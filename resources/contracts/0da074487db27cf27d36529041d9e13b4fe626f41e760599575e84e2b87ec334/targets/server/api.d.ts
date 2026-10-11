import type { Entity, Entity as BaseEntity, EventHandler, Unsubscribe, MessageHandler, Player as BasePlayer, BeastSpawnOptions, BeastSpecies, BeastSpeciesInfo, WorldObjectSpawnOptions, CharacterSpawnOptions, FxSpawnOptions, PlayerInventory, PlayerGear, PlayerWand, PlayerEffects, HoldOptions, PlayerHold, InventoryItemKind, AppearanceCallback, LookJson, PvpPolicy, TeleportOptions } from "../shared.js";

declare global {
  /**
   * Coordinate-space context combined with the player's latest replicated transform.
   */
  interface PlayerLocation {
    /**
     * Game world/map that defines the coordinate space, for example Overland.
     */
    readonly areaId: string;

    /**
     * Game map region the player is in (HOG_Class_Potions, HM_Honeydukes, RegionNameNorthCoast, or a coarser area such as Hogwarts). Empty until the game reports one.
     */
    readonly regionId: string;

    /**
     * Last confirmed named fast-travel arrival; null until actual-arrival reporting is available.
     */
    readonly destinationId: string | null;

    /**
     * World X of the latest replicated transform.
     */
    readonly x: number;

    /**
     * World Y of the latest replicated transform.
     */
    readonly y: number;

    /**
     * World Z of the latest replicated transform.
     */
    readonly z: number;

    /**
     * Heading in degrees, normalized to -180..180.
     */
    readonly yaw: number;

    /**
     * Monotonic coordinate-space context revision for this player connection.
     */
    readonly revision: number;
  }

  /**
   * A connected HogwartsMP player handle.
   */
  class Player {
    /**
     * Wraps a connected player entity id.
     * @param id Network id of the connected player to wrap.
     */
    constructor(id: number);

    /**
     * Whether this handle still resolves to a connected player.
     */
    readonly connected: boolean;

    /**
     * The virtual world scripts put this player in. Replication combines it with the game map the player is in, so players in different maps never meet.
     */
    readonly virtualWorld: number;

    /**
     * Monotonic revision of this connection's authoritative appearance publications.
     */
    readonly appearanceRevision: number;

    /**
     * Server-owned Hogwarts house; assignment applies it on the owning client.
     */
    house: "Gryffindor" | "Hufflepuff" | "Ravenclaw" | "Slytherin" | "Unaffiliated";

    /**
     * Server-owned Wizard/Witch identity used by native dormitory rules; assignment does not rebuild appearance.
     */
    gender: "male" | "female";

    /**
     * The max health set by setMaxHealth, else the max their client last reported; 0 before the first report.
     */
    readonly maxHealth: number;

    /**
     * The player's current nickname.
     */
    readonly nickname: string;

    /**
     * Server-authoritative inventory controller. Its reads never consult client memory, and the model belongs to the connection: a joining player starts empty and everything here is dropped on disconnect.
     */
    readonly inventory: PlayerInventory;

    /**
     * Per-slot gear controller: what the player wears on each body slot and what they can wear there. Reads come from the client's last report and are synchronous; equip, unequip and apply are client round trips whose callback fires once the worn set agrees, carrying the appliedRevision it settled at. Prefer apply for a multi-slot change: it costs one round trip and one client tick instead of one per slot. Slots and item-to-slot mapping come from the game's own tables, so gear added by a UGC mod behaves like shipped gear.
     */
    readonly gear: PlayerGear;

    /**
     * The player's wand: whether it is drawn, which wand it is, and the styles the game offers. Reads come from the client's last report and are synchronous; equip, unequip and setStyle are client round trips with a callback. The game's own behaviour tree also draws and stows the wand, so equip/unequip are requests, not latches - a callback can come back WAND_REVERTED.
     */
    readonly wand: PlayerWand;

    /**
     * Timed potion effects. apply/clear command the owning client (the ability lives there); has/list read the server-owned mask.
     */
    readonly effects: PlayerEffects;

    /**
     * Returns a readable representation of this handle.
     */
    toString(): string;

    /**
     * Sends a chat line to this player.
     * @param message Chat line to send to this player.
     */
    sendChat(message: string): void;

    /**
     * Queues a named fast-travel hop on this player's client — the only cross-area move.
     * @param name A known fast-travel destination name (case-insensitive).
     * @returns Request id reported by playerFastTravelComplete, or 0 when the name is unknown.
     */
    fastTravel(name: string): number;

    /**
     * Drops only this owner's hold on the player.
     * @param owner The owner tag passed to hold().
     * @returns True when that owner actually held them.
     */
    release(owner: string): boolean;

    /**
     * Moves this player into another virtual world within the map they are in.
     * @param world Virtual-world identifier used to partition replication and visibility.
     */
    setVirtualWorld(world: number): void;

    /**
     * Opens a CEF web view on this player's client (requires the `ui` resource).
     * @param name Caller-chosen stable handle for the view.
     * @param url Page the client should open.
     */
    showUI(name: string, url: string): void;

    /**
     * Destroys this player's `name` view (opened via showUI).
     * @param name The view handle opened via showUI.
     */
    hideUI(name: string): void;

    /**
     * Sends a message to this player's `name` view (fires a DOM CustomEvent).
     * @param name The view handle opened via showUI.
     * @param event DOM CustomEvent name fired on the page.
     * @param payloadJson JSON text used as the event detail.
     */
    sendUI(name: string, event: string, payloadJson: string): void;

    /**
     * Disguises this player as a registered game character (session-only).
     * @param characterId A CharacterDefinition id (e.g. 'EleazarFig'); "" reverts.
     */
    setTransmog(characterId: string): void;

    /**
     * Returns the active transmog character id.
     * @returns The character id, or "" when none.
     */
    getTransmog(): string;

    /**
     * Returns this player's character scale.
     * @returns The scale, or 1 when never set.
     */
    getScale(): number;

    /**
     * Returns how this player's scale is applied (see setScale).
     * @returns "full" unless setScale chose "visual".
     */
    getScaleMode(): "full" | "visual";

    /**
     * Takes the prop out of this player's hand, on every client.
     */
    clearProp(): void;

    /**
     * Hides or shows this player on every other client: body, wand, held prop, nametag, minimap blip and collision. Server-owned, so their own client cannot undo it; their own view is unchanged. Newcomers see it too.
     * @param visible false hides this player from everyone else.
     */
    setVisible(visible: boolean): void;

    /**
     * Whether other players can see this player (see setVisible).
     */
    isVisible(): boolean;

    /**
     * Holds or releases this player's damage immunity. Their client keeps re-applying it while held, even over its own scripts and after a respawn; the server also drops PvP and NPC hits on them. Releasing leaves the flag to client scripts again.
     * @param on true to hold this player immune to damage.
     */
    setInvulnerable(on: boolean): void;

    /**
     * Whether the server holds this player immune (see setInvulnerable).
     */
    isInvulnerable(): boolean;

    /**
     * Whether this player respawns on their own after dying (see setAutoRespawn).
     */
    getAutoRespawn(): boolean;

    /**
     * Whether this player is dead: true from playerDied until they are back up (playerDownedEnd).
     */
    isDead(): boolean;

    /**
     * Queues a same-area streamed teleport on this player's client.
     * @param options Optional yaw and native downward ground-snap settings.
     * @returns Request id reported by playerTeleportComplete.
     */
    teleport(x: number, y: number, z: number, options?: TeleportOptions): number;

    /**
     * Puts a mesh in this player's hand, replacing what was held, the way LocalPlayer.equipProp does on their own client; every other player sees it. The owner applies it once their body exists, and getProp follows once they have.
     * @param path A StaticMesh or SkeletalMesh asset path.
     * @param options socket defaults to "WandSocket"; offset is relative to it, scale defaults 1.
     */
    equipProp(path: string, options?: { socket?: string, offset?: { pitch?: number, yaw?: number, roll?: number, x?: number, y?: number, z?: number, scale?: number } }): void;

    /**
     * Sets this player's health on their own client, which the game then reports back as usual.
     * @param amount New health, or "max" to restore it; the game clamps it to the player's maximum.
     */
    setHealth(amount: number | "max"): void;

    /**
     * Chooses whether this player respawns on their own a few seconds after dying. While off, a dead player stays down, keeps seeing the world, and does not regenerate until player.respawn. Set it inside a playerDied handler to decide for that death; switching it on while they are held respawns them.
     * @param on false holds this player where they fell after dying; null restores server.json's mod.autoRespawn.
     */
    setAutoRespawn(on: boolean | null): void;

    /**
     * Respawns this dead player now: their client reloads Overland and stands them at the position. playerDownedEnd follows once they are up.
     * @param options An Overland position and heading in degrees to stand up at; omitted uses the game's default start.
     * @returns False when the player is not dead.
     */
    respawn(options?: { position?: { x: number, y: number, z: number }, yaw?: number }): boolean;

    /**
     * Holds this player's max health at a server-chosen value. Their client re-applies it over level-ups, gear, respawns and travel; current health is clamped to it, setHealth("max") fills to it, and Pvp.getVitals and the PvP policy report it.
     * @param maxHealth New max health; 0 or null restores the native, level-driven value.
     */
    setMaxHealth(maxHealth: number | null): void;

    /**
     * Resizes this player's character on every client, their own included. Full mode honours any size: a large capsule will not fit through doors.
     * @param scale Uniform body scale; 1 is native, clamped to 0.1-10.
     * @param mode "full" (default) also resizes collision, the hitbox and the lock-on point; "visual" resizes only the body and worn gear.
     */
    setScale(scale: number, mode?: "full" | "visual"): void;

    /**
     * The prop in this player's hand as their client last reported it, or null when nothing is held.
     */
    getProp(): { path: string, socket: string, offset: { pitch: number, yaw: number, roll: number, x: number, y: number, z: number, scale: number } } | null;

    /**
     * Returns the player's current game-authored area and region together with the latest replicated transform. The coordinate-space identifiers are client-observed and should be trusted like player position.
     * @returns Null until the owning client reaches a playable world, and while it is changing worlds.
     */
    location(): PlayerLocation | null;

    /**
     * Holds this player at a server-owned anchor: their streamed position is clamped before it lands, so every other client sees the anchor.
     * @param options Owner tag plus either a fixed x/y/z anchor or an anchorId to follow.
     * @returns True when the hold was applied.
     */
    hold(options: HoldOptions): boolean;

    /**
     * Lists every live hold on this player, for diagnostics and for checking before acting.
     */
    holds(): PlayerHold[];

    /**
     * Returns this player's worn appearance as plain ids under the creator's category names. Persist it (JSON.stringify) to save a look and hand it back to setLook to restore it. Never includes a transmog.
     * @returns The look, or null when there's no live player appearance.
     */
    getLook(): LookJson | null;

    /**
     * Applies a look, sanitizes it and broadcasts it; clears any transmog. A malformed field (a gear id without GA_, an unknown category, a newer version) fails with INVALID_APPEARANCE naming it before anything reaches the client; an id the game does not know is dropped by the game, so read getLook back.
     * @param look A look from getLook, Creator.exportLook or playerAppearanceChanged, or its JSON text.
     * @param callback Called after the owning client's native appearance reload settles.
     * @returns The native acknowledgement request id, or 0 when no callback was supplied.
     */
    setLook(look: LookJson | string, callback?: AppearanceCallback): number;
  }

  interface Player extends BasePlayer {}

  /**
   * A server-owned tame creature. Every nearby client builds it as the game's own creature, one client runs its AI, and players care for it with the game's petting brush and creature feed (see the beastCared event).
   */
  class Beast {
    /**
     * Wraps a beast entity id without spawning it.
     * @param id Network id of the server entity to wrap.
     */
    constructor(id: number);

    /**
     * The game's species id, e.g. "Hippogriff" or "NifflerOffspring".
     */
    readonly species: BeastSpecies;

    /**
     * Custom native creature name, or empty when the localized species name is used.
     */
    readonly name: string;

    /**
     * The beast's native creature gender, or undefined once the beast has despawned.
     */
    readonly gender: "male" | "female" | undefined;

    /**
     * Colour variation, one of the species' catalogued colours, identical on every client.
     */
    readonly color: string;

    /**
     * Network id of the player whose client advances the native AI (0 while dormant).
     */
    readonly ownerId: number;

    /**
     * Current uniform actor scale (1 = native size).
     */
    readonly scale: number;

    /**
     * Happiness, 0 to 100, held by the server. Accepted care adds the game's 11; every client's copy follows this value.
     */
    readonly happiness: number;

    /**
     * Returns a debug string for this beast.
     */
    toString(): string;

    /**
     * Sets the uniform actor scale on every client's copy of the beast.
     * @param scale Uniform actor scale (1 = native size).
     */
    setScale(scale: number): void;

    /**
     * Moves this beast's happiness, clamped into 0 to 100. Every client moves its copy through the game's own writer, which fires the gained or lost effect. Read the result from `happiness`; to assign a value, pass the difference.
     * @param amount Delta to apply; negative takes happiness away. Rejected at zero or beyond 100 either way.
     * @returns True when the change was accepted and sent.
     */
    addHappiness(amount: number): boolean;

    /**
     * Despawns the beast everywhere.
     */
    destroy(): void;

    /**
     * Spawns a tame native beast. Throws on an unknown species or a colour the species does not have.
     * @param species The game's species id; Beast.catalog() lists them.
     * @param opts Spawn options; every field is optional.
     */
    static create(species: BeastSpecies, opts?: BeastSpawnOptions): Beast;

    /**
     * Every species Beast.create accepts: the 13 nurturable adults and their young, each with its colours, their spawn weights, and whether a colour is an effect rather than a coat.
     */
    static catalog(): BeastSpeciesInfo[];
  }

  interface Beast extends BaseEntity, Entity {}

  /**
   * A server-spawned combat NPC handle; npcDied fires on death.
   */
  class NPC {
    /**
     * Wraps an NPC entity id without spawning it.
     * @param id Network id of the server entity to wrap.
     */
    constructor(id: number);

    /**
     * Catalog id or class path this NPC was spawned from.
     */
    readonly enemyId: string;

    /**
     * Current disposition, or undefined once the NPC has despawned.
     */
    readonly disposition: "hostile" | "friendly" | undefined;

    /**
     * Whether the NPC is currently alive.
     */
    readonly alive: boolean;

    /**
     * Network id of the player whose client runs the AI (0 = server-owned/dormant).
     */
    readonly ownerId: number;

    /**
     * Owner-reported readback: the player NPC_Component::GetTarget() actually resolves to right now, or 0. Compare against the id passed to forceTarget to see native reversion.
     */
    readonly targetPlayerId: number;

    /**
     * Owner-reported EEnemy_TargetType readback: 0 None, 1 Attack, 2 Flee.
     */
    readonly targetType: number;

    /**
     * Current uniform scale (1 = native size).
     */
    readonly scale: number;

    /**
     * How the scale is applied: "full" resizes the whole actor, "visual" only the body (see setScale).
     */
    readonly scaleMode: "full" | "visual";

    /**
     * Owner-reported actual current health (absolute game units); reads 0 until the owner client has embodied the pawn and polled it.
     */
    readonly health: number;

    /**
     * Owner-reported actual max health (absolute game units); reads 0 until the owner client has embodied the pawn and polled it.
     */
    readonly maxHealth: number;

    /**
     * Returns a debug string for this NPC.
     */
    toString(): string;

    /**
     * Flips the NPC friendly/adversarial at runtime (applied on the owner's client).
     * @param disposition New disposition.
     */
    setDisposition(disposition: "hostile" | "friendly"): void;

    /**
     * Overrides the NPC's max health (owner raises base health and fills current to the new max); persists across owner hand-off and level travel.
     * @param maxHealth New max health; pass <= 0 to clear back to the pawn's native max.
     */
    setMaxHealth(maxHealth: number): void;

    /**
     * Sets current health once. No-op on a dormant (unowned) NPC.
     * @param health New current health; the game clamps to [0, max].
     */
    setHealth(health: number): void;

    /**
     * Runs the game's death pipeline (death anim on every client), then despawns.
     */
    kill(): void;

    /**
     * Despawns the NPC everywhere immediately, with no death anim.
     */
    destroy(): void;

    /**
     * Spawns a replicated combat NPC.
     * @param enemyId Catalog id or class path.
     * @param x World-space X coordinate.
     * @param y World-space Y coordinate.
     * @param z World-space Z coordinate.
     * @param disposition Initial disposition.
     * @param preferredOwnerId Preferred owning player id.
     */
    static create(enemyId: string, x: number, y: number, z: number, disposition?: "hostile" | "friendly", preferredOwnerId?: number): NPC | undefined;

    /**
     * Sets the scale on every client's copy; set it right after create so the NPC is sized before it first streams in.
     * @param scale Uniform scale (1 = native size).
     * @param mode "full" (default) resizes the whole actor, collision included; "visual" resizes only the body and leaves collision native.
     */
    setScale(scale: number, mode?: "full" | "visual"): void;

    /**
     * Holds a forced combat target on the pawn via the Lane C sequence; read targetPlayerId back to see whether it held.
     * @param targetPlayerId Player network id to force this NPC onto; 0 releases it back to native selection.
     * @param holdSeconds SetForcedPerceptionTarget window (default 3, max 60).
     * @param applyTicks Owner re-apply cadence in ticks (default 1 = every tick).
     */
    forceTarget(targetPlayerId: number, holdSeconds?: number, applyTicks?: number): void;
  }

  interface NPC extends BaseEntity, Entity {}

  /**
   * A server-owned, interest-streamed world-object handle.
   */
  class WorldObject {
    /**
     * Wraps a world-object entity id without spawning it.
     * @param id Network id of the server entity to wrap.
     */
    constructor(id: number);

    /**
     * Catalog model id, or 0 when the mesh travels as a path.
     */
    readonly modelId: number;

    /**
     * Static-mesh asset path this object renders, whichever form it was created with.
     */
    readonly modelPath: string;

    /**
     * Uniform actor scale.
     */
    readonly scale: number;

    /**
     * Number of world-object-tagged models in the shared mesh registry.
     */
    static modelCount: number;

    /**
     * Destroys this world-object entity.
     */
    destroy(): boolean;

    /**
     * Creates or replaces an interest-streamed world object.
     * @param key Stable string key; creating again replaces the entity.
     * @param model Static-mesh asset path ('/Game/Dir/SM_X.SM_X') or a catalog model id. Throws if neither.
     * @param opts Placement and interaction options.
     */
    static create(key: string, model: string | number, opts: WorldObjectSpawnOptions): WorldObject | undefined;

    /**
     * Destroys the world object stored under a stable key.
     * @param key Stable key passed to create.
     */
    static destroy(key: string): boolean;
  }

  interface WorldObject extends BaseEntity, Entity {}

  /**
   * Access to live replicated world objects.
   */
  const WorldObjectManager: {
    /**
     * Returns every live world-object entity.
     */
    getAll(): WorldObject[];
  };

  /**
   * A server-owned, interest-streamed visual effect handle (a Niagara or Cascade system placed in the world).
   */
  class Fx {
    /**
     * Wraps an effect entity id without spawning it.
     * @param id Network id of the server entity to wrap.
     */
    constructor(id: number);

    /**
     * Effect-system asset path this effect renders.
     */
    readonly path: string;

    /**
     * Uniform scale.
     */
    readonly scale: number;

    /**
     * Seconds until the server destroys it, or 0 when it lives until destroy.
     */
    readonly ttl: number;

    /**
     * Destroys this effect entity; every client drops its component.
     */
    destroy(): boolean;

    /**
     * Creates or replaces an interest-streamed visual effect that every client in range renders.
     * @param key Stable string key; creating again replaces the entity.
     * @param path Niagara or Cascade system asset path ('/Game/VFX/.../VFX_NS_X.VFX_NS_X'). Throws when malformed.
     * @param opts Placement (x, y, z, pitch, yaw, roll, scale) and ttl in seconds.
     */
    static create(key: string, path: string, opts: FxSpawnOptions): Fx | undefined;

    /**
     * Destroys the effect stored under a stable key.
     * @param key Stable key passed to create.
     */
    static destroy(key: string): boolean;

    /**
     * Curated shipped effect systems (fire, explosions, smoke, weather, water, ambient, magic). A starting point, not an allowlist: any well-formed effect path spawns.
     */
    static catalog(): { category: string, name: string, path: string }[];
  }

  interface Fx extends BaseEntity, Entity {}

  /**
   * A server-placed, dressed, stationary human (vendor, townsperson) rendered on every client. No AI, no owner, no health.
   */
  class Character {
    /**
     * Wraps a character entity id without spawning it.
     * @param id Network id of the server entity to wrap.
     */
    constructor(id: number);

    /**
     * Registry character id this character is built from.
     */
    readonly characterId: string;

    /**
     * Nameplate text, or empty.
     */
    readonly label: string;

    /**
     * Uniform actor scale.
     */
    readonly scale: number;

    /**
     * Destroys this character entity.
     */
    destroy(): boolean;

    /**
     * Creates or replaces an interest-streamed stationary character.
     * @param key Stable string key; creating again replaces the entity.
     * @param characterId Human registry character id (e.g. 'GerboldOllivander'). Throws if not in the built-in list.
     * @param opts Placement, nameplate and prompt options.
     */
    static create(key: string, characterId: string, opts: CharacterSpawnOptions): Character | undefined;

    /**
     * Destroys the character stored under a stable key.
     * @param key Stable key passed to create.
     */
    static destroy(key: string): boolean;

    /**
     * Whether a registry character id is in the built-in human list Character.create accepts.
     * @param characterId Registry character id to test.
     */
    static isAllowed(characterId: string): boolean;
  }

  interface Character extends BaseEntity, Entity {}

  /**
   * Access to connected players.
   */
  const PlayerManager: {
    /**
     * Returns every connected player.
     */
    getAll(): Player[];

    /**
     * Returns the connected player with this id without throwing when it is absent.
     * @param id Network id to resolve.
     */
    getById(id: number): Player | null;
  };

  /**
   * Access to live replicated beasts.
   */
  const BeastManager: {
    /**
     * Returns every live replicated beast.
     */
    getAll(): Beast[];
  };

  /**
   * Access to live replicated NPCs.
   */
  const NPCManager: {
    /**
     * Returns every live NPC entity.
     */
    getAll(): NPC[];
  };

  /**
   * Access to live replicated visual effects.
   */
  const FxManager: {
    /**
     * Returns every live effect entity.
     */
    getAll(): Fx[];
  };

  /**
   * Access to live replicated characters.
   */
  const CharacterManager: {
    /**
     * Returns every live character entity.
     */
    getAll(): Character[];
  };

  /**
   * Replicated sound. A sound is a Wwise event NAME — every event the game ships (~6,300, e.g. "cabbage_explosion", "UI_Menu_Select", "Amb3D_Storm_ThunderClaps_Play") works out of the box, and custom banks dropped in Phoenix/Content/WwiseAudio/Windows/ work once loadBank() names them. Posting an event whose bank isn't resident is silently inaudible.
   */
  const Audio: {
    /**
     * Plays a spatialized one-shot at a world position on every client in range.
     * @param event Wwise event name (case-insensitive).
     * @param x World-space X coordinate.
     * @param y World-space Y coordinate.
     * @param z World-space Z coordinate.
     * @param options range = cm within which clients are sent the post (default 10000, 0 = everyone); bank = soundbank to load first; duration = seconds until it ends itself; stopEvent = authored terminator posted when it ends.
     * @returns A sound id for stopSound, or 0 when the event name was empty.
     */
    playSoundAt(event: string, x: number, y: number, z: number, options?: { range?: number, bank?: string, duration?: number, stopEvent?: string }): number;

    /**
     * Plays a sound attached to a player, heard by everyone in range including them.
     * @param player Player whose body the sound follows.
     * @param event Wwise event name.
     * @param options Same options as playSoundAt.
     * @returns A sound id for stopSound, or 0 when the player is gone.
     */
    playSoundOnPlayer(player: Player, event: string, options?: { range?: number, bank?: string, duration?: number, stopEvent?: string }): number;

    /**
     * Plays a sound at one player's listener — private, with no distance falloff.
     * @param player The only recipient.
     * @param event Wwise event name.
     * @param options bank = soundbank to load first; duration = seconds until it ends itself; stopEvent = authored terminator posted when it ends.
     * @returns A sound id for stopSound, or 0 when the player is gone.
     */
    playSoundForPlayer(player: Player, event: string, options?: { bank?: string, duration?: number, stopEvent?: string }): number;

    /**
     * Plays a sound at every connected player's listener, wherever they are.
     * @param event Wwise event name.
     * @param options bank = soundbank to load first; duration = seconds until it ends itself; stopEvent = authored terminator posted when it ends.
     * @returns A sound id for stopSound.
     */
    playSoundForAll(event: string, options?: { bank?: string, duration?: number, stopEvent?: string }): number;

    /**
     * Stops that sound on every client that started it.
     * @param soundId An id returned by one of the play functions.
     * @returns True when the stop was broadcast.
     */
    stopSound(soundId: number): boolean;

    /**
     * The soundbank this event needs loaded, from the cooked assets' own RequiredBank. Clients load it automatically when a post is refused, so this is for diagnostics and preloading.
     * @param event Wwise event name.
     * @returns The bank name, or "" for an unknown event.
     */
    bankFor(event: string): string;

    /**
     * The terminator that would be posted for this event, derived from the game's own soundbanks.
     * @param event Wwise event name.
     * @returns The stop event's name, or "" when the event is a one-shot that needs none.
     */
    stopEventFor(event: string): string;

    /**
     * Stops every sound on every client, including the game's own music and ambience (those mostly re-post on their own). The way out of a held/looping event nobody holds an id for.
     */
    stopAllSounds(): void;

    /**
     * Loads a soundbank on every client; clients that aren't in-world yet retry until they are.
     * @param bank Soundbank name, without the .bnk extension.
     */
    loadBank(bank: string): void;

    /**
     * Unloads a soundbank on every client.
     * @param bank Soundbank name.
     */
    unloadBank(bank: string): void;

    /**
     * Pushes a track onto every client's music priority stack. Only events that actually contain a Play action work — most "music" event names only flip Wwise states.
     * @param event Music event name (must be unique while pushed).
     * @param priority Stack priority, clamped to -5..5 (default 5 = above the game's score).
     */
    setMusic(event: string, priority?: number): void;

    /**
     * Pops a track off the music stack, starting whatever was under it. It cannot restore state-driven score, and the name stays blocked for the session.
     * @param event The event name passed to setMusic.
     */
    clearMusic(event: string): void;

    /**
     * Sets a global Wwise real-time parameter on every client.
     * @param name Wwise RTPC name.
     * @param value New value.
     */
    setRTPC(name: string, value: number): void;

    /**
     * Sets a global Wwise state on every client.
     * @param group Wwise state group.
     * @param state State within the group.
     */
    setState(group: string, state: string): void;
  };

  /**
   * A server-owned cauldron and its brew state.
   */
  interface BrewingSiteState {
    /**
     * Network key. A placed station's UID, or a level cauldron's baked SiteUID.
     */
    uid: number;

    /**
     * Transfiguration registry id; empty means bind to an existing cauldron.
     */
    registryId: string;

    /** */
    x: number;

    /** */
    y: number;

    /** */
    z: number;

    /** */
    yaw: number;

    /**
     * 0 None, 1 Brewing, 2 Brewed.
     */
    state: number;

    /**
     * PotionID being brewed.
     */
    potionId: string;

    /**
     * Uncollected potions waiting at the site.
     */
    yield: number;

    /**
     * Server-authoritative time left.
     */
    remainingMs: number;

    /**
     * Player entity id that started the brew.
     */
    brewerId: number;
  }

  /**
   * Server-owned cauldrons, replicated to every client.
   */
  const Brewing: {
    /**
     * Places (or replaces) a cauldron. uid must be non-zero; empty registryId binds an existing level cauldron instead of spawning one.
     */
    place(uid: number, registryId: string, x: number, y: number, z: number, yaw?: number): boolean;

    /**
     * Removes a cauldron everywhere.
     */
    remove(uid: number): boolean;

    /**
     * One cauldron by uid.
     */
    get(uid: number): BrewingSiteState | null;

    /**
     * Every server-owned cauldron.
     */
    list(): BrewingSiteState[];

    /**
     * Writes any of { state, potionId, yield, remainingMs, brewerId }; absent keys are left alone.
     */
    set(uid: number, patch: object): boolean;
  };

  /**
   * Door state the server holds for one selector.
   */
  interface DoorState {
    /**
     * The key the state was set under.
     */
    selector: string;

    /**
     * Actor name (may match several placements), persistent id, or asset path.
     */
    kind: "name" | "id" | "path";

    /**
     * Held locked or unlocked; null leaves the lock to each player's save.
     */
    locked: boolean | null;

    /**
     * Held open or closed; null leaves the door to swing on its own.
     */
    open: boolean | null;
  }

  /**
   * Axes to change. Absent leaves an axis alone; null releases it.
   */
  interface DoorStateUpdate {
    /**
     * Hold the door locked or unlocked. Only a door carrying a lock can be locked.
     */
    readonly locked: boolean | null;

    /**
     * Hold the door open, or closed. A closed door still swings for anyone who walks into it unless locked.
     */
    readonly open: boolean | null;
  }

  /**
   * Server-held door state. Every client applies it on arrival and again whenever a matching door streams in, whatever that player's save says; a key or Alohomora on a held-locked door is refused and raises doorUnlockRequest.
   */
  const Doors: {
    /**
     * Holds a door's lock and/or open state for every player. The selector is an actor name, a persistent id '<name>:<guid>' (Doors.list on a client shows both), or an asset path. A selector left holding nothing is released.
     */
    set(selector: string, state: DoorStateUpdate): boolean;

    /**
     * The state held under one selector.
     */
    get(selector: string): DoorState | null;

    /**
     * Every held door state.
     */
    list(): DoorState[];

    /**
     * Releases one selector. Its doors keep their current state until they restream into each player's own save.
     */
    clear(selector: string): boolean;

    /**
     * Releases every selector; returns how many were held.
     */
    clearAll(): number;
  };

  /**
   * A server-owned herb plot and its growth state.
   */
  interface HerbPlotState {
    /**
     * Network key, derived from the position — not chosen.
     */
    uid: number;

    /**
     * Small_Plant | Medium_Plant | Large_Plant.
     */
    plotSize: string;

    /** */
    x: number;

    /** */
    y: number;

    /** */
    z: number;

    /**
     * Plant occupying the plot; empty when bare.
     */
    plantId: string;

    /**
     * Fertilizer applied; independent of growth.
     */
    fertilizerId: string;

    /**
     * 0 None, 1 Growing, 2 Grown, 4 Regrowing.
     */
    state: number;

    /**
     * 0..1 growth progress.
     */
    progress: number;

    /**
     * Player entity id that planted it.
     */
    gardenerId: number;
  }

  /**
   * Server-owned herb plots, replicated to every client.
   */
  const Herbology: {
    /**
     * Places (or replaces) a plot and returns its derived uid, 0 on failure. Placing the same coordinates twice replaces rather than duplicating.
     */
    place(plotSize: string, x: number, y: number, z: number): number;

    /**
     * The uid a plot at these coordinates would have, without placing one.
     */
    uidAt(x: number, y: number, z: number): number;

    /**
     * Removes a plot everywhere.
     */
    remove(uid: number): boolean;

    /**
     * One plot by uid.
     */
    get(uid: number): HerbPlotState | null;

    /**
     * Every server-owned plot.
     */
    list(): HerbPlotState[];

    /**
     * Plants into an empty plot. Refused when something is already growing.
     */
    plant(uid: number, plantId: string, gardenerId?: number): boolean;

    /**
     * Fertilises an occupied plot. Refused if already fertilised — the yield bonus would stack.
     */
    fertilize(uid: number, fertilizerId?: string): boolean;

    /**
     * Consumes the ready crop. Refused unless the plot is Grown, which is what stops two players collecting it twice.
     */
    harvest(uid: number, multiHarvestable?: boolean): boolean;

    /**
     * Empties a plot back to bare earth.
     */
    clear(uid: number): boolean;

    /**
     * Writes the growth state directly; 3 is folded to 4, since the applier would destroy the plant.
     */
    setGrowth(uid: number, state: number, progress?: number): boolean;
  };

  /**
   * Points per house.
   */
  interface HouseStandings {
    /**
     * Gryffindor's points.
     */
    Gryffindor: number;

    /**
     * Hufflepuff's points.
     */
    Hufflepuff: number;

    /**
     * Ravenclaw's points.
     */
    Ravenclaw: number;

    /**
     * Slytherin's points.
     */
    Slytherin: number;
  }

  /**
   * Points a player's game tried to award.
   */
  interface HousePointsRequest {
    /**
     * The house the game named.
     */
    house: "Gryffindor" | "Hufflepuff" | "Ravenclaw" | "Slytherin";

    /**
     * Points to add; negative to take away.
     */
    delta: number;

    /**
     * `award` for gameplay (classes, quests); `houseCup` for the story's end-of-year rig, which hands the player's house a 150-point lead.
     */
    source: "award" | "houseCup";
  }

  /**
   * The server's house standings, the same for every player: every house starts at 0, and every client's game uses them, so the four hourglasses in the Reception Hall fill to them for everyone. A player's own in-game award is refused by their client and raised as housePointsRequest; an ordinary award of up to 100 counts unless a handler returns false. Houses are named case-insensitively. Changes raise housePointsChange(house, points, previous).
   */
  const HousePoints: {
    /**
     * The four houses, canonically spelt.
     */
    readonly houses: string[];

    /**
     * One house's standing.
     */
    get(house: string): number;

    /**
     * Every house's standing.
     */
    all(): HouseStandings;

    /**
     * Sets one house's standing. False outside +-1000000.
     */
    set(house: string, points: number): boolean;

    /**
     * Adds to (or, negative, takes from) one house. The result is clamped to +-1000000 and returned.
     */
    add(house: string, delta: number): number;

    /**
     * Sets several houses in one change; houses left out keep theirs. False, changing nothing, when any value is outside +-1000000.
     */
    setAll(points: Partial<HouseStandings>): boolean;
  };

  /**
   * One immutable definition from the compiled Hogwarts Legacy inventory catalog.
   */
  interface InventoryCatalogDefinition {
    /**
     * Canonical, case-preserving ItemDefinition id.
     */
    readonly itemId: string;

    /**
     * Native ItemDefinition.ItemType value.
     */
    readonly itemType: string;

    /**
     * Catalog-defined default inventory holder, not necessarily a live row's holder.
     */
    readonly holder: string;

    /**
     * Native MaxInventoryStack value, including zero.
     */
    readonly maxStack: number;

    /**
     * Normalized inventory item kind.
     */
    readonly kind: InventoryItemKind;

    /**
     * Whether the native definition is inventoryable.
     */
    readonly inventoryable: boolean;

    /**
     * Whether the native definition is persistent.
     */
    readonly persistent: boolean;

    /**
     * Whether the native definition is consumable.
     */
    readonly consumable: boolean;

    /**
     * Whether the native definition can be used from inventory.
     */
    readonly usableFromInventory: boolean;
  }

  /**
   * Version and size of the compiled inventory catalog.
   */
  interface InventoryCatalogInfo {
    /**
     * InventoryCatalog contract version.
     */
    readonly schemaVersion: 1;

    /**
     * Hogwarts Legacy build used to generate the catalog.
     */
    readonly gameBuild: string;

    /**
     * Number of compiled definitions.
     */
    readonly definitions: number;
  }

  /**
   * Known storage and active holders for one mount category.
   */
  interface InventoryHolderPair {
    /**
     * Canonical storage holder.
     */
    readonly storageHolder: string;

    /**
     * Canonical active holder read by the mount wheel.
     */
    readonly activeHolder: string;
  }

  /**
   * Optional AND-combined filters for InventoryCatalog.list().
   */
  interface InventoryCatalogFilter {
    /**
     * Optional filter by inventoryable state.
     */
    readonly inventoryable: boolean | undefined;

    /**
     * Optional filter by persistent state.
     */
    readonly persistent: boolean | undefined;

    /**
     * Optional filter by consumable state.
     */
    readonly consumable: boolean | undefined;

    /**
     * Optional filter by inventory-use state.
     */
    readonly usableFromInventory: boolean | undefined;

    /**
     * Optional filter by normalized item kind.
     */
    readonly kind: InventoryItemKind | undefined;

    /**
     * Optional case-insensitive exact item-type filter.
     */
    readonly itemType: string | undefined;

    /**
     * Optional case-insensitive exact default-holder filter.
     */
    readonly holder: string | undefined;
  }

  /**
   * Read-only access to the compiled Hogwarts Legacy inventory definition catalog.
   */
  const InventoryCatalog: {
    /**
     * Returns catalog version, game build, and definition count.
     */
    info(): InventoryCatalogInfo;

    /**
     * Returns a canonical catalog definition, or null when absent.
     * @param itemId Exact lookup first, then case-insensitive fallback.
     */
    get(itemId: string): InventoryCatalogDefinition | null;

    /**
     * Tests whether an item id exists in the compiled catalog.
     * @param itemId Exact lookup first, then case-insensitive fallback.
     */
    has(itemId: string): boolean;

    /**
     * Returns fresh catalog objects in canonical itemId order.
     * @param filter All provided filters are combined with AND.
     */
    list(filter?: InventoryCatalogFilter): InventoryCatalogDefinition[];

    /**
     * Returns the canonical mount-holder pair for either half, or null for an ordinary holder.
     * @param holder Storage or active mount holder, matched case-insensitively.
     */
    holderPair(holder: string): InventoryHolderPair | null;
  };

  /**
   * One stack in a lootable: a catalog item id and how many.
   */
  interface LootItem {
    /**
     * InventoryCatalog id.
     */
    itemId: string;

    /**
     * Whole number from 1. Defaults to 1 when left out.
     */
    count: number;
  }

  /**
   * What a player sees in a lootable.
   */
  interface LootableContents {
    /** */
    items: LootItem[];

    /**
     * A locked lootable offers nothing to take.
     */
    locked: boolean;
  }

  /**
   * A server-owned lootable.
   */
  interface LootableState {
    /**
     * Minted by the server; never reused in a session.
     */
    id: number;

    /**
     * "chest", "moonstone" or "foragable".
     */
    kind: string;

    /**
     * Blueprint class path the lootable spawns as.
     */
    model: string;

    /** */
    x: number;

    /** */
    y: number;

    /** */
    z: number;

    /** */
    yaw: number;

    /**
     * What every player without a view sees.
     */
    items: LootItem[];

    /** */
    locked: boolean;

    /**
     * "shared" (taken once in total) or "perPlayer" (once per player).
     */
    mode: string;
  }

  /**
   * Server-owned loot: chests opened with F, moonstone deposits broken with a spell, foragables picked up with F. A take is accepted only up to what the player sees and is adopted into their inventory automatically. Who may loot what, respawns and persistence are the gamemode's: use views and lootableTaken.
   */
  const Lootables: {
    /**
     * Places a lootable for every client and returns its id, 0 on failure. An empty or locked moonstone shows mined out, an empty or locked foragable picked.
     * @param options mode defaults to "shared". model is a Blueprint class path; it defaults to a Hogwarts chest, a small moonstone deposit, or the foragable that gives the item. Moonstones take BP_Moonstone_S/M/L and foragables the five shipped foragable Blueprints only. Moonstones and foragables hold plain items only, and a foragable one stack.
     */
    place(kind: "chest" | "moonstone" | "foragable", x: number, y: number, z: number, yaw?: number, options?: { items?: LootItem[]; locked?: boolean; mode?: "shared" | "perPlayer"; model?: string }): number;

    /**
     * Replaces what every player without a view sees; an empty list empties it.
     */
    setItems(id: number, items: LootItem[]): boolean;

    /**
     * Locks or unlocks it for every player without a view.
     */
    setLocked(id: number, locked: boolean): boolean;

    /**
     * Shared: a take empties it for everyone. PerPlayer: a take empties only the taker's view.
     */
    setMode(id: number, mode: "shared" | "perPlayer"): boolean;

    /**
     * Overrides what one player sees in it. Views last for the connection: a gamemode keeping them across reconnects re-applies them.
     * @param view Fields left out keep the lootable's own value; null drops the view.
     */
    setView(id: number, player: Player, view: { items?: LootItem[]; locked?: boolean } | null): boolean;

    /**
     * The player's view, or null when they see the lootable's own contents.
     */
    getView(id: number, player: Player): LootableContents | null;

    /**
     * Removes it from every client.
     */
    remove(id: number): boolean;

    /**
     * One lootable by id.
     */
    get(id: number): LootableState | null;

    /**
     * Every server-owned lootable.
     */
    list(): LootableState[];
  };

  /**
   * Server-authoritative world state: the global state bag, the clock, the calendar, the season, the weather, holiday decor and the Headmaster's office.
   */
  const World: {
    /**
     * Network id of the entity carrying `World.state`, for filtering the global `entityStateChange` bus. 0 before it exists.
     */
    readonly stateId: number;

    /**
     * Global replicated key/value state, shared by every resource and visible to every client. The server writes it; clients read it. Null before networking is up. See StateBag.
     */
    readonly state: StateBag | null;

    /**
     * Replicated weather template name.
     */
    readonly weather: string;

    /**
     * Hour of day (0-23).
     */
    readonly hour: number;

    /**
     * Minute of the hour (0-59).
     */
    readonly minute: number;

    /**
     * Second of the minute (0-59).
     */
    readonly second: number;

    /**
     * Day of the month.
     */
    readonly day: number;

    /**
     * Month of the year (1-12).
     */
    readonly month: number;

    /**
     * Calendar year, or 0 when the game keeps its native year.
     */
    readonly year: number;

    /**
     * 0 spring, 1 summer, 2 autumn, 3 winter.
     */
    readonly season: 0 | 1 | 2 | 3;

    /**
     * In-game minutes advanced per real second.
     */
    readonly timeScale: number;

    /**
     * Holiday decor pinned on every client: "halloween", "christmas", "none", or "game" (the default: left to story missions).
     */
    readonly decor: "game" | "none" | "halloween" | "christmas";

    /**
     * The Headmaster's office staircase pinned on every client: "open", "closed", or "game" (the default: left to the story quest).
     */
    readonly headmasterOffice: "game" | "open" | "closed";

    /**
     * Which families of the game's own loot are switched off on every client.
     */
    readonly lootSuppressed: { chests: boolean; moonstones: boolean; foragables: boolean };

    /**
     * Monotonic server revision advanced whenever authoritative world state changes.
     */
    readonly revision: number;

    /**
     * Returns the number of connected players (cheaper than PlayerManager.getAll().length).
     * @returns The connected player count.
     */
    getPlayerCount(): number;

    /**
     * Sets the active replicated weather template. Template membership is not validated.
     * @param name Non-empty weather template name to replicate to clients.
     * @returns False for an empty/oversized name or unavailable server.
     */
    setWeather(name: string): boolean;

    /**
     * Switches off the game's own world loot on every client, so Lootables can be the only loot: placed chests are hidden, and Overland moonstone and foragable spawns are removed along with placed deposits and foragables. Room of Requirement storage and quest containers are never touched. Spawns are removed from areas that load after the change, so set it at startup; placed actors follow at once.
     * @param families true switches a family off, false back on; families left out keep their setting.
     * @returns False for a non-object, a non-boolean value or unavailable server.
     */
    suppressLoot(families: { chests?: boolean; moonstones?: boolean; foragables?: boolean }): boolean;

    /**
     * Sets the replicated time of day. The clock keeps running from there at the current time scale.
     * @param hour Hour of day (0-23).
     * @param minute Minute of the hour (0-59).
     * @param second Second of the minute (0-59). Defaults to 0.
     * @returns False for an invalid range or unavailable server.
     */
    setTime(hour: number, minute: number, second?: number): boolean;

    /**
     * Sets the replicated calendar date.
     * @param day Valid day for the selected month (February allows 29).
     * @param month Month of year.
     * @param year Calendar year. Omit (or 0) to keep the game's own, ~1891.
     * @returns False for an invalid range or unavailable server.
     */
    setDate(day: number, month: number, year?: number): boolean;

    /**
     * Sets the replicated season.
     * @param season 0 = spring, 1 = summer, 2 = autumn, 3 = winter.
     * @returns False for a non-integer, invalid range, or unavailable server.
     */
    setSeason(season: number): boolean;

    /**
     * Sets the holiday decor every client shows, re-applied whenever a client's world loads or a mission changes it. Releasing to "game" leaves the decor as it was until a mission changes it. The winter season's own garlands are not holiday decor and follow World.setSeason.
     * @param decor "halloween" or "christmas" shows that holiday's castle and Hogsmeade decorations; "none" keeps both off; "game" stops pinning and leaves them to story missions.
     * @returns False for any other value or an unavailable server.
     */
    setDecor(decor: "game" | "none" | "halloween" | "christmas"): boolean;

    /**
     * Sets the Headmaster's office staircase on every client, re-applied whenever a client's world loads or a quest changes it. "open" also raises a staircase that is already loaded. A raised staircase stays up until its part of the castle reloads, so "closed" takes effect on the next visit.
     * @param office "open" raises the gargoyle staircase to the Headmaster's office; "closed" keeps it down; "game" stops pinning and leaves it to the story quest.
     * @returns False for any other value or an unavailable server.
     */
    setHeadmasterOffice(office: "game" | "open" | "closed"): boolean;

    /**
     * Sets the rate of the server-authoritative clock.
     * @param minutesPerSecond In-game minutes advanced per real second (0-600). 1 = a 24-minute in-game day; 0 freezes the clock.
     * @returns False for an invalid range or unavailable server.
     */
    setTimeScale(minutesPerSecond: number): boolean;
  };

  /**
   * Player-vs-player damage arbitration. The hit pipeline (impact relay, victim apply, vitals fan-out) is native; these knobs steer it.
   */
  const Pvp: {
    /**
     * Registers (or clears, with no/null argument) the per-hit policy hook — duels, zones, and gamemode PvP rules live here.
     * @param fn Called per hit with {casterId, victimId, spellId, spell, damage, duration}. Return false to veto, a number to replace the damage, {allow?, damage?, duration?} for full control, or nothing to accept.
     */
    setPolicy(fn?: PvpPolicy | null): boolean;

    /**
     * Forces a flat damage per hit, or restores per-spell arbitration with 0.
     * @param amount 0 (default) = the engine's per-spell number with the authored-table fallback; > 0 forces every hit flat.
     */
    setDamage(amount?: number): number;

    /**
     * Overrides the duration handed to the relayed state effect on the victim.
     * @param seconds 0 (default) = each spell record's own effect duration.
     */
    setDuration(seconds?: number): number;

    /**
     * Per-spell damage the server enforces — wins over the engine's own number (server-owner balance; the built-in authored table stays as the zero-config baseline). Use for modded/custom spells or to rebalance stock ones.
     * @param spell Record path or basename, e.g. 'DA_ExpulsoSpellRecord'.
     * @param damage Per-hit damage for that spell; UNCLAMPED (1e6 = lethal). null/omitted removes the entry.
     */
    setSpellDamage(spell: string, damage?: number | null): boolean;

    /**
     * That player's last natively-reported vitals: {hp, max, level, ageMs}. Null before their first report. The policy object also carries victimHp/victimMax per hit.
     */
    getVitals(playerId: number): object | null;
  };

  /**
   * Native events dispatched through `Events.on`. Each property is the exact callback argument tuple for that event.
   */
  interface EventMap {
    /**
     * Dispatched after a resource entry point has run and immediately before the resource becomes running.
     */
    resourceStart: [resourceName: string];

    /**
     * Dispatched while a resource is stopping, before its stop callback, timers, exports and event handlers are cleaned up.
     */
    resourceStop: [resourceName: string];

    /**
     * Dispatched when one key of an entity's state changes: on the server when a script writes it, on a client when the write arrives. `value` is undefined when the key was removed and `previous` is undefined when it held nothing before, so a stored null stays distinguishable from an absent key. The entity is whatever the game's WrapScriptEntity answers, and the base Entity handle by default.
     */
    entityStateChange: [entity: Entity, key: string, value: any, previous: any];

    /**
     * Dispatched for a line typed into the server console that no built-in command (help, ensure, refresh, ...) claimed. `args` is the rest of the line, split on whitespace. The console is the operator's, so this is the place for commands no player may run.
     */
    consoleCommand: [command: string, args: string[]];

    /**
     * Dispatched when a player asks to join, before the connection exists: they hold no player slot, are not counted as online, and are sent nothing -- no resource list, no download, no body. The request waits until every handler has returned and every Promise a handler returned has settled, then it is let in if a player slot is free (otherwise it is refused as full). `connection.reject()` turns it away instead, and so does a handler that throws or rejects, or handlers that have not settled within the server's admission timeout (30 seconds by default, restarted by every `connection.update()`). With no handler at all, every request is let in at once.
     */
    playerConnecting: [connection: PendingConnection];
  }

  /** Names of native events available in this scripting environment. */
  type EventName = keyof EventMap;

  /**
   * Node.js timer handle returned by setTimeout and setInterval.
   */
  interface Timeout {
    /**
     * Keeps the event loop alive while this timer is pending.
     * @returns This timer.
     */
    ref(): Timeout;

    /**
     * Lets the event loop exit while this timer is still pending.
     * @returns This timer.
     */
    unref(): Timeout;

    /**
     * Whether this timer keeps the event loop alive.
     */
    hasRef(): boolean;

    /**
     * Restarts this timer's countdown from now, with its original delay.
     * @returns This timer.
     */
    refresh(): Timeout;
  }

  /**
   * Mutable two-dimensional vector.
   */
  class Vector2 {
    /**
     * Creates a vector from two numeric components.
     * @param x Initial X component.
     * @param y Initial Y component.
     */
    constructor(x: number, y: number);

    /**
     * Mutable X component.
     */
    x: number;

    /**
     * Mutable Y component.
     */
    y: number;

    /**
     * Read-only Euclidean magnitude of this vector.
     */
    readonly length: number;

    /**
     * Read-only squared magnitude, avoiding a square-root calculation.
     */
    readonly lengthSquared: number;

    /**
     * Adds another vector to this vector in place.
     * @param other Vector to add component-wise.
     * @returns This mutated vector for chaining.
     */
    add(other: Vector2): this;

    /**
     * Subtracts another vector from this vector in place.
     * @param other Vector to subtract component-wise.
     * @returns This mutated vector for chaining.
     */
    sub(other: Vector2): this;

    /**
     * Multiplies this vector by a scalar in place.
     * @param scalar Multiplier applied to both components.
     * @returns This mutated vector for chaining.
     */
    mul(scalar: number): this;

    /**
     * Divides this vector by a scalar in place.
     * @param scalar Divisor applied to both components; must be non-zero.
     * @returns This mutated vector for chaining.
     */
    div(scalar: number): this;

    /**
     * Computes the dot product without changing either vector.
     * @param other Vector used for the dot product.
     * @returns Scalar dot product.
     */
    dot(other: Vector2): number;

    /**
     * Normalizes this vector in place; a zero vector remains unchanged.
     * @returns This mutated vector for chaining.
     */
    normalize(): this;

    /**
     * Linearly interpolates this vector toward a target in place.
     * @param target Destination vector.
     * @param t Interpolation factor; 0 keeps the current value and 1 reaches target.
     * @returns This mutated vector for chaining.
     */
    lerp(target: Vector2, t: number): this;

    /**
     * Replaces both components in place.
     * @param x Replacement X component.
     * @param y Replacement Y component.
     * @returns This mutated vector for chaining.
     */
    set(x: number, y: number): this;

    /**
     * Computes Euclidean distance to another vector.
     * @param other Vector to measure from this vector.
     * @returns Distance between the two vectors.
     */
    distance(other: Vector2): number;

    /**
     * Creates an independent copy of this vector.
     * @returns New vector with the same components.
     */
    clone(): Vector2;

    /**
     * Formats this vector for logging and debugging.
     * @returns Text in Vector2(x, y) form.
     */
    toString(): string;

    /**
     * Converts this vector to a plain object for JSON.stringify.
     * @returns Object containing the current components.
     */
    toJSON(): { x: number; y: number };

    /**
     * Creates a vector whose components are zero.
     * @returns New Vector2(0, 0).
     */
    static zero(): Vector2;

    /**
     * Creates a vector whose components are one.
     * @returns New Vector2(1, 1).
     */
    static one(): Vector2;
  }

  /**
   * Mutable three-dimensional vector for positions, directions, and Euler angles.
   */
  class Vector3 {
    /**
     * Creates a vector from three numeric components.
     * @param x Initial X component.
     * @param y Initial Y component.
     * @param z Initial Z component.
     */
    constructor(x: number, y: number, z: number);

    /**
     * Mutable X component.
     */
    x: number;

    /**
     * Mutable Y component.
     */
    y: number;

    /**
     * Mutable Z component.
     */
    z: number;

    /**
     * Read-only Euclidean magnitude of this vector.
     */
    readonly length: number;

    /**
     * Read-only squared magnitude, avoiding a square-root calculation.
     */
    readonly lengthSquared: number;

    /**
     * Adds another vector to this vector in place.
     * @param other Vector to add component-wise.
     * @returns This mutated vector for chaining.
     */
    add(other: Vector3): this;

    /**
     * Subtracts another vector from this vector in place.
     * @param other Vector to subtract component-wise.
     * @returns This mutated vector for chaining.
     */
    sub(other: Vector3): this;

    /**
     * Multiplies this vector by a scalar in place.
     * @param scalar Multiplier applied to every component.
     * @returns This mutated vector for chaining.
     */
    mul(scalar: number): this;

    /**
     * Divides this vector by a scalar in place.
     * @param scalar Divisor applied to every component; must be non-zero.
     * @returns This mutated vector for chaining.
     */
    div(scalar: number): this;

    /**
     * Computes the dot product without changing either vector.
     * @param other Vector used for the dot product.
     * @returns Scalar dot product.
     */
    dot(other: Vector3): number;

    /**
     * Replaces this vector with its cross product against another vector.
     * @param other Second vector in the cross product.
     * @returns This mutated perpendicular vector for chaining.
     */
    cross(other: Vector3): this;

    /**
     * Normalizes this vector in place; a zero vector remains unchanged.
     * @returns This mutated vector for chaining.
     */
    normalize(): this;

    /**
     * Linearly interpolates this vector toward a target in place.
     * @param target Destination vector.
     * @param t Interpolation factor; 0 keeps the current value and 1 reaches target.
     * @returns This mutated vector for chaining.
     */
    lerp(target: Vector3, t: number): this;

    /**
     * Replaces all components in place.
     * @param x Replacement X component.
     * @param y Replacement Y component.
     * @param z Replacement Z component.
     * @returns This mutated vector for chaining.
     */
    set(x: number, y: number, z: number): this;

    /**
     * Computes Euclidean distance to another vector.
     * @param other Vector to measure from this vector.
     * @returns Distance between the two vectors.
     */
    distance(other: Vector3): number;

    /**
     * Creates an independent copy of this vector.
     * @returns New vector with the same components.
     */
    clone(): Vector3;

    /**
     * Formats this vector for logging and debugging.
     * @returns Text in Vector3(x, y, z) form.
     */
    toString(): string;

    /**
     * Converts this vector to a plain object for JSON.stringify.
     * @returns Object containing the current components.
     */
    toJSON(): { x: number; y: number; z: number };

    /**
     * Creates a zero vector.
     * @returns New Vector3(0, 0, 0).
     */
    static zero(): Vector3;

    /**
     * Creates a vector whose components are one.
     * @returns New Vector3(1, 1, 1).
     */
    static one(): Vector3;

    /**
     * Creates the framework's positive-Y unit direction.
     * @returns New Vector3(0, 1, 0).
     */
    static up(): Vector3;

    /**
     * Creates the framework's positive-Z unit direction.
     * @returns New Vector3(0, 0, 1).
     */
    static forward(): Vector3;

    /**
     * Creates the framework's positive-X unit direction.
     * @returns New Vector3(1, 0, 0).
     */
    static right(): Vector3;
  }

  /**
   * Mutable four-dimensional vector.
   */
  class Vector4 {
    /**
     * Creates a vector from four numeric components.
     * @param x Initial X component.
     * @param y Initial Y component.
     * @param z Initial Z component.
     * @param w Initial W component.
     */
    constructor(x: number, y: number, z: number, w: number);

    /**
     * Mutable X component.
     */
    x: number;

    /**
     * Mutable Y component.
     */
    y: number;

    /**
     * Mutable Z component.
     */
    z: number;

    /**
     * Mutable W component.
     */
    w: number;

    /**
     * Read-only Euclidean magnitude of this vector.
     */
    readonly length: number;

    /**
     * Read-only squared magnitude, avoiding a square-root calculation.
     */
    readonly lengthSquared: number;

    /**
     * Adds another vector to this vector in place.
     * @param other Vector to add component-wise.
     * @returns This mutated vector for chaining.
     */
    add(other: Vector4): this;

    /**
     * Subtracts another vector from this vector in place.
     * @param other Vector to subtract component-wise.
     * @returns This mutated vector for chaining.
     */
    sub(other: Vector4): this;

    /**
     * Multiplies this vector by a scalar in place.
     * @param scalar Multiplier applied to every component.
     * @returns This mutated vector for chaining.
     */
    mul(scalar: number): this;

    /**
     * Divides this vector by a scalar in place.
     * @param scalar Divisor applied to every component; must be non-zero.
     * @returns This mutated vector for chaining.
     */
    div(scalar: number): this;

    /**
     * Computes the dot product without changing either vector.
     * @param other Vector used for the dot product.
     * @returns Scalar dot product.
     */
    dot(other: Vector4): number;

    /**
     * Computes Euclidean distance to another vector.
     * @param other Vector to measure from this vector.
     * @returns Distance between the two vectors.
     */
    distance(other: Vector4): number;

    /**
     * Normalizes this vector in place; a zero vector remains unchanged.
     * @returns This mutated vector for chaining.
     */
    normalize(): this;

    /**
     * Linearly interpolates this vector toward a target in place.
     * @param target Destination vector.
     * @param t Interpolation factor; 0 keeps the current value and 1 reaches target.
     * @returns This mutated vector for chaining.
     */
    lerp(target: Vector4, t: number): this;

    /**
     * Replaces all components in place.
     * @param x Replacement X component.
     * @param y Replacement Y component.
     * @param z Replacement Z component.
     * @param w Replacement W component.
     * @returns This mutated vector for chaining.
     */
    set(x: number, y: number, z: number, w: number): this;

    /**
     * Creates an independent copy of this vector.
     * @returns New vector with the same components.
     */
    clone(): Vector4;

    /**
     * Formats this vector for logging and debugging.
     * @returns Text in Vector4(x, y, z, w) form.
     */
    toString(): string;

    /**
     * Converts this vector to a plain object for JSON.stringify.
     * @returns Object containing the current components.
     */
    toJSON(): { x: number; y: number; z: number; w: number };

    /**
     * Creates a zero vector.
     * @returns New Vector4(0, 0, 0, 0).
     */
    static zero(): Vector4;

    /**
     * Creates a vector whose components are one.
     * @returns New Vector4(1, 1, 1, 1).
     */
    static one(): Vector4;
  }

  /**
   * Mutable quaternion for three-dimensional rotations. Components are scalar-first (w, x, y, z), matching GLM — not the x, y, z, w order some libraries use.
   */
  class Quaternion {
    /**
     * Creates a quaternion in scalar-first w, x, y, z component order. Watch the trap: the scalar w is the first argument, unlike the x, y, z, w order used by some other libraries.
     * @param w Initial scalar component (comes first — this is not x, y, z, w order).
     * @param x Initial X imaginary component.
     * @param y Initial Y imaginary component.
     * @param z Initial Z imaginary component.
     */
    constructor(w: number, x: number, y: number, z: number);

    /**
     * Mutable scalar component.
     */
    w: number;

    /**
     * Mutable X imaginary component.
     */
    x: number;

    /**
     * Mutable Y imaginary component.
     */
    y: number;

    /**
     * Mutable Z imaginary component.
     */
    z: number;

    /**
     * Read-only magnitude (norm) of this quaternion; 1 for a unit rotation.
     */
    readonly length: number;

    /**
     * Read-only squared magnitude, avoiding a square-root calculation.
     */
    readonly lengthSquared: number;

    /**
     * Composes this rotation with another quaternion in place.
     * @param other Rotation composed after this quaternion.
     * @returns This mutated quaternion for chaining.
     */
    mul(other: Quaternion): this;

    /**
     * Normalizes this quaternion in place; a zero quaternion becomes the identity rotation instead of NaN.
     * @returns This unit quaternion for chaining.
     */
    normalize(): this;

    /**
     * Computes the conjugate without changing this quaternion.
     * @returns New conjugated quaternion.
     */
    conjugate(): Quaternion;

    /**
     * Computes the inverse rotation without changing this quaternion.
     * @returns New inverse quaternion.
     */
    inverse(): Quaternion;

    /**
     * Spherically interpolates this quaternion toward a target in place.
     * @param target Destination rotation.
     * @param t Interpolation factor; 0 keeps the current rotation and 1 reaches target.
     * @returns This mutated quaternion for chaining.
     */
    slerp(target: Quaternion, t: number): this;

    /**
     * Computes the quaternion dot product.
     * @param other Quaternion used for the dot product.
     * @returns Scalar dot product.
     */
    dot(other: Quaternion): number;

    /**
     * Applies this rotation to a vector without mutating either value.
     * @param vector Vector to rotate.
     * @returns New rotated vector.
     */
    rotateVector(vector: Vector3): Vector3;

    /**
     * Converts this rotation to Euler angles in radians.
     * @returns Pitch, yaw, and roll as a Vector3.
     */
    toEuler(): Vector3;

    /**
     * Replaces all quaternion components in place.
     * @param w Replacement scalar component.
     * @param x Replacement X imaginary component.
     * @param y Replacement Y imaginary component.
     * @param z Replacement Z imaginary component.
     * @returns This mutated quaternion for chaining.
     */
    set(w: number, x: number, y: number, z: number): this;

    /**
     * Creates an independent copy of this quaternion.
     * @returns New quaternion with the same components.
     */
    clone(): Quaternion;

    /**
     * Formats this quaternion for logging and debugging.
     * @returns Text in Quaternion(w, x, y, z) form.
     */
    toString(): string;

    /**
     * Converts this quaternion to a plain object for JSON.stringify.
     * @returns Object containing the current components.
     */
    toJSON(): { w: number; x: number; y: number; z: number };

    /**
     * Creates the identity rotation.
     * @returns New Quaternion(1, 0, 0, 0).
     */
    static identity(): Quaternion;

    /**
     * Creates a rotation from Euler angles.
     * @param pitch Pitch angle in radians.
     * @param yaw Yaw angle in radians.
     * @param roll Roll angle in radians.
     * @returns New rotation quaternion.
     */
    static fromEuler(pitch: number, yaw: number, roll: number): Quaternion;

    /**
     * Creates a rotation around an axis.
     * @param axis Rotation axis; it is normalized internally.
     * @param angle Rotation angle in radians.
     * @returns New axis-angle rotation quaternion.
     */
    static fromAxisAngle(axis: Vector3, angle: number): Quaternion;
  }

  /**
   * Mutable RGBA color, with components stored from 0 to 1.
   */
  class Color {
    /**
     * Creates a color from normalized RGBA components.
     * @param r Initial red component from 0 to 1.
     * @param g Initial green component from 0 to 1.
     * @param b Initial blue component from 0 to 1.
     * @param a Optional alpha component from 0 to 1; defaults to 1.
     */
    constructor(r: number, g: number, b: number, a?: number);

    /**
     * Mutable normalized red component.
     */
    r: number;

    /**
     * Mutable normalized green component.
     */
    g: number;

    /**
     * Mutable normalized blue component.
     */
    b: number;

    /**
     * Mutable normalized alpha component.
     */
    a: number;

    /**
     * Linearly interpolates every component toward a target in place.
     * @param target Destination color.
     * @param t Interpolation factor; 0 keeps this color and 1 reaches target.
     * @returns This mutated color for chaining.
     */
    lerp(target: Color, t: number): this;

    /**
     * Replaces this color's normalized components in place.
     * @param r Replacement red component from 0 to 1.
     * @param g Replacement green component from 0 to 1.
     * @param b Replacement blue component from 0 to 1.
     * @param a Optional replacement alpha; defaults to 1 when omitted.
     * @returns This mutated color for chaining.
     */
    set(r: number, g: number, b: number, a?: number): this;

    /**
     * Creates an independent copy of this color.
     * @returns New color with the same components.
     */
    clone(): Color;

    /**
     * Converts normalized components to a hexadecimal CSS-style string.
     * @param includeAlpha Whether to append the alpha byte; defaults to false.
     * @returns Lowercase #rrggbb or #rrggbbaa string.
     */
    toHex(includeAlpha?: boolean): string;

    /**
     * Formats this color for logging and debugging.
     * @returns Text in Color(r, g, b, a) form.
     */
    toString(): string;

    /**
     * Converts this color to a plain object for JSON.stringify.
     * @returns Object containing the current normalized components.
     */
    toJSON(): { r: number; g: number; b: number; a: number };

    /**
     * Parses a hexadecimal color string.
     * @param hex Hexadecimal color in #RRGGBB or #RRGGBBAA form; the leading # is optional. Three- and four-digit shorthands are not supported.
     * @returns Parsed color, or opaque white when the input is invalid.
     */
    static fromHex(hex: string): Color;

    /**
     * Creates a normalized color from byte components.
     * @param r Red byte from 0 to 255.
     * @param g Green byte from 0 to 255.
     * @param b Blue byte from 0 to 255.
     * @param a Optional alpha byte from 0 to 255; defaults to 255.
     * @returns New normalized color.
     */
    static fromRGB(r: number, g: number, b: number, a?: number): Color;

    /**
     * Creates opaque white.
     * @returns New Color(1, 1, 1, 1).
     */
    static white(): Color;

    /**
     * Creates opaque black.
     * @returns New Color(0, 0, 0, 1).
     */
    static black(): Color;

    /**
     * Creates opaque red.
     * @returns New Color(1, 0, 0, 1).
     */
    static red(): Color;

    /**
     * Creates opaque green.
     * @returns New Color(0, 1, 0, 1).
     */
    static green(): Color;

    /**
     * Creates opaque blue.
     * @returns New Color(0, 0, 1, 1).
     */
    static blue(): Color;

    /**
     * Creates opaque yellow.
     * @returns New Color(1, 1, 0, 1).
     */
    static yellow(): Color;

    /**
     * Creates opaque cyan.
     * @returns New Color(0, 1, 1, 1).
     */
    static cyan(): Color;

    /**
     * Creates opaque magenta.
     * @returns New Color(1, 0, 1, 1).
     */
    static magenta(): Color;

    /**
     * Creates fully transparent black.
     * @returns New Color(0, 0, 0, 0).
     */
    static transparent(): Color;
  }

  /**
   * Asynchronous resource event bus.
   */
  interface EventBus {
    /**
     * Registers a persistent handler in the shared event namespace.
     * @param eventName Case-sensitive event name.
     * @param handler Resource-owned callback invoked with the emitted arguments.
     * @returns Function that removes this exact subscription.
     */
    on<K extends EventName>(eventName: K, handler: (...args: EventMap[K]) => unknown | Promise<unknown>): Unsubscribe;

    /**
     * Registers a persistent handler in the shared event namespace.
     * @param eventName Case-sensitive event name.
     * @param handler Resource-owned callback invoked with the emitted arguments.
     * @returns Function that removes this exact subscription.
     */
    on(eventName: string, handler: EventHandler): Unsubscribe;

    /**
     * Registers a handler that is removed before its first invocation.
     * @param eventName Case-sensitive event name.
     * @param handler Resource-owned callback invoked with the emitted arguments.
     */
    once<K extends EventName>(eventName: K, handler: (...args: EventMap[K]) => unknown | Promise<unknown>): void;

    /**
     * Registers a handler that is removed before its first invocation.
     * @param eventName Case-sensitive event name.
     * @param handler Resource-owned callback invoked with the emitted arguments.
     */
    once(eventName: string, handler: EventHandler): void;

    /**
     * Removes a matching handler owned by the calling resource.
     * @param eventName Case-sensitive event name.
     * @param handler Resource-owned callback invoked with the emitted arguments.
     */
    off<K extends EventName>(eventName: K, handler: (...args: EventMap[K]) => unknown | Promise<unknown>): void;

    /**
     * Removes a matching handler owned by the calling resource.
     * @param eventName Case-sensitive event name.
     * @param handler Resource-owned callback invoked with the emitted arguments.
     */
    off(eventName: string, handler: EventHandler): void;

    /**
     * Invokes every shared handler and waits for all synchronous and asynchronous results.
     * @param eventName Shared event name.
     * @param args Arguments delivered to every matching handler.
     * @returns Promise rejected with an AggregateError when one or more handlers fail.
     */
    emit(eventName: string, ...args: unknown[]): Promise<void>;

    /**
     * Invokes matching handlers belonging only to one resource.
     * @param resourceName Destination running resource.
     * @param eventName Shared event name.
     * @param args Arguments delivered to matching handlers owned by the destination.
     * @returns Promise rejected when one or more destination handlers fail.
     */
    emitTo(resourceName: string, eventName: string, ...args: unknown[]): Promise<void>;

    /**
     * Registers a handler in the calling resource's private local-event namespace.
     * @param eventName Case-sensitive event name.
     * @param handler Resource-owned callback invoked with the emitted arguments.
     */
    onLocal(eventName: string, handler: EventHandler): void;

    /**
     * Emits an event only within the calling resource.
     * @param eventName Private local event name.
     * @param args Arguments delivered only to handlers owned by the calling resource.
     * @returns Promise rejected when one or more local handlers fail.
     */
    emitLocal(eventName: string, ...args: unknown[]): Promise<void>;

    /**
     * Counts persistent and one-shot shared handlers across resources.
     * @param eventName Shared event name to inspect.
     * @returns Number of matching handlers.
     */
    listenerCount(eventName: string): number;

    /**
     * Broadcasts a named event to every connected client's shared Events handlers.
     * @param eventName Client shared-event name.
     * @param payload Optional string payload sent verbatim; other values are JSON-serialized.
     */
    emitAllClients(eventName: string, payload?: unknown): void;

    /**
     * Registers a persistent server handler for events originating from clients; this namespace is isolated from native events.
     * @param eventName Case-sensitive event name.
     * @param handler Resource-owned callback invoked with the emitted arguments.
     * @returns Function that removes this exact subscription.
     */
    onClient(eventName: string, handler: EventHandler): Unsubscribe;

    /**
     * Registers a one-shot server handler for a client-originated event.
     * @param eventName Case-sensitive event name.
     * @param handler Resource-owned callback invoked with the emitted arguments.
     */
    onceClient(eventName: string, handler: EventHandler): void;

    /**
     * Removes a matching client-originated event handler owned by the calling resource.
     * @param eventName Case-sensitive event name.
     * @param handler Resource-owned callback invoked with the emitted arguments.
     */
    offClient(eventName: string, handler: EventHandler): void;
  }

  /**
   * Asynchronous resource event bus.
   */
  const Events: EventBus;

  /**
   * Typed request and notification channel between local resources through the global Messages object.
   */
  const Messages: {
    /**
     * Registers or replaces a message handler owned by the calling resource.
     * @param messageType Message type unique within the receiving resource.
     * @param handler Handler invoked with the payload and a reply callback; the reply is ignored for notifications.
     */
    handle(messageType: string, handler: MessageHandler): void;

    /**
     * Sends a request to another local resource and waits for its handler to call reply.
     * @param resourceName Destination running resource.
     * @param messageType Handler type registered by the destination.
     * @param payload Optional payload delivered to the handler.
     * @returns Promise resolved with the reply value or rejected when delivery or handling fails.
     */
    request(resourceName: string, messageType: string, payload?: unknown): Promise<unknown>;

    /**
     * Sends a fire-and-forget notification to another local resource.
     * @param resourceName Destination running resource.
     * @param messageType Handler type registered by the destination.
     * @param payload Optional payload delivered to the handler.
     */
    send(resourceName: string, messageType: string, payload?: unknown): void;
  };

  /**
   * Bulk access to values exported by another running resource through the global Imports object.
   */
  const Imports: {
    /**
     * Builds an object containing every currently registered export from another resource; undeclared dependencies produce a warning.
     * @param resourceName Name of the running resource whose exports should be read.
     * @returns Object keyed by export name, or an empty object when the resource has no exports.
     */
    get(resourceName: string): Record<string, unknown>;
  };

  /**
   * Registration and lookup of cross-resource values through the global Exports object.
   */
  const Exports: {
    /**
     * Registers a value from the calling resource for use by dependent resources.
     * @param name Export name, preferably declared in the current resource manifest.
     * @param value JavaScript value or function retained by the current resource.
     * @returns True when the value was registered.
     */
    register(name: string, value: unknown): boolean;

    /**
     * Reads one registered export from another running resource; undeclared dependencies produce a warning.
     * @param resourceName Name of the running resource that owns the export.
     * @param exportName Registered export name.
     * @returns The exported value.
     */
    get(resourceName: string, exportName: string): unknown;
  };

  /**
   * Resource-aware console that routes output through the Framework logger.
   */
  const console: {
    /**
     * Writes an informational log entry prefixed with the current resource name.
     * @param values Values formatted and joined with spaces.
     */
    log(...values: unknown[]): void;

    /**
     * Alias of console.log for informational output.
     * @param values Values formatted and joined with spaces.
     */
    info(...values: unknown[]): void;

    /**
     * Writes a warning log entry prefixed with the current resource name.
     * @param values Values formatted and joined with spaces.
     */
    warn(...values: unknown[]): void;

    /**
     * Writes an error log entry prefixed with the current resource name.
     * @param values Values formatted and joined with spaces.
     */
    error(...values: unknown[]): void;

    /**
     * Writes a debug log entry prefixed with the current resource name.
     * @param values Values formatted and joined with spaces.
     */
    debug(...values: unknown[]): void;
  };

  /**
   * Runtime-side flags exposed as the global ExecutionEnvironment.
   */
  const ExecutionEnvironment: {
    /**
     * True in the sandboxed client scripting runtime.
     */
    readonly isClient: boolean;

    /**
     * True in the authoritative server scripting runtime.
     */
    readonly isServer: boolean;

    /**
     * Local Framework release version.
     */
    readonly frameworkVersion: string;

    /**
     * Local mod version from InstanceOptions.modVersion; empty when unset.
     */
    readonly modVersion: string;
  };

  /**
   * Server-side delivery of structured chat messages to connected clients.
   */
  const Chat: {
    /**
     * Broadcasts a structured chat message to all clients.
     * @param text Message body broadcast to every connected client.
     * @param options Optional author label and color: a Color or a packed 0xRRGGBBAA integer.
     */
    sendToAll(text: string, options?: { author?: string; color?: number | Color }): void;

    /**
     * Sends a structured chat message to one player's owning connection.
     * @param player Player-owned entity identifying the destination connection.
     * @param text Message body sent to the player.
     * @param options Optional author label and color: a Color or a packed 0xRRGGBBAA integer.
     */
    sendToPlayer(player: Entity, text: string, options?: { author?: string; color?: number | Color }): void;
  };

  /**
   * Server-side proximity voice rules: how far voice carries, and who may talk to or hear whom.
   */
  const Voice: {
    /**
     * Sets how far voice carries for talkers with no override of their own. Connected clients are told, so their playback fades out at the same distance.
     * @param range Audibility radius in world units; values <= 0 restore the default of 25.
     */
    setRange(range: number): void;

    /**
     * Reads the server-wide proximity range.
     * @returns Radius in world units.
     */
    getRange(): number;

    /**
     * Overrides how far one player's voice carries, whichever voice tier they chose.
     * @param player Player whose voice carries the given distance.
     * @param range Audibility radius in world units; values <= 0 return them to the radius of their voice tier.
     */
    setPlayerRange(player: Entity, range: number): void;

    /**
     * Reads how far a player's voice carries, with the server-wide default already resolved.
     * @param player Player to query.
     * @returns Radius in world units.
     */
    getPlayerRange(player: Entity): number;

    /**
     * Sets how far a voice tier carries. Players switch tier themselves; whisper starts at 8, shout at 60, and normal carries the server-wide range. Set a tier to 0 to make it carry the server-wide range, which takes it away. Connected clients are told.
     * @param tier Voice tier: 0 whisper, 1 normal, 2 shout.
     * @param range Audibility radius in world units; values <= 0 make the tier carry the server-wide range.
     */
    setTierRange(tier: number, range: number): void;

    /**
     * Reads how far a voice tier carries, with the server-wide range already resolved.
     * @param tier Voice tier: 0 whisper, 1 normal, 2 shout.
     * @returns Radius in world units.
     */
    getTierRange(tier: number): number;

    /**
     * Puts a player on a voice tier, as if they had switched to it. Their own indicator follows, and the playerVoiceTierChange event is not raised.
     * @param player Player to move.
     * @param tier Voice tier: 0 whisper, 1 normal, 2 shout.
     */
    setPlayerTier(player: Entity, tier: number): void;

    /**
     * Reads the voice tier a player is on. A player switching tier raises the playerVoiceTierChange event with the player and the new tier.
     * @param player Player to query.
     * @returns 0 whisper, 1 normal, 2 shout.
     */
    getPlayerTier(player: Entity): number;

    /**
     * Server-wide mute: a muted player's voice reaches nobody.
     * @param player Player to mute or unmute.
     * @param muted True to stop their voice reaching anyone.
     */
    setPlayerMuted(player: Entity, muted: boolean): void;

    /**
     * Checks the server-wide mute flag.
     * @param player Player to query.
     * @returns True when the player's voice reaches nobody.
     */
    isPlayerMuted(player: Entity): boolean;

    /**
     * Server-wide deafen: a deaf player receives nobody.
     * @param player Player to deafen or undeafen.
     * @param deaf True to stop them receiving anyone's voice.
     */
    setPlayerDeaf(player: Entity, deaf: boolean): void;

    /**
     * Checks the server-wide deafen flag.
     * @param player Player to query.
     * @returns True when the player receives nobody's voice.
     */
    isPlayerDeaf(player: Entity): boolean;

    /**
     * One-way mute between two players, enforced by the server rather than the client.
     * @param listener Player who stops hearing the target.
     * @param target Player the listener stops hearing.
     * @param muted True to mute, false to restore.
     */
    setLocalMute(listener: Entity, target: Entity, muted: boolean): void;

    /**
     * Checks a one-way mute.
     * @param listener Player doing the muting.
     * @param target Player being muted.
     * @returns True when the listener does not receive the target.
     */
    isLocallyMuted(listener: Entity, target: Entity): boolean;

    /**
     * Checks whether a player left voice chat enabled in their own client settings. A preference, not a permission: use setPlayerMuted or setPlayerDeaf to enforce anything.
     * @param player Player to query.
     * @returns True unless the player turned voice chat off.
     */
    isPlayerVoiceEnabled(player: Entity): boolean;

    /**
     * Checks whether a player is speaking right now. Tracks speech rather than the push-to-talk key: silence is dropped before it reaches the server, and the state clears shortly after the last frame. The same signal raises the playerVoiceStart and playerVoiceStop events.
     * @param player Player to query.
     * @returns True while the player's voice is reaching the server.
     */
    isPlayerTalking(player: Entity): boolean;
  };

  /**
   * A player asking to join, handed to `playerConnecting`. Every identifier is reported by the player's own client and is not verified by the server.
   */
  interface PendingConnection {
    /**
     * The name the player asked to join under.
     */
    readonly nickname: string;

    /**
     * Steam identifier the client reported, or an empty string when it had none.
     */
    readonly steamId: string;

    /**
     * Epic Games account identifier the client reported, or an empty string when it had none.
     */
    readonly epicId: string;

    /**
     * Discord identifier the client reported, or an empty string when it had none.
     */
    readonly discordId: string;

    /**
     * Framework hardware identifier the client reported, or an empty string when it had none.
     */
    readonly hardwareId: string;

    /**
     * The string the client was launched with, as the `ticket` of its launch link, or an empty string. The framework passes it through untouched; checking it -- against a one-time join ticket your own launcher or website issued, typically -- is the script's job.
     */
    readonly ticket: string;

    /**
     * The remote address the connection comes from, without its port.
     */
    readonly ip: string;

    /**
     * Turns the player away before they receive anything. Takes effect on the next server tick, whatever other handlers are still doing. Does nothing once the connection is decided or the player has left.
     * @param reason Shown to the player as written, up to 512 bytes. Omitted, they read that the server refused the connection.
     */
    reject(reason?: string): void;

    /**
     * Shows the waiting player a line of status and restarts the admission timeout, so a queue that keeps updating its players is never timed out. Does nothing once the connection is decided or the player has left.
     * @param message One line for the player's connecting screen, up to 256 bytes: 'Checking the whitelist', 'You are 4th in the queue'.
     */
    update(message: string): void;

    /**
     * Checks whether this connection is still waiting on a decision.
     * @returns False once it was let in or turned away, or the player gave up and left; a queue drops such entries.
     */
    isPending(): boolean;
  }

  /**
   * Arbitrary key/value state attached to one replicated entity, reached as `entity.state`. Keys set on the server replicate to every client that can currently see the entity.
   */
  class StateBag {
    /**
     * Reads one key from this entity's state.
     * @param key Key to read.
     * @returns The stored value, or undefined when the key is not set.
     */
    get(key: string): any;

    /**
     * Checks whether this entity's state holds a key.
     * @param key Key to test.
     * @returns True when the key is set.
     */
    has(key: string): boolean;

    /**
     * Lists the keys this entity's state holds, sorted.
     * @returns Every key currently set, in ascending order.
     */
    keys(): string[];

    /**
     * Copies this entity's whole state into a plain object.
     * @returns Every key and value currently set. The copy does not track later changes.
     */
    toObject(): Record<string, any>;

    /**
     * Watches this entity's state. The filter is applied before the handler runs, so a listener watching one key of one entity is not woken by unrelated changes. The subscription is dropped when the registering resource stops.
     * @param key Only report this key, or null to report every key of this entity.
     * @param handler Called as (key: string, value: any, previous: any) with the changed key, its new value and the value before it. `value` is undefined when the key was removed and `previous` is undefined when it held nothing.
     * @returns A zero-argument function that cancels this subscription.
     */
    onChange(key: string | null, handler: Function): Function;

    /**
     * Writes one key of this entity's state and replicates it to whoever the scope names. Throws when a limit is reached.
     * @param key Key to write; at most 64 UTF-8 bytes.
     * @param value Value to store. Booleans, numbers and strings travel as themselves; anything else is serialized as JSON. At most 4096 bytes.
     * @param options Who the key reaches: every client that can see the entity (the default), only its owning client, or nobody -- server-side storage that never goes on the wire.
     * @returns True when the value changed, false when it was already stored.
     */
    set(key: string, value: any, options?: { scope?: 'broadcast' | 'owner' | 'server' }): boolean;

    /**
     * Removes one key from this entity's state, telling every client that held it.
     * @param key Key to drop.
     * @returns True when the key was set and has been removed.
     */
    remove(key: string): boolean;
  }

  /**
   * Framework-owned base handle for a connected player, extended by each game or mod.
   */
  class BasePlayer {
    /**
     * Creates a wrapper for an existing connected player with this ID; it does not connect or spawn a player.
     * @param id Network entity identifier.
     */
    constructor(id: number);

    /**
     * Authenticated Steam identifier, or an empty string when unavailable.
     */
    readonly steamId: string;

    /**
     * Epic Games account identifier the client reported, not verified by the server, or an empty string when unavailable.
     */
    readonly epicId: string;

    /**
     * Authenticated Discord identifier, or an empty string when unavailable.
     */
    readonly discordId: string;

    /**
     * Framework hardware identifier, or an empty string when unavailable.
     */
    readonly hardwareId: string;

    /**
     * Current round-trip latency in milliseconds, or -1 when unavailable.
     */
    readonly ping: number;

    /**
     * Current remote network address, or an empty string when unavailable.
     */
    readonly ip: string;

    /**
     * Formats this player handle for logging and debugging.
     * @returns Text containing the player's network entity ID.
     */
    toString(): string;

    /**
     * Checks whether this player's nametag is shown to other players.
     * @returns True unless the nametag was hidden; false also when this game has no nametags.
     */
    isNametagVisible(): boolean;

    /**
     * Checks whether the health bar under this player's nametag is shown.
     * @returns True unless the health bar was hidden; false also when this game has no nametags.
     */
    isNametagHealthVisible(): boolean;

    /**
     * Reads this player's nametag text override.
     * @returns The override, or an empty string when the player's own name is drawn.
     */
    getNametagText(): string;

    /**
     * Reads this player's nametag color.
     * @returns Packed 0xAARRGGBB color; opaque white when untinted.
     */
    getNametagColor(): number;

    /**
     * Disconnects this player from the server.
     * @param reason Optional reason shown to the disconnected player; omitting it uses the generic kicked reason.
     */
    kick(reason?: string): void;

    /**
     * Emits a named script event to this player's client connection.
     * @param eventName Client event name.
     * @param payloadJson Optional JSON payload forwarded verbatim to the owning client.
     */
    emit(eventName: string, payloadJson?: string): void;

    /**
     * Returns this player's current remote network address.
     * @returns Address string, or an empty string when the player or peer is unavailable.
     */
    getIP(): string;

    /**
     * Shows or hides the name over this player's head for every other player. The health bar has its own switch, and each player can still hide all nametags locally.
     * @param visible True to show this player's nametag to everyone, false to hide it.
     */
    setNametagVisible(visible: boolean): void;

    /**
     * Shows or hides the health bar under this player's nametag, leaving the name itself alone.
     * @param visible True to show the health bar under this player's name, false to hide it.
     */
    setNametagHealthVisible(visible: boolean): void;

    /**
     * Overrides the text drawn on this player's nametag.
     * @param text Text to show instead of the player's name, cut to 64 bytes; empty or omitted restores the name.
     */
    setNametagText(text?: string): void;

    /**
     * Tints the text on this player's nametag.
     * @param color Packed 0xAARRGGBB color.
     */
    setNametagColor(color: number): void;
  }

  interface BasePlayer extends Entity {}

  /**
   * Calls a function once after a delay.
   * @param handler Function to call.
   * @param milliseconds Delay before the call.
   * @param args Arguments passed to the handler.
   * @returns Handle to pass to the matching clear function.
   */
  function setTimeout(handler: (...args: any[]) => void, milliseconds?: number, ...args: unknown[]): Timeout;

  /**
   * Calls a function repeatedly, waiting the delay between calls.
   * @param handler Function to call.
   * @param milliseconds Delay before the call.
   * @param args Arguments passed to the handler.
   * @returns Handle to pass to the matching clear function.
   */
  function setInterval(handler: (...args: any[]) => void, milliseconds?: number, ...args: unknown[]): Timeout;

  /**
   * Cancels a pending setTimeout.
   * @param handle Handle returned when the timer was scheduled; anything else is ignored.
   */
  function clearTimeout(handle?: Timeout): void;

  /**
   * Cancels a setInterval.
   * @param handle Handle returned when the timer was scheduled; anything else is ignored.
   */
  function clearInterval(handle?: Timeout): void;

  /**
   * Queues a function on the microtask queue.
   * @param callback Function to run once the current task completes.
   */
  function queueMicrotask(callback: () => void): void;
}

export {};
