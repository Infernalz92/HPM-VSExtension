import * as vscode from "vscode";
import type { ApiIndex } from "./apiIndex";
import { contextForDocument } from "./providers";
import type { ApiContext } from "./types";

type SnippetContext = "client" | "server" | "shared";

interface HmpSnippet {
  prefix: string;
  title: string;
  description: string;
  contexts: SnippetContext[];
  body: string[];
  requiredApi?: string[];
}

const SNIPPETS: HmpSnippet[] = [
  {
    prefix: "hmp-keybind",
    title: "HMP Key Bind",
    description: "Client • binds a physical key with Key.bind",
    contexts: ["client"],
    requiredApi: ["Key.bind"],
    body: [
      'Key.bind("${1:c}", "${2|down,up,both|}", () => {',
      '  ${0}',
      '});'
    ]
  },
  {
    prefix: "hmp-webview",
    title: "HMP WebView",
    description: "Client • creates a local Hogwarts MP WebView",
    contexts: ["client"],
    requiredApi: ["Web.createView"],
    body: [
      'const ${1:viewId} = Web.createView("fw://resources/${2:hmp-resource}/ui/index.html", {',
      '  width: screen.width,',
      '  height: screen.height,',
      '  x: 0,',
      '  y: 0,',
      '  zIndex: 1000,',
      '  visible: false,',
      '  focus: false,',
      '});',
      '${0}'
    ]
  },
  {
    prefix: "hmp-webview-fullscreen",
    title: "HMP WebView Fullscreen",
    description: "Client • fullscreen WebView with a fw://resources URL",
    contexts: ["client"],
    requiredApi: ["Web.createView"],
    body: [
      'const ${1:resourceName} = "${2:hmp-resource}";',
      'const ${3:viewId} = Web.createView(`fw://resources/${${1:resourceName}}/${4:ui/index.html}`, {',
      '  width: screen.width,',
      '  height: screen.height,',
      '  x: 0,',
      '  y: 0,',
      '  zIndex: ${5:1000},',
      '  visible: ${6:false},',
      '  focus: ${7:false},',
      '});',
      '${0}'
    ]
  },
  {
    prefix: "hmp-fwurl",
    title: "HMP Resource Web URL",
    description: "Client • valid local fw://resources URL",
    contexts: ["client"],
    requiredApi: ["Web"],
    body: ['fw://resources/${1:hmp-resource}/${2:ui/index.html}']
  },
  {
    prefix: "hmp-localplayer",
    title: "HMP LocalPlayer",
    description: "Client • LocalPlayer reference",
    contexts: ["client"],
    requiredApi: ["LocalPlayer"],
    body: [
      'const ${1:localPlayer} = LocalPlayer;',
      '${0}'
    ]
  },
  {
    prefix: "hmp-ragdoll",
    title: "HMP LocalPlayer Ragdoll",
    description: "Client • starts an impact reaction on LocalPlayer",
    contexts: ["client"],
    requiredApi: ["LocalPlayer._ragdoll.startImpactReaction"],
    body: [
      'LocalPlayer._ragdoll.startImpactReaction(${1:4}, ${2:0}, ${3:0}, ${4:0}, ${5:0});',
      '${0}'
    ]
  },
  {
    prefix: "hmp-event",
    title: "HMP Event Listener",
    description: "Client/Server • Events.on listener available in the current context",
    contexts: ["client", "server"],
    requiredApi: ["Events.on"],
    body: [
      'Events.on("${1:eventName}", (${2:event}) => {',
      '  ${0}',
      '});'
    ]
  },
  {
    prefix: "hmp-event-client",
    title: "HMP Client Event",
    description: "Client • Events.on listener",
    contexts: ["client"],
    requiredApi: ["Events.on"],
    body: [
      'Events.on("${1:eventName}", (${2:event}) => {',
      '  ${0}',
      '});'
    ]
  },
  {
    prefix: "hmp-event-server",
    title: "HMP Server Event",
    description: "Server • Events.on listener",
    contexts: ["server"],
    requiredApi: ["Events.on"],
    body: [
      'Events.on("${1:eventName}", (${2:event}) => {',
      '  ${0}',
      '});'
    ]
  },
  {
    prefix: "hmp-message",
    title: "HMP Message Listener",
    description: "Client/Server • Messages.on listener in the current context",
    contexts: ["client", "server"],
    requiredApi: ["Messages.on"],
    body: [
      'Messages.on("${1:messageName}", (${2:payload}) => {',
      '  ${0}',
      '});'
    ]
  },
  {
    prefix: "hmp-import",
    title: "HMP Resource Import",
    description: "Client/Server • gets an export from another resource",
    contexts: ["client", "server"],
    requiredApi: ["Imports.get"],
    body: [
      'const ${1:api} = Imports.get("${2:resource-name}");',
      '${0}'
    ]
  },
  {
    prefix: "hmp-player-manager",
    title: "HMP PlayerManager Lookup",
    description: "Server • gets a player with PlayerManager.getById",
    contexts: ["server"],
    requiredApi: ["PlayerManager.getById"],
    body: [
      'const ${1:targetPlayer} = PlayerManager.getById(${2:playerId});',
      'if (${1:targetPlayer}) {',
      '  ${0}',
      '}'
    ]
  },
  {
    prefix: "hmp-player-all",
    title: "HMP PlayerManager Get All",
    description: "Server • gets all connected players",
    contexts: ["server"],
    requiredApi: ["PlayerManager.getAll"],
    body: [
      'const ${1:players} = PlayerManager.getAll();',
      '${0}'
    ]
  },
  {
    prefix: "hmp-server-teleport",
    title: "HMP Server Player Teleport",
    description: "Server • teleports a Player already available in scope",
    contexts: ["server"],
    requiredApi: ["Player"],
    body: [
      '${1:targetPlayer}.teleport(${2:position});',
      '${0}'
    ]
  },
  {
    prefix: "hmp-interface",
    title: "HMP Shared Interface",
    description: "Shared/Types • shared TypeScript interface",
    contexts: ["shared"],
    body: [
      'export interface ${1:ResourceData} {',
      '  ${2:id}: ${3:number};',
      '  ${0}',
      '}'
    ]
  },
  {
    prefix: "hmp-type",
    title: "HMP Shared Type",
    description: "Shared/Types • shared TypeScript alias",
    contexts: ["shared"],
    body: [
      'export type ${1:ResourceState} = ${2:string};',
      '${0}'
    ]
  },
  {
    prefix: "hmp-config",
    title: "HMP Shared Config Interface",
    description: "Shared/Types • basic resource configuration structure",
    contexts: ["shared"],
    body: [
      'export interface ${1:HmpResourceConfig} {',
      '  enabled: boolean;',
      '  ${0}',
      '}'
    ]
  }
];

function availableInContract(index: ApiIndex, context: ApiContext, snippet: HmpSnippet): boolean {
  if (!snippet.requiredApi?.length) return true;
  return snippet.requiredApi.every((path) => Boolean(index.resolve(context, path.split("."))));
}

function prefixBefore(document: vscode.TextDocument, position: vscode.Position): { value: string; range: vscode.Range } {
  const line = document.lineAt(position.line).text.slice(0, position.character);
  const match = line.match(/([A-Za-z0-9_-]*)$/);
  const value = match?.[1] ?? "";
  const start = position.translate(0, -value.length);
  return { value, range: new vscode.Range(start, position) };
}

export class ContextualHmpSnippetProvider implements vscode.CompletionItemProvider {
  constructor(private readonly getIndex: () => ApiIndex) {}

  provideCompletionItems(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.CompletionItem[]> {
    const typed = prefixBefore(document, position);
    if (typed.value && !typed.value.toLowerCase().startsWith("hmp")) return [];

    const context = contextForDocument(document);
    const index = this.getIndex();
    return SNIPPETS
      .filter((snippet) => snippet.contexts.includes(context))
      .filter((snippet) => availableInContract(index, context, snippet))
      .map((snippet) => {
        const item = new vscode.CompletionItem(snippet.prefix, vscode.CompletionItemKind.Snippet);
        item.label = { label: snippet.prefix, description: snippet.contexts.map((x) => x.toUpperCase()).join("/") };
        item.detail = snippet.title;
        item.documentation = new vscode.MarkdownString(`${snippet.description}\n\n_Validated against the active API contract._`);
        item.insertText = new vscode.SnippetString(snippet.body.join("\n"));
        item.filterText = snippet.prefix;
        item.sortText = `00_hmp_${snippet.prefix}`;
        item.range = typed.range;
        return item;
      });
  }
}
