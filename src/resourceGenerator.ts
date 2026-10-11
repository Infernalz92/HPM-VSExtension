import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as vscode from "vscode";

export type ResourceLanguage = "typescript" | "javascript";
export type ResourcePreset = "client" | "server" | "full" | "full-ui";

interface ResourceOptions {
  name: string;
  root: string;
  language: ResourceLanguage;
  preset: ResourcePreset;
  dependencies: string[];
  includeJsonConfig: boolean;
}

function hasClient(preset: ResourcePreset): boolean { return preset === "client" || preset === "full" || preset === "full-ui"; }
function hasServer(preset: ResourcePreset): boolean { return preset === "server" || preset === "full" || preset === "full-ui"; }
function hasUi(preset: ResourcePreset): boolean { return preset === "full-ui"; }

function normalizeResourceName(value: string): string {
  let name = value.trim().toLowerCase().replace(/\s+/g, "-").replace(/_/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
  if (name && !name.startsWith("hmp-")) name = `hmp-${name}`;
  return name;
}

function validateResourceName(value: string): string | undefined {
  const name = normalizeResourceName(value);
  if (!name || name === "hmp-") return "Enter a resource name.";
  if (!/^hmp-[a-z0-9][a-z0-9-]*$/.test(name)) return "Use lowercase letters, numbers, and hyphens only.";
  if (/(?:-|_)v?\d+(?:\.\d+)*$/i.test(name)) return "Do not append version numbers to the resource name.";
  return undefined;
}

async function exists(p: string): Promise<boolean> { return fs.access(p).then(() => true).catch(() => false); }
async function write(file: string, content: string): Promise<void> { await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, content, "utf8"); }

function packageJson(options: ResourceOptions): string {
  const ts = options.language === "typescript";
  const mafiahub: Record<string, unknown> = {};
  if (hasServer(options.preset)) mafiahub.serverScripts = [ts ? "dist/server/index.js" : "server/index.js"];
  if (hasClient(options.preset)) mafiahub.clientScripts = [ts ? "dist/client/index.js" : "client/index.js"];
  const files: string[] = [];
  if (hasUi(options.preset)) files.push(ts ? "dist/ui/**" : "ui/**");
  if (options.includeJsonConfig) files.push(ts ? "dist/config/**" : "config/**");
  if (files.length) mafiahub.files = files;
  mafiahub.resourceDependencies = options.dependencies;

  const pkg: Record<string, unknown> = {
    name: options.name,
    version: "1.0.0",
    private: true,
    description: `HMP Hogwarts MP resource: ${options.name}`,
    author: "nepixarts",
    type: "module",
    mafiahub
  };
  if (ts) {
    pkg.scripts = { build: "node scripts/build.mjs", "build:watch": "node scripts/build.mjs --watch", check: "tsc -p tsconfig.json --noEmit" };
    pkg.devDependencies = { "@types/node": "22.20.1", tsx: "4.20.6" };
  }
  return `${JSON.stringify(pkg, null, 2)}\n`;
}

function tsconfig(): string {
  return `${JSON.stringify({
    compilerOptions: {
      target: "ES2022",
      module: "CommonJS",
      moduleResolution: "Node",
      lib: ["ES2022"],
      types: ["node"],
      strict: true,
      ignoreDeprecations: "6.0",
      useUnknownInCatchVariables: true,
      forceConsistentCasingInFileNames: true,
      skipLibCheck: true,
      noEmit: true,
      moduleDetection: "force"
    },
    include: [
      "client/**/*.ts",
      "server/**/*.ts",
      "types/**/*.ts",
      "../../types/**/*.d.ts"
    ]
  }, null, 4)}\n`;
}

function buildScript(options: ResourceOptions): string {
  const entries: string[] = [];
  if (hasClient(options.preset)) entries.push(`{ in: "client/index.ts", out: "client/index" }`);
  if (hasServer(options.preset)) entries.push(`{ in: "server/index.ts", out: "server/index" }`);
  const uiCopy = hasUi(options.preset) ? `\nawait cp(path.join(root, "ui"), path.join(dist, "ui"), { recursive: true });` : "";
  const configCopy = options.includeJsonConfig ? `\nawait cp(path.join(root, "config"), path.join(dist, "config"), { recursive: true });` : "";
  return `import { cp, mkdir, rm } from "node:fs/promises";\nimport path from "node:path";\nimport { fileURLToPath } from "node:url";\nimport * as esbuild from "esbuild";\n\nconst root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");\nconst dist = path.join(root, "dist");\nconst watch = process.argv.includes("--watch");\nconst entryPoints = [${entries.join(", ")}];\n\nawait rm(dist, { recursive: true, force: true });\nawait mkdir(dist, { recursive: true });\n\nconst options = {\n  absWorkingDir: root,\n  entryPoints,\n  bundle: true,\n  platform: "neutral",\n  format: "esm",\n  target: "es2022",\n  outdir: dist,\n  external: ["node:*"],\n  sourcemap: true,\n  logLevel: "info",\n};\n\nif (watch) {\n  const context = await esbuild.context(options);\n  await context.watch();\n  console.log("[HMP] Build watch active");\n} else {\n  await esbuild.build(options);\n}\n${uiCopy}${configCopy}\n`;
}

function clientSource(options: ResourceOptions): string {
  const ext = options.language === "typescript" ? "ts" : "js";
  void ext;
  if (hasUi(options.preset)) return `const RESOURCE_NAME = "${options.name}";\nconst viewUrl = \`fw://resources/\${RESOURCE_NAME}/ui/index.html\`;\nlet viewId = -1;\n\nfunction ensureView() {\n  if (viewId >= 0) return viewId;\n  viewId = Web.createView(viewUrl, { width: screen.width, height: screen.height, x: 0, y: 0, zIndex: 1000, visible: false, focus: false });\n  return viewId;\n}\n\nKey.bind("f6", "down", () => {\n  const id = ensureView();\n  Web.showView(id);\n});\n\nconsole.log("[${options.name}] client avviato");\n`;
  return `console.log("[${options.name}] client avviato");\n\n// Esempio:\n// Key.bind("c", "down", () => {\n//   console.log("[${options.name}] C premuto");\n// });\n`;
}

function serverSource(options: ResourceOptions): string {
  if (options.includeJsonConfig) {
    if (options.language === "typescript") {
      return `import configModule = require("./config");\n\nconst { loadConfig } = configModule;\nconst Hmp = Imports.get("hmp-lib");\nconst logger = Hmp.logger.create("${options.name}");\nconst config = loadConfig(Hmp, { logger });\n\nconsole.log("[${options.name}] server started", config);\n\n// Add the resource server logic here.\n`;
    }
    return `import { loadConfig } from "./config.js";\n\nconst Hmp = Imports.get("hmp-lib");\nconst logger = Hmp.logger.create("${options.name}");\nconst config = loadConfig(Hmp, { logger });\n\nconsole.log("[${options.name}] server started", config);\n\n// Add the resource server logic here.\n`;
  }
  return `console.log("[${options.name}] server started");\n\n// Add the resource server logic here.\n`;
}

function configJson(): string {
  return `${JSON.stringify({ enabled: true, debugLogs: false }, null, 2)}\n`;
}

function envPrefix(resourceName: string): string {
  return resourceName.replace(/^hmp-/, "HMP_").replace(/-/g, "_").toUpperCase();
}

function serverConfigSource(options: ResourceOptions): string {
  const prefix = envPrefix(options.name);
  if (options.language === "javascript") {
    return `import fs from "node:fs";\nimport path from "node:path";\n\nfunction uniquePaths(values) {\n  return [...new Set(values.map(value => path.normalize(value)))];\n}\n\nconst RESOURCE_NAME = "${options.name}";\n\nfunction resolveConfigPath(requested, options = {}) {\n  const candidates = [];\n  const push = value => { if (value) candidates.push(value); };\n\n  if (path.isAbsolute(requested)) {\n    push(requested);\n  } else {\n    if (options.cwd) push(path.resolve(options.cwd, requested));\n    const moduleDir = typeof __dirname === "string"\n      ? __dirname\n      : path.resolve(process.cwd(), "resources", RESOURCE_NAME, "dist", "server");\n    push(path.resolve(moduleDir, requested));\n    push(path.resolve(moduleDir, "..", requested));\n    push(path.resolve(process.cwd(), requested));\n    push(path.resolve(process.cwd(), "resources", RESOURCE_NAME, requested));\n  }\n\n  const normalized = uniquePaths(candidates);\n  return {\n    path: normalized.find(candidate => {\n      try { return fs.statSync(candidate).isFile(); } catch (_) { return false; }\n    }) || null,\n    candidates: normalized,\n  };\n}\n\nfunction readJsonConfig(filePath) {\n  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");\n  const parsed = JSON.parse(raw);\n  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {\n    throw new Error(\`Invalid configuration: \${filePath} must contain a JSON object.\`);\n  }\n  return parsed;\n}\n\nfunction loadConfig(Hmp, options = {}) {\n  const env = options.env || process.env;\n  const requested = String(env.${prefix}_CONFIG || "config/${options.name}.json").trim();\n  const defaults = { enabled: true, debugLogs: false };\n  const resolved = resolveConfigPath(requested, options);\n  let loaded = {};\n\n  if (resolved.path) {\n    loaded = readJsonConfig(resolved.path);\n    options.logger?.info(\`[config] loaded \${resolved.path}\`);\n  } else {\n    options.logger?.warn(\`[config] file not found: \${requested}; tried paths: \${resolved.candidates.join(" | ")}\`);\n  }\n\n  const config = { ...defaults, ...loaded };\n  if (env.${prefix}_ENABLED) config.enabled = Hmp.config.env.boolean(env.${prefix}_ENABLED);\n  if (env.${prefix}_DEBUG_LOGS) config.debugLogs = Hmp.config.env.boolean(env.${prefix}_DEBUG_LOGS);\n  config.enabled = config.enabled !== false;\n  config.debugLogs = config.debugLogs === true;\n  return config;\n}\n\nexport { loadConfig, resolveConfigPath, readJsonConfig };\n`;
  }

  const configType = `${toPascal(options.name.replace(/^hmp-/, ""))}Config`;
  return `import fs = require("node:fs");\nimport path = require("node:path");\nimport type { HmpLibServer, HmpLogger } from "../../hmp-lib/types";\nimport type { ${configType} } from "../types";\n\ntype LoadConfigOptions = {\n  env?: NodeJS.ProcessEnv;\n  cwd?: string;\n  logger?: Pick<HmpLogger, "info" | "warn">;\n};\n\nfunction uniquePaths(values: string[]): string[] {\n  return [...new Set(values.map(value => path.normalize(value)))];\n}\n\nconst RESOURCE_NAME = "${options.name}";\n\nfunction resolveConfigPath(\n  requested: string,\n  options: LoadConfigOptions = {},\n): { path: string | null; candidates: string[] } {\n  const candidates: string[] = [];\n  const push = (value: string): void => { if (value) candidates.push(value); };\n\n  if (path.isAbsolute(requested)) {\n    push(requested);\n  } else {\n    if (options.cwd) push(path.resolve(options.cwd, requested));\n\n    // Build: dist/server/index.js + dist/config/${options.name}.json\n    const moduleDir = typeof __dirname === "string"\n      ? __dirname\n      : path.resolve(process.cwd(), "resources", RESOURCE_NAME, "dist", "server");\n    push(path.resolve(moduleDir, requested));\n    push(path.resolve(moduleDir, "..", requested));\n\n    // Started from the server/workspace root.\n    push(path.resolve(process.cwd(), requested));\n    push(path.resolve(process.cwd(), "resources", RESOURCE_NAME, requested));\n  }\n\n  const normalized = uniquePaths(candidates);\n  return {\n    path: normalized.find(candidate => {\n      try { return fs.statSync(candidate).isFile(); }\n      catch (_) { return false; }\n    }) || null,\n    candidates: normalized,\n  };\n}\n\nfunction readJsonConfig(filePath: string): Record<string, unknown> {\n  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");\n  const parsed = JSON.parse(raw) as unknown;\n  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {\n    throw new Error(\`Invalid configuration: \${filePath} must contain a JSON object.\`);\n  }\n  return parsed as Record<string, unknown>;\n}\n\nfunction loadConfig(\n  Hmp: HmpLibServer<any>,\n  options: LoadConfigOptions = {},\n): ${configType} {\n  const env = options.env || process.env;\n  const requested = String(env.${prefix}_CONFIG || "config/${options.name}.json").trim();\n  const defaults: ${configType} = { enabled: true, debugLogs: false };\n  const resolved = resolveConfigPath(requested, options);\n  let loaded: Record<string, unknown> = {};\n\n  if (resolved.path) {\n    loaded = readJsonConfig(resolved.path);\n    options.logger?.info(\`[config] loaded \${resolved.path}\`);\n  } else {\n    options.logger?.warn(\n      \`[config] file not found: \${requested}; tried paths: \${resolved.candidates.join(" | ")}\`,\n    );\n  }\n\n  const config = { ...defaults, ...loaded } as ${configType};\n  if (env.${prefix}_ENABLED) config.enabled = Hmp.config.env.boolean(env.${prefix}_ENABLED);\n  if (env.${prefix}_DEBUG_LOGS) config.debugLogs = Hmp.config.env.boolean(env.${prefix}_DEBUG_LOGS);\n  config.enabled = config.enabled !== false;\n  config.debugLogs = config.debugLogs === true;\n  return config;\n}\n\nexport = { loadConfig, resolveConfigPath, readJsonConfig };\n`;
}

function sharedTypes(options: ResourceOptions): string {
  return `export interface ${toPascal(options.name.replace(/^hmp-/, ""))}Config {\n  enabled: boolean;\n  debugLogs: boolean;\n}\n`;
}

function toPascal(value: string): string { return value.split(/[-_\s]+/).filter(Boolean).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join("") || "Resource"; }

function uiHtml(options: ResourceOptions): string {
  return `<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="utf-8" />\n  <meta name="viewport" content="width=device-width,initial-scale=1" />\n  <title>${options.name}</title>\n  <link rel="stylesheet" href="./styles.css" />\n</head>\n<body>\n  <main class="hmp-panel">\n    <div class="hmp-kicker">NEPIXARTS</div>\n    <h1>${options.name}</h1>\n    <p>HMP interface ready for Hogwarts MP.</p>\n  </main>\n  <script type="module" src="./app.js"></script>\n</body>\n</html>\n`;
}

function uiCss(): string {
  return `:root { font-family: Inter, system-ui, sans-serif; color: #d7b86a; }\n* { box-sizing: border-box; }\nhtml, body { width: 100%; height: 100%; margin: 0; background: transparent; overflow: hidden; }\nbody { display: grid; place-items: center; }\n.hmp-panel { min-width: 420px; padding: 28px 32px; border: 1px solid rgba(215,184,106,.45); border-radius: 18px; background: rgba(7,18,40,.94); box-shadow: 0 18px 60px rgba(0,0,0,.35); }\n.hmp-kicker { font-size: 11px; letter-spacing: .24em; opacity: .72; }\nh1 { margin: 8px 0; font-size: 24px; }\np { margin: 0; color: rgba(255,255,255,.78); }\n`;
}

function uiJs(options: ResourceOptions): string { return `console.log("[${options.name}:ui] ready");\n`; }

function readme(options: ResourceOptions): string {
  const parts = [hasClient(options.preset) ? "client" : "", hasServer(options.preset) ? "server" : "", hasUi(options.preset) ? "ui" : ""].filter(Boolean).join(" + ");
  return `# ${options.name}\n\nHogwarts MP resource generated with **HMP Hogwarts API**.\n\n- Language: ${options.language}\n- Components: ${parts}\n- Dependencies: ${options.dependencies.length ? options.dependencies.join(", ") : "none"}\n- Config JSON: ${options.includeJsonConfig ? `config/${options.name}.json` : "no"}\n\n${options.language === "typescript" ? "## Build\n\n```bash\nnpm install\nnpm run build\n```\n\nThe runtime uses the files generated in `dist/`.\n" : "JavaScript files are loaded directly by the resource.\n"}\n`;
}

async function chooseDestination(contextUri?: vscode.Uri): Promise<string | undefined> {
  if (contextUri?.scheme === "file") {
    try {
      const stat = await fs.stat(contextUri.fsPath);
      if (stat.isDirectory()) return contextUri.fsPath;
    } catch (_) {
      // Fallback to the normal destination picker below.
    }
  }
  const folders = vscode.workspace.workspaceFolders ?? [];
  if (folders.length === 1) return folders[0]!.uri.fsPath;
  if (folders.length > 1) {
    const picked = await vscode.window.showQuickPick(folders.map(f => ({ label: f.name, description: f.uri.fsPath, value: f.uri.fsPath })), { title: "HMP: Where should the resource be created?", placeHolder: "Select the destination workspace" });
    if (picked) return picked.value;
  }
  const uri = await vscode.window.showOpenDialog({ canSelectFiles: false, canSelectFolders: true, canSelectMany: false, title: "Select the folder that will contain the new resource", openLabel: "Use This Folder" });
  return uri?.[0]?.fsPath;
}

async function collectOptions(contextUri?: vscode.Uri): Promise<ResourceOptions | undefined> {
  const root = await chooseDestination(contextUri);
  if (!root) return undefined;
  const inputName = await vscode.window.showInputBox({ title: "HMP: New Resource Name", prompt: "The hmp- prefix is added automatically", placeHolder: "deathscreen", validateInput: validateResourceName });
  if (!inputName) return undefined;
  const name = normalizeResourceName(inputName);
  const target = path.join(root, name);
  if (await exists(target)) { vscode.window.showErrorMessage(`Already exists: ${target}`); return undefined; }

  const preset = await vscode.window.showQuickPick([
    { label: "$(browser) Client + Server + Web UI", description: "Recommended full preset for panels/HUDs", value: "full-ui" as ResourcePreset },
    { label: "$(files) Client + Server", description: "Multiplayer logic without a Web UI", value: "full" as ResourcePreset },
    { label: "$(device-desktop) Client Only", description: "Script executed on the client", value: "client" as ResourcePreset },
    { label: "$(server) Server Only", description: "Script executed on the server", value: "server" as ResourcePreset }
  ], { title: `HMP: Structure of ${name}`, placeHolder: "Choose the resource components" });
  if (!preset) return undefined;

  const language = await vscode.window.showQuickPick([
    { label: "TypeScript", description: "Recommended • API typings + dist build", value: "typescript" as ResourceLanguage },
    { label: "JavaScript", description: "Direct execution without compilation", value: "javascript" as ResourceLanguage }
  ], { title: "HMP: Language", placeHolder: "Choose the language" });
  if (!language) return undefined;

  const depsRaw = await vscode.window.showInputBox({ title: "HMP: Resource Dependencies", prompt: "Optional. Separate multiple resources with commas.", placeHolder: "hmp-lib, hmp-api" });
  if (depsRaw === undefined) return undefined;
  const dependencies = [...new Set(depsRaw.split(",").map(v => v.trim()).filter(Boolean))];

  let includeJsonConfig = false;
  if (hasServer(preset.value)) {
    const configChoice = await vscode.window.showQuickPick([
      { label: "$(json) Yes, add JSON configuration", description: `Generates config/${name}.json + server/config.${language.value === "typescript" ? "ts" : "js"}`, value: true },
      { label: "No", description: "Create the resource without a JSON loader", value: false },
    ], { title: "HMP: JSON Configuration", placeHolder: "Do you want a server-side configurable JSON file?" });
    if (!configChoice) return undefined;
    includeJsonConfig = configChoice.value;
    if (includeJsonConfig && !dependencies.includes("hmp-lib")) dependencies.unshift("hmp-lib");
  }

  return { name, root: target, language: language.value, preset: preset.value, dependencies, includeJsonConfig };
}

export async function createResource(contextUri?: vscode.Uri): Promise<string | undefined> {
  const options = await collectOptions(contextUri);
  if (!options) return undefined;
  const ext = options.language === "typescript" ? "ts" : "js";
  await fs.mkdir(options.root, { recursive: true });
  await write(path.join(options.root, "package.json"), packageJson(options));
  await write(path.join(options.root, ".gitignore"), "node_modules/\ndist/\n*.log\n");
  await write(path.join(options.root, "README.md"), readme(options));

  if (hasClient(options.preset)) await write(path.join(options.root, "client", `index.${ext}`), clientSource(options));
  if (hasServer(options.preset)) {
    await write(path.join(options.root, "server", `index.${ext}`), serverSource(options));
    if (options.includeJsonConfig) {
      await write(path.join(options.root, "server", `config.${ext}`), serverConfigSource(options));
      await write(path.join(options.root, "config", `${options.name}.json`), configJson());
    }
  }
  await write(path.join(options.root, "types", `index.${ext === "ts" ? "ts" : "d.ts"}`), sharedTypes(options));

  if (hasUi(options.preset)) {
    await write(path.join(options.root, "ui", "index.html"), uiHtml(options));
    await write(path.join(options.root, "ui", "styles.css"), uiCss());
    await write(path.join(options.root, "ui", "app.js"), uiJs(options));
  }
  if (options.language === "typescript") {
    await write(path.join(options.root, "tsconfig.json"), tsconfig());
    await write(path.join(options.root, "scripts", "build.mjs"), buildScript(options));
  }

  const packageDocument = await vscode.workspace.openTextDocument(vscode.Uri.file(path.join(options.root, "package.json")));
  await vscode.window.showTextDocument(packageDocument, { preview: false });
  vscode.window.showInformationMessage(`Resource ${options.name} created successfully.`, "Open Folder").then(action => {
    if (action === "Open Folder") void vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(options.root), { forceNewWindow: false });
  });
  return options.root;
}
