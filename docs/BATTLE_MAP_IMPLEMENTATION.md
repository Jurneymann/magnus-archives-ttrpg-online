# Battle Map System - Technical Implementation

## Overview

The battle map system (`battle-map.js`) provides a full grid-based tactical map for the Magnus Archives GM Tool. The system supports layered terrain, multiplayer sync, edge-wall drawing, and real-time player view sharing.

As of v2.3, `battle-map.js` has grown to ~6,700 lines and is the largest single module in the project.

---

## Core Data Structures

### `battleMap` Object

The primary state object for the active map:

```javascript
const battleMap = {
  width: 10, // Map width in metres
  height: 10, // Map height in metres
  gridSize: 40, // Pixels per square at zoom 1.0
  zoom: 1.0, // Current zoom level (0.5 – 2.0)
  layers: [], // Array of layer objects (see below)
  activeLayer: 0, // Index of the currently active layer
  combatantPositions: {}, // { combatantId: { x, y } }
  selectedCombatant: null,
  selectedTool: "move", // Active tool: "move" | terrain type | "erase"
};
```

### Layer Structure

Each entry in `battleMap.layers[]`:

```javascript
{
  id: 0,
  name: "Ground",
  visible: true,
  locked: false,
  terrain: [],      // Array of { x, y, type } — square-fill terrain
  edgeWalls: [],    // Array of { x, y, edge, type } — border-drawn walls
}
```

### Terrain Types

Defined in the `terrainTypes` object (~line 147 of `battle-map.js`):

| Type        | Colour    | Passable | Use Case                         |
| ----------- | --------- | -------- | -------------------------------- |
| `wall`      | `#424242` | No       | Solid walls, impassable barriers |
| `door`      | `#8B4513` | Yes      | Doors, archways, openings        |
| `window`    | `#87CEEB` | No       | Windows, glass panels            |
| `furniture` | `#6D4C41` | No       | Tables, crates, large objects    |
| `landscape` | `#2E7D32` | Yes      | Trees, bushes, dense vegetation  |
| `water`     | `#1976D2` | Yes      | Water, rivers, pools             |
| `difficult` | `#F9A825` | Yes      | Rubble, mud, difficult terrain   |

### Edge Walls

Edge walls are drawn on cell _borders_ rather than filling a cell. Each entry in `layer.edgeWalls[]`:

```javascript
{
  x: 3,         // Grid column of the cell
  y: 2,         // Grid row of the cell
  edge: "n",    // Which border: "n" | "s" | "e" | "w"
  type: "wall"  // Terrain type: "wall" | "door" | "window"
}
```

Edge walls render as a thick coloured line along the specified cell border, using the colour from `terrainTypes[type].color`.

---

## Wall Draw Modes

### `wallDrawMode`

A string state variable controlling how wall/door/window terrain is placed:

- `"square"` (default) — a click fills the entire cell with the selected terrain type
- `"edge"` — a click draws on the nearest border of the cell

### `setWallDrawMode(mode)`

Switches between modes and updates the UI toggle buttons (⬛ Square / ⬜ Edge).

### Edge Detection

In edge mode, the mouse position within a cell is compared against the centre point. The cursor's offset from centre determines the closest border — if the cursor is primarily left/right of centre the `w`/`e` edge is used; if primarily above/below the `n`/`s` edge is used.

---

## Undo/Redo System

### State Object

```javascript
const battleMapHistory = {
  past: [], // Terrain snapshots (oldest → newest), max 50 entries
  future: [], // Redo stack (most recent first)
  maxSize: 50,
};
```

Each snapshot is a lightweight array of `{ id, terrain, edgeWalls }` per layer — combatant positions, lights, AoE templates, and fog-of-war data are **not** included.

### Snapshot Trigger Points

`saveBattleMapSnapshot()` is called immediately **before** any terrain mutation:

| Operation              | Trigger location in code                                      |
| ---------------------- | ------------------------------------------------------------- |
| Erase (square or edge) | Top of the erase branch in `handleBattleMapClick()`           |
| Edge wall line         | Before `drawWallsBetweenCorners()` on the second corner click |
| Square terrain paint   | Before `layer.terrain.push()` in `handleBattleMapClick()`     |
| Clear all terrain      | Before `layer.terrain = []` in `clearBattleMapTerrain()`      |

### History Stack Behaviour

- Any new terrain edit clears the redo (`future`) stack
- The `past` stack is capped at 50 entries; oldest entry is dropped when the limit is exceeded
- Undo/redo both call `renderBattleMap()` and `saveBattleMapState()` so the canvas and localStorage remain in sync
- The history is **in-memory only** — it does not persist across page refreshes

### Keyboard Shortcuts

| Shortcut       | Action |
| -------------- | ------ |
| `Ctrl+Z`       | Undo   |
| `Ctrl+Y`       | Redo   |
| `Ctrl+Shift+Z` | Redo   |

These are handled inside the existing `handleBattleMapKeyPress()` listener, which already guards against firing when an `<input>` or `<textarea>` is focused.

---

## Layer System

### Layer Management

- Layers are listed in the UI as a vertical panel alongside the map
- Each layer row has: visibility (👁) toggle, lock (🔒) toggle, and a name label
- The active layer is highlighted and receives all terrain edits
- Layers render bottom-to-top: index 0 is drawn first (background), higher indices draw on top

### Layer Functions

| Function                   | Description                                   |
| -------------------------- | --------------------------------------------- |
| `addLayer()`               | Adds a new layer above the current active one |
| `deleteLayer()`            | Removes the active layer (min 1 must remain)  |
| `setActiveLayer(index)`    | Changes which layer receives edits            |
| `moveLayerUp(index)`       | Swaps layer with the one above it             |
| `moveLayerDown(index)`     | Swaps layer with the one below it             |
| `toggleLayerVisibility(i)` | Toggles `visible` flag for layer `i`          |
| `toggleLayerLock(i)`       | Toggles `locked` flag for layer `i`           |

---

## Multiplayer Integration

### GM → Player Sync

The GM can share the current map state with all connected players via Firebase:

1. `toggleBattleMapVisibility()` — toggles the `visible` flag and pushes the full serialised map to Firebase
2. On every save, the full state (all layers, edge walls, tokens) is written to `rooms/{roomCode}/battleMap`
3. Players receive updates via `onBattleMapUpdate()` listener in `player-multiplayer.js`

### Battle Map Pings

The GM can ping a location on the map to draw players' attention:

- Pings are broadcast to `rooms/{roomCode}/battleMapPings/{pingId}`
- Both GM and player views render pings as animated circular markers
- `handleBattleMapPings(pingsData)` processes the Firebase snapshot and renders/removes markers

---

## Exposed Global Functions

| Function                      | Description                                          |
| ----------------------------- | ---------------------------------------------------- |
| `initializeBattleMap()`       | One-time setup on first open; renders initial grid   |
| `syncBattleMapWithCombat()`   | Pushes current combatants from combat tracker to map |
| `clearBattleMap()`            | Clears all combatant positions                       |
| `saveBattleMapState()`        | Serialises full state to localStorage                |
| `loadBattleMapState()`        | Restores state from localStorage                     |
| `setWallDrawMode(mode)`       | Switches between `"square"` / `"edge"` draw modes    |
| `handleBattleMapPings(data)`  | Renders animated ping markers from Firebase data     |
| `toggleBattleMapVisibility()` | Shares / unshares the map with connected players     |
| `saveBattleMapPreset(name)`   | Saves current map to a named preset                  |
| `loadBattleMapPreset(name)`   | Loads and renders a saved preset                     |
| `undoBattleMapAction()`       | Reverts the last terrain edit (up to 50 steps)       |
| `redoBattleMapAction()`       | Re-applies the last undone terrain edit              |
| `saveBattleMapSnapshot()`     | Captures a terrain snapshot before a destructive op  |
| `updateUndoRedoButtons()`     | Syncs Undo/Redo button state with history stacks     |

---

## User Interface

### Control Panel

- **Map size inputs** — width/height in metres
- **Zoom controls** — 50%–200% with live feedback
- **Wall Draw Mode toggle** — ⬛ Square (fill cells) / ⬜ Edge (draw on borders)
- **Undo / Redo buttons** — ↩ Undo and ↪ Redo, up to 50 steps; keyboard shortcuts Ctrl+Z / Ctrl+Y
- **Terrain tool buttons** — Wall, Door, Window, Furniture, Landscape, Water, Difficult, Erase
- **Layer panel** — add, remove, reorder, lock, hide layers
- **Action buttons** — Save, Load, Clear, Share (multiplayer)

### Map Canvas

- Scrollable container for large maps
- Square-fill terrain rendered as coloured cells
- Edge walls rendered as thick coloured lines on cell borders
- Combatant tokens with emoji icons and colour backgrounds
- Ping markers as animated red circles

---

## Features Status

### ✅ Implemented

- [x] Configurable map size (5–50 m)
- [x] Grid display (1 square = 1 metre)
- [x] Combatant tokens with colour/emoji icons
- [x] 7 terrain types + erase
- [x] Door and window terrain types
- [x] Square and edge wall draw modes
- [x] Layer system (add, remove, reorder, lock, hide)
- [x] Zoom controls (50%–200%)
- [x] Save/load named map presets
- [x] LocalStorage persistence
- [x] Multiplayer player view (read-only)
- [x] Firebase-synced map sharing
- [x] Battle map pings (animated markers)
- [x] Integration with combat tracker
- [x] Auto-placement of new combatants
- [x] Undo/redo (50-step history, Ctrl+Z / Ctrl+Y)

### ⏳ Not Yet Implemented

- [ ] Canvas-based rendering (currently DOM)
- [ ] Touch/mobile optimisation
- [ ] Export map as image
- [ ] Import map from image file

---

## User Workflow

### Setup Phase

1. Open the Combat Tracker tab
2. Expand the "Battle Map" section
3. Set map width and height (metres)
4. Select a layer (or use the default "Ground" layer)
5. Choose a terrain tool and draw mode (Square or Edge)
6. Paint terrain across the grid
7. Add further layers for objects, effects, etc.
8. Save a preset for reuse

### Combat Phase

1. Add combatants via the Combat Tracker
2. Combatants auto-appear on the map
3. Select the Move tool
4. Click a combatant token to select it
5. Click the destination square to move it
6. (Optional) Enable multiplayer sharing so players see the map live

### End Combat

1. Click "End Combat" in the Combat Tracker
2. Combatant positions are cleared
3. Terrain and layers persist for the next encounter

---

## Data Persistence

### LocalStorage Keys

| Key                | Contents                                            |
| ------------------ | --------------------------------------------------- |
| `battleMapState`   | Full serialised map including all layers/edge walls |
| `battleMapPresets` | Saved named preset objects keyed by preset name     |

### Saved JSON Format

```json
{
  "width": 15,
  "height": 12,
  "zoom": 1.0,
  "activeLayer": 0,
  "layers": [
    {
      "id": 0,
      "name": "Ground",
      "visible": true,
      "locked": false,
      "terrain": [{ "x": 0, "y": 0, "type": "wall" }],
      "edgeWalls": [{ "x": 3, "y": 2, "edge": "n", "type": "door" }]
    }
  ],
  "combatantPositions": {
    "combatant-1": { "x": 5, "y": 4 }
  }
}
```

### Firebase Paths (Multiplayer)

```
rooms/{roomCode}/battleMap/
  visible: true/false
  width: 10
  height: 12
  zoom: 1.0
  activeLayer: 0
  layers: [...]
  combatantPositions: {...}

rooms/{roomCode}/battleMapPings/
  {pingId}/
    x: 3
    y: 4
    timestamp: 1234567890
```

---

## Browser Compatibility

**Tested On:**

- Chrome/Edge (Chromium)
- Firefox
- Safari

**Requirements:**

- ES6 JavaScript
- LocalStorage API
- CSS Grid support

---

## Performance Notes

- DOM-based rendering; large maps (40×40+) may degrade on older or low-power machines
- Optimal performance: maps up to 20×20
- Edge walls add minimal overhead — they are a sparse array iterated separately from square terrain
- Multiplayer sync pushes the full serialised state on each save; for large maps with many layers this can be a large Firebase write

---

## Known Limitations

1. **DOM Rendering** — No canvas fallback; 50×50 maps with many tokens can be slow
2. **Full-state sync** — Multiplayer writes the entire map on each update, not just deltas
3. **Edge walls are layer-specific** — An edge wall cannot span across layers
4. **Undo history not persisted** — The undo stack is in-memory only; refreshing the page clears it

---

## Version History

| Version | Date     | Notes                                                                        |
| ------- | -------- | ---------------------------------------------------------------------------- |
| v1.0    | Jan 2026 | Initial: basic grid, 6 terrain types, tokens, zoom, save/load (~600 lines)   |
| v2.0    | Feb 2026 | Layer system, multiplayer sync, battle map pings, preset management          |
| v2.3    | Mar 2026 | Edge wall draw mode, door + window terrain types, UI overhaul (~6,700 lines) |
| v2.4    | Mar 2026 | Undo/redo (50-step history per session, Ctrl+Z / Ctrl+Y + toolbar buttons)   |

---

**Version:** 2.4  
**Date:** March 2026  
**Status:** Active Development
