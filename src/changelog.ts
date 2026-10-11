import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as vscode from "vscode";
import { ApiIndex } from "./apiIndex";
import type { ApiBreakingChange, ApiContext, ApiDiff, ApiSnapshotEntry, ContractManifest } from "./types";

interface ChangelogHistoryEntry {
  id: string;
  createdAt: string;
  fromVersion: string;
  toVersion: string;
  fromRevision: string;
  toRevision: string;
  added: number;
  changed: number;
  removed: number;
  breaking: number;
  file: string;
}

interface ChangelogHistoryIndex { schemaVersion: 1; entries: ChangelogHistoryEntry[]; }

function parameterList(signature: string): string[] {
  const start = signature.indexOf("(");
  const end = signature.indexOf(")", start + 1);
  if (start < 0 || end < 0) return [];
  const body = signature.slice(start + 1, end).trim();
  if (!body) return [];
  return body.split(",").map((x) => x.trim());
}
function requiredCount(signature: string): number { return parameterList(signature).filter((p) => p && !p.includes("?") && !p.includes("=") && !p.startsWith("...")).length; }
function returnType(signature: string): string | undefined { const m = signature.match(/\)\s*:\s*([^|{;]+)(?:\s*\||$)/); return m?.[1]?.trim(); }
function breakingFor(before: ApiSnapshotEntry, after: ApiSnapshotEntry): ApiBreakingChange | undefined {
  if (before.signature === after.signature) return undefined;
  const oldReq = requiredCount(before.signature), newReq = requiredCount(after.signature);
  if (newReq > oldReq) return { reason: "required-parameter-added", before, after, detail: `Required parameters: ${oldReq} → ${newReq}` };
  const oldRet = returnType(before.signature), newRet = returnType(after.signature);
  if (oldRet && newRet && oldRet !== newRet) return { reason: "return-type-changed", before, after, detail: `Return type: ${oldRet} → ${newRet}` };
  if (["function", "method"].includes(before.kind)) return { reason: "signature-changed", before, after, detail: "The callable signature changed." };
  return undefined;
}

export function diffIndexes(oldIndex: ApiIndex | undefined, newIndex: ApiIndex, from: ContractManifest | undefined, to: ContractManifest): ApiDiff {
  const oldMap = new Map((oldIndex?.snapshots ?? []).map((entry) => [entry.key, entry]));
  const newMap = new Map(newIndex.snapshots.map((entry) => [entry.key, entry]));
  const added: ApiSnapshotEntry[] = [], removed: ApiSnapshotEntry[] = [];
  const changed: Array<{ before: ApiSnapshotEntry; after: ApiSnapshotEntry }> = [];
  const breaking: ApiBreakingChange[] = [];
  for (const [key, next] of newMap) {
    const previous = oldMap.get(key);
    if (!previous) added.push(next);
    else if (previous.signature !== next.signature || previous.documentation !== next.documentation) {
      changed.push({ before: previous, after: next });
      const b = breakingFor(previous, next); if (b) breaking.push(b);
    }
  }
  for (const [key, previous] of oldMap) if (!newMap.has(key)) {
    removed.push(previous);
    breaking.push({ reason: "removed", before: previous, detail: "Symbol removed from the API contract." });
  }
  const sort = (a: ApiSnapshotEntry, b: ApiSnapshotEntry) => a.path.localeCompare(b.path);
  added.sort(sort); removed.sort(sort); changed.sort((a, b) => a.after.path.localeCompare(b.after.path)); breaking.sort((a, b) => a.before.path.localeCompare(b.before.path));
  return { from, to, added, removed, changed, breaking };
}

function shortDoc(value: string): string {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  return cleaned.length > 240 ? `${cleaned.slice(0, 237)}...` : cleaned;
}

function contextLabel(context: ApiContext): string {
  return context === "client" ? "Client" : context === "server" ? "Server" : "Shared";
}

function grouped<T>(items: T[], contextOf: (item: T) => ApiContext): Record<ApiContext, T[]> {
  return {
    client: items.filter((item) => contextOf(item) === "client"),
    server: items.filter((item) => contextOf(item) === "server"),
    shared: items.filter((item) => contextOf(item) === "shared"),
  };
}

function entryMarkdown(entry: ApiSnapshotEntry, marker: string): string {
  const doc = shortDoc(entry.documentation);
  return `${marker} **${entry.path}** · ${entry.kind}\n  - Signature: \`${entry.signature}\`${doc ? `\n  - Note: ${doc}` : ""}`;
}

function entriesSection(title: string, items: ApiSnapshotEntry[], marker: string): string {
  let out = `## ${title}\n\n`;
  if (!items.length) return `${out}_No changes._\n`;
  const byContext = grouped(items, (entry) => entry.context);
  for (const context of ["client", "server", "shared"] as ApiContext[]) {
    const rows = byContext[context];
    if (!rows.length) continue;
    out += `### ${contextLabel(context)} (${rows.length})\n\n${rows.map((entry) => entryMarkdown(entry, marker)).join("\n\n")}\n\n`;
  }
  return out.trimEnd() + "\n";
}

function changedSection(diff: ApiDiff): string {
  let out = "## Changed\n\n";
  if (!diff.changed.length) return `${out}_No changes._\n`;
  const byContext = grouped(diff.changed, (item) => item.after.context);
  for (const context of ["client", "server", "shared"] as ApiContext[]) {
    const rows = byContext[context];
    if (!rows.length) continue;
    out += `### ${contextLabel(context)} (${rows.length})\n\n`;
    for (const { before, after } of rows) {
      const signatureChanged = before.signature !== after.signature;
      const documentationChanged = before.documentation !== after.documentation;
      out += `~ **${after.path}** · ${after.kind}\n`;
      if (signatureChanged) out += `  - Before: \`${before.signature}\`\n  - After: \`${after.signature}\`\n`;
      else out += `  - Unchanged signature: \`${after.signature}\`\n`;
      if (documentationChanged) {
        const beforeDoc = shortDoc(before.documentation);
        const afterDoc = shortDoc(after.documentation);
        out += "  - Documentation changed";
        if (beforeDoc || afterDoc) out += `\n    - Before: ${beforeDoc || "_(empty)_"}\n    - After: ${afterDoc || "_(empty)_"}`;
        out += "\n";
      }
      out += "\n";
    }
  }
  return out.trimEnd() + "\n";
}

function breakingSection(diff: ApiDiff): string {
  let out = "## Compatibility / Potential breaking changes\n\n";
  if (!diff.breaking.length) return `${out}_No breaking changes detected automatically._\n`;
  for (const item of diff.breaking) {
    out += `! **[${contextLabel(item.before.context)}] ${item.before.path}**\n  - Reason: ${item.detail}\n  - Before: \`${item.before.signature}\``;
    if (item.after) out += `\n  - After: \`${item.after.signature}\``;
    out += "\n\n";
  }
  return out.trimEnd() + "\n";
}

export function diffToMarkdown(diff: ApiDiff): string {
  const fromVersion = diff.from?.version ?? "unknown";
  const fromRevision = diff.from?.revision?.slice(0, 12) ?? "n/a";
  const contexts = {
    client: {
      added: diff.added.filter((x) => x.context === "client").length,
      changed: diff.changed.filter((x) => x.after.context === "client").length,
      removed: diff.removed.filter((x) => x.context === "client").length,
    },
    server: {
      added: diff.added.filter((x) => x.context === "server").length,
      changed: diff.changed.filter((x) => x.after.context === "server").length,
      removed: diff.removed.filter((x) => x.context === "server").length,
    },
    shared: {
      added: diff.added.filter((x) => x.context === "shared").length,
      changed: diff.changed.filter((x) => x.after.context === "shared").length,
      removed: diff.removed.filter((x) => x.context === "shared").length,
    },
  };

  return `# Hogwarts MP API ${fromVersion} → ${diff.to.version}\n\n` +
    `**Channel:** ${diff.to.channel}  \n` +
    `**Revision:** \`${fromRevision}\` → \`${diff.to.revision.slice(0, 12)}\`\n\n` +
    `## Summary\n\n` +
    `- **Added:** ${diff.added.length}\n` +
    `- **Changed:** ${diff.changed.length}\n` +
    `- **Removed:** ${diff.removed.length}\n` +
    `- **Potential breaking changes:** ${diff.breaking.length}\n\n` +
    `### Impact by context\n\n` +
    `- **Client:** +${contexts.client.added} ~${contexts.client.changed} -${contexts.client.removed}\n` +
    `- **Server:** +${contexts.server.added} ~${contexts.server.changed} -${contexts.server.removed}\n` +
    `- **Shared:** +${contexts.shared.added} ~${contexts.shared.changed} -${contexts.shared.removed}\n\n` +
    breakingSection(diff) + "\n" +
    entriesSection("Added", diff.added, "+") + "\n" +
    changedSection(diff) + "\n" +
    entriesSection("Removed", diff.removed, "-");
}

function safePart(value: string): string { return value.replace(/[^0-9A-Za-z._-]+/g, "-").replace(/^-+|-+$/g, "") || "unknown"; }
function historyRoot(storageRoot: string): string { return path.join(storageRoot, "api-changelog-history"); }

async function readHistoryIndex(root: string): Promise<ChangelogHistoryIndex> {
  try {
    const parsed = JSON.parse(await fs.readFile(path.join(root, "index.json"), "utf8")) as ChangelogHistoryIndex;
    return parsed?.schemaVersion === 1 && Array.isArray(parsed.entries) ? parsed : { schemaVersion: 1, entries: [] };
  } catch {
    return { schemaVersion: 1, entries: [] };
  }
}

export async function saveChangelog(storageRoot: string, markdown: string, diff?: ApiDiff): Promise<string> {
  await fs.mkdir(storageRoot, { recursive: true });
  const latest = path.join(storageRoot, "CHANGELOG-api.md");
  await fs.writeFile(latest, markdown, "utf8");
  if (!diff) return latest;

  const root = historyRoot(storageRoot);
  await fs.mkdir(root, { recursive: true });
  const id = `${safePart(diff.from?.version ?? "unknown")}-to-${safePart(diff.to.version)}-${diff.to.revision.slice(0, 12)}`;
  const fileName = `${id}.md`;
  await fs.writeFile(path.join(root, fileName), markdown, "utf8");

  const index = await readHistoryIndex(root);
  const entry: ChangelogHistoryEntry = {
    id,
    createdAt: new Date().toISOString(),
    fromVersion: diff.from?.version ?? "unknown",
    toVersion: diff.to.version,
    fromRevision: diff.from?.revision ?? "",
    toRevision: diff.to.revision,
    added: diff.added.length,
    changed: diff.changed.length,
    removed: diff.removed.length,
    breaking: diff.breaking.length,
    file: fileName,
  };
  index.entries = [entry, ...index.entries.filter((item) => item.toRevision !== entry.toRevision || item.fromRevision !== entry.fromRevision)]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  await fs.writeFile(path.join(root, "index.json"), `${JSON.stringify(index, null, 2)}\n`, "utf8");
  return latest;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function normalizeLegacyEnglish(markdown: string): string {
  const replacements: Array<[RegExp, string]> = [
    [/La firma callable è cambiata\./g, "The callable signature changed."],
    [/Simbolo rimosso dal contratto API\./g, "Symbol removed from the API contract."],
    [/Simbolo aggiunto al contratto API\./g, "Symbol added to the API contract."],
    [/La documentazione è cambiata\./g, "The documentation changed."],
    [/Tipo di ritorno cambiato:/g, "Return type changed:"],
    [/Parametro obbligatorio aggiunto:/g, "Required parameter added:"],
  ];
  let result = markdown;
  for (const [pattern, replacement] of replacements) result = result.replace(pattern, replacement);
  return result;
}

function inlineMarkdown(value: string): string {
  let text = escapeHtml(value);
  text = text.replace(/`([^`]+)`/g, "<code>$1</code>");
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/_([^_]+)_/g, "<em>$1</em>");
  return text;
}

function markdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r/g, "").split("\n");
  const html: string[] = [];
  let inList = false;
  const closeList = () => { if (inList) { html.push("</ul>"); inList = false; } };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) { closeList(); continue; }
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      closeList();
      const level = heading[1]!.length;
      html.push(`<h${level}>${inlineMarkdown(heading[2]!)}</h${level}>`);
      continue;
    }
    const bullet = line.match(/^\s*[-+~!]\s+(.+)$/);
    if (bullet) {
      if (!inList) { html.push("<ul>"); inList = true; }
      const cls = line.trimStart().startsWith("+") ? "added" : line.trimStart().startsWith("-") ? "removed" : line.trimStart().startsWith("~") ? "changed" : line.trimStart().startsWith("!") ? "breaking" : "";
      html.push(`<li class="${cls}">${inlineMarkdown(bullet[1]!)}</li>`);
      continue;
    }
    const indented = line.match(/^\s{2,}-\s+(.+)$/);
    if (indented) {
      if (!inList) { html.push("<ul>"); inList = true; }
      html.push(`<li class="detail">${inlineMarkdown(indented[1]!)}</li>`);
      continue;
    }
    closeList();
    html.push(`<p>${inlineMarkdown(line).replace(/  $/, "<br>")}</p>`);
  }
  closeList();
  return html.join("\n");
}

async function loadHistory(storageRoot: string, extensionPath?: string): Promise<Array<{ entry: ChangelogHistoryEntry; markdown: string; source: "local" | "bundled" }>> {
  const sources: Array<{ root: string; source: "local" | "bundled" }> = [{ root: historyRoot(storageRoot), source: "local" }];
  if (extensionPath) sources.push({ root: path.join(extensionPath, "resources", "changelog-history"), source: "bundled" });

  const merged = new Map<string, { entry: ChangelogHistoryEntry; markdown: string; source: "local" | "bundled" }>();
  for (const source of sources) {
    const index = await readHistoryIndex(source.root);
    for (const entry of index.entries) {
      try {
        const markdown = normalizeLegacyEnglish(await fs.readFile(path.join(source.root, entry.file), "utf8"));
        const key = `${entry.fromRevision}:${entry.toRevision}`;
        if (!merged.has(key) || source.source === "local") merged.set(key, { entry, markdown, source: source.source });
      } catch {}
    }
  }
  return [...merged.values()].sort((a, b) => b.entry.createdAt.localeCompare(a.entry.createdAt));
}

export async function showChangelogPanel(storageRoot: string, extensionPath?: string): Promise<void> {
  let history = await loadHistory(storageRoot, extensionPath);
  if (!history.length) {
    const latest = normalizeLegacyEnglish(await fs.readFile(path.join(storageRoot, "CHANGELOG-api.md"), "utf8").catch(() => "# Hogwarts MP API Changelog\n\nNo API updates have been recorded yet."));
    history = [{
      entry: { id: "latest", createdAt: new Date(0).toISOString(), fromVersion: "?", toVersion: "Latest", fromRevision: "", toRevision: "", added: 0, changed: 0, removed: 0, breaking: 0, file: "CHANGELOG-api.md" },
      markdown: latest,
      source: "local",
    }];
  }

  const panel = vscode.window.createWebviewPanel("hmpHogwartsApi.changelog", "Hogwarts MP API Changelog", vscode.ViewColumn.Active, { enableScripts: true });
  const options = history.map((item, index) => `<option value="${index}">${escapeHtml(item.entry.fromVersion)} → ${escapeHtml(item.entry.toVersion)} · +${item.entry.added} ~${item.entry.changed} -${item.entry.removed}${item.entry.breaking ? ` · ⚠ ${item.entry.breaking}` : ""}</option>`).join("");
  const pages = history.map((item, index) => `<article class="page${index === 0 ? " active" : ""}" data-page="${index}">
    <div class="summary-cards">
      <div><span>Added</span><strong>+${item.entry.added}</strong></div>
      <div><span>Changed</span><strong>~${item.entry.changed}</strong></div>
      <div><span>Removed</span><strong>-${item.entry.removed}</strong></div>
      <div><span>Breaking</span><strong>${item.entry.breaking}</strong></div>
    </div>
    ${markdownToHtml(item.markdown)}
  </article>`).join("\n");

  panel.webview.html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
    :root{color-scheme:light dark}*{box-sizing:border-box}body{margin:0;font-family:var(--vscode-font-family);color:var(--vscode-foreground);background:var(--vscode-editor-background)}
    .shell{max-width:1180px;margin:0 auto;padding:28px}.toolbar{position:sticky;top:0;z-index:3;padding:14px 0 18px;background:linear-gradient(var(--vscode-editor-background) 76%,transparent)}
    .toolbar h1{margin:0 0 10px;font-size:24px}.toolbar p{margin:0 0 14px;color:var(--vscode-descriptionForeground)}select{width:min(620px,100%);padding:9px 12px;background:var(--vscode-dropdown-background);color:var(--vscode-dropdown-foreground);border:1px solid var(--vscode-dropdown-border);border-radius:6px}
    .page{display:none}.page.active{display:block}.summary-cards{display:grid;grid-template-columns:repeat(4,minmax(120px,1fr));gap:10px;margin:4px 0 26px}.summary-cards div{padding:14px;border:1px solid var(--vscode-panel-border);background:var(--vscode-editor-inactiveSelectionBackground);border-radius:8px}.summary-cards span{display:block;font-size:12px;color:var(--vscode-descriptionForeground);margin-bottom:5px}.summary-cards strong{font-size:22px}
    h1{font-size:28px;margin:28px 0 14px}h2{font-size:20px;margin:30px 0 12px;padding-bottom:8px;border-bottom:1px solid var(--vscode-panel-border)}h3{font-size:16px;margin:22px 0 10px;color:var(--vscode-textLink-foreground)}h4{font-size:14px}p{line-height:1.6;color:var(--vscode-descriptionForeground)}ul{padding-left:22px}li{margin:7px 0;line-height:1.55}li.added::marker{content:"+  ";color:var(--vscode-testing-iconPassed)}li.removed::marker{content:"−  ";color:var(--vscode-testing-iconFailed)}li.changed::marker{content:"~  ";color:var(--vscode-editorWarning-foreground)}li.breaking::marker{content:"!  ";color:var(--vscode-editorError-foreground)}li.detail{color:var(--vscode-descriptionForeground)}code{font-family:var(--vscode-editor-font-family);font-size:.92em;padding:2px 5px;border-radius:4px;background:var(--vscode-textCodeBlock-background);color:var(--vscode-textPreformat-foreground);word-break:break-word}
    @media(max-width:700px){.shell{padding:18px}.summary-cards{grid-template-columns:repeat(2,1fr)}}
  </style></head><body><main class="shell"><div class="toolbar"><h1>Hogwarts MP API Changelog</h1><p>Select a version to review current and previous API changes.</p><select id="version">${options}</select></div>${pages}</main><script>
    const select=document.getElementById('version');const pages=[...document.querySelectorAll('.page')];select.addEventListener('change',()=>{pages.forEach((page,index)=>page.classList.toggle('active',String(index)===select.value));window.scrollTo({top:0,behavior:'smooth'});});
  </script></body></html>`;
}
