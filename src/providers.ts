import * as vscode from "vscode";
import { ApiIndex } from "./apiIndex";
import type { ApiContext, ApiSymbolNode } from "./types";

function configArray(key: string, fallback: string[]): string[] {
  return vscode.workspace.getConfiguration("hmpHogwartsApi").get<string[]>(key, fallback).map((x) => x.toLowerCase());
}

export function contextForDocument(document: vscode.TextDocument): ApiContext {
  const parts = document.uri.fsPath.replace(/\\/g, "/").toLowerCase().split("/");
  const client = configArray("clientFolderNames", ["client"]);
  const server = configArray("serverFolderNames", ["server"]);
  const shared = configArray("sharedFolderNames", ["shared", "types"]);
  if (parts.some((part) => client.includes(part))) return "client";
  if (parts.some((part) => server.includes(part))) return "server";
  if (parts.some((part) => shared.includes(part))) return "shared";
  return "shared";
}

function kindToCompletion(kind: string): vscode.CompletionItemKind {
  switch (kind) {
    case "class": return vscode.CompletionItemKind.Class;
    case "interface": return vscode.CompletionItemKind.Interface;
    case "function": return vscode.CompletionItemKind.Function;
    case "method": return vscode.CompletionItemKind.Method;
    case "property": return vscode.CompletionItemKind.Property;
    case "namespace": return vscode.CompletionItemKind.Module;
    case "enum": return vscode.CompletionItemKind.Enum;
    case "type": return vscode.CompletionItemKind.TypeParameter;
    default: return vscode.CompletionItemKind.Variable;
  }
}

function chainBefore(document: vscode.TextDocument, position: vscode.Position, requireDot: boolean): string[] | undefined {
  const line = document.lineAt(position.line).text.slice(0, position.character);
  const regex = requireDot ? /([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\.$/ : /([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)$/;
  const match = line.match(regex);
  return match?.[1]?.split(".");
}

function markdownFor(node: ApiSymbolNode): vscode.MarkdownString {
  const md = new vscode.MarkdownString();
  md.appendCodeblock(node.signature || node.path, "typescript");
  if (node.documentation) md.appendMarkdown(`\n${node.documentation}`);
  md.appendMarkdown(`\n\n_Hogwarts MP API • ${node.kind}_`);
  return md;
}

export class HogwartsCompletionProvider implements vscode.CompletionItemProvider {
  constructor(private readonly getIndex: () => ApiIndex) {}
  provideCompletionItems(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.CompletionItem[]> {
    const index = this.getIndex();
    const context = contextForDocument(document);
    const chain = chainBefore(document, position, true);
    const nodes = chain ? [...(index.resolve(context, chain)?.children.values() ?? [])] : index.topLevel(context);
    return nodes.map((node) => {
      const item = new vscode.CompletionItem(node.name, kindToCompletion(node.kind));
      item.detail = node.signature;
      item.documentation = markdownFor(node);
      item.sortText = `0_${node.name}`;
      return item;
    });
  }
}

export class HogwartsHoverProvider implements vscode.HoverProvider {
  constructor(private readonly getIndex: () => ApiIndex) {}
  provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.Hover> {
    const range = document.getWordRangeAtPosition(position, /[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*/);
    if (!range) return undefined;
    const chain = document.getText(range).split(".");
    const node = this.getIndex().resolve(contextForDocument(document), chain);
    return node ? new vscode.Hover(markdownFor(node), range) : undefined;
  }
}

export class HogwartsDefinitionProvider implements vscode.DefinitionProvider {
  constructor(private readonly getIndex: () => ApiIndex) {}
  provideDefinition(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.Definition> {
    const range = document.getWordRangeAtPosition(position, /[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*/);
    if (!range) return undefined;
    const node = this.getIndex().resolve(contextForDocument(document), document.getText(range).split("."));
    if (!node) return undefined;
    return new vscode.Location(vscode.Uri.file(node.filePath), new vscode.Position(node.line, node.character));
  }
}

export class HogwartsSignatureProvider implements vscode.SignatureHelpProvider {
  constructor(private readonly getIndex: () => ApiIndex) {}
  provideSignatureHelp(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.SignatureHelp> {
    const line = document.lineAt(position.line).text.slice(0, position.character);
    const open = line.lastIndexOf("(");
    if (open < 0) return undefined;
    const before = line.slice(0, open).match(/([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*$/);
    if (!before?.[1]) return undefined;
    const node = this.getIndex().resolve(contextForDocument(document), before[1].split("."));
    if (!node || !["function", "method"].includes(node.kind)) return undefined;
    const help = new vscode.SignatureHelp();
    const signature = new vscode.SignatureInformation(node.signature, node.documentation);
    help.signatures = [signature];
    help.activeSignature = 0;
    help.activeParameter = Math.max(0, line.slice(open + 1).split(",").length - 1);
    return help;
  }
}

export class ApiExplorerProvider implements vscode.TreeDataProvider<ApiSymbolNode> {
  private readonly emitter = new vscode.EventEmitter<ApiSymbolNode | undefined | void>();
  readonly onDidChangeTreeData = this.emitter.event;
  private filter: ApiContext | "all" = "all";
  constructor(private readonly getIndex: () => ApiIndex) {}
  refresh(): void { this.emitter.fire(); }
  setFilter(filter: ApiContext | "all"): void { this.filter = filter; this.refresh(); }
  getFilter(): ApiContext | "all" { return this.filter; }
  getTreeItem(element: ApiSymbolNode): vscode.TreeItem {
    const item = new vscode.TreeItem(element.name, element.children.size ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
    item.description = element.kind === "context" ? undefined : element.kind;
    item.tooltip = element.kind === "context" ? element.signature : markdownFor(element);
    if (element.kind !== "context") {
      item.command = { command: "hmpHogwartsApi.showSymbolDetails", title: "Show API details", arguments: [element] };
      item.contextValue = "hmpHogwartsApi.symbol";
    }
    return item;
  }
  getChildren(element?: ApiSymbolNode): ApiSymbolNode[] {
    const makeContext = (name: string, mode: ApiContext): ApiSymbolNode => ({
      name, path: `__context__:${mode}`, kind: "context", signature: `${name} (${mode})`, documentation: "", filePath: "", line: 0, character: 0, children: new Map()
    });
    if (!element) {
      if (this.filter === "client") return [makeContext("Client API", "client")];
      if (this.filter === "server") return [makeContext("Server API", "server")];
      if (this.filter === "shared") return [makeContext("Shared API", "shared")];
      return [makeContext("Client API", "client"), makeContext("Server API", "server"), makeContext("Shared API", "shared")];
    }
    if (element.kind === "context") {
      const mode = element.path.split(":")[1] as ApiContext;
      return this.getIndex().topLevel(mode);
    }
    return [...element.children.values()].sort((a, b) => a.name.localeCompare(b.name));
  }
}

export async function showSymbolDetails(node: ApiSymbolNode | undefined): Promise<void> {
  if (!node || typeof node.path !== "string") {
    vscode.window.showWarningMessage("Select an API symbol first.");
    return;
  }
  const panel = vscode.window.createWebviewPanel("hmpHogwartsApi.symbolDetails", `Hogwarts API: ${node.path}`, vscode.ViewColumn.Beside, { enableScripts: false });
  const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
  const children = [...node.children.values()].sort((a, b) => a.name.localeCompare(b.name));
  panel.webview.html = `<!doctype html><html><head><meta charset="utf-8"><style>
  body{font-family:var(--vscode-font-family);padding:24px;color:var(--vscode-foreground);line-height:1.5}h1{margin-top:0;color:var(--vscode-textLink-foreground)}
  .badge{display:inline-block;padding:2px 8px;border:1px solid var(--vscode-panel-border);border-radius:12px;margin-bottom:12px}.sig{white-space:pre-wrap;background:var(--vscode-textCodeBlock-background);padding:14px;border-radius:8px;font-family:var(--vscode-editor-font-family)}
  table{border-collapse:collapse;width:100%;margin-top:20px}td,th{border-bottom:1px solid var(--vscode-panel-border);padding:8px;text-align:left}code{font-family:var(--vscode-editor-font-family)}</style></head><body>
  <h1>${esc(node.path)}</h1><div class="badge">${esc(node.kind)}</div><div class="sig">${esc(node.signature || node.path)}</div>
  ${node.documentation ? `<h2>Documentation</h2><p>${esc(node.documentation)}</p>` : ""}
  ${children.length ? `<h2>Members (${children.length})</h2><table><thead><tr><th>Name</th><th>Kind</th><th>Signature</th></tr></thead><tbody>${children.map((c) => `<tr><td><code>${esc(c.name)}</code></td><td>${esc(c.kind)}</td><td><code>${esc(c.signature)}</code></td></tr>`).join("")}</tbody></table>` : ""}
  <p><small>${esc(node.filePath)}:${node.line + 1}</small></p></body></html>`;
}

export async function searchApiSymbols(index: ApiIndex): Promise<ApiSymbolNode | undefined> {
  const entries: Array<{ node: ApiSymbolNode; context: ApiContext }> = [];
  const walk = (node: ApiSymbolNode, context: ApiContext) => { entries.push({ node, context }); for (const child of node.children.values()) walk(child, context); };
  for (const context of ["client", "server", "shared"] as ApiContext[]) for (const node of index.topLevel(context)) walk(node, context);
  const seen = new Set<string>();
  const items = entries.filter(({ node, context }) => { const k = `${context}:${node.path}`; if (seen.has(k)) return false; seen.add(k); return true; }).map(({ node, context }) => ({
    label: `$(symbol-${node.kind === "method" ? "method" : node.kind === "property" ? "property" : node.kind === "class" ? "class" : "misc"}) ${node.path}`,
    description: context,
    detail: node.signature,
    node
  }));
  const selected = await vscode.window.showQuickPick(items, { placeHolder: "Search Hogwarts MP API (e.g. LocalPlayer, Web.createView, Player.teleport)", matchOnDescription: true, matchOnDetail: true });
  return selected?.node;
}

export function registerDiagnostics(context: vscode.ExtensionContext, getIndex: () => ApiIndex): vscode.DiagnosticCollection {
  const collection = vscode.languages.createDiagnosticCollection("hmp-hogwarts-api");
  const update = (document: vscode.TextDocument) => {
    if (!vscode.workspace.getConfiguration("hmpHogwartsApi").get("diagnostics", true)) return collection.delete(document.uri);
    if (!["typescript", "javascript", "typescriptreact", "javascriptreact"].includes(document.languageId)) return;
    const diagnostics: vscode.Diagnostic[] = [];
    const text = document.getText();
    const webRe = /Web\.createView\(\s*["'](?!https?:\/\/|fw:\/\/)([^"']+)["']/g;
    for (let match; (match = webRe.exec(text)); ) {
      const start = document.positionAt(match.index);
      const end = document.positionAt(match.index + match[0].length);
      diagnostics.push(new vscode.Diagnostic(new vscode.Range(start, end), `Local WebView: use a fw://resources/<resource-name>/ URL, for example fw://resources/<resource-name>/${match[1]}`, vscode.DiagnosticSeverity.Warning));
    }
    const deathRe = /(?:LocalPlayer\.)?stateInfo\.setHealth\(\s*0\b/g;
    for (let match; (match = deathRe.exec(text)); ) {
      const start = document.positionAt(match.index);
      const end = document.positionAt(match.index + match[0].length);
      diagnostics.push(new vscode.Diagnostic(new vscode.Range(start, end), "setHealth(0) may trigger the native Hogwarts MP death/respawn pipeline.", vscode.DiagnosticSeverity.Information));
    }
    const apiContext = contextForDocument(document);
    if (apiContext !== "shared") {
      const other: ApiContext = apiContext === "client" ? "server" : "client";
      const currentNames = new Set(getIndex().topLevel(apiContext).map((x) => x.name));
      const otherOnly = getIndex().topLevel(other).filter((x) => !currentNames.has(x.name));
      for (const symbol of otherOnly) {
        const re = new RegExp(`\\b${symbol.name.replace(/[$]/g, "\\$")}\\b`, "g");
        for (let match; (match = re.exec(text)); ) {
          const start = document.positionAt(match.index);
          const end = document.positionAt(match.index + symbol.name.length);
          diagnostics.push(new vscode.Diagnostic(new vscode.Range(start, end), `${symbol.name} belongs to the ${other} API, but this file is in the ${apiContext} context.`, vscode.DiagnosticSeverity.Warning));
          if (diagnostics.length > 80) break;
        }
        if (diagnostics.length > 80) break;
      }
    }
    collection.set(document.uri, diagnostics);
  };
  context.subscriptions.push(collection, vscode.workspace.onDidOpenTextDocument(update), vscode.workspace.onDidChangeTextDocument((e) => update(e.document)), vscode.workspace.onDidCloseTextDocument((d) => collection.delete(d.uri)));
  vscode.workspace.textDocuments.forEach(update);
  return collection;
}
