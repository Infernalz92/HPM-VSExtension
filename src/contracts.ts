import * as crypto from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as vscode from "vscode";
import type { ContractManifest } from "./types";

const ALLOWED_PATH = /^(?:reference\.config\.json|targets\/shared\.d\.ts|targets\/[a-z0-9][a-z0-9-]{0,63}\/(?:api\.d\.ts|metadata\.json|tsconfig\.json))$/;
const MAX_FILES = 64;
const MAX_SIZE = 16 * 1024 * 1024;

async function exists(filePath: string): Promise<boolean> {
  return fs.access(filePath).then(() => true).catch(() => false);
}

async function copyDir(source: string, destination: string): Promise<void> {
  await fs.rm(destination, { recursive: true, force: true });
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.cp(source, destination, { recursive: true });
}

async function fetchBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url, { headers: { "User-Agent": "hmp-hogwarts-api/0.1.0" } });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

async function readManifest(root: string): Promise<ContractManifest> {
  return JSON.parse(await fs.readFile(path.join(root, "manifest.json"), "utf8")) as ContractManifest;
}

function validateManifest(manifest: ContractManifest, channel: string): void {
  if (manifest.schemaVersion !== 1 || manifest.slug !== "hogwarts-mp" || manifest.channel !== channel || !/^[a-f0-9]{64}$/.test(manifest.revision ?? "") || !Array.isArray(manifest.files)) {
    throw new Error("Invalid Hogwarts MP contract manifest.");
  }
  if (!manifest.files.length || manifest.files.length > MAX_FILES) throw new Error("Invalid contract file count.");
  const total = manifest.files.reduce((sum, file) => sum + (file.size ?? 0), 0);
  if (total > MAX_SIZE) throw new Error("Contratto troppo grande.");
  const paths = new Set<string>();
  for (const file of manifest.files) {
    if (!ALLOWED_PATH.test(file.path) || !/^[a-f0-9]{64}$/.test(file.sha256) || !Number.isSafeInteger(file.size) || file.size < 0) throw new Error(`Invalid contract file: ${file.path}`);
    if (paths.has(file.path)) throw new Error(`Duplicate file in contract: ${file.path}`);
    paths.add(file.path);
  }
  if (!paths.has("reference.config.json") || !paths.has("targets/shared.d.ts")) throw new Error("Contratto incompleto.");
}

export class ContractManager {
  private readonly storageRoot: string;
  private readonly currentRoot: string;
  private readonly previousRoot: string;
  private bundledRoot = "";

  constructor(private readonly context: vscode.ExtensionContext) {
    this.storageRoot = context.globalStorageUri.fsPath;
    this.currentRoot = path.join(this.storageRoot, "contracts", "current");
    this.previousRoot = path.join(this.storageRoot, "contracts", "previous");
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.storageRoot, { recursive: true });
    const bundledContracts = path.join(this.context.extensionPath, "resources", "contracts");
    const revisions = await fs.readdir(bundledContracts, { withFileTypes: true });
    const revision = revisions.find((entry) => entry.isDirectory());
    if (!revision) throw new Error("Contratto bundled non trovato.");
    this.bundledRoot = path.join(bundledContracts, revision.name);
  }

  async getActiveRoot(): Promise<string> {
    return (await exists(path.join(this.currentRoot, "manifest.json"))) ? this.currentRoot : this.bundledRoot;
  }

  async getActiveManifest(): Promise<ContractManifest> {
    return readManifest(await this.getActiveRoot());
  }

  async getPreviousManifest(): Promise<ContractManifest | undefined> {
    if (!(await exists(path.join(this.previousRoot, "manifest.json")))) return undefined;
    return readManifest(this.previousRoot);
  }

  getApiPath(root: string, target: "client" | "server" | "shared"): string {
    return target === "shared" ? path.join(root, "targets", "shared.d.ts") : path.join(root, "targets", target, "api.d.ts");
  }

  private settings() {
    const config = vscode.workspace.getConfiguration("hmpHogwartsApi");
    return {
      apiUrl: String(config.get("apiUrl", "https://api.mafiahub.dev")).replace(/\/graphql\/?$/, "").replace(/\/$/, ""),
      channel: config.get("channel", "testing") as string
    };
  }

  async fetchRemoteManifest(): Promise<ContractManifest> {
    const { apiUrl, channel } = this.settings();
    const url = `${apiUrl}/documentation-contracts/hogwarts-mp/${encodeURIComponent(channel)}/manifest.json`;
    const body = await fetchBuffer(url);
    const manifest = JSON.parse(body.toString("utf8")) as ContractManifest;
    validateManifest(manifest, channel);
    return manifest;
  }

  async checkForUpdate(): Promise<{ current: ContractManifest; remote: ContractManifest; hasUpdate: boolean }> {
    const [current, remote] = await Promise.all([this.getActiveManifest(), this.fetchRemoteManifest()]);
    return { current, remote, hasUpdate: current.revision !== remote.revision };
  }

  async downloadAndActivate(manifest: ContractManifest): Promise<string> {
    const { apiUrl } = this.settings();
    const routeRoot = `${apiUrl}/documentation-contracts/hogwarts-mp`;
    const temporary = path.join(this.storageRoot, "contracts", `download-${Date.now()}`);
    await fs.rm(temporary, { recursive: true, force: true });
    await fs.mkdir(temporary, { recursive: true });
    try {
      for (const file of manifest.files) {
        const encoded = file.path.split("/").map(encodeURIComponent).join("/");
        const url = `${routeRoot}/releases/${manifest.revision}/files/${encoded}`;
        const body = await fetchBuffer(url);
        const hash = crypto.createHash("sha256").update(body).digest("hex");
        if (body.length !== file.size || hash !== file.sha256) throw new Error(`Integrity check fallito: ${file.path}`);
        const output = path.join(temporary, file.path);
        await fs.mkdir(path.dirname(output), { recursive: true });
        await fs.writeFile(output, body);
      }
      await fs.writeFile(path.join(temporary, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
      const active = await this.getActiveRoot();
      await copyDir(active, this.previousRoot);
      await copyDir(temporary, this.currentRoot);
      return this.currentRoot;
    } finally {
      await fs.rm(temporary, { recursive: true, force: true });
    }
  }

  async rollback(): Promise<boolean> {
    if (!(await exists(path.join(this.previousRoot, "manifest.json")))) return false;
    const temp = path.join(this.storageRoot, "contracts", "rollback-temp");
    const active = await this.getActiveRoot();
    await copyDir(active, temp);
    await copyDir(this.previousRoot, this.currentRoot);
    await copyDir(temp, this.previousRoot);
    await fs.rm(temp, { recursive: true, force: true });
    return true;
  }
}
