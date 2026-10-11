import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as vscode from "vscode";
import { ApiIndex } from "./apiIndex";
import { diffIndexes, diffToMarkdown, saveChangelog, showChangelogPanel } from "./changelog";
import { ContractManager } from "./contracts";
import { ApiExplorerProvider, HogwartsCompletionProvider, HogwartsDefinitionProvider, HogwartsHoverProvider, HogwartsSignatureProvider, registerDiagnostics, searchApiSymbols, showSymbolDetails } from "./providers";
import { syncWorkspaceTypings } from "./workspaceTypings";
import { createResource } from "./resourceGenerator";
import { ContextualHmpSnippetProvider } from "./contextualSnippets";
import { ExtensionUpdater } from "./extensionUpdater";
import type { ContractManifest } from "./types";

let index: ApiIndex;
let contractManager: ContractManager;
let statusBar: vscode.StatusBarItem;
let explorer: ApiExplorerProvider;
let output: vscode.OutputChannel;
let extensionContext: vscode.ExtensionContext;
let apiReady = false;
let extensionUpdater: ExtensionUpdater;

function contextStorageRoot(): string { return extensionContext.globalStorageUri.fsPath; }

const languageSelector: vscode.DocumentSelector = [
  { language: "typescript", scheme: "file" },
  { language: "javascript", scheme: "file" },
  { language: "typescriptreact", scheme: "file" },
  { language: "javascriptreact", scheme: "file" }
];

async function rebuildIndex(): Promise<ContractManifest> {
  const root = await contractManager.getActiveRoot();
  index = new ApiIndex(root);
  const manifest = await contractManager.getActiveManifest();
  const extensionVersion = String(extensionContext.extension.packageJSON.version || "0.0.0");
  statusBar.text = `$(book) HMP ${extensionVersion} | HMP ${manifest.version}`;
  statusBar.tooltip = `HMP Hogwarts API ${extensionVersion}\nHogwarts MP API ${manifest.version}\n${manifest.channel}\n${manifest.revision}`;
  explorer?.refresh();
  output.appendLine(`[index] ${manifest.version} ${manifest.revision} — ${index.snapshots.length} symbols indexed`);
  return manifest;
}

async function performUpdate(remote?: ContractManifest, interactive = true): Promise<boolean> {
  const currentRoot = await contractManager.getActiveRoot();
  const currentManifest = await contractManager.getActiveManifest();
  const oldIndex = new ApiIndex(currentRoot);
  const manifest = remote ?? (await contractManager.fetchRemoteManifest());
  if (manifest.revision === currentManifest.revision) {
    if (interactive) vscode.window.showInformationMessage(`Hogwarts MP API ${currentManifest.version}: already up to date.`);
    return false;
  }
  if (interactive) statusBar.text = "$(sync~spin) HMP API updating";
  const newRoot = await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: `Updating Hogwarts MP API ${manifest.version}`, cancellable: false }, async (progress) => {
    progress.report({ message: "downloading and verifying integrity..." });
    return contractManager.downloadAndActivate(manifest);
  });
  const newIndex = new ApiIndex(newRoot);
  const diff = diffIndexes(oldIndex, newIndex, currentManifest, manifest);
  const markdown = diffToMarkdown(diff);
  await saveChangelog(contextStorageRoot(), markdown, diff);
  await rebuildIndex();
  await syncWorkspaceTypings(await contractManager.getActiveRoot(), output);
  vscode.window.showInformationMessage(`Hogwarts MP API updated ${currentManifest.version} → ${manifest.version}: +${diff.added.length} ~${diff.changed.length} -${diff.removed.length} • ⚠ ${diff.breaking.length} potential breaking changes`);
  return true;
}

async function checkUpdates(interactive: boolean): Promise<void> {
  try {
    statusBar.text = "$(sync~spin) HMP API check";
    const result = await contractManager.checkForUpdate();
    if (!result.hasUpdate) {
      await rebuildIndex();
      if (interactive) vscode.window.showInformationMessage(`Hogwarts MP API ${result.current.version}: no updates available.`);
      return;
    }
    if (!interactive) {
      await performUpdate(result.remote, false);
      return;
    }
    await rebuildIndex();
    const action = await vscode.window.showInformationMessage(`New Hogwarts MP contract available: ${result.current.version} → ${result.remote.version}`, "Update", "Show version");
    if (action === "Update") await performUpdate(result.remote, true);
    if (action === "Show version") await showVersion();
  } catch (error) {
    await rebuildIndex().catch(() => undefined);
    const message = error instanceof Error ? error.message : String(error);
    output.appendLine(`[update:error] ${message}`);
    if (interactive) vscode.window.showErrorMessage(`HMP Hogwarts API: ${message}`);
  }
}

async function showVersion(): Promise<void> {
  const manifest = await contractManager.getActiveManifest();
  const previous = await contractManager.getPreviousManifest();
  const text = [
    `Hogwarts MP API ${manifest.version}`,
    `Channel: ${manifest.channel}`,
    `Revision: ${manifest.revision}`,
    `Symbols: ${index.snapshots.length}`,
    previous ? `Rollback available: ${previous.version} (${previous.revision.slice(0, 12)})` : "Rollback available: no"
  ].join("\n");
  vscode.window.showInformationMessage(text, { modal: true });
}

async function openApi(target: "client" | "server" | "shared"): Promise<void> {
  const root = await contractManager.getActiveRoot();
  const file = contractManager.getApiPath(root, target);
  const document = await vscode.workspace.openTextDocument(vscode.Uri.file(file));
  await vscode.window.showTextDocument(document, { preview: false });
}

async function rollback(): Promise<void> {
  const previous = await contractManager.getPreviousManifest();
  if (!previous) {
    vscode.window.showWarningMessage("No previous contract is available for rollback yet.");
    return;
  }
  const answer = await vscode.window.showWarningMessage(`Restore Hogwarts MP API ${previous.version} (${previous.revision.slice(0, 12)})?`, { modal: true }, "Restore");
  if (answer !== "Restore") return;
  if (await contractManager.rollback()) {
    await rebuildIndex();
    vscode.window.showInformationMessage(`Hogwarts MP contract restored to ${previous.version}.`);
  }
}

async function maybeAutoUpdate(context: vscode.ExtensionContext): Promise<void> {
  const config = vscode.workspace.getConfiguration("hmpHogwartsApi");
  if (!config.get("autoUpdate", true)) return;
  const intervalHours = Math.max(1, config.get("checkIntervalHours", 12));
  const now = Date.now();
  const last = context.globalState.get<number>("lastUpdateCheck", 0);
  if (now - last < intervalHours * 60 * 60 * 1000) return;
  await context.globalState.update("lastUpdateCheck", now);
  void checkUpdates(false);
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  extensionContext = context;
  output = vscode.window.createOutputChannel("HMP Hogwarts API");
  context.subscriptions.push(output);
  output.appendLine(`HMP Hogwarts API ${context.extension.packageJSON.version} activation`);
  extensionUpdater = new ExtensionUpdater(context, output);

  context.subscriptions.push(
    vscode.commands.registerCommand("hmpHogwartsApi.healthCheck", () => {
      vscode.window.showInformationMessage(`HMP Hogwarts API v${context.extension.packageJSON.version}: extension is active and working.`);
    }),
    vscode.commands.registerCommand("hmpHogwartsApi.checkExtensionUpdates", async () => {
      try {
        const check = await extensionUpdater.check();
        await extensionUpdater.promptForUpdate(check, true);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        output.appendLine(`[extension-update:error] ${message}`);
        vscode.window.showErrorMessage(`HMP Extension Update: ${message}`);
      }
    }),
    vscode.commands.registerCommand("hmpHogwartsApi.showExtensionChangelog", async () => {
      try { await extensionUpdater.showChangelog(); }
      catch (error) { vscode.window.showErrorMessage(error instanceof Error ? error.message : String(error)); }
    }),
    vscode.commands.registerCommand("hmpHogwartsApi.showExtensionVersion", () => {
      vscode.window.showInformationMessage(`HMP Hogwarts API ${context.extension.packageJSON.version}`);
    })
  );

  void extensionUpdater.maybeAutoCheck();

  // Register the resource generator immediately. This command must remain usable
  // even if API-contract initialization fails for any reason.
  context.subscriptions.push(
    vscode.commands.registerCommand("hmpHogwartsApi.createResource", async (contextUri?: vscode.Uri) => {
      try {
        const root = await createResource(contextUri);
        if (!root) return;
        if (apiReady && contractManager) {
          await syncWorkspaceTypings(await contractManager.getActiveRoot(), output);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        output.appendLine(`[resource-generator:error] ${message}`);
        vscode.window.showErrorMessage(`HMP Resource Generator: ${message}`);
      }
    })
  );

  contractManager = new ContractManager(context);
  try {
    await contractManager.initialize();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    output.appendLine(`[activation:error] ${message}`);
    vscode.window.showWarningMessage(`HMP Hogwarts API: API contract could not be initialized. The Resource Generator remains available. ${message}`);
    return;
  }
  apiReady = true;

  statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 90);
  statusBar.command = "hmpHogwartsApi.showVersion";
  context.subscriptions.push(statusBar);

  explorer = new ApiExplorerProvider(() => index);
  context.subscriptions.push(vscode.window.registerTreeDataProvider("hmpHogwartsApi.explorer", explorer));

  await rebuildIndex();
  statusBar.show();

  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(languageSelector, new HogwartsCompletionProvider(() => index), "."),
    vscode.languages.registerCompletionItemProvider(languageSelector, new ContextualHmpSnippetProvider(() => index)),
    vscode.languages.registerHoverProvider(languageSelector, new HogwartsHoverProvider(() => index)),
    vscode.languages.registerDefinitionProvider(languageSelector, new HogwartsDefinitionProvider(() => index)),
    vscode.languages.registerSignatureHelpProvider(languageSelector, new HogwartsSignatureProvider(() => index), "(", ","),
    vscode.commands.registerCommand("hmpHogwartsApi.checkUpdates", () => checkUpdates(true)),
    vscode.commands.registerCommand("hmpHogwartsApi.update", async () => {
      try { await performUpdate(undefined, true); } catch (error) { vscode.window.showErrorMessage(error instanceof Error ? error.message : String(error)); await rebuildIndex(); }
    }),
    vscode.commands.registerCommand("hmpHogwartsApi.showChangelog", () => showChangelogPanel(context.globalStorageUri.fsPath, context.extensionPath)),
    vscode.commands.registerCommand("hmpHogwartsApi.showVersion", showVersion),
    vscode.commands.registerCommand("hmpHogwartsApi.rollback", rollback),
    vscode.commands.registerCommand("hmpHogwartsApi.openClientApi", () => openApi("client")),
    vscode.commands.registerCommand("hmpHogwartsApi.openServerApi", () => openApi("server")),
    vscode.commands.registerCommand("hmpHogwartsApi.openSharedApi", () => openApi("shared")),
    vscode.commands.registerCommand("hmpHogwartsApi.refreshExplorer", () => explorer.refresh()),
    vscode.commands.registerCommand("hmpHogwartsApi.searchSymbols", async () => {
      const node = await searchApiSymbols(index);
      if (node) await showSymbolDetails(node);
    }),
    vscode.commands.registerCommand("hmpHogwartsApi.showSymbolDetails", async (node?: unknown) => {
      if (node && typeof node === "object" && "path" in node && "kind" in node) {
        await showSymbolDetails(node as import("./types").ApiSymbolNode);
        return;
      }
      const selected = await searchApiSymbols(index);
      if (selected) await showSymbolDetails(selected);
    }),
    vscode.commands.registerCommand("hmpHogwartsApi.filterAll", () => explorer.setFilter("all")),
    vscode.commands.registerCommand("hmpHogwartsApi.filterClient", () => explorer.setFilter("client")),
    vscode.commands.registerCommand("hmpHogwartsApi.filterServer", () => explorer.setFilter("server")),
    vscode.commands.registerCommand("hmpHogwartsApi.filterShared", () => explorer.setFilter("shared")),
    vscode.commands.registerCommand("hmpHogwartsApi.syncWorkspaceTypings", async () => {
      const count = await syncWorkspaceTypings(await contractManager.getActiveRoot(), output);
      vscode.window.showInformationMessage(`HMP Hogwarts API: removed ${count} legacy typings from client/server. No node_modules folders are generated.`);
    })
  );

  registerDiagnostics(context, () => index);
  void syncWorkspaceTypings(await contractManager.getActiveRoot(), output);
  void maybeAutoUpdate(context);
}

export function deactivate(): void {}
