/** A mutable 3D vector handle on an entity's transform. Read, call `set(...)`, then re-assign. */
export interface Vector3 {
  x: number;
  y: number;
  z: number;
  set(x: number, y: number, z: number): void;
}

export interface Quaternion {
  w: number;
  x: number;
  y: number;
  z: number;
}

/**
 * Handler registered with `Messages.handle`, provided by the MafiaHub Framework. `reply` is ignored
 * for notifications sent with `Messages.send`.
 */
export type MessageHandler = (payload: unknown, reply: (value?: unknown) => void) => void;

/** Handler registered with `Events.on` and its siblings, provided by the MafiaHub Framework. */
export type EventHandler = (...args: unknown[]) => unknown | Promise<unknown>;

/** Removes the subscription `Events.on` or `Events.onClient` returned it for. */
export type Unsubscribe = () => void;

/** Handler registered with `Key.bind`, provided by the MafiaHub Framework. */
export type KeyHandler = (key: string, state: "down" | "up") => void;

/**
 * Handler registered with `Web.on`, provided by the MafiaHub Framework. A JSON payload arrives
 * parsed; anything else arrives as the raw string, and an empty payload as `undefined`.
 */
export type WebEventHandler = (payload?: unknown) => void;

/** Base networked entity handle, provided by the MafiaHub Framework. */
export interface Entity {
  /** Network id, stable for the entity's lifetime. */
  readonly id: number;
  /** World position. Read, call `set(...)`, then assign back. */
  position: Vector3;
  /** Reads as a quaternion; assignments also accept Euler angles in degrees. */
  rotation: Quaternion | Vector3;
  virtualWorld: number;
  setVirtualWorld(world: number): void;
  setVisibleTo(player: Entity | null): void;
  toString(): string;
}

export interface Player extends Entity {
  kick(reason?: string): void;
  emit(eventName: string, payloadJson?: string): void;
  getIP(): string;
  /** Client-announced identifier; do not use for authorization without independent verification. */
  readonly steamId: string;
  /** Client-announced identifier; do not use for authorization without independent verification. */
  readonly discordId: string;
  /** Client-announced identifier; do not use for authorization. */
  readonly hardwareId: string;
  readonly ping: number;
  readonly ip: string;
}

/** The game's id of every species `Beast.create` accepts: the nurturable adults and their young. */
export type BeastSpecies = "Diricawl" | "DiricawlOffspring" | "Fwooper" | "FwooperOffspring" | "GiantPurpleToad" | "GiantPurpleToadOffspring" | "Graphorn" | "GraphornOffspring" | "Hippogriff" | "HippogriffOffspring" | "Jobberknoll" | "JobberknollOffspring" | "Kneazle" | "KneazleOffspring" | "Mooncalf" | "MooncalfOffspring" | "Niffler" | "NifflerOffspring" | "Phoenix" | "Puffskein" | "PuffskeinOffspring" | "Thestral" | "ThestralOffspring" | "Unicorn" | "UnicornOffspring";

/** One species in `Beast.catalog()`. */
export interface BeastSpeciesInfo {
  id: BeastSpecies;
  /** The adult's id for a young creature, null for an adult. */
  adult: BeastSpecies | null;
  /** `weight` is the game's spawn chance (0 = never rolled); `effect` marks a special effect, not a coat. */
  colors: { id: string; weight: number; effect: boolean }[];
}

/** Optional configuration for `Beast.create`. */
export interface BeastSpawnOptions {
  x?: number;
  y?: number;
  z?: number;
  /** Facing, in degrees. */
  yaw?: number;
  scale?: number;
  name?: string;
  gender?: "male" | "female";
  /** One of the species' colours (see `Beast.catalog()`). Omit to roll on the game's own spawn weights. */
  color?: string;
  preferredOwnerId?: number;
}

/** Optional placement and interaction configuration for `WorldObject.create`. */
export interface WorldObjectSpawnOptions {
  x?: number;
  y?: number;
  z?: number;
  pitch?: number;
  yaw?: number;
  roll?: number;
  scale?: number;
  collision?: boolean;
  promptText?: string;
  promptHeight?: number;
  promptRange?: number;
}

/** Placement and lifetime configuration for `Fx.create`. */
export interface FxSpawnOptions {
  x?: number;
  y?: number;
  z?: number;
  /** Rotation in degrees. */
  pitch?: number;
  yaw?: number;
  roll?: number;
  /** Uniform scale, default 1. */
  scale?: number;
  /** Seconds until the server destroys the effect; 0 or omitted lives until `destroy`. */
  ttl?: number;
}

/** Placement, nameplate and prompt configuration for `Character.create`. */
export interface CharacterSpawnOptions {
  x?: number;
  y?: number;
  z?: number;
  yaw?: number;
  scale?: number;
  label?: string;
  promptText?: string;
  promptHeight?: number;
  promptRange?: number;
}

/** This client's view of one server-owned effect (the server's `Fx.create`). */
export interface FxClientState {
  readonly id: number;
  readonly path: string;
  /** Whether the replicated entity currently owns a live effect component in this Unreal world. */
  readonly componentLive: boolean;
  /** Whether loading the effect failed. Cleared and retried when a mod pak mounts, in case of a race. */
  readonly spawnFailed: boolean;
  readonly position: {
    x: number;
    y: number;
    z: number;
  };
}

/** This client's applied state for one server-owned world object. */
export interface WorldObjectClientState {
  readonly id: number;
  readonly modelId: number;
  /** Whether the replicated entity currently owns a live StaticMeshActor in this Unreal world. */
  readonly actorLive: boolean;
  /** Whether resolving or spawning the configured mesh failed permanently for this replica. */
  readonly spawnFailed: boolean;
  readonly promptConfigured: boolean;
  readonly position: {
    x: number;
    y: number;
    z: number;
  };
}

export type InventoryItemKind = "item" | "gear" | "tool" | "mount";

/** One authoritative native inventory row. */
export interface InventoryItem {
  readonly itemId: string;
  readonly holder: string;
  readonly variation: string;
  readonly count: number;
  readonly kind: InventoryItemKind;
  readonly stolen: boolean;
  readonly unique: boolean;
  readonly keepOnReset: boolean;
  /** Gear only: whether the game considers this item identified (i.e. wearable). */
  readonly identified: boolean;
  /** Gear only: whether the player is wearing it. */
  readonly equipped: boolean;
  /** Hooded gear only, and only while worn: whether the hood is raised. */
  readonly hoodUp: boolean;
}

/** Optional native identity fields for give/remove. */
export interface InventoryOptions {
  /** Generated automatically by give() for gear; required when restoring gear with replace(). */
  variation?: string;
  /** Gear only: grant it already identified, instead of on the game's loot path. */
  identified?: boolean;
  /** Gear only: have the client wear it once it materializes (implies identified). */
  equipped?: boolean;
  /** Hooded gear only: raise the hood once it is worn (implies equipped). */
  hoodUp?: boolean;
  stolen?: boolean;
  unique?: boolean;
  keepOnReset?: boolean;
}

export interface InventoryPatchGiveOperation extends InventoryOptions {
  op: "give";
  itemId: string;
  count?: number;
}

export interface InventoryPatchRemoveOperation {
  op: "remove";
  itemId: string;
  count?: number;
  variation?: string;
  unique?: boolean;
}

export interface InventoryPatchMoveOperation {
  op: "move";
  itemId: string;
  /** Omit count to move the complete matching source row. */
  count?: number;
  fromHolder: string;
  toHolder: string;
  variation?: string;
  unique?: boolean;
}

export type InventoryPatchOperation =
  | InventoryPatchGiveOperation
  | InventoryPatchRemoveOperation
  | InventoryPatchMoveOperation;

export interface InventoryPatchOptions {
  /** Reject the entire transaction unless this still equals inventory.revision. */
  expectedRevision?: number;
}

export interface InventoryMoveOptions extends InventoryPatchOptions {
  fromHolder: string;
  toHolder: string;
  /** Omit count to move the complete matching source row. */
  count?: number;
  variation?: string;
  unique?: boolean;
}

/** A positive client-native acquisition not yet present in the authoritative inventory. */
export interface NativeInventoryDelta {
  /** Opaque, one-shot capability for adopting exactly this reported addition. */
  readonly adoptionId: string;
  readonly sequence: number;
  /** Current native row after the change; `change` is the newly eligible positive amount. */
  readonly item: InventoryItem;
  readonly change: number;
  readonly reason: "unknown";
}

export interface NativeInventoryAdoptionOptions {
  /** Version 1 adopts positive acquisitions only; passing false is rejected. */
  additionsOnly?: true;
  /** Optional case-insensitive allowlists, applied in addition to catalog validation. */
  holders?: string[];
  itemIds?: string[];
}

export interface NativeInventoryApplyError {
  /** Canonical item row whose requested native state did not settle. */
  readonly itemId: string;
  readonly holder: string;
  /** Stable machine-readable client apply failure code. */
  readonly code: string;
}

export interface NativeInventoryState {
  readonly items: InventoryItem[];
  /** Monotonic client observation sequence. */
  readonly sequence: number;
  /** Latest authoritative snapshot revision whose native work reached a terminal state. */
  readonly appliedRevision: number;
  /** Empty when that terminal revision applied exactly. */
  readonly applyErrors: NativeInventoryApplyError[];
}

export interface InventoryRevisionError {
  readonly code:
    | "PLAYER_DISCONNECTED"
    | "REVISION_NOT_PUBLISHED"
    | "NATIVE_APPLY_FAILED"
    | "NATIVE_APPLY_TIMEOUT";
  readonly message: string;
  readonly requestedRevision: number;
  readonly appliedRevision: number;
  readonly applyErrors: NativeInventoryApplyError[];
}

export interface InventoryUseOptions {
  /** Exact native variation to use; empty selects the ordinary stack. */
  variation?: string;
}

export interface InventoryOperationResult {
  readonly revision: number;
  readonly rows: number;
  /** Normalized resulting row for give(), adoptNative(), and use(); omitted by other mutations. */
  readonly item?: InventoryItem;
}

export interface InventoryOperationError {
  readonly code:
    | "PLAYER_DISCONNECTED"
    | "INVALID_ITEM"
    | "INVALID_ARGUMENT"
    | "INVALID_HOLDER"
    | "AMBIGUOUS_ITEM"
    | "INSUFFICIENT_COUNT"
    | "REVISION_CONFLICT"
    | "PERSISTENCE_UNAVAILABLE"
    | "NATIVE_DELTA_NOT_FOUND"
    | "STALE_NATIVE_DELTA"
    | "NATIVE_DELTA_NOT_ALLOWED"
    | "ITEM_NOT_USABLE"
    | "USE_IN_PROGRESS"
    | "USE_DECLINED"
    | "USE_UNAVAILABLE"
    | "USE_MISSING_ITEM"
    | "USE_TIMEOUT"
    | "USE_INVALID_RESULT"
    | "NATIVE_USE_COUNT_MISMATCH";
  readonly message: string;
}

/** Controls an absolute local-player experience update. */
export interface ProgressionSetPointsOptions {
  /** Keep the current unspent talent-point pool when crossing level boundaries. Defaults to true. */
  preserveTalentPoints?: boolean;
  /** Native AddExperience audit source. Defaults to "HogwartsMP". */
  source?: string;
  /** Native AddExperience audit detail. Defaults to "setPoints". */
  detail?: string;
}

/** Applied state returned by Progression.setPoints(). */
export interface ProgressionSetPointsResult {
  /** True when the native point target and requested talent-point policy both settled. */
  readonly accepted: boolean;
  readonly requested: number;
  /** Requested points after clamping to the native level curve. */
  readonly target: number;
  readonly clamped: boolean;
  readonly changed: boolean;
  readonly level: number;
  readonly points: number;
  /** Current unspent talent points, or -1 before the perk tree exists. */
  readonly talentPoints: number;
}

export type InventoryCallback = (
  error: InventoryOperationError | null,
  result: InventoryOperationResult | null,
) => void;

export interface AppearanceOperationResult {
  /** Authoritative revision associated with the appearance that settled natively. */
  readonly revision: number;
}

export interface AppearanceOperationError {
  readonly code:
    | "PLAYER_DISCONNECTED"
    | "INVALID_APPEARANCE"
    | "APPEARANCE_APPLY_IN_PROGRESS"
    | "APPEARANCE_APPLY_UNAVAILABLE"
    | "APPEARANCE_APPLY_FAILED"
    | "APPEARANCE_APPLY_TIMEOUT";
  readonly message: string;
}

export type AppearanceCallback = (
  error: AppearanceOperationError | null,
  result: AppearanceOperationResult | null,
) => void;

/**
 * A look as plain ids — the only form of an appearance scripts see: what resources store, read, edit
 * and share. `presets` is keyed by the creator's category names (`hairStyle`, `hairColour`,
 * `faceShape`, `skin`, `eyeColour`, `browShape`, `browColour`, `marking0..3`, `makeup*`; an unmapped
 * type appears as `type<N>`). Absent optional keys leave that part untouched. Never carries a transmog.
 */
export interface LookJson {
  format: "hogwartsmp-look";
  /** Format version this build writes; imports accept this version or older. */
  version: number;
  gender: "male" | "female";
  /** Creator category -> preset id, e.g. `{ hairStyle: "HairFemale040" }`. */
  presets: Record<string, string>;
  /** `GA_` gear appearance ids for the worn slots, e.g. `"GA_Outfit_002"`. */
  gear: string[];
  /** Forced FACE-slot appearance — the creator's glasses, e.g. `"GA_Face_004"`. */
  faceGear?: string;
  /** House id name for the robe and crest variants; absent lets the game decide. */
  house?: string;
  /** Body scale, 0.1..10. */
  scale?: number;
  /** How `scale` is applied (see `Player.setScale`); absent means `"full"`. */
  scaleMode?: "full" | "visual";
  /** Bone slider name -> scale. */
  boneScales?: Record<string, number>;
  /** `tone` 0/1, `pitch` -2..2. */
  voice?: { tone: number; pitch: number };
  name?: { first: string; last: string };
  /** Hood up or down. */
  hood?: boolean;
  /** A `DT_CustomWandStyle` row key. */
  wandStyle?: string;
}

/** One arbitrated hit handed to the Pvp policy hook. */
export interface PvpHit {
  readonly casterId: number;
  readonly victimId: number;
  readonly spellId: number;
  readonly spell: string;
  readonly damage: number;
  readonly duration: number;
  /**
   * Victim's last-reported vitals — absent before their first report, and up to a vitals interval
   * stale: for a non-lethal guarantee return `minHp`, not just clamped damage.
   */
  readonly victimHp?: number;
  readonly victimMax?: number;
}

/** Full-control verdict from a Pvp policy; every field falls back to the arbitrated value. */
export interface PvpPolicyDecision {
  allow?: boolean;
  damage?: number;
  duration?: number;
  /** Live-health floor the victim's client enforces — the only real non-lethal guarantee. */
  minHp?: number;
}

/** Return `false` to veto, a number to replace the damage, or nothing to accept. */
export type PvpPolicy = (hit: PvpHit) => void | boolean | number | PvpPolicyDecision;

/** Timed potion effects, returned by Player.effects. */
export interface PlayerEffects {
  apply(name: string, seconds?: number): boolean;
  clear(name: string): boolean;
  has(name: string): boolean;
  list(): string[];
}

/** Optional presentation controls for a same-area streamed teleport. */
export interface TeleportOptions {
  /** Final actor/controller heading in degrees. Omitted preserves the current heading. */
  yaw?: number;
  /** Run the game's capsule-aware downward placement after arrival. */
  snapToGround?: boolean;
  /** Maximum downward search distance in cm. Default 2000; maximum 100000. */
  groundSnapDistance?: number;
}

export interface TeleportRequestedDestination {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly yaw: number | null;
  readonly snapToGround: boolean;
  readonly groundSnapDistance: number;
}

export interface TeleportDestination {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly yaw: number;
}

/** Fourth argument of playerTeleportComplete; the first three legacy arguments remain unchanged. */
export interface TeleportCompletion {
  readonly requestId: number;
  readonly status: number;
  readonly requested: TeleportRequestedDestination;
  readonly destination: TeleportDestination | null;
  /** True only when snapToGround was requested and the native placement found acceptable ground. */
  readonly groundSnapped: boolean;
}

/** Anchor spec for Player.hold(); needs either x/y/z or anchorId, never both. */
export interface HoldOptions {
  owner: string;
  x?: number;
  y?: number;
  z?: number;
  /** Network id to follow instead of a fixed anchor. */
  anchorId?: number;
  offset?: Vector3;
  radius?: number;
  radiusZ?: number;
  /** Attach rigidly to anchorId; refused without one. */
  rigid?: boolean;
  mode?: "clamp" | "reject";
  ttlMs?: number;
}

/** One live hold, as reported by Player.holds(). */
export interface PlayerHold {
  readonly owner: string;
  readonly anchorId?: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly offset: Vector3;
  readonly radius: number;
  readonly radiusZ: number;
  readonly mode: "clamp" | "reject";
  readonly rigid: boolean;
  /** Absolute expiry in network time; 0 never expires. */
  readonly expiresAt: number;
}

/** Server-authoritative controller returned by Player.inventory. */
export interface PlayerInventory {
  /** Current server-authoritative revision for optimistic transactions. */
  readonly revision: number;
  replace(items: InventoryItem[], callback?: InventoryCallback): void;
  give(
    itemId: string,
    count?: number,
    options?: InventoryOptions,
    callback?: InventoryCallback,
  ): void;
  remove(
    itemId: string,
    count?: number,
    options?: InventoryOptions,
    callback?: InventoryCallback,
  ): void;
  /** Applies all operations atomically and publishes exactly one revision/native snapshot. */
  patch(
    operations: InventoryPatchOperation[],
    options?: InventoryPatchOptions,
    callback?: InventoryCallback,
  ): void;
  /** Holder-move sugar over a one-operation patch; active mount moves swap the old occupant to storage. */
  move(itemId: string, options: InventoryMoveOptions, callback?: InventoryCallback): void;
  clear(callback?: InventoryCallback): void;
  /** Full client-reported native inventory, or null before its first report. */
  native(): NativeInventoryState | null;
  /** Waits for terminal native application of this revision or a newer full snapshot. */
  waitForRevision(revision: number): Promise<NativeInventoryState>;
  /** Deliberately imports one exact playerInventoryNativeDelta after revalidating it. */
  adoptNative(
    adoptionId: string,
    options?: NativeInventoryAdoptionOptions,
    callback?: InventoryCallback,
  ): void;
  /** Uses one native potion/plant and completes only after the game proves its exact decrement. */
  use(itemId: string, options?: InventoryUseOptions, callback?: InventoryCallback): number;
  list(): InventoryItem[];
  count(itemId: string): number;
  has(itemId: string, count?: number): boolean;
  /**
   * Chooses where this player's inventory is saved: a slot name selects a per-player record and
   * LOADS it over the current model, `true` is the default slot, `false` stops the built-in writes
   * so a resource can persist to its own store off `playerInventoryUpdated`.
   */
  persist(slot: string | boolean, callback?: InventoryCallback): void;
}

/** One owned gear row from the client's last report; `slot` is the game's own GearItems.SlotID. */
export interface GearItem {
  readonly itemId: string;
  readonly variation: string;
  readonly slot: string;
  readonly equipped: boolean;
}

export interface GearApplyEntry {
  itemId: string;
  /** Exact owned variation to wear; omitted lets the client pick the owned row. */
  variation?: string;
}

/** Optional refinements for PlayerGear.equip(). */
export interface GearEquipOptions {
  /** Exact owned variation to wear; omitted lets the client pick the owned row. */
  variation?: string;
  /** Asserted slot; the command fails with GEAR_SLOT_MISMATCH when the item belongs elsewhere. */
  expectedSlot?: string;
}

export type GearErrorCode =
  | "GEAR_NOT_REGISTERED"
  | "GEAR_NOT_OWNED"
  | "GEAR_UNKNOWN_SLOT"
  | "GEAR_SLOT_MISMATCH"
  | "GEAR_SLOT_EMPTY"
  | "GEAR_UNAVAILABLE"
  | "GEAR_TIMEOUT"
  | "GEAR_FAILED";

/** One op's verdict, in the order the ops were sent. A single equip/unequip gets one entry. */
export interface GearChangeResult {
  /** The slot actually touched. */
  readonly slot: string;
  readonly ok: boolean;
  /** Present only when ok is false. */
  readonly code?: GearErrorCode;
  readonly message?: string;
}

export interface GearOperationResult {
  /** The first slot touched. */
  readonly slot: string;
  readonly changes: readonly GearChangeResult[];
  /**
   * Gear report sequence the worn set settled at, matching player.gear.revision(). The callback
   * does not fire until that report has been observed, so the read APIs already agree with it.
   */
  readonly appliedRevision: number;
}

/** The first failure, plus the same per-op detail a success carries. */
export interface GearOperationError extends GearOperationResult {
  readonly code: GearErrorCode;
  readonly message: string;
}

export type GearCallback = (
  error: GearOperationError | null,
  result: GearOperationResult | null,
) => void;

export interface WandOperationResult {
  /** Whether the wand is drawn, as observed after the call settled. */
  readonly equipped: boolean;
  /** The wand's style row key after the call. */
  readonly style: string;
}

export interface WandOperationError {
  readonly code:
    | "WAND_UNKNOWN_STYLE"
    | "WAND_NONE"
    | "WAND_UNAVAILABLE"
    | "WAND_REVERTED"
    | "WAND_TIMEOUT"
    | "WAND_FAILED";
  readonly message: string;
}

/** The result object is supplied for failures too, so a WAND_REVERTED still reports the real state. */
export type WandCallback = (
  error: WandOperationError | null,
  result: WandOperationResult,
) => void;

/** Wand controller returned by Player.wand. */
export interface PlayerWand {
  /** Whether the wand is drawn; null before the client's first report. */
  equipped(): boolean | null;
  /** The DT_CustomWandStyle row the wand renders, "" before the client's first report. */
  style(): string;
  /** Every style the game's table offers, empty before the client's first report. */
  styles(): string[];
  /**
   * Client round trip; returns the request id. The game's behaviour tree also draws and stows the
   * wand, so the callback can report WAND_REVERTED: the call landed and the game undid it.
   */
  equip(callback?: WandCallback): number;
  /** Client round trip; returns the request id. Same WAND_REVERTED caveat as equip. */
  unequip(callback?: WandCallback): number;
  /** Client round trip; returns the request id. Persists, so it survives a reconnect. */
  setStyle(style: string, callback?: WandCallback): number;
}

/** Per-slot gear controller returned by Player.gear. */
export interface PlayerGear {
  /** Canonical slot names in the game's own order, empty before the client's first report. */
  slots(): string[];
  /** Worn item per slot, every slot present with an explicit null; null before the first report. */
  equipped(): Record<string, GearItem | null> | null;
  /** Owned gear that fits this slot, the worn one flagged. */
  available(slot: string): GearItem[];
  /** Client round trip; returns the request id. */
  equip(itemId: string, options?: GearEquipOptions, callback?: GearCallback): number;
  /** Client round trip; returns the request id. */
  unequip(slot: string, callback?: GearCallback): number;
  /**
   * Every slot in one round trip and one client tick. A value names what should end up in that
   * slot; null clears it. Not a transaction — the ops that can apply do. Returns the request id.
   */
  apply(changes: Record<string, string | GearApplyEntry | null>, callback?: GearCallback): number;
  /** Sequence of the last gear report adopted; compare against a result's appliedRevision. */
  revision(): number;
}
