import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as vscode from "vscode";

async function exists(p: string): Promise<boolean> {
  return fs.access(p).then(() => true).catch(() => false);
}

async function removeIfEmpty(dir: string): Promise<void> {
  try {
    const entries = await fs.readdir(dir);
    if (entries.length === 0) await fs.rmdir(dir);
  } catch {
    // Directory missing/not empty: nothing to do.
  }
}

/**
 * Legacy cleanup only.
 *
 * Older releases injected Hogwarts API declarations under
 * client/server/node_modules/@types/hmp-hogwarts-api. This polluted each
 * resource and also conflicts with the single-project tsconfig now generated
 * by the resource wizard.
 *
 * IntelliSense/completion/hover is provided by the extension itself, so this
 * function now removes only the legacy folders created by HMP Hogwarts API
 * and never creates node_modules inside a resource.
 */
export async function syncWorkspaceTypings(_contractRoot: string, output?: vscode.OutputChannel): Promise<number> {
  const config = vscode.workspace.getConfiguration("hmpHogwartsApi");
  if (!config.get("syncWorkspaceTypings", true)) return 0;

  const clientNames = config.get<string[]>("clientFolderNames", ["client"]);
  const serverNames = config.get<string[]>("serverFolderNames", ["server"]);
  const packageFiles = await vscode.workspace.findFiles("**/package.json", "**/node_modules/**", 2000);
  let cleaned = 0;

  for (const uri of packageFiles) {
    let pkg: any;
    try {
      pkg = JSON.parse(await fs.readFile(uri.fsPath, "utf8"));
    } catch {
      continue;
    }
    if (!pkg?.mafiahub) continue;

    const resourceRoot = path.dirname(uri.fsPath);
    for (const folderName of [...new Set([...clientNames, ...serverNames])]) {
      const contextRoot = path.join(resourceRoot, folderName);
      if (!(await exists(contextRoot))) continue;

      const nodeModules = path.join(contextRoot, "node_modules");
      const atTypes = path.join(nodeModules, "@types");
      const legacyTypeRoot = path.join(atTypes, "hmp-hogwarts-api");
      if (!(await exists(legacyTypeRoot))) continue;

      await fs.rm(legacyTypeRoot, { recursive: true, force: true });
      await removeIfEmpty(atTypes);
      await removeIfEmpty(nodeModules);
      cleaned++;
      output?.appendLine(`[typings] removed legacy ${legacyTypeRoot}`);
    }
  }

  if (cleaned) await vscode.commands.executeCommand("typescript.restartTsServer");
  return cleaned;
}
