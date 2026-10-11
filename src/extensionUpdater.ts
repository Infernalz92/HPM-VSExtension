import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import * as https from "node:https";
import * as path from "node:path";
import * as vscode from "vscode";

export interface ExtensionUpdateManifest {
  name: string;
  latest: string;
  url: string;
  changelog?: string;
  sha256?: string;
  releaseUrl?: string;
  publishedAt?: string;
  releaseName?: string;
}

interface GitHubReleaseAsset {
  name: string;
  browser_download_url: string;
  size?: number;
  digest?: string | null;
}

interface GitHubRelease {
  tag_name: string;
  name?: string | null;
  body?: string | null;
  html_url?: string;
  published_at?: string | null;
  draft?: boolean;
  prerelease?: boolean;
  assets?: GitHubReleaseAsset[];
}

export interface ExtensionUpdateCheck {
  current: string;
  remote: string;
  available: boolean;
  manifest: ExtensionUpdateManifest;
}

function requestBuffer(
  url: string,
  redirects = 0,
  extraHeaders: Record<string, string> = {},
): Promise<Buffer> {
  if (redirects > 5) return Promise.reject(new Error("Too many HTTP redirects while downloading."));

  return new Promise((resolve, reject) => {
    const headers = {
      "User-Agent": "HMP-Hogwarts-API",
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...extraHeaders,
    };

    const req = https.get(url, { headers }, (res) => {
      const status = res.statusCode || 0;
      const location = res.headers.location;

      if (status >= 300 && status < 400 && location) {
        res.resume();
        const next = new URL(location, url).toString();
        requestBuffer(next, redirects + 1, extraHeaders).then(resolve, reject);
        return;
      }

      if (status < 200 || status >= 300) {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer | string) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        res.on("end", () => {
          const detail = Buffer.concat(chunks).toString("utf8").trim();
          reject(new Error(`HTTP ${status} while requesting ${url}${detail ? `: ${detail.slice(0, 240)}` : ""}`));
        });
        return;
      }

      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer | string) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      res.on("end", () => resolve(Buffer.concat(chunks)));
    });

    req.setTimeout(20000, () => req.destroy(new Error("HTTP request timed out.")));
    req.on("error", reject);
  });
}

function parseVersion(value: string): [number, number, number, string] {
  const normalized = value.trim().replace(/^v/i, "");
  const match = normalized.match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
  if (!match) throw new Error(`Invalid version in manifest: ${value}`);
  return [Number(match[1]), Number(match[2]), Number(match[3]), match[4] || ""];
}

export function compareVersions(a: string, b: string): number {
  const av = parseVersion(a);
  const bv = parseVersion(b);
  for (let i = 0; i < 3; i++) {
    if (av[i] !== bv[i]) return (av[i] as number) > (bv[i] as number) ? 1 : -1;
  }
  if (av[3] === bv[3]) return 0;
  if (!av[3]) return 1;
  if (!bv[3]) return -1;
  return av[3] > bv[3] ? 1 : -1;
}


function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]!));
}

function markdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r/g, "").split("\n");
  const out: string[] = [];
  let inList = false;
  let inCode = false;
  let code: string[] = [];

  const closeList = () => {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  };

  const inline = (value: string) => {
    let result = escapeHtml(value);
    result = result.replace(/`([^`]+)`/g, "<code>$1</code>");
    result = result.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    result = result.replace(/_([^_]+)_/g, "<em>$1</em>");
    return result;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (line.startsWith("```")) {
      closeList();
      if (inCode) {
        out.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
        code = [];
        inCode = false;
      } else {
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      code.push(raw);
      continue;
    }

    if (!line.trim()) {
      closeList();
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      closeList();
      const level = heading[1]!.length;
      out.push(`<h${level}>${inline(heading[2]!)}</h${level}>`);
      continue;
    }

    const bullet = line.match(/^\s*[-*+]\s+(.+)$/);
    if (bullet) {
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${inline(bullet[1]!)}</li>`);
      continue;
    }

    closeList();
    out.push(`<p>${inline(line)}</p>`);
  }

  if (inCode) out.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
  closeList();
  return out.join("\n");
}

function showMarkdownPanel(title: string, markdown: string): void {
  const panel = vscode.window.createWebviewPanel(
    "hmpHogwartsApi.extensionChangelog",
    title,
    vscode.ViewColumn.Active,
    { enableScripts: false },
  );

  panel.webview.html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  :root{color-scheme:light dark}
  body{max-width:980px;margin:0 auto;padding:28px 34px;font-family:var(--vscode-font-family);color:var(--vscode-foreground);background:var(--vscode-editor-background);line-height:1.55}
  h1{font-size:28px;border-bottom:1px solid var(--vscode-panel-border);padding-bottom:10px}
  h2{margin-top:30px;font-size:20px}
  h3{margin-top:24px}
  code{font-family:var(--vscode-editor-font-family);background:var(--vscode-textCodeBlock-background);padding:2px 5px;border-radius:4px}
  pre{overflow:auto;background:var(--vscode-textCodeBlock-background);padding:14px;border-radius:6px}
  pre code{padding:0;background:transparent}
  li{margin:6px 0}
  p{margin:10px 0}
</style>
</head>
<body>${markdownToHtml(markdown)}</body>
</html>`;
}

function parseGitHubRelease(raw: unknown): GitHubRelease {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("GitHub returned an invalid release payload.");
  }

  const value = raw as Record<string, unknown>;
  const tagName = String(value.tag_name || "").trim();
  if (!tagName) throw new Error("GitHub release does not contain tag_name.");
  parseVersion(tagName);

  return {
    tag_name: tagName,
    name: value.name == null ? null : String(value.name),
    body: value.body == null ? null : String(value.body),
    html_url: value.html_url == null ? undefined : String(value.html_url),
    published_at: value.published_at == null ? null : String(value.published_at),
    draft: Boolean(value.draft),
    prerelease: Boolean(value.prerelease),
    assets: Array.isArray(value.assets)
      ? value.assets.map((asset) => {
          const a = asset as Record<string, unknown>;
          return {
            name: String(a.name || ""),
            browser_download_url: String(a.browser_download_url || ""),
            size: a.size == null ? undefined : Number(a.size),
            digest: a.digest == null ? null : String(a.digest),
          };
        })
      : [],
  };
}

function extractSha256(asset: GitHubReleaseAsset): string | undefined {
  const digest = String(asset.digest || "").trim().toLowerCase();
  const match = digest.match(/^sha256:([0-9a-f]{64})$/);
  return match?.[1];
}

export class ExtensionUpdater {
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly output: vscode.OutputChannel,
  ) {}

  get currentVersion(): string {
    return String(this.context.extension.packageJSON.version || "0.0.0");
  }

  get githubRepository(): string {
    return vscode.workspace.getConfiguration("hmpHogwartsApi").get(
      "githubRepository",
      "hogwarts-mp/foundations",
    ).trim();
  }

  get githubApiBaseUrl(): string {
    return vscode.workspace.getConfiguration("hmpHogwartsApi").get(
      "githubApiBaseUrl",
      "https://api.github.com",
    ).replace(/\/+$/, "");
  }

  private latestReleaseApiUrl(): string {
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(this.githubRepository)) {
      throw new Error(`Invalid GitHub repository '${this.githubRepository}'. Expected OWNER/REPOSITORY.`);
    }
    return `${this.githubApiBaseUrl}/repos/${this.githubRepository}/releases/latest`;
  }

  private async fetchLatestRelease(): Promise<GitHubRelease> {
    const data = await requestBuffer(this.latestReleaseApiUrl());
    let raw: unknown;

    try {
      raw = JSON.parse(data.toString("utf8").replace(/^\uFEFF/, ""));
    } catch {
      throw new Error("GitHub did not return valid JSON for the latest release.");
    }

    const release = parseGitHubRelease(raw);
    if (release.draft || release.prerelease) {
      throw new Error(`GitHub latest release '${release.tag_name}' is not a stable published release.`);
    }
    return release;
  }

  async fetchManifest(): Promise<ExtensionUpdateManifest> {
    const release = await this.fetchLatestRelease();
    const latest = release.tag_name.replace(/^v/i, "");
    const assets = release.assets || [];
    const expectedNames = [
      `HMP-Hogwarts-API-v${latest}.vsix`,
      `hmp-hogwarts-api-${latest}.vsix`,
      "HMP-Hogwarts-API.vsix",
      "hmp-hogwarts-api.vsix",
    ];

    let vsix: GitHubReleaseAsset | undefined;

    for (const expected of expectedNames) {
      vsix = assets.find((asset) => asset.name.toLowerCase() === expected.toLowerCase());
      if (vsix) break;
    }

    if (!vsix) {
      const candidates = assets.filter((asset) => asset.name.toLowerCase().endsWith(".vsix"));
      if (candidates.length === 1) vsix = candidates[0];
    }

    if (!vsix?.browser_download_url) {
      throw new Error(`GitHub release ${release.tag_name} does not contain the HMP Hogwarts API VSIX asset.`);
    }

    let sha256 = extractSha256(vsix);

    if (!sha256) {
      const checksumAsset = assets.find((asset) => {
        const name = asset.name.toLowerCase();
        return name === `${vsix!.name.toLowerCase()}.sha256`
          || name === "sha256sums.txt"
          || name === "checksums.txt";
      });

      if (checksumAsset?.browser_download_url) {
        try {
          const checksumText = (await requestBuffer(checksumAsset.browser_download_url)).toString("utf8");
          const name = vsix.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const named = checksumText.match(new RegExp(`([0-9a-fA-F]{64})\\s+[* ]?${name}(?:\\s|$)`));
          const first = checksumText.match(/\b([0-9a-fA-F]{64})\b/);
          sha256 = (named?.[1] || first?.[1])?.toLowerCase();
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          this.output.appendLine(`[extension-update:checksum-warning] ${message}`);
        }
      }
    }

    return {
      name: "hmp-hogwarts-api",
      latest,
      url: vsix.browser_download_url,
      changelog: release.body?.trim() || undefined,
      sha256,
      releaseUrl: release.html_url,
      publishedAt: release.published_at || undefined,
      releaseName: release.name || undefined,
    };
  }

  async check(): Promise<ExtensionUpdateCheck> {
    const manifest = await this.fetchManifest();
    return {
      current: this.currentVersion,
      remote: manifest.latest,
      available: compareVersions(manifest.latest, this.currentVersion) > 0,
      manifest,
    };
  }

  async downloadAndInstall(manifest: ExtensionUpdateManifest): Promise<void> {
    const sourceUrl = manifest.url;
    if (!sourceUrl) throw new Error("The GitHub release does not contain a VSIX download URL.");
    const buffer = await requestBuffer(sourceUrl);
    if (manifest.sha256) {
      const actual = crypto.createHash("sha256").update(buffer).digest("hex").toLowerCase();
      if (actual !== manifest.sha256.toLowerCase()) {
        throw new Error(`SHA-256 mismatch. Expected ${manifest.sha256}, received ${actual}.`);
      }
    }

    const updatesDir = path.join(this.context.globalStorageUri.fsPath, "extension-updates");
    await fsp.mkdir(updatesDir, { recursive: true });
    const target = path.join(updatesDir, `hmp-hogwarts-api-${manifest.latest}.vsix`);
    await fsp.writeFile(target, buffer);
    this.output.appendLine(`[extension-update] VSIX saved: ${target}`);

    try {
      await vscode.commands.executeCommand("workbench.extensions.installExtension", vscode.Uri.file(target));
      const reload = await vscode.window.showInformationMessage(
        `HMP Hogwarts API ${manifest.latest} installed. Reload the window to complete the update.`,
        "Reload Window",
      );
      if (reload === "Reload Window") await vscode.commands.executeCommand("workbench.action.reloadWindow");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.output.appendLine(`[extension-update:install-error] ${message}`);
      const action = await vscode.window.showWarningMessage(
        `Update downloaded, but automatic installation failed. VSIX: ${target}`,
        "Open Folder",
      );
      if (action === "Open Folder") {
        await vscode.commands.executeCommand("revealFileInOS", vscode.Uri.file(target));
      }
    }
  }

  async showChangelog(manifest?: ExtensionUpdateManifest): Promise<void> {
    if (manifest?.changelog?.trim()) {
      showMarkdownPanel(
        manifest.releaseName || `HMP Hogwarts API ${manifest.latest} Changelog`,
        manifest.changelog,
      );
      return;
    }

    if (!manifest) {
      try {
        const latest = await this.fetchManifest();
        if (compareVersions(latest.latest, this.currentVersion) === 0 && latest.changelog?.trim()) {
          showMarkdownPanel(
            latest.releaseName || `HMP Hogwarts API ${latest.latest} Changelog`,
            latest.changelog,
          );
          return;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.output.appendLine(`[extension-changelog:github-warning] ${message}`);
      }
    }

    const localPath = path.join(this.context.extensionPath, "CHANGELOG.md");
    try {
      const markdown = await fsp.readFile(localPath, "utf8");
      showMarkdownPanel(`HMP Hogwarts API ${this.currentVersion} Changelog`, markdown);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.output.appendLine(`[extension-changelog:local-error] ${message}`);
      throw new Error(`Unable to open the extension changelog: ${message}`);
    }
  }

  async promptForUpdate(check: ExtensionUpdateCheck, interactive = true): Promise<boolean> {
    if (!check.available) {
      if (interactive) vscode.window.showInformationMessage(`HMP Hogwarts API ${check.current}: no updates available.`);
      return false;
    }
    const message = `New HMP Hogwarts API version available: ${check.current} → ${check.remote}.`;
    const actions = check.manifest.changelog ? ["Install Update", "Changelog", "Later"] : ["Install Update", "Later"];
    const choice = await vscode.window.showInformationMessage(message, ...actions);
    if (choice === "Changelog") {
      await this.showChangelog(check.manifest);
      return true;
    }
    if (choice !== "Install Update") return true;
    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: `Download HMP Hogwarts API ${check.remote}`, cancellable: false },
      async () => this.downloadAndInstall(check.manifest),
    );
    return true;
  }

  async maybeAutoCheck(): Promise<void> {
    const config = vscode.workspace.getConfiguration("hmpHogwartsApi");
    if (!config.get("extensionAutoUpdate", true)) return;
    const intervalHours = Math.max(1, config.get("extensionCheckIntervalHours", 12));
    const now = Date.now();
    const last = this.context.globalState.get<number>("lastExtensionUpdateCheck", 0);
    if (now - last < intervalHours * 60 * 60 * 1000) return;
    await this.context.globalState.update("lastExtensionUpdateCheck", now);
    try {
      const check = await this.check();
      this.output.appendLine(`[extension-update] installed=${check.current} remote=${check.remote} available=${check.available}`);
      if (check.available) await this.promptForUpdate(check, false);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.output.appendLine(`[extension-update:auto-error] ${message}`);
    }
  }
}
