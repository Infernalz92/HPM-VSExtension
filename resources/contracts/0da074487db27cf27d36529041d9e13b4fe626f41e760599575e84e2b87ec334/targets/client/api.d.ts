import type { Entity, EventHandler, Unsubscribe, MessageHandler, KeyHandler, WebEventHandler, ProgressionSetPointsOptions, ProgressionSetPointsResult, WorldObjectClientState, FxClientState, GearItem, LookJson } from "../shared.js";

declare global {
  /**
   * Client-side game utilities available to sandboxed client resources.
   */
  const Game: {
    /**
     * Shows a line in the local chat UI.
     * @param text Message shown in the local chat UI.
     */
    notify(text: string): void;

    /**
     * Shows the cursor and locks game controls so a focused web view can be clicked. Refcounted per resource: pair each lockControls(true) with exactly one lockControls(false). Stopping a resource releases its holds.
     * @param enable true shows the cursor and locks controls; false restores gameplay input.
     */
    lockControls(enable: boolean): void;

    /**
     * True while anything holds a control lock. Locks are dropped on disconnect, so a lock still held at resource start belongs to another owner — never drain one you did not take.
     */
    areControlsLocked(): boolean;

    /**
     * Keeps the game's own Field Guide (the pause menu) from opening: ESC, the gamepad menu button and every page hotkey (map, inventory, character, talents, settings...) do nothing while it is held, so a resource can put its own menus behind those keys. The tool wheel, action screen and owl mail are untouched, and a Field Guide already open stays until the player closes it. One hold per resource, idempotent; the menu stays shut while any resource holds. The hold is dropped when the resource stops or reloads and on disconnect, so nothing has to be paired.
     * @param enabled false keeps the game's Field Guide from opening; true gives this resource's hold back.
     */
    setPauseMenuEnabled(enabled: boolean): void;

    /**
     * False while any resource holds the game's Field Guide shut.
     */
    isPauseMenuEnabled(): boolean;

    /**
     * Diagnostic snapshot: enabled mirrors isPauseMenuEnabled(), holders names the resources keeping the Field Guide shut, and locked is whether the game's UI manager currently carries the temp pause lock the hold is applied through (the game raises it itself during cut cameras).
     */
    pauseMenuState(): { enabled: boolean; locked: boolean; holders: string[] };

    /**
     * Keeps the game's action screen (the spell-set editor behind T / d-pad right) from opening, so a resource can own spell loadouts or put its own screen on that key. Casting, the spell diamond and the tool wheel are untouched, and an action screen already open stays until the player closes it. Same contract as setPauseMenuEnabled: one idempotent hold per resource, shut while any resource holds, dropped when the resource stops or reloads and on disconnect.
     * @param enabled false keeps the game's action screen from opening; true gives this resource's hold back.
     */
    setActionScreenEnabled(enabled: boolean): void;

    /**
     * False while any resource holds the game's action screen shut.
     */
    isActionScreenEnabled(): boolean;

    /**
     * Diagnostic snapshot for the action screen hold: holders names the resources keeping it shut, and locked is whether the player's NoEditActionBar game-logic flag, which the hold is applied through, is currently set.
     */
    actionScreenState(): { enabled: boolean; locked: boolean; holders: string[] };

    /**
     * Keeps the game's tool wheel (Tab / gamepad LB, the consumable and tool selector) from opening, so a resource that owns items or brooms can put its own wheel on that key. Also collapses the stock quick-item HUD slot while held, since it would otherwise sit there drawing an unusable diamond, and restores it on release. Quick item use, casting and the spell diamond are untouched, and a wheel already open stays until the player closes it. Same contract as setPauseMenuEnabled: one idempotent hold per resource, shut while any resource holds, dropped when the resource stops or reloads and on disconnect.
     * @param enabled false keeps the game's tool wheel from opening; true gives this resource's hold back.
     */
    setToolWheelEnabled(enabled: boolean): void;

    /**
     * False while any resource holds the game's tool wheel shut.
     */
    isToolWheelEnabled(): boolean;

    /**
     * Diagnostic snapshot for the tool wheel hold: holders names the resources keeping it shut, and locked is whether the player's TutorialMechanics ItemMenu bit, which the hold is applied through, is currently cleared.
     */
    toolWheelState(): { enabled: boolean; locked: boolean; holders: string[] };

    /**
     * Keeps one page of the game's Field Guide out of reach while the rest of it, the map included, keeps working: its tab is greyed out and skipped when paging, its hotkey does nothing, and its entry on the Field Guide's first page does nothing. The page stays out through save loads and story unlocks. A page already open stays until the player leaves it. Same contract as setPauseMenuEnabled, per page: one idempotent hold per resource, shut while any resource holds, dropped when the resource stops or reloads and on disconnect. Throws on an unknown page name.
     * @param page A Field Guide page.
     * @param enabled false keeps the page out of the Field Guide; true gives this resource's hold back.
     */
    setMenuPageEnabled(page: "inventory" | "gear" | "talents" | "quests" | "map" | "mail" | "collections" | "challenges" | "settings", enabled: boolean): void;

    /**
     * False while any resource holds that Field Guide page shut.
     * @param page A Field Guide page.
     */
    isMenuPageEnabled(page: "inventory" | "gear" | "talents" | "quests" | "map" | "mail" | "collections" | "challenges" | "settings"): boolean;

    /**
     * Diagnostic snapshot for one page's hold: holders names the resources keeping it shut, and locked is whether the game's own hidden-tab set currently holds the page. The game also hides a tab whose story unlock has not happened yet, so locked can be true with nobody holding it.
     * @param page A Field Guide page.
     */
    menuPageState(page: "inventory" | "gear" | "talents" | "quests" | "map" | "mail" | "collections" | "challenges" | "settings"): { enabled: boolean; locked: boolean; holders: string[] };

    /**
     * DEV/QA. The Field Guide and its page gates: open (on the screen stack), tabIndex (its CurrentTabIndex, 0 on the index page), hidden (the game's hidden-tab set), vetoed (hotkeys and index entries dropped since boot), reasserted (game rebuilds kept a held page hidden), vetoReady (the veto can fire). Reads only.
     */
    _menuPagesState(): { uiManager: boolean; open: boolean; uiShown: boolean; inMenuTransition: boolean; fieldGuideTransition: boolean; pauseLock: boolean; tabIndex: number | null; activeMenu: string; hidden: string[]; vetoed: number; reasserted: number; vetoReady: boolean };

    /**
     * DEV/QA. Calls the game's own ToggleMenuTab, the call every save load and story unlock rebuilds the hidden-tab set with, and returns whether the tab is hidden afterwards. Null without the UI manager.
     * @param page A Field Guide page.
     * @param show Asks the game to show (true) or hide (false) the tab.
     */
    _menuTabToggle(page: "inventory" | "gear" | "talents" | "quests" | "map" | "mail" | "collections" | "challenges" | "settings", show: boolean): boolean | null;

    /**
     * DEV/QA. Fires the page's hotkey handler on the player's BTS_Biped_TopLevel through ProcessEvent, as the key would. reason names a refusal: bad-page, no-pawn, no-state-tree or call-failed.
     * @param page A Field Guide page.
     */
    _menuPageHotkey(page: "inventory" | "gear" | "talents" | "quests" | "map" | "mail" | "collections" | "challenges" | "settings"): { requested: boolean; reason: string };

    /**
     * DEV/QA. Fires the open Field Guide's handler for the page's entry on its first page through ProcessEvent, as a click would. reason names a refusal: bad-page, not-open or call-failed.
     * @param page A Field Guide page.
     */
    _menuPageIndexSelect(page: "inventory" | "gear" | "talents" | "quests" | "map" | "mail" | "collections" | "challenges" | "settings"): { requested: boolean; reason: string };

    /**
     * DEV/QA. Opens the Field Guide on its first page, as ESC does. requested only means the calls went out; poll _menuPagesState(). reason names a refusal: no-ui-manager, already-open, menu-transition or pause-lock.
     */
    _fieldGuideOpen(): { requested: boolean; reason: string };

    /**
     * DEV/QA. Closes an open Field Guide through its own back path. reason names a refusal: no-ui-manager, not-open or call-failed.
     */
    _fieldGuideClose(): { requested: boolean; reason: string };

    /**
     * DEV/QA. Opens the world map the way the M key does. requested only means the calls went out, since the game refuses silently past its own checks, so poll _mapState(). reason names a refusal: no-ui-manager, already-open, held (a resource holds the map page), menu-transition, dungeon or call-failed.
     */
    _openMap(): { requested: boolean; reason: string };

    /**
     * DEV/QA. Closes an open map through the Field Guide's own back path. reason names a refusal: no-ui-manager, not-open, no-field-guide or call-failed.
     */
    _closeMap(): { requested: boolean; reason: string };

    /**
     * DEV/QA. Full GUObjectArray walks the client has started since boot. Diff two reads around an action to prove it never scans the whole object array. Reads only.
     */
    _objectArrayWalks(): number;

    /**
     * QA: the spell-lesson minigame with that game name while it waits for start or runs. Null otherwise.
     * @param name The lesson's game name, e.g. Revelio.
     */
    _minigame(name: string): { name: string; checkpoint: number; checkpoints: number; expectedInput: number | null; active: boolean; finished: boolean; inputWindowOpen: boolean; waitingForStart: boolean; inputsComplete: boolean } | null;

    /**
     * QA: presses what the shown lesson waits for now: start, or the open checkpoint's input. pressed is false when it waits for neither.
     * @param name The lesson's game name.
     */
    _minigamePress(name: string): { pressed: boolean; state: object | null };

    /**
     * QA: finishes the shown lesson as passing its last checkpoint does: success animation, SpellComplete, teardown. False when none is shown.
     * @param name The lesson's game name.
     */
    _minigameSucceed(name: string): boolean;

    /**
     * QA: dispatches a UMG input action through the world's input manager when a screen listens for it.
     * @param action EUMGInputAction value.
     * @param event 0 pressed (default), 1 released.
     */
    _umgInput(action: number, event?: number): { listener: boolean; dispatched: boolean };

    /**
     * DEV/QA. Every gate a travel holds the client on, read together: transitionInFlight (reflection walks refuse and fastTravel waits while it is set), the load-screen hold count, the streaming curtain, the game's fast-travel flag, streamingSystem (destination teleports wait until the lifecycle knows the streaming manager), the local readiness phases, and presentationReady (web views composite). sceneRigTransitions and phaseFaults count phase-1 scene rigs and faulted phase reads since boot. foreignSpawnsBlocked holds other players, NPCs and props back from a respawn order until the player is up. A null flag means its manager is not up. Reads only.
     */
    _worldLifecycle(): { transitionInFlight: boolean; loadScreenHold: number; curtainDown: boolean | null; fastTravelInProgress: boolean | null; streamingSystem: boolean; worldPrepared: boolean; loadingFinished: boolean; gameplayReady: boolean; presentationReady: boolean; sceneRigTransitions: number; phaseFaults: number; foreignSpawnsBlocked: boolean };

    /**
     * DEV/QA. One CharacterStateInfo read through the typed SDK and through the reflected getters it replaced: health, maxHealth, isDead, isHealthZero, isNearDeathKneeling, invulnerableToDamage, regenerationRate, healthThresholds. A field is null when that side could not read it. Reads only.
     * @param npcId 0 or omitted = the local player; otherwise this client's pawn for that NPC.
     */
    _stateInfoParity(npcId?: number): { native: Record<string, number | boolean | null>; reflected: Record<string, number | boolean | null> } | null;

    /**
     * DEV/QA. Runs the lip-sync's once-per-process player dialogue-table preload through the native static, then the reflected UFunction it replaced, and reports whether each returned a live handle. reflected is null when the UFunction could not be called.
     */
    _preloadDialogueTables(): { native: boolean; reflected: boolean | null };

    /**
     * DEV/QA. Writes the invulnerable-to-damage flag through the typed SDK setter, so a suite can read it back through the reflected getter. False when there is no state info.
     * @param npcId 0 = the local player.
     * @param enabled The flag to write.
     */
    _setInvulnerableToDamage(npcId: number, enabled: boolean): boolean;

    /**
     * DEV/QA. One pawn's location and rotation read through the typed SDK (the root component's world transform) and through the reflected K2_GetActorLocation / K2_GetActorRotation it replaced, in the same frame. rejectsComponent: the typed read refused the pawn's root component, which is not an actor. Reads only.
     * @param npcId 0 or omitted = the local player; otherwise this client's pawn for that NPC.
     */
    _transformParity(npcId?: number): { classResolved: boolean; native: { x: number; y: number; z: number; pitch: number; yaw: number; roll: number } | null; reflected: { x: number; y: number; z: number; pitch: number; yaw: number; roll: number } | null; rejectsComponent: boolean } | null;

    /**
     * DEV/QA. For a fixed set of component classes (one a pawn lacks), looks the pawn's component up through the native FindComponentByClass and through the reflected GetComponentByClass it replaced. found: the native lookup returned one; same: both returned the same object. rejectsComponent: the native lookup refused the pawn's root component, which is not an actor. Reads only.
     * @param npcId 0 or omitted = the local player; otherwise this client's pawn for that NPC.
     */
    _componentParity(npcId?: number): { classes: { name: string; resolved: boolean; found?: boolean; same?: boolean }[]; rejectsComponent: boolean } | null;

    /**
     * DEV/QA. Every typed SDK member the reflection swaps moved onto, read beside the reflected call it replaced, in one frame: the local player, its wand, mesh, anim instance, controller and state info, every live spell tool (up to 32), five spell locks, the mount gates, live AIControllers (up to 16), every new class guard against its reflected class, the ridden creature mount when riding one, and the GameLogic variables, expressions and bitfield the menu gate reads, against the reflected `_OnActor` statics. The GameLogic write rows round-trip a bool, the idle stack and the item-menu bit in the same frame and restore each. found: the typed side answered (for a write row, the write landed); same: both sides agree; count: objects compared. Null without a local pawn.
     */
    _sdkSwapParity(): { name: string; found: boolean; same: boolean; count: number }[] | null;

    /**
     * DEV/QA. The typed NPC_Component / EnemyAIComponent / NPC_Character members the NPC swaps moved onto, beside the reflected calls they replaced, on one NPC in one frame: the component lookups, target, target type, flying, target-sighted and perception flags, the perception params, the sense TargetChanged is handed (npcTargetSense: the AISense_EnemyAITarget CDO the game caches at NPC_Component+0x11C0) and the team response to the local player. The write rows round-trip the target-sighted, perception and exclude-player stores and restore each. found: the typed side answered (for a write row, the write landed); same: both sides agree. Null without that NPC's pawn.
     * @param npcId The NPC whose local pawn is read.
     */
    _npcSdkParity(npcId: number): { name: string; found: boolean; same: boolean; count: number }[] | null;

    /**
     * DEV/QA. The MountFlying flag the last local tick replicated (the typed mount-component read) beside the reflected IsFlying on the possessed pawn's Creature_MountComponent, else its NPC_Component. reflected is null when neither answers. Null without a possessed pawn. Reads only.
     */
    _mountFlyingParity(): { published: boolean; reflected: boolean | null; possessedClass: string } | null;

    /**
     * DEV/QA. The NPC's team response to the local player ("Attack", "Flee", "AllyWith", ...), read through the typed CharacterStateInfo native and the reflected GetInteractionBetween. "None" without a state info; null without that NPC's pawn or a local pawn. Reads only.
     * @param npcId The NPC whose local pawn is the interactor.
     */
    _npcInteraction(npcId: number): { typed: string; reflected: string | null } | null;

    /**
     * DEV/QA. In one frame: moves the pawn dx along X through the native SetActorLocation, reads the result typed (native) and through the reflected K2_GetActorLocation (reflected), then teleports it back through the native TeleportTo and reads home. Null when the pawn is missing.
     * @param npcId 0 = the local player; otherwise this client's pawn for that NPC.
     * @param dx Centimetres to move along X. Default 50.
     */
    _moveProbe(npcId: number, dx?: number): { before: Vec3; target: Vec3; moved: boolean; native: Vec3 | null; reflected: Vec3 | null; teleported: boolean; home: Vec3 | null } | null;

    /**
     * DEV/QA. The map and Field Guide state, plus which pawn the local controller possesses: an open map swaps the player's body for the map subsystem's MapPawn. standInHeld is whether the local publishers are holding because of that. mapActive is null without a map subsystem.
     */
    _mapState(): { uiManager: boolean; mapActive: boolean | null; uiShown: boolean; inMenuTransition: boolean; fieldGuideTransition: boolean; activeMenu: string; possessedClass: string; possessedIsBody: boolean; possessedIsMapPawn: boolean; standInHeld: boolean };
  };

  /**
   * Local Wwise playback. Sounds are named game events (see Audio.playSoundAt on the server for the replicated form); a bank that isn't resident makes the post silently return 0.
   */
  const Audio: {
    /**
     * Posts a spatialized one-shot at a world position.
     * @param event Wwise event name, e.g. "cabbage_explosion" (case-insensitive).
     * @param x World-space X coordinate.
     * @param y World-space Y coordinate.
     * @param z World-space Z coordinate.
     * @param options duration = seconds until it ends itself; stopEvent = terminator override (auto-resolved from the game data when omitted); autoStop = false disables that lookup.
     * @returns AkPlayingID for stopSound, or 0 when the post was refused.
     */
    playSoundAt(event: string, x: number, y: number, z: number, options?: { duration?: number, stopEvent?: string, autoStop?: boolean }): number;

    /**
     * Posts an event on the local pawn, i.e. at the listener (no distance falloff).
     * @param event Wwise event name.
     * @param options duration = seconds until it ends itself; stopEvent = terminator override (auto-resolved from the game data when omitted); autoStop = false disables that lookup.
     * @returns AkPlayingID, or 0 when the post was refused.
     */
    playSound(event: string, options?: { duration?: number, stopEvent?: string, autoStop?: boolean }): number;

    /**
     * Stops one playing sound, posting its registered stopEvent first when it has one.
     * @param playingId An id returned by playSound/playSoundAt.
     */
    stopSound(playingId: number): boolean;

    /**
     * The terminator that would be posted for this event, derived from the game's own soundbanks.
     * @param event Wwise event name.
     * @returns The stop event's name, or "" when the event is a one-shot that needs none.
     */
    stopEventFor(event: string): string;

    /**
     * Stops every sound posted on the local pawn — where playSound puts them. The way out of a held/looping event whose id you no longer have.
     */
    stopOnSelf(): boolean;

    /**
     * Stops every sound in the engine, including the game's own music and ambience (those mostly re-post on their own). A last resort.
     */
    stopAll(): boolean;

    /**
     * The soundbank this event needs loaded, from the cooked assets' own RequiredBank.
     * @param event Wwise event name.
     * @returns The bank name, or "" for an unknown event.
     */
    bankFor(event: string): string;

    /**
     * Whether THIS client loaded that bank. The game streams its own banks with the area and reports nothing, so false does not mean an event cannot play.
     * @param bank Soundbank name.
     */
    isBankLoaded(bank: string): boolean;

    /**
     * Loads a soundbank so its events can be posted. Custom banks are read from Phoenix/Content/WwiseAudio/Windows/.
     * @param bank Soundbank name without the .bnk extension.
     * @returns True when the call reached the engine; the engine itself reports no result.
     */
    loadBank(bank: string): boolean;

    /**
     * Unloads a soundbank.
     * @param bank Soundbank name.
     */
    unloadBank(bank: string): boolean;

    /**
     * Pushes a track onto the game's music priority stack. Only events that actually contain a Play action work — most "music" event names only flip Wwise states.
     * @param event Music event name (must be unique while pushed).
     * @param priority Stack priority, clamped to -5..5 (default 5 = above the game's score).
     */
    setMusic(event: string, priority?: number): boolean;

    /**
     * Pops a track off the music stack, starting whatever was under it. It cannot restore state-driven score, and the name stays blocked for the session.
     * @param event The event name passed to setMusic.
     */
    clearMusic(event: string): boolean;

    /**
     * Sets a global Wwise real-time parameter.
     * @param name Wwise RTPC name.
     * @param value New value.
     */
    setRTPC(name: string, value: number): boolean;

    /**
     * Sets a global Wwise state.
     * @param group Wwise state group.
     * @param state State within the group.
     */
    setState(group: string, state: string): boolean;
  };

  /**
   * Map, minimap and compass markers.
   */
  const Blips: {
    /**
     * Creates or replaces the world marker under this key.
     */
    setMarker(key: string, x: number, y: number, z: number, icon?: string, label?: string, showOnHud?: boolean, showDistance?: boolean): boolean;

    /**
     * Removes the marker or circle under this key.
     */
    remove(key: string): boolean;

    /**
     * Removes every script blip.
     */
    clear(): void;

    /**
     * Per-player blip colour (0-1 linear); omit rgb to revert to the house colour.
     */
    setPlayerColor(networkId: number, r?: number, g?: number, b?: number, a?: number): void;

    /**
     * Colour every tracked blip; no args reverts to house colours.
     */
    setAllPlayerColors(r?: number, g?: number, b?: number, a?: number): void;

    /**
     * Network ids of tracked remote players.
     */
    trackedPlayers(): number[];

    /**
     * Whether this player gets a blip; may be set before they spawn.
     */
    trackPlayer(networkId: number, enabled?: boolean): void;

    /**
     * The whole set of players with blips; anyone else loses theirs.
     */
    setTrackedPlayers(networkIds: number[]): void;

    /**
     * Blip every remote player (the default), or only tracked ones.
     */
    trackAllPlayers(enabled?: boolean): void;

    /**
     * HIDEFROMMAP the underlying beacon while tinting.
     */
    hideBaseIcon(hide?: boolean): void;

    /**
     * Player blip size; 1.0 is about twice the game's own icons.
     */
    setBlipScale(scale: number): void;

    /**
     * Toggles house-coloured player blips (experimental).
     */
    setHouseTint(enabled?: boolean): boolean;

    /**
     * Reads the house-tint toggle.
     */
    houseTint(): boolean;

    /**
     * Reports resolved beacon/minimap state.
     */
    debugDump(): string;

    /**
     * Which beacon types are safe to register.
     */
    styles(): string;

    /**
     * Full UI_DT_CompassStyles dump by reflection.
     */
    dumpStyles(): string;

    /**
     * Hexdumps two types' compass-style structs for diffing.
     */
    styleDiff(typeA?: number, typeB?: number): string;

    /**
     * ShowOnHUD for new blips (false = no 3D world marker).
     */
    setHud(enabled?: boolean): void;

    /**
     * Is this point inside the circle under this key?
     */
    inArea(key: string, x: number, y: number, z: number): boolean;

    /**
     * Creates or replaces the search circle under this key. METRES.
     */
    setCircle(key: string, x: number, y: number, z: number, radiusMetres?: number): boolean;

    /**
     * PulseCircleIcon (true) or FadeInCircleIcon (false).
     */
    pulseCircle(key: string, pulse?: boolean): boolean;

    /**
     * Diffs our beacon against a game beacon of the same type.
     */
    probe(type?: number): string;

    /**
     * BeaconIcon for new blips; empty lifts it off a live beacon.
     */
    setIcon(icon?: string): void;

    /**
     * EBeaconType for new markers (24 = FINDLOCATION).
     */
    setType(type: number): void;

    /**
     * BeaconScale on live mod beacons (mission-area circle radius).
     */
    setScale(scale: number): void;

    /**
     * DEV/QA. Every typed SDK member the blip code moved onto, read beside the reflected call it replaced, in one frame: the beacon manager, up to 24 registered beacons (handle lookup and every laid-out field), the registry, UI_DT_CompassStyles rows and icon columns, the minimap manager, active minimap and its getters, the icon render widgets, IconExistsInTable and the control rotation. dynamicBeacon registers an enemy beacon on the local pawn and beaconUnregister removes it again in the same frame. found: the typed side answered; same: both sides agree; detail names what differed.
     * @param markerKey A live marker whose registration is checked too.
     */
    _sdkParity(markerKey?: string): { name: string; found: boolean; same: boolean; count: number; detail?: string }[];

    /**
     * Sets EBeaconState on every mod beacon (4 = DISCOVERED).
     */
    setState(state: number): void;

    /**
     * Draws the game's gold mission route to a blip on the map and minimap, replacing this client's last route. It survives the target being re-shown or respawning; a route to a circle ends at its ring. The player's own map waypoint still wins the minimap while placed and hands it back when removed. Returns whether the game took it.
     * @param target A live marker or circle key, or a tracked player's network id.
     * @param label The route's long name.
     */
    setRoute(target: string | number, label?: string): boolean;

    /**
     * Ends the route, re-tracking the player's own waypoint if they placed one. False when there was none. Removing the routed blip ends it too.
     */
    clearRoute(): boolean;

    /**
     * The routed blip key, or a player's network id, or null.
     */
    route(): string | number | null;

    /**
     * DEV/QA. Our route beside the game's own slots: the tracked, waymarker and mission beacon handles, whether it tracks the waymarker, HasDestinationLocation, GetCanPlayerTrackDestination, the minimap route's point count, and the tracked/mission/waypoint colours the map would draw.
     */
    _routeState(): { key: string | null; player: number | null; label: string; target: number; applied: number; testWaymarker: number; pathNavigation: boolean; tracked: number; waymarker: number; mission: number; trackingWaymarker: boolean; hasDestination: boolean; canTrack: boolean; minimapPathPoints: number; trackedColor: { r: number; g: number; b: number; a: number } | null; missionColor: { r: number; g: number; b: number; a: number } | null; waypointColor: { r: number; g: number; b: number; a: number } | null };

    /**
     * DEV/QA. Stands in for the player's own map waypoint the way the map places one: a WayMarker beacon in the waymarker slot, tracked. Returns its handle, 0 if refused.
     */
    _routeWaymarker(x: number, y: number, z: number): number;

    /**
     * DEV/QA. Removes the stand-in waypoint through the game's own BeaconRemoved restore, then puts back a real waypoint it displaced.
     */
    _routeWaymarkerRemove(): boolean;
  };

  /**
   * One loaded repairable world object.
   */
  interface BreakableInfo {
    /**
     * The game's own object id (CRC-32 of the placed location); identical on every client.
     */
    uid: number;

    /**
     * Actor class name.
     */
    cls: string;

    /**
     * Actor name.
     */
    name: string;

    /**
     * Broken or partially broken right now.
     */
    broken: boolean;

    /**
     * A repair animation is in progress.
     */
    repairing: boolean;

    /**
     * Centimetres from the player, or -1 when unlocated.
     */
    dist: number;

    /**
     * World X in centimetres; absent when unlocated.
     */
    x?: number;

    /**
     * World Y in centimetres; absent when unlocated.
     */
    y?: number;

    /**
     * World Z in centimetres; absent when unlocated.
     */
    z?: number;
  }

  /**
   * Server-owned state of one repairable object.
   */
  interface BreakableState {
    /**
     * Object id, as in BreakableInfo.
     */
    uid: number;

    /**
     * 'broken' or 'repaired'.
     */
    state: string;
  }

  /**
   * Repairable world objects (statues, armour): server-owned broken/repaired state.
   */
  const Breakables: {
    /**
     * Watches the game's repair-done and fully-broken events; the local player's own changes surface as the breakableState event.
     */
    arm(): boolean;

    /**
     * Whether the game-event hook is live.
     */
    isInstalled(): boolean;

    /**
     * Loaded repairables, nearest first; radius 0 or omitted lists all.
     */
    list(radius?: number): BreakableInfo[];

    /**
     * Records the server's state for one object and applies it if loaded (animated repair unless instant). Re-applied whenever its cell streams in.
     */
    setState(uid: number, state: string, instant?: boolean): boolean;

    /**
     * Records a full state list (instant by default) and returns how many applied to loaded objects.
     */
    applyStates(states: BreakableState[], instant?: boolean): number;

    /**
     * Forgets every recorded state.
     */
    clear(): void;

    /**
     * Re-indexes every loaded cell and re-applies; returns the recorded state count.
     */
    rescan(): number;

    /**
     * QA: queued stream-in passes, levels the loaded-level diff knows, and cumulative level indexes and apply rounds.
     */
    _stats(): { pending: number; seenLevels: number; levelIndexes: number; applyRounds: number };
  };

  /**
   * One loaded cauldron and its live brewing state.
   */
  interface BrewingSiteInfo {
    /**
     * Position in sites(); order is not stable between calls.
     */
    index: number;

    /**
     * Actor name.
     */
    name: string;

    /**
     * Full object path; no PersistentLevel means a Blueprint archetype.
     */
    path: string;

    /**
     * Whether it is a class archetype rather than a placed actor.
     */
    template: boolean;

    /**
     * GetCauldronID — level-authored, uniqueness unverified.
     */
    cauldronId: string;

    /**
     * Persistence UID; for a dynamic actor a CRC32 of its position.
     */
    readonly siteUid: number;

    /**
     * Parent station UID, shared by sibling cauldrons.
     */
    readonly stationUid: number;

    /**
     * EBrewingState: 0 None, 1 Brewing, 2 Brewed. Null if unregistered.
     */
    state: number;

    /**
     * State as a name.
     */
    stateName: string;

    /**
     * Potion being brewed.
     */
    potionId: string;

    /**
     * Item the brew yields.
     */
    outputItemId: string;

    /**
     * 0..1 brewing progress.
     */
    progress: number;

    /**
     * Only meaningful while Brewing(1).
     */
    remainingSec: number;

    /**
     * Potions waiting to be collected.
     */
    uncollectedYield: number;

    /**
     * Potions this recipe yields.
     */
    recipeYield: number;

    /**
     * Whether the site is in the Room of Requirement.
     */
    inSanctuary: boolean;

    /**
     * World position.
     */
    readonly x: number;

    /**
     * World position.
     */
    readonly y: number;

    /**
     * World position.
     */
    readonly z: number;

    /**
     * Distance from the local player in cm; -1 if unknown.
     */
    dist: number;
  }

  /**
   * A row from the brewing manager's recipe set.
   */
  interface BrewingRecipeInfo {
    /**
     * Recipe key.
     */
    potionId: string;

    /**
     * LockID gating the recipe.
     */
    lockId: string;

    /**
     * Potions produced.
     */
    yield: number;

    /**
     * Brew duration in nurture seconds.
     */
    timeToBrewSec: number;

    /**
     * Whether it came from the locked list.
     */
    locked: boolean;

    /**
     * { itemId, quantity, owned } rows.
     */
    ingredients: object[];
  }

  /**
   * Local cauldron inspection and drive. Server-owned brew state arrives through replication, not here.
   */
  const Brewing: {
    /**
     * Lists every loaded cauldron with its live state.
     */
    sites(): BrewingSiteInfo[];

    /**
     * State of one cauldron, by index or cauldronId.
     */
    state(site: number | string): BrewingSiteInfo | null;

    /**
     * { available, locked } recipe rows from the brewing manager.
     */
    recipes(): object;

    /**
     * Starts a brew from a hand-built recipe — consumes no ingredients.
     */
    begin(site: number | string, potionId: string): BrewingSiteInfo | null;

    /**
     * Starts a brew from the manager's own row — consumes ingredients natively.
     */
    beginFromRecipe(site: number | string, potionId: string): BrewingSiteInfo | null;

    /**
     * InstantlyCompleteBrewing on the site's state.
     */
    complete(site: number | string): BrewingSiteInfo | null;

    /**
     * { hasSpace, yieldLeft } for a collector, default Player0.
     */
    hasSpace(site: number | string, collectorId?: string): object | null;

    /**
     * CollectPotion — credits the calling client's own inventory.
     */
    collect(site: number | string, collectorId?: string): BrewingSiteInfo | null;

    /**
     * DestroyPotion — clears the site back to None.
     */
    destroy(site: number | string, collectorId?: string): BrewingSiteInfo | null;

    /**
     * BrewTimeMultiplier; -1 if the manager is missing.
     */
    multiplier(): number;

    /**
     * Places a potion station locally. Server-owned benches come from the server instead.
     */
    conjure(registryId?: string, x?: number, y?: number, z?: number, uid?: number): object | null;

    /**
     * Raw SpawnActor of a bare cauldron; its UID is a CRC32 of the position, not chosen.
     */
    spawn(x?: number, y?: number, z?: number): BrewingSiteInfo | null;

    /**
     * ESpawnAllowedResponse: 0 allowed, 1 unregistered, 2 locked, 3 dead, 4 consumed, 5 exists, 6 unknown.
     */
    allowSpawn(registryId: string): number;

    /**
     * Watches the stock UI's cauldron calls through the ProcessEvent hook. Returns whether the hook is installed.
     */
    watchNative(): boolean;

    /**
     * Counts every UFunction ProcessEvent sees. Dev only — a hash insert per call.
     */
    discover(on?: boolean): boolean;

    /**
     * Most-called functions seen since discover(true).
     */
    discovered(max?: number): string[];

    /**
     * { ticks, seconds } from the Scheduler's nurture clock.
     */
    nurtureTime(): object | null;

    /**
     * Native inventory count; -1 if unreadable.
     */
    itemCount(itemId: string, holderId?: string, collectorId?: string): number;
  };

  /**
   * Structured snapshot of the local player's production mount state and active rideable broom.
   */
  interface BroomState {
    /**
     * The Biped_Player mount predicate used by the game's own broom gates.
     */
    readonly mountedOrTransitioning: boolean | null;

    /**
     * Whether the active hover-broom task owns a rideable broom linked to the local pawn.
     */
    readonly mountSettled: boolean;

    /**
     * Current boost meter amount; null without a settled active broom.
     */
    readonly boost: number | null;

    /**
     * Whether the active broom is in turbo; null without a settled active broom.
     */
    readonly turbo: boolean | null;

    /**
     * Class name of the rideable broom actually under the player (per broom item); null without a settled active broom.
     */
    readonly broomClass: string | null;
  }

  /**
   * One stored broom inventory row.
   */
  interface BroomInventoryEntry {
    /**
     * Canonical native broom item id.
     */
    readonly itemId: string;

    /**
     * Number of this broom item in storage.
     */
    readonly count: number;
  }

  /**
   * Snapshot of the ActiveBroom and BroomStorage holders.
   */
  interface BroomInventoryState {
    /**
     * Item id in the one-slot ActiveBroom holder.
     */
    readonly equippedId: string | null;

    /**
     * Brooms currently in BroomStorage.
     */
    readonly stored: BroomInventoryEntry[];

    /**
     * Total brooms across the active and storage holders.
     */
    readonly total: number;
  }

  /**
   * The local player's flying broom: handling, stuns and the mounted-cast gate.
   */
  const Broom: {
    /**
     * Returns structured mount state without parsing diagnostics.
     */
    state(): BroomState;

    /**
     * Returns the equipped broom id and stored broom rows; null if native inventory is unreadable.
     */
    inventory(): BroomInventoryState | null;

    /**
     * Whether the game reports the local player mounted or transitioning, excluding creature mounts — the game's own predicate is mount-agnostic. See FlyingMount and GroundMount.
     */
    mounted(): boolean;

    /**
     * Calls the game's production CanUseBroom gate; null if the gate is unavailable.
     * @param includeAvatarState Include the local avatar's current gameplay state; defaults to true.
     */
    canMount(includeAvatarState?: boolean): boolean | null;

    /**
     * Calls the mounted broom's production AllowDismount gate. False while dismounted; null during an unreadable transition.
     */
    canDismount(): boolean | null;

    /**
     * Whether ActiveBroom contains an equipped broom; null if inventory is unreadable.
     */
    isEquipped(): boolean | null;

    /**
     * Whether BroomStorage contains at least one unequipped broom; null if inventory is unreadable. May be true alongside isEquipped() when the player owns multiple brooms.
     */
    isInStorage(): boolean | null;

    /**
     * Moves a stored broom into ActiveBroom using the production holder model. False while mounted or when the requested broom is not stored; null if inventory is unreadable.
     * @param itemId Stored broom to equip; omitting it keeps the current selection or chooses the first stored broom.
     */
    equip(itemId?: string): boolean | null;

    /**
     * Moves the active broom back to BroomStorage. False while mounted; null if inventory is unreadable.
     */
    unequip(): boolean | null;

    /**
     * Starts the production broom mount flow through the gadget-wheel item-use path, which re-reads the ActiveBroom holder on every call — the broom that spawns is always the one equip() last put there. Observe state() for completion and retry while an async tool class loads.
     */
    mount(): boolean;

    /**
     * Dismounts the local player. Returns false until state().mountSettled is true. Observe mountedOrTransitioning for completion.
     * @param contextual When true, uses the normal gated input-side landing flow. Defaults to false, which force-dismounts through FastTravelManager and bypasses ground and no-dismount-zone checks.
     */
    dismount(contextual?: boolean): boolean;

    /**
     * Sets max flying speed (cm/s). Re-apply after a flight-data push — that rebuilds the scratch.
     */
    setMaxSpeed(speed: number): boolean;

    /**
     * Overrides the flight ceiling (world Z) at Debug priority.
     */
    setMaxHeight(height: number): boolean;

    /**
     * Releases this session's ceiling override.
     */
    clearMaxHeight(): boolean;

    /**
     * Locks or restores rider input at Debug priority.
     */
    setInputDisabled(disabled: boolean): boolean;

    /**
     * Forces a landing. Use with setInputDisabled for a knock — never dismount, which writes the save.
     */
    setForceLand(forceLand: boolean): boolean;

    /**
     * Adds a fraction of the max boost meter.
     */
    addBoost(fraction: number): boolean;

    /**
     * Current boost meter amount; null if unreadable.
     */
    boost(): number | null;

    /**
     * Whether the broom is in turbo; null if unreadable.
     */
    inTurbo(): boolean | null;

    /**
     * Moves the mounted rider, zeroing momentum. False when the destination is encroached.
     */
    teleport(x: number, y: number, z: number, yaw?: number, resetCamera?: boolean): boolean;

    /**
     * Frees non-heavy spellcasting while broom-mounted (stock game allows only Revelio).
     */
    setCastingAllowed(allowed: boolean): boolean;

    /**
     * Releases only overrides previously applied through Broom: speed, height, input, force landing, and casting. Does not dismount or change inventory.
     */
    resetOverrides(): boolean;
  };

  /**
   * A camera position and rotation.
   */
  interface CameraPose {
    /**
     * World-space position.
     */
    position: Vec3;

    /**
     * Rotation in degrees.
     */
    rotation: Rotator;
  }

  /**
   * Resolved camera lens settings.
   */
  interface CameraLens {
    /**
     * Horizontal field of view in degrees.
     */
    fov: number;

    /**
     * Requested width-to-height aspect ratio.
     */
    aspectRatio: number;

    /**
     * Cinematic focal length in millimeters.
     */
    focalLength: number;

    /**
     * Cinematic aperture (f-stop).
     */
    aperture: number;

    /**
     * Post-process blend weight from 0 to 1.
     */
    postProcessBlend: number;

    /**
     * Orthographic view width in world units.
     */
    orthographicWidth: number;

    /**
     * Whether to constrain the requested aspect ratio.
     */
    constrainAspectRatio: boolean;

    /**
     * Projection mode.
     */
    projection: "perspective" | "orthographic";

    /**
     * Whether field of view affects level-of-detail selection.
     */
    useFovForLod: boolean;
  }

  /**
   * Partial lens update; every field is optional.
   */
  interface CameraLensOptions {
    /**
     * Horizontal field of view in degrees.
     */
    fov?: number;

    /**
     * Requested width-to-height aspect ratio.
     */
    aspectRatio?: number;

    /**
     * Cinematic focal length in millimeters.
     */
    focalLength?: number;

    /**
     * Cinematic aperture (f-stop).
     */
    aperture?: number;

    /**
     * Post-process blend weight from 0 to 1.
     */
    postProcessBlend?: number;

    /**
     * Orthographic view width in world units.
     */
    orthographicWidth?: number;

    /**
     * Whether to constrain the requested aspect ratio.
     */
    constrainAspectRatio?: boolean;

    /**
     * Projection mode.
     */
    projection?: "perspective" | "orthographic";

    /**
     * Whether field of view affects level-of-detail selection.
     */
    useFovForLod?: boolean;
  }

  /**
   * A camera pose with optional lens overrides.
   */
  interface CameraView {
    /**
     * World-space position.
     */
    position: Vec3;

    /**
     * Rotation in degrees.
     */
    rotation: Rotator;

    /**
     * Optional lens overrides.
     */
    lens?: CameraLensOptions;
  }

  /**
   * Optional game view-target blend settings.
   */
  interface CameraTransition {
    /**
     * Blend duration in seconds; defaults to 0.5.
     */
    duration?: number;

    /**
     * Blend curve.
     */
    curve?: "linear" | "cubic" | "easeIn" | "easeOut" | "easeInOut" | "preBlended";

    /**
     * Curve exponent for ease blends.
     */
    exponent?: number;

    /**
     * Freeze the outgoing camera during the blend.
     */
    lockOutgoing?: boolean;
  }

  /**
   * Options for Camera.animateTo; every field is optional.
   */
  interface CameraAnimationOptions {
    /**
     * Animation duration in seconds; defaults to 1.
     */
    duration?: number;

    /**
     * Interpolation curve.
     */
    easing?: "linear" | "smoothStep" | "easeIn" | "easeOut" | "easeInOut";
  }

  /**
   * One keyframe in a scripted camera path.
   */
  interface CameraKeyframe {
    /**
     * World-space position.
     */
    position: Vec3;

    /**
     * Rotation in degrees.
     */
    rotation: Rotator;

    /**
     * Optional lens overrides inherited from the previous keyframe.
     */
    lens?: CameraLensOptions;

    /**
     * Travel time to this keyframe in seconds; defaults to 1.
     */
    duration?: number;

    /**
     * Interpolation curve used to reach this keyframe.
     */
    easing?: "linear" | "smoothStep" | "easeIn" | "easeOut" | "easeInOut";
  }

  /**
   * Options for Camera.playPath; every field is optional.
   */
  interface CameraPathOptions {
    /**
     * Repeat the path until stopped.
     */
    loop?: boolean;

    /**
     * Reverse direction at each end; implies looping.
     */
    pingPong?: boolean;
  }

  /**
   * Options for Camera.orbit; every field is optional.
   */
  interface CameraOrbitOptions {
    /**
     * Orbit radius in world units; defaults to 300.
     */
    radius?: number;

    /**
     * Height above the target; defaults to 0.
     */
    height?: number;

    /**
     * Angular speed in degrees per second; defaults to 20.
     */
    speed?: number;
  }

  /**
   * Normalized camera-fade color.
   */
  interface CameraColor {
    /**
     * Red channel from 0 to 1.
     */
    r: number;

    /**
     * Green channel from 0 to 1.
     */
    g: number;

    /**
     * Blue channel from 0 to 1.
     */
    b: number;

    /**
     * Alpha channel from 0 to 1; defaults to 1.
     */
    a?: number;
  }

  /**
   * Options for Camera.fade.
   */
  interface CameraFadeOptions {
    /**
     * Starting opacity from 0 to 1; defaults to 0.
     */
    from?: number;

    /**
     * Ending opacity from 0 to 1; defaults to 1.
     */
    to?: number;

    /**
     * Fade duration in seconds; defaults to 1.
     */
    duration?: number;

    /**
     * Fade color; defaults to opaque black.
     */
    color?: CameraColor;

    /**
     * Hold the final opacity until Camera.stopFade().
     */
    hold?: boolean;

    /**
     * Fade game audio with the image.
     */
    fadeAudio?: boolean;
  }

  /**
   * Options for Camera.playShake; every field is optional.
   */
  interface CameraShakeOptions {
    /**
     * Shake intensity multiplier; defaults to 1.
     */
    scale?: number;

    /**
     * Coordinate space for the shake.
     */
    space?: "camera" | "world" | "user";
  }

  /**
   * Options for Camera.playAnimation; every field is optional.
   */
  interface CameraAssetAnimationOptions {
    /**
     * Playback rate; defaults to 1.
     */
    rate?: number;

    /**
     * Transform intensity; defaults to 1.
     */
    scale?: number;

    /**
     * Blend-in time in seconds.
     */
    blendIn?: number;

    /**
     * Blend-out time in seconds.
     */
    blendOut?: number;

    /**
     * Loop the animation.
     */
    loop?: boolean;
  }

  /**
   * Immutable snapshot of the local camera controller.
   */
  interface CameraState {
    /**
     * Whether the custom camera owns the current view target.
     */
    readonly active: boolean;

    /**
     * Whether a tween, path, or orbit is running.
     */
    readonly playing: boolean;

    /**
     * Whether camera motion is paused.
     */
    readonly paused: boolean;

    /**
     * Current custom-camera pose.
     */
    readonly pose: CameraPose;

    /**
     * Current custom-camera lens settings.
     */
    readonly lens: CameraLens;

    /**
     * Current path keyframe index.
     */
    readonly pathIndex: number;

    /**
     * Number of keyframes in the current path.
     */
    readonly pathSize: number;
  }

  /**
   * Local cinematic camera control for client resources.
   */
  const Camera: {
    /**
     * Whether the custom camera owns the current view target.
     */
    readonly active: boolean;

    /**
     * Whether a tween, path, or orbit is running.
     */
    readonly playing: boolean;

    /**
     * Whether camera motion is paused.
     */
    readonly paused: boolean;

    /**
     * Current custom-camera pose.
     */
    readonly pose: CameraPose;

    /**
     * Current custom-camera lens settings.
     */
    readonly lens: CameraLens;

    /**
     * Complete immutable state snapshot.
     */
    readonly state: CameraState;

    /**
     * Captures the live game camera as a reusable view, or null while no camera manager exists.
     */
    capture(): CameraView | null;

    /**
     * Activates a fixed custom camera.
     */
    activate(view: CameraView, transition?: CameraTransition): boolean;

    /**
     * Moves the active custom camera immediately.
     */
    setPose(pose: CameraPose): boolean;

    /**
     * Updates selected lens fields on the active camera.
     */
    setLens(lens: CameraLensOptions): boolean;

    /**
     * Returns control to the player camera.
     */
    restore(transition?: CameraTransition): void;

    /**
     * Aims the active camera at a world position.
     */
    lookAt(target: Vec3, track?: boolean): boolean;

    /**
     * Stops look-at control without stopping other motion.
     */
    clearLookAt(): void;

    /**
     * Animates the active camera to a view.
     */
    animateTo(view: CameraView, options?: CameraAnimationOptions): boolean;

    /**
     * Plays a keyframed camera path.
     */
    playPath(keyframes: CameraKeyframe[], options?: CameraPathOptions): boolean;

    /**
     * Starts an automated orbit around a world position.
     */
    orbit(target: Vec3, options?: CameraOrbitOptions): boolean;

    /**
     * Pauses camera motion.
     */
    pause(): void;

    /**
     * Resumes camera motion.
     */
    resume(): void;

    /**
     * Stops camera motion while keeping the current view.
     */
    stop(): void;

    /**
     * Starts a camera fade.
     */
    fade(options: CameraFadeOptions): boolean;

    /**
     * Stops the active camera fade.
     */
    stopFade(): boolean;

    /**
     * Starts a cooked CameraShake class.
     */
    playShake(classPath: string, options?: CameraShakeOptions): boolean;

    /**
     * Stops all camera shakes.
     */
    stopShakes(immediate?: boolean): boolean;

    /**
     * Plays a cooked CameraAnim asset.
     */
    playAnimation(assetPath: string, options?: CameraAssetAnimationOptions): boolean;

    /**
     * Stops all CameraAnim instances.
     */
    stopAnimations(immediate?: boolean): boolean;

    /**
     * Adds a camera lens-effect class.
     */
    addLensEffect(classPath: string): boolean;

    /**
     * Clears all camera lens effects.
     */
    clearLensEffects(): boolean;

    /**
     * Adds a camera-modifier class.
     */
    addModifier(classPath: string): boolean;
  };

  /**
   * Typed combat-event hook control.
   */
  const CombatEvents: {
    /**
     * Arms the fixed typed combat-event set.
     */
    arm(): boolean;

    /**
     * Returns whether the hook is installed.
     */
    isInstalled(): boolean;
  };

  /**
   * What this build's Creator API supports. Branch on these rather than on the mod version.
   */
  interface CreatorCapabilities {
    /**
     * API shape version, bumped when anything below changes.
     */
    version: number;

    /**
     * Whether begin/commit/cancel exist.
     */
    session: boolean;

    /**
     * Who holds the editing session: "none", "overlay" or "script".
     */
    sessionHolder: string;

    /**
     * Whether getSchema is available.
     */
    schema: boolean;

    /**
     * Whether getState is available.
     */
    state: boolean;

    /**
     * Whether applyPatch is available.
     */
    patch: boolean;

    /**
     * Whether the CreatorPreview controls are available.
     */
    preview: boolean;

    /**
     * Whether exportLook/importLook are available.
     */
    look: boolean;
  }

  /**
   * A look as plain ids: the readable, editable form of an appearance. Absent optional keys leave that part untouched; never carries a transmog.
   */
  interface LookJson {
    /**
     * Always "hogwartsmp-look".
     */
    format: string;

    /**
     * Format version this build writes; imports accept it or older.
     */
    version: number;

    /**
     * Body gender.
     */
    gender: "male" | "female";

    /**
     * Creator category -> preset id, e.g. { hairStyle: "HairFemale040" }; an unmapped type appears as type<N>.
     */
    presets: Record<string, string>;

    /**
     * GA_ gear appearance ids for the worn slots.
     */
    gear: string[];

    /**
     * Forced FACE-slot appearance (the creator's glasses), e.g. GA_Face_004.
     */
    readonly faceGear: string;

    /**
     * House id name for the robe and crest; absent lets the game decide.
     */
    readonly house: string;

    /**
     * Body scale, 0.1..10.
     */
    readonly scale: number;

    /**
     * How scale is applied (see player.setScale); absent means "full".
     */
    readonly scaleMode: "full" | "visual";

    /**
     * Bone slider name -> scale.
     */
    readonly boneScales: Record<string, number>;

    /**
     * tone 0/1, pitch -2..2.
     */
    readonly voice: { tone: number; pitch: number };

    /**
     * Character name parts.
     */
    readonly name: { first: string; last: string };

    /**
     * Hood up or down.
     */
    readonly hood: boolean;

    /**
     * A DT_CustomWandStyle row key.
     */
    readonly wandStyle: string;
  }

  /**
   * One editable category and the option ids it accepts.
   */
  interface CreatorCategory {
    /**
     * Stable option ids — the game's own preset names, or a GA_* id for glasses.
     */
    options: string[];

    /**
     * How many options the category has.
     */
    count: number;
  }

  /**
   * Every category and the option ids it accepts. Gender-scoped: a full-body preset switches gender and re-resolves every category, so re-read after one.
   */
  interface CreatorSchema {
    /**
     * Schema shape version.
     */
    version: number;

    /**
     * 0 = male, 1 = female. The option lists are for THIS gender only.
     */
    gender: number;

    /**
     * Keyed by category: preset (full body), hairStyle, hairColour, faceShape, skin, eyeColour, browShape, browColour, marking0-marking3, glasses.
     */
    categories: Record<string, CreatorCategory>;
  }

  /**
   * What the character currently wears, read back from the game.
   */
  interface CreatorState {
    /**
     * 0 = male, 1 = female.
     */
    gender: number;

    /**
     * Category -> the option id currently applied, for categories that have one.
     */
    selections: Record<string, string>;

    /**
     * Forced FACE-slot appearance id, or "" for none.
     */
    faceGear: string;

    /**
     * Gender-voice switch and pitch.
     */
    readonly voice: { tone: number, pitch: number };

    /**
     * Character name.
     */
    readonly name: { first: string, last: string };
  }

  /**
   * The character-creator overlay (the same one F5 toggles).
   */
  const Creator: {
    /**
     * Opens the character-creator overlay. No-op if it isn't up.
     */
    open(): void;

    /**
     * Closes the character-creator overlay.
     */
    close(): void;

    /**
     * Whether the creator overlay is currently open.
     */
    isOpen(): boolean;

    /**
     * What this build's Creator API supports: `version`, whether a session is held and by whom, and a flag per feature. Branch on these rather than on the mod version.
     */
    getCapabilities(): CreatorCapabilities;

    /**
     * Claims the editing session and snapshots the appearance, so cancel() can restore it. Returns false if the F5 overlay or another resource already holds it — check before showing your UI.
     * @param options Reserved; a session always starts from the current look today.
     */
    begin(options?: { preserveCurrent?: boolean }): boolean;

    /**
     * Keeps the edits: settles the look into its persistable form and releases the snapshot. False if you don't hold the session. Queued patches are guaranteed to be applied BEFORE the settle -- but this RETURNS IMMEDIATELY, it does not wait for the game to finish. Do not read the look off the back of it; wait for the server's playerAppearanceChanged instead.
     */
    commit(): boolean;

    /**
     * Discards the edits and restores the snapshot taken by begin(). False if you don't hold the session.
     */
    cancel(): boolean;

    /**
     * Every category and the stable option ids it accepts. null until built (begin() primes it). GENDER-SCOPED: a full-body preset switches gender and re-resolves every category, so re-read after one.
     */
    getSchema(): CreatorSchema | null;

    /**
     * The current selections, face gear, voice and name. Refreshed after each applyPatch, so read it on `creatorChanged` rather than immediately after patching.
     */
    getState(): CreatorState | null;

    /**
     * Queues one apply per entry and returns how many were queued (not how many succeeded — an unknown id is dropped on the game thread and logged). An EMPTY string clears the category, which only face gear supports. `preset` is applied FIRST because it can switch gender. Throws without an active session.
     * @param patch category -> option id, e.g. { hairStyle: "DA_HairMale012" }.
     */
    applyPatch(patch: Record<string, string>): number;

    /**
     * Sets the voice. Not a preset category, so it cannot ride applyPatch. Returns whether anything was queued; read the result back on creatorChanged. Requires an active session.
     * @param voice tone 0/1 = the creator's VOICE ONE/TWO; pitch -2..+2, 0 = default.
     */
    setVoice(voice: { tone?: number, pitch?: number }): boolean;

    /**
     * Sets the character name. Requires an active session.
     * @param first Given name.
     * @param last Family name.
     */
    setName(first: string, last?: string): boolean;

    /**
     * The local player's look as plain ids under the creator's category names: what a person can read, edit, share and hand back to importLook or the server's player.setLook. null when there is no live character. Never includes a transmog.
     */
    exportLook(): LookJson | null;

    /**
     * Applies a look given as ids to the local player. Validated synchronously: false, with the reason logged, when a field is malformed (a gear id without GA_, an unknown category, a newer version). True means it was QUEUED; the apply runs on the game thread and an id the game does not know is dropped there. Watch creatorChanged for the result.
     * @param look A look from exportLook, the server's player.getLook or a stored copy, or its JSON text.
     */
    importLook(look: LookJson | string): boolean;

    /**
     * Whether any creator session is live — the overlay's or a resource's.
     */
    isActive(): boolean;
  };

  /**
   * Framing and posing for a creator preview. Independent of which UI is driving the session.
   */
  const CreatorPreview: {
    /**
     * Points a spawned camera at the player and makes it the view target. Call restoreCamera() when done.
     * @param frame Front-view framing on the live avatar; shift nudges it laterally so a side panel doesn't cover it.
     */
    setCamera(frame: { dist?: number, height?: number, pitch?: number, fov?: number, shift?: number }): void;

    /**
     * Hands the view back to the normal player camera.
     */
    restoreCamera(): void;

    /**
     * Turns the live avatar for inspection. Relative, so call it per input frame.
     * @param deltaYaw Degrees to turn the avatar by, relative.
     */
    rotate(deltaYaw: number): void;

    /**
     * Pauses the avatar's animation so it holds still. Does NOT stop a playIdle ability -- that is a separate lane.
     * @param frozen Defaults to true.
     */
    freeze(frozen?: boolean): void;

    /**
     * Holds a posing idle on the live avatar via the game's own ability system -- local only, not replicated. Returns whether it was QUEUED. The channel is released automatically when the session ends. Requires an active session.
     * @param abilityClassPath An Able ability CLASS path ending _C.
     * @param channel "FullBody" (default) or "PartialBody".
     */
    playIdle(abilityClassPath: string, channel?: string): boolean;
  };

  /**
   * A loaded physical door near the local player.
   */
  interface DoorInfo {
    /**
     * Exact actor name.
     */
    name: string;

    /**
     * Actor class name.
     */
    cls: string;

    /**
     * Full asset path; distinguishes placements sharing a name. Empty if unresolved.
     */
    path: string;

    /**
     * Distance in centimetres.
     */
    dist: number;

    /**
     * Relative bearing in degrees.
     */
    bearing: number;

    /**
     * World X in centimetres; absent when unlocated.
     */
    x?: number;

    /**
     * World Y in centimetres; absent when unlocated.
     */
    y?: number;

    /**
     * World Z in centimetres; absent when unlocated.
     */
    z?: number;

    /**
     * Persistent id `<name>:<guid>`, unique where names repeat. Empty for a lockable that is not a door.
     */
    id: string;

    /**
     * Any lock on it is locked. Never true for a lockable carrying no lock.
     */
    locked: boolean;

    /**
     * Swung open, or swinging. Doors only.
     */
    open?: boolean;

    /**
     * Held open rather than closing on its own. Doors only.
     */
    keepOpen?: boolean;

    /**
     * Persistent id of the linked leaf of a double door, which unlocks whenever this one does; empty when unlinked. Doors only.
     */
    child?: string;
  }

  /**
   * Door state the server holds, as this client received it.
   */
  interface HeldDoorState {
    /**
     * Actor name, persistent id (holds ':'), or asset path (holds '/').
     */
    selector: string;

    /**
     * Held locked or unlocked; null leaves the lock to the save.
     */
    locked: boolean | null;

    /**
     * Held open or closed; null leaves the door to swing on its own.
     */
    open: boolean | null;
  }

  /**
   * Physical-door enforcement policy.
   */
  interface DoorPolicy {
    /**
     * Unlock all streamed doors.
     */
    unlockAll: boolean;

    /**
     * Doors to unlock.
     */
    unlockDoors: string[];

    /**
     * Unlock-all exclusions.
     */
    unlockAllExcept: string[];

    /**
     * Doors to lock; beats any unlock. Entries are actor names, persistent ids when they hold ':', or asset paths when they hold '/'. Server-held state beats all of it.
     */
    lockDoors: string[];
  }

  /**
   * Logic locks and loaded physical doors.
   */
  const Doors: {
    /**
     * Changes a logic lock.
     */
    setLock(lockId: string, unlocked?: boolean): boolean;

    /**
     * Reads a logic lock.
     */
    isUnlocked(lockId: string): boolean | null;

    /**
     * Toggles the lock master key: every lock opens to a key or Alohomora press, whatever the player's Alohomora level, key-only locks included. Server-held locks still refuse. Cleared on disconnect. False when the key could not be reached.
     */
    superAlohomora(enable?: boolean): boolean;

    /**
     * Whether the lock master key is on.
     */
    isSuperAlohomora(): boolean;

    /**
     * Lists nearby loaded doors.
     */
    list(radius?: number): DoorInfo[];

    /**
     * Opens nearby doors.
     */
    openNearby(radius?: number): number;

    /**
     * Changes one door.
     */
    setOpen(name: string, open?: boolean): boolean;

    /**
     * Unlocks nearby doors.
     */
    unlockNearby(radius?: number): number;

    /**
     * Locks or unlocks, on this client only, every loaded door matching an actor name, a persistent id (holds ':') or an asset path (holds '/'). A restream undoes it; the server's Doors.set holds. Returns how many matched.
     */
    setLocked(selector: string, locked?: boolean): number;

    /**
     * Sets streamed-door enforcement and applies it to every loaded door; returns how many were checked.
     */
    setPolicy(policy: DoorPolicy): number;

    /**
     * The streamed-door enforcement policy last set.
     */
    policy(): DoorPolicy;

    /**
     * Door state the server holds, re-applied to each door as it streams in.
     */
    held(): HeldDoorState[];

    /**
     * QA: re-applies held state and policy to every loaded door, as a stream-in would; returns how many were checked.
     */
    _reapply(): number;

    /**
     * QA: whether a key/Alohomora press on the first matching loaded lockable would go through; a refusal sends doorUnlockRequest. Null when nothing matches.
     */
    _unlockAttempt(selector: string): boolean | null;
  };

  /**
   * Visual effects: Niagara and Cascade systems by asset path. spawn() is local to this client; the server's Fx.create is the replicated form, and state() reads one of those here.
   */
  const Fx: {
    /**
     * Spawns an effect system at a world position on this client only. It lives until destroy, destroyAll, or the world reloads.
     * @param path Effect-system asset path, e.g. a Fx.catalog() entry.
     * @param x World-space X coordinate.
     * @param y World-space Y coordinate.
     * @param z World-space Z coordinate.
     * @param options Rotation in degrees and uniform scale (default 1).
     * @returns A local handle for destroy, or 0 when the path did not load as a Niagara/Cascade system.
     */
    spawn(path: string, x: number, y: number, z: number, options?: { pitch?: number, yaw?: number, roll?: number, scale?: number }): number;

    /**
     * Destroys one locally spawned effect.
     * @param handle A handle returned by spawn.
     */
    destroy(handle: number): boolean;

    /**
     * Destroys every locally spawned effect.
     * @returns How many were still live.
     */
    destroyAll(): number;

    /**
     * Curated shipped effect systems (fire, explosions, smoke, weather, water, ambient, magic).
     */
    catalog(): { category: string, name: string, path: string }[];

    /**
     * This client's replicated and applied state for one server-owned effect, or null before stream-in and after stream-out/destruction.
     * @param networkId Server entity id from the server's Fx.create.
     */
    state(networkId: number): FxClientState | null;
  };

  /**
   * One loaded herb plot as THIS client sees it.
   */
  interface HerbPlotInfo {
    /**
     * Position in plots(); order is not stable between calls.
     */
    index: number;

    /**
     * Actor name.
     */
    name: string;

    /**
     * Full object path; no PersistentLevel means a Blueprint archetype.
     */
    path: string;

    /**
     * Whether it is a class archetype rather than a placed actor.
     */
    template: boolean;

    /**
     * GetPlotID — a PlotDefinition row, i.e. a plot SIZE, not a unique key.
     */
    plotId: string;

    /**
     * Persistence UID; CRC32 of the plot's world position.
     */
    readonly plotUid: number;

    /**
     * Parent station UID; stale on a plot whose state was rebound.
     */
    readonly stationUid: number;

    /**
     * ObjectStateManager::GetDbId — reflected per-actor persistence name.
     */
    dbId: string;

    /**
     * EHerbGrowthState: 0 None, 1 Growing, 2 Grown, 3 Harvested, 4 Regrowing. Null if unregistered.
     */
    state: number;

    /**
     * State as a name.
     */
    stateName: string;

    /**
     * Plant occupying the plot.
     */
    plantId: string;

    /**
     * Fertilizer applied; independent of growth state.
     */
    fertilizerId: string;

    /**
     * 0..1 growth progress.
     */
    progress: number;

    /**
     * 0..1 regrowth progress for a multi-harvest plant.
     */
    regrowthRatio: number;

    /**
     * Only meaningful while Growing(1) or Regrowing(4).
     */
    remainingSec: number;

    /**
     * Byproducts a harvest would grant.
     */
    yield: number;

    /**
     * IsGrowing.
     */
    growing: boolean;

    /**
     * Whether the plot is in the Room of Requirement.
     */
    inSanctuary: boolean;

    /**
     * Copied off the plant definition when it was planted.
     */
    growthTimeSec: number;

    /**
     * Copied off the plant definition when it was planted.
     */
    regrowthTimeSec: number;

    /**
     * Whether it regrows instead of being consumed.
     */
    multiHarvestable: boolean;

    /**
     * Name of the spawned AHerb actor, empty if none.
     */
    herb: string;

    /**
     * The herb mesh stage; it animates, so a read right after a write shows the old one.
     */
    stage: number;

    /**
     * GetNumStages — the stage count for this plant.
     */
    stages: number;

    /**
     * Growth timer handle; 0 means nothing is armed.
     */
    timerHandle: number;

    /**
     * CompletionTime minus the nurture clock; 0 when no deadline is set.
     */
    completionInSec: number;

    /**
     * World position.
     */
    readonly x: number;

    /**
     * World position.
     */
    readonly y: number;

    /**
     * World position.
     */
    readonly z: number;

    /**
     * Distance from the local player in cm; -1 if unknown.
     */
    dist: number;
  }

  /**
   * Read-only view of what THIS client's game believes about its herb plots. Server-owned state arrives through replication — this is for telling a desync from a mistaken expectation.
   */
  const Herbology: {
    /**
     * Every herb plot loaded on this client.
     */
    plots(): HerbPlotInfo[];

    /**
     * One plot, by plots() index or by plotUid passed as a string.
     */
    state(plot: number | string): HerbPlotInfo | null;
  };

  /**
   * The mod's own world-anchored interaction prompt, plus visibility control over the game's HUD groups. Group visibility is the tool for hiding UI for a moment; Settings.setHud writes the player's own HUD preferences and is only for a settings panel.
   */
  const Hud: {
    /**
     * Shows a floating "[key] label" prompt anchored at a world position, re-projected each frame. Only one prompt at a time; hides itself when off-screen.
     * @param key The key glyph shown (e.g. "F").
     * @param label The prompt label text.
     * @param x World-space X anchor.
     * @param y World-space Y anchor.
     * @param z World-space Z anchor.
     */
    showPrompt(key: string, label: string, x: number, y: number, z: number): void;

    /**
     * Hides the interaction prompt.
     */
    hidePrompt(): void;

    /**
     * QA: the game's "Special Notifications" setting gates located at boot, and how many still skip the toast.
     */
    _specialNotificationProbe(): { found: number; blocked: number };

    /**
     * Every HUD group name the game knows, read straight off its own UIHUDGroups table rather than a baked copy, so it stays correct across game patches. Available from startup — it does not wait for the HUD.
     */
    groups(): string[];

    /**
     * Hides one HUD group for as long as the mod holds it. This is the right tool for a cutscene or a duel: it stacks per owner alongside the game's own hides and leaves the player's Settings.getHud() choices untouched, so nothing has to be restored. Every group hidden this way is shown again on disconnect.
     * @param group A name from groups().
     */
    hideGroup(group: string): boolean;

    /**
     * QA: the widgets registered for a group, with the ESlateVisibility each one actually has, whether its provider votes still hide it, and how many re-show writes the hold has dropped.
     * @param group A name from groups().
     */
    _groupState(group: string): { known: boolean; held: boolean; hudPresent: boolean; vetoed: number; widgets: { widgetClass: string; address: string; visibility: number; shouldBeHidden: boolean; vetoable: boolean }[] };

    /**
     * Releases the mod's hold on a group. The group stays hidden if the game itself is also hiding it.
     * @param group A name from groups().
     */
    showGroup(group: string): boolean;

    /**
     * Toggles the entire HUD through UIManager. Unlike hideGroup this is NOT provider-scoped — it is one global flag, so two callers fighting over it will clobber each other, and it is not restored on disconnect.
     * @param visible false hides the whole HUD.
     * @param allowSelectiveTicking Lets the game keep ticking parts of the hidden HUD (default true).
     */
    setVisible(visible: boolean, allowSelectiveTicking?: boolean): boolean;
  };

  /**
   * The local player and its native-component controls.
   */
  const LocalPlayer: {
    /**
     * Curated death / health / invulnerability state controls on the CharacterStateInfo component.
     */
    readonly stateInfo: LocalPlayerStateInfo;

    /**
     * Curated ragdoll (downed body) physics state controls on the RagdollControlComponent.
     */
    readonly _ragdoll: LocalPlayerRagdoll;

    /**
     * Draw, stow and restyle the local player's wand.
     */
    readonly wand: LocalPlayerWand;

    /**
     * Walk/jog locomotion, including the RP walk-by-default inversion.
     */
    readonly gait: LocalPlayerGait;

    /**
     * Returns the local pawn's world location, or null before it has spawned.
     */
    getPosition(): Vec3 | null;

    /**
     * Returns the local pawn's rotation in degrees, or null before it has spawned.
     */
    getRotation(): Rotator | null;

    /**
     * Returns the live controller rotation, or null without a pawn/controller.
     */
    getControlRotation(): Rotator | null;

    /**
     * Clears local movement velocity. Returns false without a pawn or movement component.
     */
    clearVelocity(): boolean;

    /**
     * Diagnostic: true once the native ActorSpellCast hook is live.
     */
    _spellHookInstalled(): boolean;

    /**
     * AActor::SetActorEnableCollision on the local pawn. Returns false if there's no pawn.
     * @param enable false lets the pawn pass through world geometry (collision half of noclip).
     */
    setCollision(enable: boolean): boolean;

    /**
     * Teleports the local pawn to a world location, preserving facing. Returns false if there's no pawn.
     * @param x World-space X coordinate.
     * @param y World-space Y coordinate.
     * @param z World-space Z coordinate.
     */
    setPosition(x: number, y: number, z: number): boolean;

    /**
     * Freezes player input via the game's own pawn-level suppressor (camera look still runs). Pair with restorePlayerInput. null without a pawn.
     */
    stopPlayerInput(): boolean | null;

    /**
     * Undoes stopPlayerInput via the game's own input restore. null without a pawn.
     */
    restorePlayerInput(): boolean | null;

    /**
     * Clears a held emote or a playClip pose, locally and on other players' proxies.
     */
    stopEmote(): boolean;

    /**
     * PLAYS an arbitrary AnimSequence on the local body; pass loop: false, hold: true to hold a static pose. Replicates as state, so other players' proxies play it too, including players who arrive later: a loop joins in and a held clip shows its last frame. Returns false if the clip has no length or the play head can't be driven (it stays a static pose).
     * @param clipPath An AnimSequence object path; omit or "" to clear.
     * @param options loop and hold default true, rate defaults 1. hold only applies when loop is false: true freezes the last frame, false releases so you can move immediately.
     */
    playClip(clipPath?: string, options?: { loop?: boolean, hold?: boolean, rate?: number }): boolean;

    /**
     * Plays an Able ability on the local player via the game's own PlayAbilityByClass — the mechanism the game itself uses to animate the avatar — and returns a tracked handle. Other players see it through the Able channel mirror, including players who arrive later or whose copy of you is rebuilt. The handle's status moves requested → started → ended | interrupted | cancelled, or failed if the play was refused or never appeared on the channel; each transition also fires the abilityStatus event, always after this call returns. A new play on the same channel supersedes the previous handle (it reads interrupted). A refused play still returns a handle, already failed.
     * @param classPath An Able ability CLASS path, ending _C (e.g. "/Game/Pawn/Student/Abilities/PartialBody/Waving/ABL_Waving.ABL_Waving_C").
     * @param channel Able channel — "FullBody" (default) or "PartialBody".
     * @param suppressIdle Holds the game's ambient-idle gate for this handle's lifetime, so the casual idle transitions cannot cut a PartialBody interaction short. Released on every terminal status. While it is held the avatar keeps its current idle and plays no idle breaks; if it was already lounging in casual idle the play waits out the one exit transition that raising the gate commands (up to 4.5 s).
     */
    playAbility(classPath: string, channel?: string, suppressIdle?: boolean): AbilityHandle;

    /**
     * Current status of a tracked ability. Finished handles stay readable for a while; "unknown" means the id was never issued or has aged out.
     * @param handle A handle from playAbility, or its id.
     */
    abilityStatus(handle: AbilityHandle | number): "requested" | "started" | "ended" | "interrupted" | "cancelled" | "failed" | "unknown";

    /**
     * Ends the ability behind a handle ONLY while it still holds its channel — a replacement is left alone, unlike cancelAbility(channel). Returns whether a cancel was actually issued; false means the playback was already over or replaced.
     * @param handle A handle from playAbility, or its id.
     */
    cancelAbilityHandle(handle: AbilityHandle | number): boolean;

    /**
     * Drives a local-only copy of your character, pinned inside the camera frustum so it floats beside a menu like an emote preview. Nobody else sees it, and unlike the real player it can play motion clips, not only held poses. Ability emotes have no preview — a dummy is unpossessed.
     * @param options clip and emote set what the figure plays; show spawns or drops it. Omit everything to just read the state back.
     */
    emotePreview(options?: { show?: boolean, clip?: string, loop?: boolean, emote?: string, tune?: EmotePreviewTuning }): EmotePreviewState;

    /**
     * Ends whatever occupies an Able channel. REQUIRED after playAbility for any ability whose m_Length is infinite (the throw and swipe both are) — the Behaviour Tree normally tears those down, and nothing else will.
     * @param channel Able channel to clear; defaults to "PartialBody".
     */
    cancelAbility(channel?: string): boolean;

    /**
     * Whether an ability currently occupies the channel (AblAbilityComponent::GetActiveAbility_New). The honest answer to "did playAbility actually start?".
     * @param channel Able channel to inspect; defaults to "PartialBody".
     */
    _abilityActive(channel?: string): boolean;

    /**
     * Spawns a mesh and attaches it to the local body at a socket, replacing whatever was held. Replicates as state, so other players see it in your hand, including players who arrive later, until clearProp. Warns when the socket does not exist, because the engine silently attaches at the component origin instead.
     * @param path A StaticMesh OR SkeletalMesh asset path — the asset kind picks the actor class and the setter.
     * @param socket Body-mesh socket to attach at; defaults to "WandSocket".
     */
    equipProp(path: string, socket?: string): boolean;

    /**
     * Nudges the held prop relative to its socket (replicated with it), so the fit is dialled in live rather than rebuilt per guess. Omitted arguments reset to zero, and scale to 1.
     */
    setPropOffset(pitch?: number, yaw?: number, roll?: number, x?: number, y?: number, z?: number, scale?: number): boolean;

    /**
     * Destroys the held prop. Returns whether there was one.
     */
    clearProp(): boolean;

    /**
     * The prop in your hand and its offset, or null when nothing is held.
     */
    getProp(): { path: string, socket: string, offset: { pitch: number, yaw: number, roll: number, x: number, y: number, z: number, scale: number } } | null;

    /**
     * The local character's live body scale (1 = native) in either scale mode. Set it server-side with player.setScale.
     * @returns The scale, or 0 before the character component exists.
     */
    getScale(): number;

    /**
     * Dev probe: CCC and actor scale, the mesh's relative scale/location and world scale, capsule dimensions scaled and unscaled, and the held wand's world scale.
     * @param networkId Measure this player's body as we render it (our proxy of them, or our own pawn); omit for the local pawn.
     */
    _scaleProbe(networkId?: number): object | null;

    /**
     * QA probe: what this client's copy of that player shows (applied clip, play head, notify props/sounds, Able channels, held prop) beside the owner's replicated clip, ability and prop state. { known: false } for an unknown or local id.
     * @param networkId A remote player's network id.
     */
    _proxyAnimProbe(networkId: number): object;

    /**
     * QA probe: the broom this client spawned under that rider, its mesh's material overrides, the house painted onto it and the owner's replicated look.house. { known: false } for an unknown or local id.
     * @param networkId A remote player's network id.
     */
    _proxyBroomProbe(networkId: number): object;

    /**
     * QA probe: world positions of this client's Lumos light and tip FX on that player's proxy, beside its wand's MuzzleSocket and grip, with each one's distance to the tip. { known: false } for an unknown or local id.
     * @param networkId A remote player's network id.
     */
    _proxyLumosProbe(networkId: number): object;

    /**
     * QA hook: tears down this client's copy of that player so the next update rebuilds it, as a respawn reload does. False for an unknown or local id, or a copy not built yet.
     * @param networkId A remote player's network id.
     */
    _rebuildProxy(networkId: number): boolean;

    /**
     * UGearManager::IdentifyAllItems. Gear granted at runtime arrives unidentified (the loot path); this identifies all of it. Returns the count identified, -1 if the manager isn't up.
     */
    identifyGear(): number;

    /**
     * How many unidentified items the player holds, so an identify interaction can be gated on there being something to identify. -1 if the manager isn't up.
     */
    unidentifiedGearCount(): number;

    /**
     * The equippable gear slots, read from the game's own GearSlotTypes table (Head, Face, Neck, Hand, Back, Outfit). Empty until the GearManager is up. Boots and trousers are not slots of their own — they are part of Outfit.
     */
    gearSlots(): string[];

    /**
     * What the local player is wearing, keyed by slot, with null for the empty ones. One native call. null if the GearManager isn't up.
     */
    equippedGear(): Record<string, GearItem | null> | null;

    /**
     * Owned gear that fits one slot, each flagged with whether it is the worn one — the list a gear UI shows for that body part. Includes gear registered by UGC mods, since the slot comes from the GearItems table rather than the item's name. null if the slot is unknown or the manager isn't up.
     * @param slot A slot name from gearSlots; matched case-insensitively.
     */
    availableGear(slot: string): GearItem[] | null;

    /**
     * QA/diagnostic. Cumulative counters and wall-clock durations of the appearance paths' synchronous work: self-apply and creator-confirm reloads, look harvests and publishes, the proxy look and transmog builds, and each outfit re-render of the local pawn (outfitUpdate, the gear signal's source). Diff two reads around a change.
     */
    _appearancePerf(): Record<string, { count: number; lastMs: number; totalMs: number; maxMs: number; lastEndedAtMs: number }>;

    /**
     * QA/diagnostic. Per-slot digests of what a character component wears right now, from its live piece maps (piece, flip and every material override). Keys are CharacterItems/<slot> and Outfits/<outfit>/<slot>. `scale` and `bones` are the component's body scale and the requested bone sliders, read through the reflected getters.
     * @param options probe: digest that look probe instead of the player; bones: bone slider names to read back into `bones`.
     */
    _appearanceDigest(options?: { probe?: number; bones?: string[] }): { ok: boolean; outfit: string; live: Record<string, { piece: string; flipped: boolean; scalars: number; vectors: number; textures: number; digest: string }>; scale?: number; bones?: Record<string, number> };

    /**
     * QA/diagnostic. Spawns or releases look probes so a proxy's look can be compared with the player's through _appearanceDigest({ probe }).
     * @param options spawn: dress a stand-in body beside the player from the local look, the way a viewer dresses this player; look: dress it from this look instead (refused like importLook); side: sideways offset in cm, negative = left; release: destroy every probe.
     */
    _lookProbe(options?: { spawn?: boolean; side?: number; release?: boolean; look?: LookJson }): { ok: boolean; index: number; status: string; released?: boolean; look?: { gender: number; presets: string[]; gear: string[]; unresolvedGear: string[]; faceGear: string; house: string } };

    /**
     * UGearManager::SetGearStat. Accepts 'IsIdentified' (verified), which is the per-item identify the game has no native for. Returns the game's verdict.
     * @param gearId A GearID from the game's gear tables.
     * @param variation The item's variation name.
     * @param statName Stat to write; "IsIdentified" is an unverified probe for a per-item identify.
     * @param value New stat value.
     */
    _setGearStat(gearId: string, variation: string, statName: string, value: number): boolean;

    /**
     * Silences HUD notification banners (pickups, unlocks, XP, missions, tutorials) for a window, then restores the player's own settings. Login already does this; use it around bulk grants. Returns the window applied.
     * @param ms How long to stay quiet; defaults to 3000, capped at 20000.
     */
    muteNotifications(ms?: number): number;

    /**
     * Reads one of the pawn's gameplay stats. null when there's no pawn or the name doesn't resolve.
     * @param name An ABiped_Player FGameplayProperty_Float — OffenseStat, DefenseStat, CooldownStat, StatDamageMultiplier, StatDamageReduction, ...
     * @param field Which field to read: "Current" (default), "Base", "Min" or "Max".
     */
    gameplayStat(name: string, field?: string): number | null;

    /**
     * Writes a gameplay stat directly, bypassing gear. Both Current and Base are set, since the mod system recomputes Current from Base. Local and non-authoritative — it does not sync.
     * @param name The stat to write (see gameplayStat).
     * @param value New value, written to both Current and Base.
     */
    _setGameplayStat(name: string, value: number): boolean;
  };

  /**
   * The local player's walk/jog gait. Off by default: a server opts in with setWalkDefault(true), which makes walking the default and turns "C" into walk-to-jog instead of the other way round, and keeps that choice across sprints, which vanilla does not.
   */
  interface LocalPlayerGait {
    /**
     * Enables RP locomotion for this client. Applies on the next spawn and re-applies after death or travel.
     * @param on true to walk by default and hold the player's choice through sprints.
     */
    setWalkDefault(on: boolean): boolean;

    /**
     * Whether RP locomotion is currently enabled on this client.
     */
    walkDefault(): boolean;

    /**
     * The gait the player is currently set to: "walk", "jog", "sprint", "idle", "slowwalk", "fastwalk", or "none" before the pawn exists.
     */
    get(): string;

    /**
     * Sets the gait outright, as if the player had pressed the toggle. Returns false for any other name, or before the pawn exists.
     * @param gait "walk" or "jog".
     */
    set(gait: string): boolean;

    /**
     * QA probe: forces the slot to jog without recording it as the player's choice, standing in for one of the game's snap-backs so a test can prove the watchdog restores it.
     */
    _clobber(): boolean;
  }

  /**
   * The local player's wand. Equip state and style are replicated, so remote players see both. Every mutator returns a status code: "OK", or WAND_UNKNOWN_STYLE / WAND_NONE / WAND_UNAVAILABLE / WAND_FAILED.
   */
  interface LocalPlayerWand {
    /**
     * Whether the wand is drawn, read from the right-arm state the body is actually playing. null without a pawn.
     */
    isEquipped(): boolean | null;

    /**
     * Draws the wand, and holds it drawn: the request is pinned above the idle that would otherwise stow it, but below casting and cutscenes, so those still take the arm and the wand returns afterwards.
     */
    equip(): string;

    /**
     * Stows the wand, and holds it stowed. Same priority rules as equip.
     */
    unequip(): string;

    /**
     * The DT_CustomWandStyle row the wand actually renders (e.g. "T003_M01_H007_M02"). Empty only before the pawn is up, or on a character that has never been given one.
     */
    style(): string;

    /**
     * Every wand style the game's own table offers — 1034 rows in the stock game, plus anything a UGC mod added. Empty until the player's wand exists, since the table is reached through it.
     */
    styles(): string[];

    /**
     * Dev probe. The wand's ANIMATION state, which is a different fact from isEquipped(): the wand can be the toolset's active tool while the body holds it stowed in a casual idle. null fields mean the body is not running its AnimBlueprint.
     */
    _animState(): { equipped: boolean | null, equipping: boolean | null, ready: boolean | null };

    /**
     * Changes which wand the player carries and persists the choice. Refused for a row the table doesn't have, because the game writes the saved style before it validates anything.
     * @param style A row key from styles(); matched case-insensitively.
     */
    setStyle(style: string): string;
  }

  /**
   * Curated view of the pawn's CharacterStateInfo component. Getters return null without a pawn/component; each call re-resolves the live pawn.
   */
  interface LocalPlayerStateInfo {
    /**
     * Whether the local player is dead.
     */
    isDead(): boolean | null;

    /**
     * true while in the near-death kneel (the game's downed state).
     */
    isNearDeathKneeling(): boolean | null;

    /**
     * The game's own resolution of whether a lethal hit would kneel instead of kill.
     */
    _willNearDeathKneel(): boolean | null;

    /**
     * Whether the death-protection flag is set.
     */
    isProtectedFromDeath(): boolean | null;

    /**
     * true during a timed invulnerability window (_setInvulnerable(seconds)).
     */
    isInvulnerable(): boolean | null;

    /**
     * The persistent damage-immunity flag (setInvulnerableToDamage), distinct from the timed window.
     */
    isInvulnerableToDamage(): boolean | null;

    /**
     * Returns the local player's current health.
     */
    getHealth(): number | null;

    /**
     * Returns the local player's maximum health.
     */
    getMaxHealth(): number | null;

    /**
     * Returns the local player's level (ObjectStateInfo::GetLevel).
     */
    getLevel(): number | null;

    /**
     * Sets/clears the persistent damage-immunity flag.
     * @param invulnerable Set or clear the persistent damage-immunity flag.
     */
    setInvulnerableToDamage(invulnerable: boolean): boolean;

    /**
     * Grants timed invulnerability for seconds (the game's own window). Returns the game's accepted/rejected verdict; false for a non-finite value.
     * @param seconds Duration of the timed invulnerability window.
     */
    _setInvulnerable(seconds: number): boolean;

    /**
     * Restores health to max.
     * @param removeTak Passed to the game's bRemoveTAK; defaults to false.
     */
    restoreHealthToMax(removeTak?: boolean): boolean;

    /**
     * Clears an active timed invulnerability window (no-op when none is active).
     */
    _clearInvulnerable(): boolean;

    /**
     * Sets/clears the game's death-protection flag. While protected, health can reach 0 without the game ending the pawn.
     * @param protectedFromDeath Set or clear the game's death-protection flag.
     */
    _setProtected(protectedFromDeath: boolean): boolean;

    /**
     * Sets current health through the game's own SetHealth. Returns the game's accepted/rejected verdict; false also when there's no pawn.
     * @param amount New current health (clamped by the game).
     * @param indicateHud Whether the health bar reacts; defaults to true.
     */
    setHealth(amount: number, indicateHud?: boolean): boolean;
  }

  /**
   * Curated view of the pawn's RagdollControlComponent (the downed-body physics state). Getters return null / mutators false without a pawn.
   */
  interface LocalPlayerRagdoll {
    /**
     * true while the pawn is in full ragdoll (limp on the ground).
     */
    isFullRagdoll(): boolean | null;

    /**
     * The game's own resolution of whether the pawn could stand up right now.
     */
    canGetUp(): boolean | null;

    /**
     * true when the component is wired to a valid skeletal mesh setup.
     */
    hasValidSetup(): boolean | null;

    /**
     * Tells the ragdoll system its owner died (enters the dead-ragdoll state).
     */
    setOwnerIsDead(): boolean;

    /**
     * Tells the ragdoll system its owner was resurrected; pairs with setOwnerIsDead.
     */
    setOwnerResurrected(): boolean;

    /**
     * Snaps out of ragdoll instantly (no blend) - the hard recovery.
     */
    forcePopOutOfRagdollImmediately(): boolean;

    /**
     * Blends out of ragdoll back to animation.
     * @param stationaryCapsule Keeps the capsule in place while blending; defaults to true.
     * @param durationOverride Blend duration in seconds; 0 recovers instantly.
     */
    blendBack(stationaryCapsule?: boolean, durationOverride?: number): boolean;

    /**
     * Enters ragdoll via the game's impact-reaction system at the pawn's own location. No-op while already in full ragdoll.
     * @param strength 0 None, 1 Hitch, 2 Knockdown (default), 3 Levioso, 4 DeathBlows, 5 Slam.
     * @param impactStrength Scales the impulse along dirX/Y/Z (default no force).
     * @param dirX Impulse direction X.
     * @param dirY Impulse direction Y.
     * @param dirZ Impulse direction Z.
     */
    startImpactReaction(strength?: number, impactStrength?: number, dirX?: number, dirY?: number, dirZ?: number): boolean;
  }

  /**
   * A tracked ability playback on the local player, from playAbility. status is a snapshot from when it was read; watch the abilityStatus event for transitions.
   */
  interface AbilityHandle {
    /**
     * Handle id, unique per client session; 0 is never issued.
     */
    id: number;

    /**
     * Able channel the ability was played on.
     */
    channel: string;

    /**
     * The ability class path that was requested.
     */
    classPath: string;

    /**
     * requested → started → ended | interrupted | cancelled, or failed.
     */
    status: "requested" | "started" | "ended" | "interrupted" | "cancelled" | "failed";
  }

  /**
   * What emotePreview did and where the preview figure stands now.
   */
  interface EmotePreviewState {
    /**
     * False when something in the request was rejected — today only an unknown or ability-backed emote name.
     */
    ok: boolean;

    /**
     * Whether the preview is meant to be showing.
     */
    visible: boolean;

    /**
     * Whether the figure is actually spawned yet; a spawn takes a tick or two and needs a live pawn.
     */
    ready: boolean;

    /**
     * Last failure reason, consumed on read ("" when there is none).
     */
    status: string;
  }

  /**
   * Where the preview figure sits in frame. Every field is optional and sticky — set once, not per call.
   */
  interface EmotePreviewTuning {
    /**
     * Viewport fraction across, 0 = left edge. Default 0.24.
     */
    readonly screenX: number;

    /**
     * Viewport fraction down, 0 = top edge. Default 0.58.
     */
    readonly screenY: number;

    /**
     * Centimetres in front of the camera — this is what sets apparent size. Default 185.
     */
    readonly distance: number;

    /**
     * How far below the screen mark the figure's origin sits, in cm. Default -15.
     */
    readonly anchor: number;

    /**
     * Degrees added to facing-the-camera, for a three-quarter turn. Default -20.
     */
    readonly yaw: number;

    /**
     * Actor scale, clamped to 0.05-10. Prefer `distance` unless you want a doll rather than a person: scale shrinks the figure itself, distance only how big it reads. Default 0.60.
     */
    readonly scale: number;

    /**
     * Private studio-light scale. 0 drops the rig and hands the figure back to world lighting. Default 1.
     */
    readonly rig: number;
  }

  /**
   * A world position in centimeters.
   */
  interface Vec3 {
    /**
     * X coordinate.
     */
    x: number;

    /**
     * Y coordinate.
     */
    y: number;

    /**
     * Z coordinate.
     */
    z: number;
  }

  /**
   * A rotation in degrees.
   */
  interface Rotator {
    /**
     * Pitch in degrees.
     */
    pitch: number;

    /**
     * Yaw in degrees.
     */
    yaw: number;

    /**
     * Roll in degrees.
     */
    roll: number;
  }

  /**
   * Deliver owl post from an arbitrary sender, with custom text and a portrait.
   */
  const Mail: {
    /**
     * Delivers a real owl: persistent, listed in the Field Guide, with a sender name, your text and a portrait. WRITES SAVE STATE.
     * @param body The letter text, free-form.
     * @param options { from?, key?, anonymous?, live?, silent?, read? }. Sender defaults to this player's character name; anonymous overrides from.
     */
    compose(body: string, options?: object): string;

    /**
     * Reads MailManager back: unread count and inbox/archive sizes.
     */
    status(): string;

    /**
     * JSON `[{key, read}]` for the inbox. The game only holds read state for the session, so persist this if it should survive a rejoin.
     */
    inboxStates(): string;
  };

  /**
   * Client-side NPC diagnostics.
   */
  const Npc: {
    /**
     * Dumps every hostility/attackability gate between an NPC's pawn and a player's body on this client. Run it on the NPC's owner.
     * @param npcId NPC network id.
     * @param playerId Player network id whose body to test as a victim.
     */
    hostilityProbe(npcId: number, playerId: number): string;

    /**
     * Dumps the enemy AI's attack state machine, move acceptance and its current target's health/state-info. Explains why a pinned target isn't re-attacked. Run it on the NPC's owner.
     * @param npcId NPC network id.
     */
    aiDiag(npcId: number): string;

    /**
     * Lifts the enemy AI's attack restrictions so it will keep attacking a non-player target.
     * @param npcId NPC network id.
     * @param mode 'turn' (default, arbiter only, keeps pacing), 'full' (also strips cooldowns), or 'off'.
     */
    unleash(npcId: number, mode?: string): string;

    /**
     * Registers a player's body with the game's non-NPC combat registry so the enemy attack arbiter will grant turns against it. Run on the NPC's owner.
     * @param playerId Player whose local body to register.
     * @param on Register (default) or remove.
     */
    registerCombatant(playerId: number, on?: boolean): string;

    /**
     * Compares the local player and that player's proxy as cognition stimuli sources. If the local player isn't registered either, perception isn't how the game finds the player.
     * @param playerId Player whose proxy to compare against the local player.
     */
    senseProbe(playerId: number): string;

    /**
     * Asks this client's copy of that NPC what a hit on the local player would cost, via EnemyAIComponent::GetDamage. Candidate oracle for a damage relay that carries no number.
     * @param npcId NPC network id.
     */
    getDamageProbe(npcId: number): string;

    /**
     * Fires EnemyAIComponent::SendMunitionImpact from this client's copy of that NPC at the local player. Unlike the other probes this deals REAL damage — it is the candidate relay apply, engine-scaled on the victim.
     * @param npcId NPC network id.
     */
    sendImpactProbe(npcId: number): string;

    /**
     * Arms a log-only watch on the goblin weapon's attack-capsule overlap; every hit is logged with the class of the actor struck and, if it is a remote player's proxy, that player's network id. Run on the NPC's owner. Results go to HogwartsMP.log, not chat.
     */
    meleeProbe(): string;

    /**
     * Fires SpellHelper::DoDamageTarget at this client's own player pawn and reports health either side of the call. Proves the victim-side half of an NPC->player damage relay; the instigator arguments test whether a non-null InInstigator is what makes the game compute mitigation.
     * @param damage Damage to apply (default 25).
     * @param force Knockback impulse (default 0).
     * @param instigatorNpcId Use this client's copy of that NPC as InInstigator (0 = none).
     * @param selfAsInstigator Use the local pawn as InInstigator when no NPC id is given.
     */
    selfDamageProbe(damage?: number, force?: number, instigatorNpcId?: number, selfAsInstigator?: boolean): string;
  };

  /**
   * Off-screen avatar portraits: renders a dressed dummy to a PNG (+ alpha matte).
   */
  const Portrait: {
    /**
     * Queues a capture; false if one is already running. Multi-frame — poll busy()/result().
     * @param request { subjectId: 0 for yourself or a player's id, look: a saved look (LookJson or its JSON text; wins over subjectId), transmog: a disguise character id rendered instead of the look, framing: 'face'|'bust'|'waist'|'body', pose ('live' = their current emote, '' = none, i.e. the bind pose), name, gaze, matte, size }
     */
    capture(request?: object): boolean;

    /**
     * True while a capture is in flight.
     */
    busy(): boolean;

    /**
     * The last completed capture's status line, consumed on read.
     */
    result(): string;

    /**
     * The last colour PNG as a data: URI for a Web view, or '' if absent/too large. Use a small capture size for previews.
     * @param maxBytes Size cap; default 4 MiB.
     */
    lastImage(maxBytes?: number): string;

    /**
     * Where the last capture's wall clock went, in ms: { dress, settle, rig, colour, matte, total, encode }.
     */
    timings(): object;

    /**
     * Art direction, set once rather than per call. Returns the settings in effect.
     * @param settings { fov, rigScale, keyScale, fillScale, rimScale, washScale, supersample, backdropCm, eyeLineBias, settleTicks, poseTicks } — any subset
     */
    tune(settings?: object): object;
  };

  /**
   * Client end of the potion-effect layer. Effect state itself is server-owned and replicated; this only carries the server's duration config.
   */
  interface Potions {
    /**
     * Server-configured potion durations, applied when an effect first becomes active. Overrides the game's own table AND its random duration doubling. Returns how many entries were accepted.
     * @param table { abilityName: seconds } — absolute durations. Pass {} to clear.
     */
    setDurationOverrides(table: object): number;
  }

  /**
   * Local experience/level state (UExperienceManager).
   */
  const Progression: {
    /**
     * Current experience level; -1 before the manager exists.
     */
    getLevel(): number;

    /**
     * Current experience points; -1 before the manager exists.
     */
    getPoints(): number;

    /**
     * Dispatches the game's reflected SetExperienceLevel function, which is inert in the current game build. Prefer setPoints().
     */
    setLevel(level: number): boolean;

    /**
     * Grants points through the game's own path, so level-ups fire normally.
     */
    addExperience(points: number, source?: string, detail?: string): boolean;

    /**
     * Sets exact experience through the game's AddExperience path and returns applied state. Preserves unspent talent points by default; crossing a level can still show the normal presentation.
     * @param points Absolute experience-point target; clamped to the native level curve.
     */
    setPoints(points: number, options?: ProgressionSetPointsOptions): ProgressionSetPointsResult | null;

    /**
     * Point bounds {start,end} for a level, or null.
     */
    getLevelBounds(level: number): object;
  };

  /**
   * Player-vs-player duelling. The hit pipeline (impact relay, damage apply, vitals) is native — these are the presentation/state levers a duel needs.
   */
  const Pvp: {
    /**
     * WRITES. Sets proxy team(s). A hostile team unlocks the game's own lock-on/homing and full-body curses — the spell fire path skips targets on the caster's own team.
     * @param team Team FName; default 'Enemy'.
     * @param playerId Limit the write to that player's proxy — per-relationship aim policy (teams are CLIENT-LOCAL). Omit for every proxy.
     */
    setTeam(team?: string, playerId?: number): string;

    /**
     * WRITES. The engine-level consent gate: our spells only impact/target listed players' proxies. Empty (the default) = nobody is hittable — a duel adds its opponent for its duration.
     * @param playerId Player whose proxy accepts our spell affect (0 = a dev-spawned student); null/omitted clears everyone.
     * @param on Default true; false removes just that player.
     */
    setTargetable(playerId?: number | null, on?: boolean): string;

    /**
     * WRITES. Restores the original team setTeam recorded on its first write per proxy — how a duel puts the relationship back as found.
     * @param playerId Limit the restore to that player's proxy; omit for every proxy with a recorded team.
     */
    resetTeam(playerId?: number): string;

    /**
     * WRITES. Retail non-lethal defeat on the LOCAL pawn: arms the (authored-false) near-death-kneel flag and enters the game's own kneel state directly. Readback-verified at every step and never lethal; the kneel holds ~4s, then the native expiry restores health (the recover flag is armed here — the player's authored copy would die instead).
     */
    kneel(): string;

    /**
     * WRITES. Ends an active near-death kneel via the game's own reflected EndNearDeathKneel — the backstop if the native expiry hasn't stood the player up.
     */
    endKneel(): string;

    /**
     * WRITES. Enters retail duel state on the LOCAL pawn: the 'DuelingState' actor tag + health recovery off (+ optionally the arena input context). Reports the reflected IsDueling readback.
     * @param arenaControls true also sets the ControlMapper 'Dueling' input context — the retail arena control scheme (camera lock, no free aim). Default false: free movement.
     */
    startDuelContext(arenaControls?: boolean): string;

    /**
     * WRITES. Leaves retail duel mode: clears the 'Dueling' input context and 'DuelingState' tag and re-enables health recovery.
     */
    endDuelContext(): string;

    /**
     * WRITES. The player's auto health recovery (Biped_Player::DisablePlayerHealthRecovery — the real refill mechanism; RegenerationRate is authored 0 on players). No seconds = sticky until re-enabled.
     * @param enabled false = stop the player's out-of-combat health refill.
     * @param seconds With enabled=false: suppress only for this window (extended by further calls) instead of sticky. Native hits already suppress 10s each.
     */
    setRegen(enabled: boolean, seconds?: number): string;

    /**
     * WRITES. Points the retail boss/duel HUD meter at that player's proxy and writes their character name (CCD first+last, nickname fallback) into it. The bar/level track their real vitals via the native relay.
     * @param playerId Whose proxy to track; 0 uses a dev-spawned student; 'auto' follows whoever your hits land on (team duels/FFA); null/omitted hides the meter.
     */
    showMeter(playerId?: number | 'auto' | null): string;

    /**
     * WRITES. The victim-side stagger economy: after `maxChain` staggers inside `window` seconds (or one unbroken stagger longer than `window`), impacts from other players stop requesting a hit reaction on the local pawn until `suppressFor` seconds after the current stagger ends, so a spammed basic attack can no longer chain full-body reactions into an unanswerable lock. Damage, PvE hits and death are never affected. Defaults: 2 staggers per 1.5s, then 1s of stagger immunity.
     * @param policy Omitted fields keep their current value; a bare boolean toggles `enabled`.
     */
    setReactPolicy(policy?: { enabled?: boolean, maxChain?: number, window?: number, suppressFor?: number } | boolean): string;

    /**
     * Reads the react policy's live state: the resolved reaction component, whether a reaction is running right now, the current chain count and any active suppression window. Reads only.
     */
    reactStatus(): string;

    /**
     * reactStatus as data. An empty `component` means the pawn carries no ability component and the stagger cap is inert; `reactionRunning` is null when the readback itself failed; `cancels` counts remote impacts whose reaction request was dropped, `impacts` every remote impact seen on the pawn (dropped or not). Reads only.
     */
    reactState(): { enabled: boolean, maxChain: number, window: number, suppressFor: number, component: string, activeAbility: string, lastStagger: string, reactionRunning: boolean | null, chain: number, suppressed: boolean, suppressedFor: number, suppressions: number, cancels: number, impacts: number, probeQueued: number };

    /**
     * WRITES. Ends any active stagger-immunity window now and turns the pawn's reactions back on, leaving the policy itself alone. Call it wherever a duel or gamemode ends — reactions must never be left off.
     */
    restoreReactions(): string;

    /**
     * Samples the local pawn's reaction component every tick and counts reactions that actually began — the readback that turns "the stagger cap worked" into a measurement. Off by default: a reflected call per frame is not free.
     * @param on true (default) resets the counters and starts sampling; false stops.
     */
    _watchReactions(on?: boolean): { active: boolean, starts: number, samples: number, running: number, componentLost: boolean };

    /**
     * Reads the reaction counters without arming or resetting them. `componentLost` means a sample could not reach the component, so the counts are incomplete. Reads only.
     */
    _reactObservation(): { active: boolean, starts: number, samples: number, running: number, componentLost: boolean };

    /**
     * DEV/QA. Feeds the chain counter observed staggers through the same path the FullBody sampler uses, so the counting/suppression state machine is testable without a fight. Does not touch the game.
     * @param times How many observed staggers to feed; default 1.
     */
    _noteStagger(times?: number): string;

    /**
     * DEV/QA. Runs the whole stagger reproduction end to end: spawns the dev students if fewer are up, makes them hostile for the burst, arms the diagnostic, fires the rounds, restores their teams and closes the window 2s after the last one. reactState().probeQueued reaches 0 at the last round; read the summary with _reactDiag(0).
     * @param count Rounds to fire; default 6.
     * @param intervalMs Spacing in milliseconds; default 400.
     * @param options pattern: what each round casts (default combo = 3x Stupefy then StupefyHeavy, the records a remote player's replay sends); students: how many dev students take turns casting (1-4, default 1; a round = one cast from each, one per interval — same-tick casts of one record collapse in the pooled spell tool); upgraded: replay through each spell's own tool with the local player's upgrades, the path an upgraded remote player's casts take — its munitions are damage-stripped.
     */
    _staggerRun(count?: number, intervalMs?: number, options?: { pattern?: 'combo' | 'light' | 'heavy', students?: number, upgraded?: boolean }): string;

    /**
     * DEV/QA. Despawns every dev student proxy on the next tick — the cleanup for _staggerRun.
     */
    _despawnStudents(): string;

    /**
     * DEV. Samples every ability channel, the combat-AnimBP FullBodyState and IsPlayingAbility for a window, then reports the distinct values with counts — the readout that says where the player's stagger actually lives.
     * @param ms Sampling window in milliseconds (default 4000); 0 stops sampling and returns what was seen.
     */
    _reactDiag(ms?: number): string;

    /**
     * DEV. Fires the human basic combo (3x Stupefy then StupefyHeavy) from the dev student proxy at the local pawn so the FullBody stagger chain reproduces on ONE client — the same records and instigator class a remote player's replay sends. Spawn a student from the F8 dev menu first.
     * @param count Casts to fire; default 8.
     * @param intervalMs Spacing in milliseconds; default 250.
     */
    _staggerProbe(count?: number, intervalMs?: number): string;
  };

  /**
   * Physical balls, hoops, the loose snitch and the pitch crowd.
   */
  const Quidditch: {
    /**
     * Spawns a simulating ball on SmallPhysicsProp (Pawn -> Ignore, so it never shoves players) plus an OverlapOnlyPawn probe sphere. Returns a handle, 0 on failure.
     */
    spawnBall(meshPath: string, x: number, y: number, z: number, massKg?: number, probeRadius?: number): number;

    /**
     * Destroys a ball.
     */
    destroyBall(id: number): boolean;

    /**
     * The ball's world location.
     */
    ballPosition(id: number): Vec3 | null;

    /**
     * Teleports the ball. Use while kinematic; sweeping is off, so a server plane test must use segments.
     */
    setBallPosition(id: number, x: number, y: number, z: number): boolean;

    /**
     * Kinematic while the server drives it, simulating while it is loose.
     */
    setBallSimulating(id: number, simulating: boolean): boolean;

    /**
     * Sets the ball's linear velocity (cm/s).
     */
    throwBall(id: number, vx: number, vy: number, vz: number): boolean;

    /**
     * Attaches the ball to the local player's mesh socket and stops simulating it.
     */
    attachBall(id: number, socket?: string): boolean;

    /**
     * Detaches the ball, keeping world transform.
     */
    detachBall(id: number): boolean;

    /**
     * Spawns a standalone race ring as a hoop. Its aperture is Pawn-only, so it registers fly-throughs, never the ball. Leave ~11m clearance below — the ring carries hidden blocking pillars.
     */
    spawnHoop(x: number, y: number, z: number, yaw?: number): boolean;

    /**
     * Spawns BP_BludgerBallToy with the game's own bludger trail attached, and returns its index (-1 on failure). A puppet: the server owns the position, so move it with moveBludger rather than letting it simulate.
     */
    spawnBludger(x: number, y: number, z: number): number;

    /**
     * Teleports a spawned bludger. Index is what spawnBludger returned.
     */
    moveBludger(index: number, x: number, y: number, z: number): boolean;

    /**
     * Scales every spawned bludger and returns how many were changed. The shipped mesh is small for something meant to be dodged at speed.
     */
    setBludgerScale(scale: number): number;

    /**
     * Destroys every actor this builtin spawned — balls, hoops, bludgers, the snitch and its box and the trail carrier (the held prop is LocalPlayer's). The handles are C++ statics that outlive a script restart, so this cleans up after a disconnect the script never got to tear down.
     */
    clearAll(): number;

    /**
     * Places a house banner in the world and returns whether it stood up. Used to mark which end of the pitch belongs to which side, so a player in the air can tell without reading anything.
     */
    spawnBanner(mesh: string, x: number, y: number, z: number, yaw?: number, scale?: number, cullDistance?: number): boolean;

    /**
     * Destroys every goal banner.
     */
    clearBanners(): number;

    /**
     * Destroys every bludger this session spawned.
     */
    clearBludgers(): number;

    /**
     * Destroys every hoop this session spawned.
     */
    clearHoops(): number;

    /**
     * Spawns the shipped loose snitch, which flies itself, with the game's own unused wing-trail VFX attached. Client-local and random-driven, so the server must own the authoritative position. Its steering container is hidden; scale it up to make a 5cm prop findable.
     */
    spawnSnitch(x: number, y: number, z: number, scale?: number, trailScale?: number): boolean;

    /**
     * Moves the snitch's container box, which it re-reads every leg — the game generates the arcs.
     */
    steerSnitch(x: number, y: number, z: number): boolean;

    /**
     * Sets the steering container's box extent in cm — how FAR a Swoop can carry the snitch, which is a different knob from Snitch_Speed (how fast it flies a leg). Flit and Vibrate use boxes attached to the snitch and stay local regardless.
     */
    setSnitchRoam(extent: number): boolean;

    /**
     * Sets BP_Loose_Snitch's own Snitch_Speed timeline play-rate (default 3.0). Steering only moves the box it picks destinations in — this is the only thing that changes how fast it flies its own Swoop/Flit/Vibrate arcs.
     */
    setSnitchSpeed(rate: number): boolean;

    /**
     * Where the local snitch actor actually is. Track from this, not the server beat — the puppet lags the authoritative point, so a marker driven from the server judders.
     */
    snitchPosition(): Vec3 | null;

    /**
     * Destroys the snitch and its container.
     */
    despawnSnitch(): boolean;

    /**
     * Fills the stands from the live population. Gated to 06:05-18:00 game time — set the clock first.
     */
    setCrowd(enabled: boolean, location?: string): boolean;
  };

  /**
   * A world-space spline point on a race track.
   */
  interface RacePoint {
    /**
     * World X in centimetres.
     */
    x: number;

    /**
     * World Y in centimetres.
     */
    y: number;

    /**
     * World Z in centimetres.
     */
    z: number;
  }

  /**
   * Live state of one race actor.
   */
  interface RaceStatus {
    /**
     * Race actor world X.
     */
    x: number;

    /**
     * Race actor world Y.
     */
    y: number;

    /**
     * Race actor world Z.
     */
    z: number;

    /**
     * Spline point count.
     */
    splinePoints: number;

    /**
     * Spawned gate count.
     */
    gates: number;

    /**
     * 0 = TimeTrial, 1 = RingSequence.
     */
    raceType: number;

    /**
     * Whether the off-track leash is enabled.
     */
    leash: boolean;
  }

  /**
   * A loaded race actor.
   */
  interface RaceInfo {
    /**
     * The race's database id, e.g. BRR_01.
     */
    raceId: string;

    /**
     * Spline point count, or -1 if unreadable.
     */
    points: number;

    /**
     * Whether a spline component was resolved.
     */
    hasSpline: boolean;
  }

  /**
   * Broom-race track and session access (spike).
   */
  const Races: {
    /**
     * Lists loaded race actors.
     */
    list(): RaceInfo[];

    /**
     * Reads a race's current spline points.
     */
    getTrack(raceId: string): RacePoint[] | null;

    /**
     * Rewrites a race's spline (>= 3 points).
     */
    setTrack(raceId: string, points: RacePoint[]): boolean;

    /**
     * Starts a race as a non-mission run.
     */
    start(raceId: string): boolean;

    /**
     * The active race's id, if any.
     */
    active(): string | null;

    /**
     * Whether the local player is currently mounted; null if unreadable.
     */
    onBroom(raceId?: string): boolean | null;

    /**
     * World positions of every spawned race gate.
     */
    gates(): RacePoint[];

    /**
     * Toggles the off-track leash (bKeepPlayerCloseToSpline).
     */
    setLeash(raceId: string, enabled?: boolean): boolean;

    /**
     * Spawns turbo bubbles at 0..1 fractions along the spline; returns the count.
     */
    spawnBoosts(raceId: string, fractions: number[]): number;

    /**
     * Destroys every turbo bubble this session spawned.
     */
    clearBoosts(): number;

    /**
     * Force-ends a stuck race and releases its gameplay locks.
     */
    abandon(raceId?: string): object | null;

    /**
     * Arms ProcessEvent watches for OnRaceStart / OnRaceFinish / OnRaceAbandoned, delivered as 'gameEvent'.
     */
    watchEvents(): boolean;

    /**
     * Whether the local player owns a broom; null if the inventory is unreadable.
     */
    hasBroom(): boolean | null;

    /**
     * Destroys stray pace-ghost riders left by earlier aborts.
     */
    clearGhosts(): number;

    /**
     * Hides a stuck broom-race HUD (RaceHudDismissed does not do this).
     */
    hideHud(): boolean;

    /**
     * The race tile's current streaming bounds (world units).
     */
    tileBounds(raceId?: string): object | null;

    /**
     * Grows the race tile's streaming bounds to cover a track, saving the authored box.
     */
    fitBounds(raceId: string, points: RacePoint[], padXY?: number, padZ?: number): boolean;

    /**
     * Restores every tile bounds this session modified.
     */
    restoreBounds(): number;

    /**
     * Draws the race tile's streaming box as a debug box.
     */
    showBounds(raceId?: string, seconds?: number): boolean;

    /**
     * Race actor location, spline/gate counts and leash state.
     */
    info(raceId: string): RaceStatus | null;
  };

  /**
   * The player's OWN game settings, the same values the pause menu writes. These are a preference, not a scratchpad: write them only where the player asked for it (a settings panel), and reach for Audio.setState/setRTPC when a gamemode wants to duck audio for a moment. Those compose on top of the preference instead of overwriting it, so nothing has to be put back afterwards. Display, resolution and input rebinds are deliberately absent.
   */
  const Settings: {
    /**
     * The audio page of the player's settings. Volumes are 0..1. A field is null when the game would not report it, which is every field before the settings object exists.
     */
    getAudio(): { effects: number|null, music: number|null, voice: number|null, muted: boolean|null, mono: boolean|null, subtitles: boolean|null, menuReaderEnabled: boolean|null, menuReaderVolume: number|null };

    /**
     * Writes the audio page. Player-driven only; see the namespace note.
     * @param patch Any subset of getAudio()'s fields. Volumes are clamped to 0..1; absent fields are left alone.
     * @param options persist = true writes the player's saved settings for real, which is what a settings panel wants. Default false applies for this run only — but the game saves on its own schedule too, so do not rely on false to keep a change out of the ini.
     * @returns How many keys were applied; compare against how many you passed.
     */
    setAudio(patch: object, options?: { persist?: boolean }): number;

    /**
     * The HUD and minimap page: minimal, notifications, specialNotifications, xp, mission, tutorial, spell, map, meters, beacons, target, targetName, targetHighlights, toolWheel, enemyDamage, beastControls (boolean|null each), minimapSize (number|null), minimapOpacity (number|null, 0..1), minimapPath (boolean|null).
     */
    getHud(): object;

    /**
     * Writes the HUD page. To hide UI for a cutscene or a duel this is the wrong tool — it edits what the player chose and would have to be undone afterwards.
     * @param patch Any subset of getHud()'s fields.
     * @param options As setAudio.
     * @returns How many keys were applied.
     */
    setHud(patch: object, options?: { persist?: boolean }): number;
  };

  /**
   * One spell-diamond loadout and its four assignable slots.
   */
  interface SpellLoadoutState {
    /**
     * The returned loadout index.
     */
    readonly index: number;

    /**
     * The currently selected loadout index.
     */
    readonly current: number;

    /**
     * Identifies live QuickActionManager readback.
     */
    readonly source: "quick-actions";

    /**
     * Four spell names in diamond-slot order; null means empty.
     */
    readonly slots: (string | null)[];
  }

  /**
   * Result of dispatching a production WandTool ground-cast input tap.
   */
  interface SpellCastResult {
    /**
     * Whether the production wand handler accepted the press dispatch.
     */
    readonly accepted: boolean;

    /**
     * Requested diamond slot 0-3.
     */
    readonly slot: number;

    /**
     * Spell assigned to the requested slot; null when unreadable or empty.
     */
    readonly spellName: string | null;

    /**
     * Immediate dispatch rejection reason; null when accepted.
     */
    readonly reason: string | null;
  }

  /**
   * The local wand's active spell tool, read without the spellCast hook.
   */
  interface SpellActiveTool {
    /**
     * Asset path of the active tool's SpellToolRecord; null when no tool is active.
     */
    readonly recordPath: string | null;

    /**
     * Class name of the active spell tool.
     */
    readonly toolClass: string | null;

    /**
     * Class of the tool's ExecutionClassMap["Default"] cast ability.
     */
    readonly castAbility: string | null;

    /**
     * Class of the ability occupying each of the local player's Able channels; empty channels are left out.
     */
    readonly activeAbilities: string[];
  }

  /**
   * Local spell-unlock enforcement and spell-diamond access.
   */
  const Spells: {
    /**
     * Sets the spell policy.
     * @param relockIds Granted-then-revoked spell LockIDs to actively re-lock and clear from every quick slot — dropping an id from lockIds cannot undo an unlock on its own. 'Spell_Stupefy' also takes back the basic (left-click) cast.
     */
    setPolicy(lockIds: string[], bonusLoadouts?: number, relockIds?: string[]): void;

    /**
     * Reads one live spell-diamond loadout through QuickActionManager.
     * @param loadoutIndex Defaults to the currently selected loadout.
     */
    loadout(loadoutIndex?: number): SpellLoadoutState | null;

    /**
     * Reads only the active native loadout index without inspecting spell slots.
     */
    currentLoadout(): number | null;

    /**
     * Assigns a live native spell-diamond slot through QuickActionManager, verifies readback, and emits spellAssignment with source 'api' after success. Modded record paths are valid persistence identities but require a modded slot provider rather than QuickActionManager.
     * @param slot Diamond slot 0-3.
     * @param spellName Native gameplay name or plugin-rooted modded SpellToolRecord path, or null to clear.
     * @param loadoutIndex Defaults to the currently selected loadout.
     * @param emitAssignmentEvent Defaults to true. Internal state restoration passes false to avoid reporting synchronization as a user assignment.
     */
    setLoadoutSlot(slot: number, spellName: string | null, loadoutIndex?: number, emitAssignmentEvent?: boolean): boolean;

    /**
     * DEV/QA. The state behind the spell-set gate: Biped_Player.BonusSpellLoadouts (the action screen unlocks Current + 1 sets), the three GEN_SpellLoadouts perks, the SpellManager's raw loadout index, QuickActionManager's group counters, and each live action screen's AvailableGroups (only while one is open). Null without a pawn. Reads only.
     */
    _loadoutState(): { bonusSpellLoadouts: { current: number; base: number; min: number; max: number }; perks: (boolean | null)[]; spellManagerIndex: number | null; activeGroup: number | null; groupCount: number | null; widgets: { name: string; availableGroups: number; currentGroup: number }[] } | null;

    /**
     * DEV/QA. Fires the basic wand attack through the production WandTool::CastPewPewSpell — the QA attacker's way to produce real player-sourced impacts on another client. Aim comes from the wand's own target tracker, so face the target first. Reads the basic-cast record directly, so a revoked Spell_Stupefy does not stop it.
     */
    _castBasic(): boolean;

    /**
     * DEV/QA. The basic cast's gate as a left click meets it: the wand's Spell_Stupefy latch, then the record WandTool::GetSpellRecordFromSlot(1) resolves (null = the click does nothing). The lookup re-latches when Spell_Stupefy is unlocked. Null without a local wand.
     */
    _basicCastRecord(): { latched: boolean; record: string | null } | null;

    /**
     * Loads the slotted spell tools and taps the requested spell through the production WandTool OnSpell_Pressed/OnSpell_Released route. The result confirms dispatch; observe spellCast for native cast completion.
     * @param slot Diamond slot 0-3.
     */
    cast(slot: number): SpellCastResult;

    /**
     * Loads a modded SpellToolRecord and fires it through the local wand's real ActivateSpellTool + SpellTool::Start path. Vanilla /Game paths are rejected.
     * @param recordPath Plugin-rooted Package.Object path to a modded SpellToolRecord.
     * @param aimMode 0 uses the tool's aim; 1/2 use the target tracker; 5 uses a per-cast camera override.
     */
    castRecord(recordPath: string, aimMode?: number): SpellCastResult;

    /**
     * Probe: mount state, wand/active-tool identity, per-slot toolset verdicts, ASpellTool vtable addresses. Reads only.
     */
    broomCastDiag(): string;

    /**
     * Casts the slot's spell via ActivateSpellTool + SpellTool::Start, bypassing the ground cast path. Fires a real spell.
     * @param slot Equipped diamond slot 0-3.
     * @param aimMode 0 tool's own aim (rider-forward on a broom), 1/2 wand-cast tracker, 5 per-cast override on the tool.
     */
    broomCastTry(slot: number, aimMode?: number): string;

    /**
     * DEV/QA. Reads the local wand's active spell tool, its cast ability, and what occupies each of the local player's Able channels — evidence a cast ran that does not come from any spellCast hook. Walks the object array for the wand; poll it, never per frame. Null without a local wand.
     */
    _activeTool(): SpellActiveTool | null;

    /**
     * True while broom-mounted with a usable wand; gate keybinds on this so they stay inert on foot.
     */
    broomCastReady(): boolean;

    /**
     * DEV/QA. The cosmetic replay's post-cast bookkeeping: the muzzle sockets it must put back and the munition strips it keeps up for 2.5 s. Counts are lifetime totals — diff two reads; *Lost means the tool died before its restore. Reads only.
     */
    _replayStats(): { pendingSockets: number; pendingStrips: number; socketsQueued: number; socketsRestored: number; socketsLost: number; stripsQueued: number; stripsDone: number; stripsLost: number; ownersBorrowed: number; ownersRestored: number };

    /**
     * Probe: RPGAbilityComponent presence and the live RPGAbility.SpellUpgrade.* tags on the local pawn, every remote proxy and any dev student. Reads only.
     */
    upgradeProbe(): string;
  };

  /**
   * Immediate native spell lesson launch result; rejected requests emit no result event.
   */
  interface SpellLearningRequest {
    /**
     * Whether the native launcher accepted this request.
     */
    readonly started: boolean;

    /**
     * Request identity; null when rejected.
     */
    readonly requestId: number | null;

    /**
     * Rejection reason; null when accepted.
     */
    readonly reason: string | null;
  }

  /**
   * A native lesson result delivered only to the requesting resource's current load.
   */
  interface SpellLearningResult {
    /**
     * Identity returned by start.
     */
    readonly requestId: number;

    /**
     * Requested native lesson name.
     */
    readonly spell: string;

    /**
     * Completed means the native success outro reached its completion signal.
     */
    readonly status: "completed" | "cancelled" | "failed";

    /**
     * Cancellation/failure reason; null on completion.
     */
    readonly reason: string | null;
  }

  /**
   * The lesson owned by the calling resource, until its result is reported.
   */
  interface SpellLearningState {
    /**
     * Active request identity.
     */
    readonly requestId: number;

    /**
     * Requested native lesson name.
     */
    readonly spell: string;

    /**
     * Current lesson phase.
     */
    readonly phase: "loading" | "running" | "finishing" | "cancelling";
  }

  /**
   * Native events dispatched through `Events.on`. Each property is the exact callback argument tuple for that event.
   */
  interface EventMap {
    /**
     * Native lesson result for the requesting resource; no spell is granted.
     */
    readonly spellLearningFinished: [result: SpellLearningResult];

    /**
     * The minimap switched map, Hogwarts floor or tile. Read Minimap.state() at start for the state before the first change.
     */
    readonly minimapChanged: [state: MinimapState, previous: MinimapState];

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
     * Dispatched once per view, before any navigation, to the resource that created it.
     */
    browserCreated: [event: BrowserCreatedEvent];

    /**
     * Dispatched when any frame of an owned view begins loading.
     */
    browserLoadingStart: [event: BrowserLoadingStartEvent];

    /**
     * Dispatched when an owned view's main document is ready; the earliest point at which the page can receive Web.emit.
     */
    browserDocumentReady: [event: BrowserDocumentReadyEvent];

    /**
     * Dispatched when a frame of an owned view fails to load.
     */
    browserLoadingFailed: [event: BrowserLoadingFailedEvent];

    /**
     * Dispatched for every navigation an owned view is asked to perform, refused or not.
     */
    browserNavigate: [event: BrowserNavigateEvent];

    /**
     * Dispatched when an owned view blocks a popup; windowless views cannot host one, so handle the URL yourself.
     */
    browserPopup: [event: BrowserPopupEvent];

    /**
     * Dispatched when an owned view's requested cursor shape changes.
     */
    browserCursorChange: [event: BrowserCursorChangeEvent];

    /**
     * Dispatched when an owned view requests a tooltip; windowless rendering draws none, so the script must.
     */
    browserTooltip: [event: BrowserTooltipEvent];

    /**
     * Dispatched when focus enters or leaves an editable element of an owned view; use it to stop routing keys to the game.
     */
    browserInputFocusChange: [event: BrowserInputFocusChangeEvent];

    /**
     * Dispatched when an owned view rejects a navigation or a page event from outside its locked origin.
     */
    browserResourceBlocked: [event: BrowserResourceBlockedEvent];

    /**
     * Dispatched for console output of an owned view; the framework logs these regardless.
     */
    browserConsoleMessage: [event: BrowserConsoleMessageEvent];

    /**
     * Dispatched on view creation and whenever Web.loadURL re-locks an owned view to a different origin.
     */
    browserOriginChange: [event: BrowserOriginChangeEvent];
  }

  /** Names of native events available in this scripting environment. */
  type EventName = keyof EventMap;

  /**
   * Standalone native spell lessons. Resources decide progression; this API does not grant spells.
   */
  const SpellLearning: {
    /**
     * Starts one native lesson in a ready world with idle native UI. Listen for spellLearningFinished before starting. One request may be active globally.
     * @param spell Exact name from supportedSpells, such as Revelio.
     */
    start(spell: string): SpellLearningRequest;

    /**
     * Cancels a request owned by the calling resource. False for stale, foreign, or already settled requests.
     */
    cancel(requestId: number): boolean;

    /**
     * Reads the caller's active lesson; null for other resources or after result delivery.
     */
    state(): SpellLearningState | null;

    /**
     * Lists the 29 verified rows in the shipping native spell lesson table.
     */
    supportedSpells(): string[];
  };

  /**
   * Local talent (perk) tree state — UPerksTree.
   */
  const Talents: {
    /**
     * Whether the perk tree singleton exists yet; false before world entry.
     */
    available(): boolean;

    /**
     * Talents with their live state, level and gates, or null before the tree exists.
     * @param category Perk type (Core, Spells, DarkWizard, Infiltrator, SancWheel, ...); omit to sweep every type.
     */
    list(category?: string): object[];

    /**
     * Unspent talent points; -1 before the tree exists.
     */
    getPoints(): number;

    /**
     * Moves the unspent talent point pool.
     * @param amount Signed delta; negative spends.
     */
    addPoints(amount: number): boolean;

    /**
     * 'unavailable' | 'available' | 'purchased' | 'upgradeUnavailable', or null for an unknown id/unavailable tree.
     */
    getState(id: string): string;

    /**
     * Whether the talent is purchased.
     */
    has(id: string): boolean;

    /**
     * Current talent level (0 = not taken); -1 for an unknown id or before the tree exists.
     */
    getLevel(id: string): number;

    /**
     * Buys the talent the game's own way: spends a point and honours the level, lock and prerequisite gates. Use activate() to force one.
     */
    purchase(id: string): boolean;

    /**
     * Buys the next level of an already-purchased talent.
     */
    upgrade(id: string): boolean;

    /**
     * Sets the UPGRADE TIER of a talent the player owns. Refused for one they don't: the game would apply its ability without purchasing it.
     * @param level Defaults to 1; 0 clears.
     */
    setLevel(id: string, level?: number): boolean;

    /**
     * Whether the live RPGAbilityComponent carries the tag — the real test of whether a talent is doing anything.
     * @param tag e.g. RPGAbility.Talent.Core.Talent_Core_DodgeFast
     */
    hasAbilityTag(tag: string): boolean;

    /**
     * Pushes an RPGAbility onto the player directly; repair path when a purchased talent's tag is missing.
     * @param abilityName The perk's AbilityID, e.g. Talent_Core_DodgeFast.
     */
    addAbility(abilityName: string): boolean;

    /**
     * Force-grants the talent: free, ignores the level and lock gates, marks it purchased and applies its ability.
     */
    grant(id: string): boolean;

    /**
     * Every gameplay tag live on the player's RPGAbilityComponent; empty before the pawn exists.
     */
    abilityTags(): string[];

    /**
     * Removes a talent WITHOUT refunding its point, and resets its level to 0.
     */
    remove(id: string): boolean;

    /**
     * Removes a talent and returns its point to the pool.
     */
    refund(id: string): boolean;

    /**
     * Refunds every talent, or every talent in one category.
     */
    reset(category?: string): boolean;
  };

  /**
   * Current level and world-streaming state.
   */
  const World: {
    /**
     * Network id of the entity carrying `World.state`, for filtering the global `entityStateChange` bus. 0 before it streams in.
     */
    readonly stateId: number;

    /**
     * Global replicated key/value state written by the server and shared by every resource. Read-only here. Null until the world entity streams in. See StateBag.
     */
    readonly state: StateBag | null;

    /**
     * Returns the current level name.
     */
    currentLevelName(): string;

    /**
     * Returns whether the playable world is ready.
     */
    isReady(): boolean;

    /**
     * Returns the streaming-generation counter.
     */
    generation(): number;

    /**
     * Returns this client's replicated world-object and spawned-actor state, or null when the replica is absent.
     * @param networkId Server world-object network id.
     */
    worldObjectState(networkId: number): WorldObjectClientState | null;

    /**
     * Sets boundary-volume enforcement.
     */
    setBoundaryPolicy(remove: boolean): number;

    /**
     * Restores the game's ambient population (students, seat fillers, Tier-4 crowd extras). The mod suppresses it by default, so crowds need this on first. Turning it off returns every Tier-4 extra already out, except an exempt NPC's own.
     */
    setAmbientPopulation(enabled: boolean): boolean;

    /**
     * Whether ambient population is currently restored.
     */
    ambientPopulation(): boolean;

    /**
     * Keeps these named NPCs scheduled while ambient population is off, so a location-bound character such as the Fat Lady's portrait is not left empty. Replaces the whole list and returns it deduplicated. Empty by default and cleared when the session ends. Removing an id stops scheduling that NPC but does not despawn one already in the world.
     * @param ids Scheduled-entity names, e.g. "FatLady".
     */
    setPopulationExemptions(ids: string[]): string[];

    /**
     * The NPC names currently exempt from population suppression.
     */
    populationExemptions(): string[];

    /**
     * QA: whether the named scheduled entity is spawned, its location, and its body's class (empty when not spawned). Null when none is registered under that name.
     */
    _probeScheduledEntity(id: string): { inFlesh: boolean, position: Vec3, fleshClass: string, fleshTier4: boolean } | null;

    /**
     * QA: this client's game clock, as the Scheduler holds it. Null before it exists.
     */
    _clock(): { year: number; month: number; day: number; hour: number; minute: number; second: number } | null;

    /**
     * QA: opens a map the way a dungeon entrance does. False when refused (no world yet, or an empty/frontend name).
     * @param name Map name, e.g. RestrictedLibrary_Dungeon.
     */
    _openLevel(name: string): boolean;

    /**
     * QA: the visible levels every loaded-level sweep walks, named by map package; whether the persistent level is among them; and loaded-level sweeps run before this call.
     */
    _loadedLevels(): { sweeps: number; count: number; persistentIncluded: boolean; names: string[] };

    /**
     * QA: the holiday decor the server pins and the two game stats it drives (null while unreadable).
     */
    _decor(): { decor: "game" | "none" | "halloween" | "christmas"; halloween: number | null; christmas: number | null };

    /**
     * QA: the Headmaster's office setting the server pins, the gargoyle stat it drives (null while unreadable), and each loaded gargoyle staircase.
     */
    _headmasterOffice(): { office: "game" | "open" | "closed"; stat: number | null; staircases: { begunPlay: boolean; goingUp: boolean | null; rise: number | null; position: Vec3 | null }[] };

    /**
     * QA: writes one game stat through the engine's own writer, as a story mission would. False when the stat table has no such row.
     * @param name Stat ID, e.g. Seasons_HalloweenDecor.
     * @param value Integer value.
     */
    _writeStat(name: string, value: number): boolean;

    /**
     * QA: every live dungeon exit teleporter, whether it needs a switch and is switched on, and whether its level is visible and found by the per-level scan the auto switch-on uses.
     */
    _dungeonExits(): { name: string; path: string; requireSwitch: boolean | null; active: boolean | null; levelVisible: boolean; levelScan: boolean }[];

    /**
     * QA: every scene-rig player the world's manager holds: the rig asset it plays, its player state, and whether it arrived this tick.
     */
    _sceneRigs(): { rig: string; state: number; playing: boolean; pending: boolean }[];

    /**
     * QA: actors in one loaded level whose name starts with the prefix, with their class, world position, raw 0x70 flag byte, recent on-screen rendering and Tier-4 distance band. Null when the level is not loaded.
     * @param level Map package name, e.g. SUB_Hogwarts_Dungeon_02_FX.
     * @param namePrefix Actor name prefix, e.g. BP_Tier4_Actor; empty matches all.
     */
    _levelActors(level: string, namePrefix: string): { name: string; class: string; position: Vec3 | null; flags70: number; rendered: boolean; lodBand: number | null }[] | null;

    /**
     * QA: scheduled entities the population scheduler holds, how many are spawned and how many of those are exempt; Tier-4 actors lent out of the pool and how many are an exempt NPC's body; Tier-4 requests refused and extras released since boot.
     */
    _populationCensus(): { entities: number, inFlesh: number, exemptInFlesh: number, tier4: number, tier4Exempt: number, tier4Refused: number, tier4Released: number, seatTickers: number, seatObjects: number, seatRecords: number, tier4SeatOwned: number, tier4SeatRecorded: number };

    /**
     * QA: requests one Tier-4 townsperson 3 m from the local player, as a Blueprint crowd would. False with no player or population manager.
     * @param bypass Skip the suppression hook: the control that proves the request spawns.
     */
    _requestTier4(bypass?: boolean): boolean;

    /**
     * QA: stands in for co-op, the only state in which story scenes play and placed story crowds stay. Leaving co-op removes the crowds already loaded and returns how many; they return with their level's next stream-in. Off by default and at session end.
     */
    _setStoryCoop(active: boolean): number;

    /**
     * QA: whether co-op lets story scenes play, scenes refused since boot, and the last few refused rigs (GetTickCount64 ms).
     */
    _storyScenes(): { coop: boolean; refused: number; recent: { rig: string; atMs: number }[] };

    /**
     * Suppresses native enemy-encounter spawns; returns volumes latched.
     */
    setEncounterPolicy(suppress: boolean): number;

    /**
     * Returns whether native enemy spawns are currently suppressed.
     */
    encounterPolicy(): boolean;

    /**
     * Disables field-guide collectables without writing any save state; returns actors written. Turning it off re-arms the hotspots, but destroyed books and pages only return when their cell re-streams. Chests, ancient magic, astronomy, Merlin trials and balloons are separate systems and are not covered.
     * @param families Which families to act on: fieldGuidePages, flyingBooks, spawnedPages. Omit for all; with it, only the keys set true are touched.
     */
    setCollectablePolicy(suppress: boolean, families?: object): number;

    /**
     * The per-family suppression policy: {fieldGuidePages, flyingBooks, spawnedPages}.
     */
    collectablePolicy(): object;

    /**
     * Live field-guide collectable counts: hotspots (and how many are still armed), flying books, spawned page actors, plus the game's own field-guide completion percent (-1 before the KnowledgeManager is up).
     */
    collectableCensus(): object;

    /**
     * Logs each live enemy's spawning DOV + GUID, and counts orphans; returns enemies sampled.
     */
    censusEnemyDovs(): number;

    /**
     * Per-family live/un-latched spawner-volume counts, exempt DOVs and how many are open, enemy and orphan-enemy counts, and the volumes and enemies not yet in play.
     */
    spawnerCensus(): object;

    /**
     * The engine's ballistic lead solver: the velocity to launch from the source at to hit a target moving at a constant velocity. Returns {x,y,z,time}; time 0 means no solution. Magnitude is sqrt(speed^2 + |targetVel|^2) — a shipped bug, so pass sqrt(S^2 - |tv|^2) for exactly S.
     */
    leadVelocity(sx: number, sy: number, sz: number, tx: number, ty: number, tz: number, tvx: number, tvy: number, tvz: number, speed: number, gravity?: number): object | null;
  };

  /**
   * Structured snapshot of one creature-mount family for the local player.
   */
  interface MountState {
    /**
     * Whether the local player is riding a mount of this family, settled and seated.
     */
    readonly mounted: boolean;

    /**
     * Whether a summon of this family is in flight but not yet seated.
     */
    readonly summoning: boolean;

    /**
     * The game's own mount-or-transition predicate. Mount-AGNOSTIC: true on a broom too.
     */
    readonly busy: boolean | null;

    /**
     * EMountTypes name of the active handler, e.g. Hippogriff_Flying.
     */
    readonly mountType: string | null;

    /**
     * Creature class, e.g. BP_Thestral_Creature_C. EMountTypes cannot tell a thestral from a hippogriff; this can.
     */
    readonly species: string | null;

    /**
     * Whether the ridden creature is airborne; null unless mounted.
     */
    readonly flying: boolean | null;

    /**
     * Ground, Flying, Takeoff or Landing; null unless mounted.
     */
    readonly movementState: string | null;
  }

  /**
   * One stored mount inventory row.
   */
  interface MountInventoryEntry {
    /**
     * Canonical native mount item id.
     */
    readonly itemId: string;

    /**
     * Number of this mount item in storage.
     */
    readonly count: number;
  }

  /**
   * Snapshot of one mount family's active and storage holders.
   */
  interface MountInventoryState {
    /**
     * Item id in the one-slot active holder.
     */
    readonly equippedId: string | null;

    /**
     * Mounts currently in the storage holder.
     */
    readonly stored: MountInventoryEntry[];

    /**
     * Total mounts across the active and storage holders.
     */
    readonly total: number;
  }

  /**
   * The local player's flying creature mounts: hippogriff, onyx hippogriff and thestral.
   */
  const FlyingMount: {
    /**
     * Returns structured mount state without parsing diagnostics.
     */
    state(): MountState;

    /**
     * Returns the equipped mount id and stored rows; null if native inventory is unreadable.
     */
    inventory(): MountInventoryState | null;

    /**
     * Whether the local player is riding a mount of this family. Settled state only — false through the summon animation, which summoning() covers.
     */
    mounted(): boolean;

    /**
     * Whether a summon of this family has been accepted but has not seated the player yet.
     */
    summoning(): boolean;

    /**
     * Calls the game's production gate. This is PERMISSION ONLY — it checks no-mount zones, map-area rules and the designer toggle, never ownership, so AND it with isEquipped(). It is also a global: a remote player standing in a no-mount zone flips it false for everyone, so do not trust a false as 'this player may not mount'.
     */
    canMount(): boolean | null;

    /**
     * Whether the active handler owns both a rider and a live creature, which is what the native teardown requires.
     */
    canDismount(): boolean;

    /**
     * Whether the active holder contains a mount; null if inventory is unreadable.
     */
    isEquipped(): boolean | null;

    /**
     * Whether the storage holder contains an unequipped mount; null if inventory is unreadable.
     */
    isInStorage(): boolean | null;

    /**
     * Moves a stored mount into the active holder using the production holder model — evict then insert, because the active holder has no native replace. False while mounted or summoning.
     * @param itemId Stored mount to equip, e.g. HippogriffMount, OnyxHippogriffMount or ThestralMount.
     */
    equip(itemId?: string): boolean | null;

    /**
     * Moves the active mount back to storage. False while mounted or summoning.
     */
    unequip(): boolean | null;

    /**
     * Starts the production summon for whatever equip() last put in the active holder. The default goes through the gadget-wheel item-use path; either option routes through the mount tool directly, which is the only way to skip the animation or start airborne. The bool means 'request admitted', not 'mounted' — observe state() and retry while an async tool class loads.
     * @param options transition defaults true (the bag summon animation); inFlight summons already airborne.
     */
    mount(options?: { transition?: boolean, inFlight?: boolean }): boolean;

    /**
     * Dismounts the local player. Returns false until the handler owns a live creature — the native reports success even when it changed nothing, so this refuses first. Asked mid-transition it cancels the transition rather than dismounting, so a second call may be needed.
     * @param animated Play the dismount transition instead of the instant teardown. Defaults to false.
     */
    dismount(animated?: boolean): boolean;

    /**
     * Whether the ridden creature is airborne; null unless mounted.
     */
    isFlying(): boolean | null;

    /**
     * Requests takeoff on the ridden creature. False unless mounted. Acceptance only: poll state().flying and re-ask, because the request can arrive before the creature will act on it.
     * @param skipAnimation Skip the takeoff animation. Defaults to false.
     */
    takeoff(skipAnimation?: boolean): boolean;

    /**
     * Requests a landing on the ridden creature. False unless mounted.
     */
    land(): boolean;

    /**
     * Enables or disables the creature's automatic landing.
     */
    setAutoLanding(enabled: boolean): boolean;

    /**
     * Sets the minimum flying gait, which is the floor the rider's own input cannot go below.
     */
    setFlyingGait(gait: "stop" | "hover" | "slow" | "fast"): boolean;
  };

  /**
   * The local player's ground creature mounts: the graphorn.
   */
  const GroundMount: {
    /**
     * Returns structured mount state without parsing diagnostics.
     */
    state(): MountState;

    /**
     * Returns the equipped mount id and stored rows; null if native inventory is unreadable.
     */
    inventory(): MountInventoryState | null;

    /**
     * Whether the local player is riding a mount of this family. Settled state only — false through the summon animation, which summoning() covers.
     */
    mounted(): boolean;

    /**
     * Whether a summon of this family has been accepted but has not seated the player yet.
     */
    summoning(): boolean;

    /**
     * Calls the game's production gate. This is PERMISSION ONLY — it checks no-mount zones, map-area rules and the designer toggle, never ownership, so AND it with isEquipped(). It is also a global: a remote player standing in a no-mount zone flips it false for everyone, so do not trust a false as 'this player may not mount'.
     */
    canMount(): boolean | null;

    /**
     * Whether the active handler owns both a rider and a live creature, which is what the native teardown requires.
     */
    canDismount(): boolean;

    /**
     * Whether the active holder contains a mount; null if inventory is unreadable.
     */
    isEquipped(): boolean | null;

    /**
     * Whether the storage holder contains an unequipped mount; null if inventory is unreadable.
     */
    isInStorage(): boolean | null;

    /**
     * Moves a stored mount into the active holder using the production holder model — evict then insert, because the active holder has no native replace. False while mounted or summoning.
     * @param itemId Stored mount to equip, e.g. GraphornMount.
     */
    equip(itemId?: string): boolean | null;

    /**
     * Moves the active mount back to storage. False while mounted or summoning.
     */
    unequip(): boolean | null;

    /**
     * Starts the production summon for whatever equip() last put in the active holder. The default goes through the gadget-wheel item-use path; either option routes through the mount tool directly, which is the only way to skip the animation or start airborne. The bool means 'request admitted', not 'mounted' — observe state() and retry while an async tool class loads.
     * @param options transition defaults true (the bag summon animation); inFlight summons already airborne.
     */
    mount(options?: { transition?: boolean, inFlight?: boolean }): boolean;

    /**
     * Dismounts the local player. Returns false until the handler owns a live creature — the native reports success even when it changed nothing, so this refuses first. Asked mid-transition it cancels the transition rather than dismounting, so a second call may be needed.
     * @param animated Play the dismount transition instead of the instant teardown. Defaults to false.
     */
    dismount(animated?: boolean): boolean;
  };

  /**
   * QA access to this client's native copy of each beast. Internal; scripts use the server's Beast.
   */
  const _Beasts: {
    /**
     * The game's record behind this client's copy of the beast, or null while it is not embodied. spawnMs times the registry spawn call alone.
     * @param networkId The beast entity's network id.
     */
    inspect(networkId: number): { live: boolean; uid: number; species: string; color: string; name: string; gender: "male" | "female"; uncapturable: boolean; simulation: boolean; happiness: number; spawnMs: number } | null;

    /**
     * Drives the game's own care entry on this client's copy, the one the petting brush or creature feed reaches, so the report path runs as it would from the tool. False when the beast is not embodied here.
     * @param networkId The beast entity's network id.
     * @param kind Which care entry to drive.
     */
    care(networkId: number, kind: "pet" | "feed"): boolean;
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
   * House standings as this game sees them. On a server they are the server's, pinned into the game so the Reception Hall hourglasses fill to them for everyone, and the player's own in-game awards go to the server instead of changing them.
   */
  const HousePoints: {
    /**
     * One house's standing: the server's on a server, else the game's own. Null with neither.
     */
    get(house: string): number | null;

    /**
     * Every house's standing, as get() reads them.
     */
    all(): HouseStandings | null;

    /**
     * QA: the server's standings, the game's own rows, and each loaded hourglass's column heights beside the expected ones.
     */
    _probe(): object;

    /**
     * QA: awards points through the game's own AddHousePoints, as gameplay does. On a server it is swallowed and reaches the server as housePointsRequest. False with no world.
     */
    _nativeAdd(house: string, points: number): boolean;

    /**
     * QA: re-fills every loaded hourglass from get()'s standings; returns how many it reached.
     */
    _refresh(): number;
  };

  /**
   * What the game's own minimap is drawing.
   */
  interface MinimapState {
    /**
     * The region map on screen. It switches as the game's cross-fade starts. "none" while there is no minimap, such as behind a load screen.
     */
    readonly map: "overland" | "hogwarts" | "hogsmeade" | "dungeon" | "tutorial" | "sanctuary" | "tents" | "none";

    /**
     * On the hogwarts map, the game's own 0-based floor pick for the player. It keeps tracking on a broom, while the map shows the overview. Null on every other map.
     */
    readonly floor: number | null;

    /**
     * On the hogwarts map, the tile the game draws: UI_T_MapMini_Hogwarts_Level_<floor + 1>_D, or the Level_99 overview while on a broom. Null on every other map.
     */
    readonly texture: string | null;
  }

  /**
   * The game's own minimap, read only: the region map it draws and, in Hogwarts, the floor.
   */
  const Minimap: {
    /**
     * What the minimap is drawing this frame. minimapChanged reports every change to it.
     */
    state(): MinimapState;

    /**
     * The Hogwarts floor the game would pick at this height, from the same table and rule as its own pick, so other players can be put on floors the way the game puts the local one. Null before the table loads.
     * @param z An actor location's Z: the capsule centre, which is what the game measures.
     */
    floorAt(z: number): number | null;

    /**
     * DEV/QA. The Hogwarts map's raw floor state: its pick, its last pick, the broom-overview latch and the BottomZValue heights it picks from. Null with no minimap.
     */
    _castle(): { floor: number; previousFloor: number; broomOverview: boolean; heights: number[] } | null;

    /**
     * DEV/QA. Every typed minimap member the API reads, beside the reflected call it mirrors, in one frame: the active level against its region getter, the Hogwarts map, its floor and its level table; and the heights loaded from that table against its typed rows, read the way the game's loader reads them. found: the typed side answered; same: both sides agree.
     */
    _sdkParity(): { name: string; found: boolean; same: boolean; count: number; detail?: string }[];
  };

  /**
   * This client's copies of the server's lootables. QA only.
   */
  const Lootables: {
    /**
     * QA: this client's actor for a lootable: what it should hold (its view or the lootable's own contents), the stock read back from the game, a moonstone's or foragable's state (1 takeable, 2 taken, -1 for chests) and whether it offers its prompt.
     */
    _inspect(id: number): { spawned: boolean; actor: string; persistentId: string; items: { itemId: string; count: number }[]; locked: boolean; stock: { itemId: string; count: number }[]; state: number; interactable: boolean | null } | null;

    /**
     * QA: takes it as the player would: the loot screen's hand-out for a chest, a break for a moonstone, the pickup for a foragable.
     */
    _loot(id: number): boolean;

    /**
     * QA: save rows still kept under a chest's or moonstone's persistent id (stock, saved loot group, expiry); -1 when the query failed.
     */
    _rows(persistentId: string): number;

    /**
     * QA: the game's own world loot in range (this client's lootables left out) and whether it is hidden, the suppression policy, which tile families are zeroed, and with countInstances the moonstone and other instanced meshes drawn in range.
     * @param radiusCm 0 reads only the policy.
     * @param countInstances Walks every instanced mesh; off by default.
     */
    _worldLoot(x: number, y: number, z: number, radiusCm?: number, countInstances?: boolean): { policy: { chests: boolean; moonstones: boolean; foragables: boolean }; tilesZeroed: { chests: boolean; moonstones: boolean; foragables: boolean }; actors: { actor: string; class: string; family: string; distanceCm: number; position: { x: number; y: number; z: number }; hidden: boolean; interactable: boolean | null }[]; moonstoneInstances: number; otherInstances: number };
  };

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
     * Sends a named event from this client to the server's isolated onClient handlers.
     * @param eventName Server-side client-event name.
     * @param payload Optional string payload sent verbatim; other values are JSON-serialized.
     */
    emitServer(eventName: string, payload?: unknown): void;
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
   * Client-only, resource-owned CEF web-view API exposed as the global Web.
   */
  const Web: {
    /**
     * Creates an origin-locked web view owned by the calling resource.
     * @param url Resource-relative URL or allowed absolute URL loaded into the view.
     * @param options Optional initial pixel geometry, stacking, visibility, and focus settings.
     * @returns Numeric view ID used by the remaining Web methods.
     */
    createView(url: string, options?: { width?: number; height?: number; x?: number; y?: number; zIndex?: number; visible?: boolean; focus?: boolean }): number;

    /**
     * Destroys an owned view and removes all of its script event handlers.
     * @param viewId Owned view identifier.
     * @returns True when a view was destroyed.
     */
    destroyView(viewId: number): boolean;

    /**
     * Makes an owned view visible.
     * @param viewId Owned view identifier.
     * @returns True when the view exists and was updated.
     */
    showView(viewId: number): boolean;

    /**
     * Hides an owned view.
     * @param viewId Owned view identifier.
     * @returns True when the view exists and was updated.
     */
    hideView(viewId: number): boolean;

    /**
     * Changes input focus for an owned view.
     * @param viewId Owned view identifier.
     * @param focused Whether the view captures keyboard and mouse input; defaults to true.
     * @returns True when the view exists and focus was updated.
     */
    focusView(viewId: number, focused?: boolean): boolean;

    /**
     * Checks whether an owned view is currently visible.
     * @param viewId Owned view identifier.
     * @returns False for missing or unowned views.
     */
    isViewVisible(viewId: number): boolean;

    /**
     * Keeps a hidden view painting so something else can sample it, such as a render target drawing the page onto world geometry. A view that is merely hidden stops painting and the sampled picture freezes.
     * @param viewId Owned view identifier.
     * @param offscreen Whether the page keeps painting without being drawn on screen; defaults to true.
     * @returns True when the view exists and was updated.
     */
    setViewOffscreen(viewId: number, offscreen?: boolean): boolean;

    /**
     * Checks whether an owned view keeps painting while hidden.
     * @param viewId Owned view identifier.
     * @returns False for missing or unowned views.
     */
    isViewOffscreen(viewId: number): boolean;

    /**
     * Navigates a view and replaces its allowed origin with the new URL's origin.
     * @param viewId Owned view identifier.
     * @param url New resource-relative or allowed absolute URL.
     * @returns True when navigation was requested.
     */
    loadURL(viewId: number, url: string): boolean;

    /**
     * Resizes an owned view's viewport.
     * @param viewId Owned view identifier.
     * @param width New viewport width in pixels.
     * @param height New viewport height in pixels.
     * @returns True when the view exists and was resized.
     */
    resizeView(viewId: number, width: number, height: number): boolean;

    /**
     * Moves an owned view on screen.
     * @param viewId Owned view identifier.
     * @param x New horizontal screen position in pixels.
     * @param y New vertical screen position in pixels.
     * @returns True when the view exists and was moved.
     */
    setViewPosition(viewId: number, x: number, y: number): boolean;

    /**
     * Registers a handler for an event emitted by an owned same-origin page.
     * @param viewId Owned view identifier.
     * @param eventName Page-to-script event name.
     * @param handler Resource-owned callback invoked by the view's callEvent bridge.
     */
    on(viewId: number, eventName: string, handler: WebEventHandler): void;

    /**
     * Removes page-event handlers from an owned view.
     * @param viewId Owned view identifier.
     * @param eventName Page-to-script event name.
     * @param handler Optional exact callback; omitting it removes every matching handler owned by the resource.
     * @returns True when at least one handler was removed.
     */
    off(viewId: number, eventName: string, handler?: WebEventHandler): boolean;

    /**
     * Dispatches a CustomEvent into an owned view.
     * @param viewId Owned view identifier.
     * @param eventName CustomEvent name dispatched in the page.
     * @param payload Optional JSON-serializable event detail.
     * @returns True when the dispatch script was queued.
     */
    emit(viewId: number, eventName: string, payload?: unknown): boolean;

    /**
     * Returns the current client viewport size.
     * @returns Width and height in physical pixels.
     */
    getScreenSize(): { width: number; height: number };
  };

  /**
   * A web view's browser finished being created.
   */
  interface BrowserCreatedEvent {
    /**
     * Identifier of the view the event belongs to.
     */
    viewId: number;

    /**
     * URL the view was created with.
     */
    url: string;
  }

  /**
   * A frame inside a web view started loading.
   */
  interface BrowserLoadingStartEvent {
    /**
     * Identifier of the view the event belongs to.
     */
    viewId: number;

    /**
     * URL being loaded.
     */
    url: string;

    /**
     * False for sub-frame loads.
     */
    isMainFrame: boolean;
  }

  /**
   * A web view's main frame finished loading.
   */
  interface BrowserDocumentReadyEvent {
    /**
     * Identifier of the view the event belongs to.
     */
    viewId: number;

    /**
     * URL that finished loading.
     */
    url: string;
  }

  /**
   * A load inside a web view was aborted.
   */
  interface BrowserLoadingFailedEvent {
    /**
     * Identifier of the view the event belongs to.
     */
    viewId: number;

    /**
     * URL that failed to load.
     */
    url: string;

    /**
     * CEF error text, such as ERR_CONNECTION_REFUSED.
     */
    description: string;

    /**
     * CEF error code.
     */
    errorCode: number;

    /**
     * False for sub-frame failures.
     */
    isMainFrame: boolean;
  }

  /**
   * A web view was asked to navigate.
   */
  interface BrowserNavigateEvent {
    /**
     * Identifier of the view the event belongs to.
     */
    viewId: number;

    /**
     * Requested URL.
     */
    url: string;

    /**
     * False for sub-frame navigation.
     */
    isMainFrame: boolean;

    /**
     * Whether the request was refused.
     */
    blocked: boolean;
  }

  /**
   * A page tried to open a new window or tab.
   */
  interface BrowserPopupEvent {
    /**
     * Identifier of the view the event belongs to.
     */
    viewId: number;

    /**
     * Target URL of the blocked popup.
     */
    url: string;

    /**
     * URL of the frame that requested it.
     */
    openerUrl: string;
  }

  /**
   * The cursor shape a page is asking for.
   */
  interface BrowserCursorChangeEvent {
    /**
     * Identifier of the view the event belongs to.
     */
    viewId: number;

    /**
     * CSS-style cursor name, or "custom" for shapes without one.
     */
    cursor: string;

    /**
     * Raw CEF cursor type.
     */
    cursorType: number;
  }

  /**
   * A page wants to display a tooltip.
   */
  interface BrowserTooltipEvent {
    /**
     * Identifier of the view the event belongs to.
     */
    viewId: number;

    /**
     * Tooltip text; empty when the tooltip is dismissed.
     */
    text: string;
  }

  /**
   * A form control inside a page gained or lost focus.
   */
  interface BrowserInputFocusChangeEvent {
    /**
     * Identifier of the view the event belongs to.
     */
    viewId: number;

    /**
     * True while the page holds keyboard input.
     */
    focused: boolean;
  }

  /**
   * A web view refused a request.
   */
  interface BrowserResourceBlockedEvent {
    /**
     * Identifier of the view the event belongs to.
     */
    viewId: number;

    /**
     * URL that was refused.
     */
    url: string;

    /**
     * Host component of that URL, empty when unparsable.
     */
    domain: string;

    /**
     * Why the request was refused.
     */
    reason: "cross-origin" | "invalid-url" | "host-filter" | "foreign-event";
  }

  /**
   * A console call made by a page.
   */
  interface BrowserConsoleMessageEvent {
    /**
     * Identifier of the view the event belongs to.
     */
    viewId: number;

    /**
     * Console message body.
     */
    message: string;

    /**
     * Script URL that logged it.
     */
    source: string;

    /**
     * Line number within that script.
     */
    line: number;

    /**
     * Console severity.
     */
    severity: "debug" | "info" | "warning" | "error" | "fatal";
  }

  /**
   * A web view's allowed origin changed.
   */
  interface BrowserOriginChangeEvent {
    /**
     * Identifier of the view the event belongs to.
     */
    viewId: number;

    /**
     * New locked origin, or "null" when the URL has none.
     */
    origin: string;

    /**
     * URL the lock was derived from.
     */
    url: string;
  }

  /**
   * Client-only, resource-owned physical key bindings exposed as the global Key.
   */
  const Key: {
    /**
     * Returns the current layout's label for a physical key, even while UI owns input. Query again when refreshing prompts. Throws for unknown keys or non-string arguments.
     * @param key Case-insensitive physical key name, using the same names as bind.
     * @returns Uppercase printable text, or an English name such as Enter or Mouse 1. Falls back to the uppercase canonical key name when translation is unavailable.
     */
    getLabel(key: string): string;

    /**
     * Binds a resource-owned handler that fires while the game has foreground input and no UI is capturing it.
     * @param key Case-insensitive supported keyboard or mouse key name.
     * @param stateOrHandler Trigger state, or the handler itself to use the default down state.
     * @param handler Handler required when an explicit trigger state is provided.
     * @returns True after the binding is installed; invalid keys or states throw.
     */
    bind(key: string, stateOrHandler: "down" | "up" | "both" | KeyHandler, handler?: KeyHandler): boolean;

    /**
     * Removes matching bindings owned by the calling resource; omitting filters removes every binding for the key.
     * @param key Case-insensitive supported key name.
     * @param state Optional trigger-state filter.
     * @param handler Optional exact handler filter.
     * @returns True when at least one binding was removed.
     */
    unbind(key: string, state?: "down" | "up" | "both", handler?: KeyHandler): boolean;

    /**
     * Queries live physical key state using the same foreground and UI-input gate as binding dispatch.
     * @param key Case-insensitive supported key name.
     * @returns False when the key is up, the game is backgrounded, UI owns input, or the key name is invalid.
     */
    isDown(key: string): boolean;
  };

  /**
   * Client chat transport and native chat-box controls.
   */
  const Chat: {
    /**
     * Sends a chat line to the server, bypassing the chatSend event; incoming lines arrive through the reserved chatMessage event.
     * @param text Player-authored chat text sent to the server.
     */
    send(text: string): void;

    /**
     * Changes visibility of the native chat overlay without opening its input field. Hidden, the overlay also stops opening on its key. The choice holds for the rest of the session and resets to visible on disconnect, so a resource that replaces the chat calls this once at startup.
     * @param visible Whether the chat overlay is rendered.
     */
    setUIVisible(visible: boolean): void;

    /**
     * Checks whether the native chat overlay is visible.
     * @returns True when the overlay is currently rendered.
     */
    isUIVisible(): boolean;

    /**
     * Opens and focuses the native chat input field.
     */
    open(): void;

    /**
     * Closes the native chat input field without submitting its contents.
     */
    close(): void;

    /**
     * Checks whether the native chat input field is active.
     * @returns True while chat is capturing keyboard input.
     */
    isOpen(): boolean;
  };

  /**
   * Client-only Discord rich-presence composer exposed as the global Discord; setters stage values until update or setPresence publishes them.
   */
  const Discord: {
    /**
     * Stages the Discord activity verb or numeric enum value.
     * @param type the Discord activity verb or numeric enum value.
     */
    setType(type: "playing" | "streaming" | "listening" | "watching" | number): void;

    /**
     * Stages the activity name.
     * @param name the activity name.
     */
    setName(name: string): void;

    /**
     * Stages the top presence line.
     * @param details the top presence line.
     */
    setDetails(details: string): void;

    /**
     * Stages the bottom presence line.
     * @param state the bottom presence line.
     */
    setState(state: string): void;

    /**
     * Stages the elapsed-time Unix timestamp in seconds; zero clears it.
     * @param seconds the elapsed-time Unix timestamp in seconds; zero clears it.
     */
    setStartTimestamp(seconds: number): void;

    /**
     * Stages the countdown Unix timestamp in seconds; zero clears it.
     * @param seconds the countdown Unix timestamp in seconds; zero clears it.
     */
    setEndTimestamp(seconds: number): void;

    /**
     * Stages the supported-platform bitmask: Desktop 1, Android 2, and iOS 4.
     * @param flags the supported-platform bitmask: Desktop 1, Android 2, and iOS 4.
     */
    setSupportedPlatforms(flags: number): void;

    /**
     * Stages the large image asset key.
     * @param assetKey the large image asset key.
     */
    setLargeImage(assetKey: string): void;

    /**
     * Stages the large image tooltip.
     * @param text the large image tooltip.
     */
    setLargeText(text: string): void;

    /**
     * Stages the small image asset key.
     * @param assetKey the small image asset key.
     */
    setSmallImage(assetKey: string): void;

    /**
     * Stages the small image tooltip.
     * @param text the small image tooltip.
     */
    setSmallText(text: string): void;

    /**
     * Stages the party grouping identifier.
     * @param id the party grouping identifier.
     */
    setPartyId(id: string): void;

    /**
     * Stages the party join-privacy name or numeric enum value.
     * @param privacy the party join-privacy name or numeric enum value.
     */
    setPartyPrivacy(privacy: "private" | "public" | number): void;

    /**
     * Stages the opaque match secret.
     * @param secret the opaque match secret.
     */
    setMatchSecret(secret: string): void;

    /**
     * Stages the opaque join secret that enables invitations.
     * @param secret the opaque join secret that enables invitations.
     */
    setJoinSecret(secret: string): void;

    /**
     * Stages the opaque spectate secret.
     * @param secret the opaque spectate secret.
     */
    setSpectateSecret(secret: string): void;

    /**
     * Stages whether the activity represents an instanced session.
     * @param instance whether the activity represents an instanced session.
     */
    setInstance(instance: boolean): void;

    /**
     * Stages multiple Discord image fields at once.
     * @param assets Asset keys and tooltips to merge into the staged activity.
     */
    setAssets(assets: { largeImage?: string; largeText?: string; smallImage?: string; smallText?: string }): void;

    /**
     * Stages the party's current and maximum size.
     * @param current Current party member count.
     * @param max Maximum party capacity.
     */
    setPartySize(current: number, max: number): void;

    /**
     * Stages multiple Discord party fields at once.
     * @param party Party fields to merge into the staged activity.
     */
    setParty(party: { id?: string; size?: [number, number]; privacy?: "private" | "public" | number }): void;

    /**
     * Stages multiple Discord activity secrets at once.
     * @param secrets Opaque secrets to merge into the staged activity.
     */
    setSecrets(secrets: { match?: string; join?: string; spectate?: string }): void;

    /**
     * Merges a complete option batch into the staged activity and publishes it immediately.
     * @param options Batch of supported activity, timestamp, asset, party, secret, instance, and platform fields.
     * @returns True when the update was dispatched; false when Discord is unavailable.
     */
    setPresence(options: Record<string, unknown>): boolean;

    /**
     * Publishes the currently staged activity as one rate-limited Discord update.
     * @returns True when dispatched; false when Discord is unavailable.
     */
    update(): boolean;

    /**
     * Clears what scripts published and resets staged state.
     * @returns True when dispatched; false when Discord is unavailable.
     */
    clear(): boolean;

    /**
     * Resets staged activity fields without publishing a Discord update.
     */
    reset(): void;

    /**
     * Returns the signed-in Discord user's snowflake.
     * @returns User ID string, or an empty string until available.
     */
    getUserId(): string;

    /**
     * Checks whether Discord is connected and can publish presence.
     * @returns True when rich presence is initialized.
     */
    isAvailable(): boolean;
  };

  /**
   * Local player's proximity voice chat settings: on/off, playback volume, hearing range and the push-to-talk binding.
   */
  const Voice: {
    /**
     * Turns voice chat on or off. Off closes the microphone and playback devices and tells the server to stop relaying voice to this client.
     * @param enabled Whether voice chat runs at all for this player.
     */
    setEnabled(enabled: boolean): void;

    /**
     * Checks whether voice chat is enabled for this player.
     * @returns True unless the player turned voice chat off.
     */
    isEnabled(): boolean;

    /**
     * Sets the playback volume of incoming voice. A game that plays voice through its own audio engine applies the same gain there.
     * @param volume Playback gain, where 1 is unattenuated. Clamped to 0..4.
     */
    setVolume(volume: number): void;

    /**
     * Reads the voice playback volume.
     * @returns Current gain, where 1 is unattenuated.
     */
    getVolume(): number;

    /**
     * Narrows how far this player hears others. Can only reduce the server's range, since a talker beyond it is never relayed.
     * @param range Audibility radius in world units; 0 removes the local limit.
     */
    setHearingRange(range: number): void;

    /**
     * Reads the local hearing-range limit.
     * @returns Radius in world units, or 0 when the server's range applies unreduced.
     */
    getHearingRange(): number;

    /**
     * Reads the server's proximity range for talkers with no override of their own.
     * @returns Radius in world units.
     */
    getRange(): number;

    /**
     * Switches how far this player's voice carries. A request: the server paces it, decides the radius, and may move the player itself.
     * @param tier Voice tier: 0 whisper, 1 normal, 2 shout.
     */
    setTier(tier: number): void;

    /**
     * Reads the voice tier this player is on.
     * @returns 0 whisper, 1 normal, 2 shout.
     */
    getTier(): number;

    /**
     * Rebinds push-to-talk. Unknown key names throw.
     * @param key Case-insensitive key name, using the same names as Key.bind.
     */
    setPushToTalkKey(key: string): void;

    /**
     * Reads the push-to-talk binding.
     * @returns Canonical key name, e.g. "v".
     */
    getPushToTalkKey(): string;

    /**
     * Sets how long transmission continues after push-to-talk is released, so letting go slightly early does not clip the end of a word. Muting, turning voice off and losing input focus still stop it at once.
     * @param milliseconds How long to keep transmitting after the key goes up. Clamped to 0..2000.
     */
    setPushToTalkReleaseDelay(milliseconds: number): void;

    /**
     * Reads the push-to-talk release delay.
     * @returns Delay in milliseconds; 0 when transmission stops the moment the key is released.
     */
    getPushToTalkReleaseDelay(): number;

    /**
     * Checks whether the local player is speaking right now. The same state raises the voiceStart and voiceStop events.
     * @returns True while push-to-talk is open -- held, or still inside the release delay -- and the microphone is producing audio.
     */
    isTalking(): boolean;

    /**
     * Checks whether a capture device opened for this session.
     * @returns False when the player has no working microphone, i.e. they are listen-only.
     */
    hasMicrophone(): boolean;

    /**
     * Chooses what opens the microphone. Switching closes whatever the previous mode had open. Unknown modes throw.
     * @param mode pushToTalk sends while the key is held; voiceActivity sends whenever the microphone is louder than the activation threshold.
     */
    setTransmitMode(mode: 'pushToTalk' | 'voiceActivity'): void;

    /**
     * Reads what opens the microphone.
     * @returns The current transmit mode.
     */
    getTransmitMode(): 'pushToTalk' | 'voiceActivity';

    /**
     * Sets the voice-activation sensitivity: lower sends quieter speech, higher ignores more background noise. Clamped to 0..1.
     * @param level Microphone level, 0 to 1 on the scale getInputLevel reports, above which voice activation sends.
     */
    setActivationThreshold(level: number): void;

    /**
     * Reads the voice-activation threshold.
     * @returns Level from 0 to 1.
     */
    getActivationThreshold(): number;

    /**
     * Reads how loud the microphone is right now, whether or not anything is being sent -- the value to draw a level meter from and to tune the activation threshold against.
     * @returns Smoothed level from 0 to 1; 0 while no microphone is open.
     */
    getInputLevel(): number;

    /**
     * Turns noise suppression on or off. It runs before the level is measured, so it also keeps steady noise from tripping voice activation.
     * @param enabled Whether to filter background noise out of the microphone.
     */
    setNoiseSuppression(enabled: boolean): void;

    /**
     * Checks whether noise suppression is on.
     * @returns True while background noise is being filtered.
     */
    isNoiseSuppressionEnabled(): boolean;

    /**
     * Lists the microphones voice can record from.
     * @returns Device names as the player would recognise them; empty when the game chooses the device itself.
     */
    getInputDevices(): string[];

    /**
     * Chooses the microphone. A running microphone is reopened on the new device; a device that is no longer connected falls back to the default.
     * @param name A name from getInputDevices, or an empty string for the system default.
     */
    setInputDevice(name: string): void;

    /**
     * Reads the chosen microphone.
     * @returns Its name, or an empty string for the system default.
     */
    getInputDevice(): string;
  };

  /**
   * The local player's view of the nametags above players: whether they draw at all, whether they carry a health bar, and whether their own is shown.
   */
  const Nametags: {
    /**
     * Shows or hides all nametags for this player only. A player hidden with Player.setNametagVisible stays hidden either way.
     * @param visible True to draw nametags, false to hide every one of them.
     */
    setVisible(visible: boolean): void;

    /**
     * Checks whether this player draws nametags.
     * @returns True unless they were hidden locally.
     */
    isVisible(): boolean;

    /**
     * Shows or hides the health bar on all nametags for this player only, leaving the names alone.
     * @param visible True to draw the health bar under each name, false to hide it.
     */
    setHealthVisible(visible: boolean): void;

    /**
     * Checks whether this player draws health bars on nametags.
     * @returns True unless they were hidden locally.
     */
    isHealthVisible(): boolean;

    /**
     * Shows or hides this player's own nametag, drawn as others see it, with any label set on their own id.
     * @param visible True to draw this player's own nametag, false (default) to leave it off.
     */
    setSelfVisible(visible: boolean): void;

    /**
     * Checks whether this player draws their own nametag.
     * @returns False unless it was turned on locally.
     */
    isSelfVisible(): boolean;

    /**
     * Hangs a transient line on that entity's nametag, above its name -- speech, an emote, a status. It follows the body, fades with distance and hides behind cover exactly as the name does. Local to this player: the line is not replicated, and a nametag hidden with Nametags.setVisible draws neither. Player.setNametagText is the server-side counterpart for a lasting name.
     * @param entityId Network id of the entity to label (server-side `player.id`).
     * @param text Label text; '\n' splits lines. Empty clears the label.
     * @param durationMs How long to hold it (default 6000). <= 0 holds until cleared.
     * @param color Packed 0xAARRGGBB; 0 (default) uses the nametag's own colour.
     */
    setLabel(entityId: number, text: string, durationMs?: number, color?: number): void;

    /**
     * Removes an entity's label before its duration elapses.
     * @param entityId Network id of the entity whose label to remove.
     */
    clearLabel(entityId: number): void;

    /**
     * Removes every label this player is drawing.
     */
    clearLabels(): void;
  };

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
  }

  /**
   * Calls a function once after a delay.
   * @param handler Function to call.
   * @param milliseconds Delay before the call.
   * @param args Arguments passed to the handler.
   * @returns Handle to pass to the matching clear function.
   */
  function setTimeout(handler: (...args: any[]) => void, milliseconds?: number, ...args: unknown[]): number;

  /**
   * Calls a function repeatedly, waiting the delay between calls.
   * @param handler Function to call.
   * @param milliseconds Delay before the call.
   * @param args Arguments passed to the handler.
   * @returns Handle to pass to the matching clear function.
   */
  function setInterval(handler: (...args: any[]) => void, milliseconds?: number, ...args: unknown[]): number;

  /**
   * Cancels a pending setTimeout.
   * @param handle Handle returned when the timer was scheduled; anything else is ignored.
   */
  function clearTimeout(handle?: number): void;

  /**
   * Cancels a setInterval.
   * @param handle Handle returned when the timer was scheduled; anything else is ignored.
   */
  function clearInterval(handle?: number): void;

  /**
   * Queues a function on the microtask queue.
   * @param callback Function to run once the current task completes.
   */
  function queueMicrotask(callback: () => void): void;
}

export {};
