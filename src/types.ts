export type ApiContext = "client" | "server" | "shared";

export interface ContractManifestFile { path: string; size: number; sha256: string; contentType?: string; }
export interface ContractManifest { schemaVersion: number; slug: string; channel: string; revision: string; version: string; files: ContractManifestFile[]; }

export interface ApiSymbolNode {
  name: string;
  path: string;
  kind: string;
  signature: string;
  documentation: string;
  filePath: string;
  line: number;
  character: number;
  children: Map<string, ApiSymbolNode>;
}

export interface ApiSnapshotEntry {
  key: string;
  context: ApiContext;
  kind: string;
  path: string;
  signature: string;
  documentation: string;
}

export type BreakingReason = "removed" | "signature-changed" | "required-parameter-added" | "return-type-changed";
export interface ApiBreakingChange { reason: BreakingReason; before: ApiSnapshotEntry; after?: ApiSnapshotEntry; detail: string; }

export interface ApiDiff {
  from?: ContractManifest;
  to: ContractManifest;
  added: ApiSnapshotEntry[];
  removed: ApiSnapshotEntry[];
  changed: Array<{ before: ApiSnapshotEntry; after: ApiSnapshotEntry }>;
  breaking: ApiBreakingChange[];
}
