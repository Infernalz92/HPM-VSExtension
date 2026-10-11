import * as fs from "node:fs";
import * as path from "node:path";
import * as ts from "typescript";
import type { ApiContext, ApiSnapshotEntry, ApiSymbolNode } from "./types";

function docs(checker: ts.TypeChecker, symbol: ts.Symbol): string {
  return ts.displayPartsToString(symbol.getDocumentationComment(checker));
}

function compact(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function kindOf(symbol: ts.Symbol): string {
  const flags = symbol.getFlags();
  if (flags & ts.SymbolFlags.Class) return "class";
  if (flags & ts.SymbolFlags.Interface) return "interface";
  if (flags & ts.SymbolFlags.Function) return "function";
  if (flags & ts.SymbolFlags.NamespaceModule) return "namespace";
  if (flags & ts.SymbolFlags.Enum) return "enum";
  if (flags & ts.SymbolFlags.TypeAlias) return "type";
  if (flags & ts.SymbolFlags.Method) return "method";
  if (flags & ts.SymbolFlags.Property) return "property";
  if (flags & ts.SymbolFlags.Variable) return "variable";
  return "symbol";
}

function signatureFor(checker: ts.TypeChecker, symbol: ts.Symbol, location: ts.Node): string {
  const flags = symbol.getFlags();
  if (flags & (ts.SymbolFlags.Function | ts.SymbolFlags.Method)) {
    const type = checker.getTypeOfSymbolAtLocation(symbol, location);
    const calls = type.getCallSignatures();
    if (calls.length) return calls.map((sig) => checker.signatureToString(sig, location, ts.TypeFormatFlags.NoTruncation)).join(" | ");
  }
  const declaration = symbol.valueDeclaration ?? symbol.declarations?.[0];
  if (declaration) {
    const text = declaration.getText();
    if (text.length < 500) return compact(text.replace(/\{[\s\S]*$/, ""));
  }
  try {
    return checker.typeToString(checker.getTypeOfSymbolAtLocation(symbol, location), location, ts.TypeFormatFlags.NoTruncation);
  } catch {
    return symbol.getName();
  }
}

function locationOf(symbol: ts.Symbol, fallbackFile: string) {
  const declaration = symbol.valueDeclaration ?? symbol.declarations?.[0];
  if (!declaration) return { filePath: fallbackFile, line: 0, character: 0 };
  const sf = declaration.getSourceFile();
  const pos = sf.getLineAndCharacterOfPosition(declaration.getStart(sf));
  return { filePath: sf.fileName, line: pos.line, character: pos.character };
}

function membersOf(checker: ts.TypeChecker, symbol: ts.Symbol, location: ts.Node): ts.Symbol[] {
  try {
    if (symbol.getFlags() & ts.SymbolFlags.NamespaceModule) return checker.getExportsOfModule(symbol);
    const type = checker.getTypeOfSymbolAtLocation(symbol, location);
    return checker.getPropertiesOfType(type);
  } catch {
    return [];
  }
}

function buildNode(checker: ts.TypeChecker, symbol: ts.Symbol, location: ts.Node, parentPath: string, fallbackFile: string, depth = 0, seen = new Set<string>()): ApiSymbolNode {
  const name = symbol.getName();
  const fullPath = parentPath ? `${parentPath}.${name}` : name;
  const loc = locationOf(symbol, fallbackFile);
  const node: ApiSymbolNode = {
    name,
    path: fullPath,
    kind: kindOf(symbol),
    signature: signatureFor(checker, symbol, location),
    documentation: docs(checker, symbol),
    filePath: loc.filePath,
    line: loc.line,
    character: loc.character,
    children: new Map()
  };
  if (depth >= 4 || seen.has(fullPath)) return node;
  const nextSeen = new Set(seen);
  nextSeen.add(fullPath);
  for (const member of membersOf(checker, symbol, location)) {
    const memberName = member.getName();
    if (memberName === "prototype" || memberName.startsWith("__")) continue;
    const memberLocation = member.valueDeclaration ?? member.declarations?.[0] ?? location;
    node.children.set(memberName, buildNode(checker, member, memberLocation, fullPath, fallbackFile, depth + 1, nextSeen));
  }
  return node;
}

function collectTopLevel(sourceFile: ts.SourceFile, checker: ts.TypeChecker, fallbackFile: string): Map<string, ApiSymbolNode> {
  const result = new Map<string, ApiSymbolNode>();
  const processStatements = (statements: ts.NodeArray<ts.Statement>) => {
    for (const statement of statements) {
      const add = (nameNode: ts.Identifier | ts.StringLiteral | undefined) => {
        if (!nameNode) return;
        const symbol = checker.getSymbolAtLocation(nameNode);
        if (!symbol) return;
        const name = symbol.getName();
        result.set(name, buildNode(checker, symbol, nameNode, "", fallbackFile));
      };
      if (ts.isVariableStatement(statement)) {
        for (const declaration of statement.declarationList.declarations) if (ts.isIdentifier(declaration.name)) add(declaration.name);
      } else if (ts.isModuleDeclaration(statement)) {
        const moduleName = statement.name.getText(sourceFile).replace(/["']/g, "");
        if ((moduleName === "global" || moduleName === "__global") && statement.body && ts.isModuleBlock(statement.body)) {
          processStatements(statement.body.statements);
        } else if (statement.name) {
          add(statement.name as ts.Identifier | ts.StringLiteral);
        }
      } else if ((ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement) || ts.isInterfaceDeclaration(statement) || ts.isEnumDeclaration(statement) || ts.isTypeAliasDeclaration(statement)) && statement.name) {
        add(statement.name as ts.Identifier);
      }
    }
  };
  processStatements(sourceFile.statements);
  return result;
}

export class ApiIndex {
  readonly roots = new Map<ApiContext, Map<string, ApiSymbolNode>>();
  readonly snapshots: ApiSnapshotEntry[] = [];

  constructor(public readonly rootPath: string) {
    this.load();
  }

  private loadContext(context: ApiContext, apiFile: string, sharedFile?: string) {
    const files = sharedFile ? [sharedFile, apiFile] : [apiFile];
    const options: ts.CompilerOptions = { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, noLib: true, skipLibCheck: true };
    const host = ts.createCompilerHost(options);
    const program = ts.createProgram(files, options, host);
    const checker = program.getTypeChecker();
    const merged = new Map<string, ApiSymbolNode>();
    for (const fileName of files) {
      const source = program.getSourceFile(fileName);
      if (!source) continue;
      for (const [name, node] of collectTopLevel(source, checker, fileName)) merged.set(name, node);
    }
    this.roots.set(context, merged);
    const flatten = (node: ApiSymbolNode) => {
      this.snapshots.push({ key: `${context}:${node.kind}:${node.path}`, context, kind: node.kind, path: node.path, signature: node.signature, documentation: node.documentation });
      for (const child of node.children.values()) flatten(child);
    };
    for (const node of merged.values()) flatten(node);
  }

  private load() {
    const shared = path.join(this.rootPath, "targets", "shared.d.ts");
    const client = path.join(this.rootPath, "targets", "client", "api.d.ts");
    const server = path.join(this.rootPath, "targets", "server", "api.d.ts");
    if (fs.existsSync(shared)) this.loadContext("shared", shared);
    if (fs.existsSync(client)) this.loadContext("client", client, shared);
    if (fs.existsSync(server)) this.loadContext("server", server, shared);
  }

  resolve(context: ApiContext, chain: string[]): ApiSymbolNode | undefined {
    const roots = this.roots.get(context) ?? this.roots.get("shared");
    if (!roots || !chain.length) return undefined;
    let node = roots.get(chain[0]!);
    for (let i = 1; node && i < chain.length; i++) node = node.children.get(chain[i]!);
    return node;
  }

  topLevel(context: ApiContext): ApiSymbolNode[] {
    const contextRoots = [...(this.roots.get(context)?.values() ?? [])];
    const sharedRoots = context === "shared" ? [] : [...(this.roots.get("shared")?.values() ?? [])];
    const map = new Map<string, ApiSymbolNode>();
    for (const item of [...sharedRoots, ...contextRoots]) map.set(item.name, item);
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }
}
