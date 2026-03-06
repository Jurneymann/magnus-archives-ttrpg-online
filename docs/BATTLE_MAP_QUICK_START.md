# Battle Map System - Quick Start Guide

## What You'll See

### Map Display

```
┌─────────────────────────────────────┐
│  Grid-Based Battle Map              │
│  • Each square = 1 metre            │
│  • Hover highlights squares         │
│  • Click to interact                │
└─────────────────────────────────────┘
```

### Combatant Tokens

**Visual Appearance:**

- 🎭 **Green Circle** = Player Character
- 👤 **Blue Circle** = NPC
- 💀 **Red Circle** = Enemy

**Selected Token:**

- Yellow border with pulsing glow
- Ready to move to a new position

### Terrain Colors

| Type      | Color                  | Passable | Notes          |
| --------- | ---------------------- | -------- | -------------- |
| Wall      | Dark Gray (#424242)    | No       | Square or edge |
| Door      | Brown (#8B4513)        | Yes      | Square or edge |
| Window    | Sky Blue (#87CEEB)     | No       | Square or edge |
| Furniture | Dark Brown (#6D4C41)   | No       | Square only    |
| Landscape | Green (#2E7D32)        | Yes      | Square only    |
| Water     | Blue (#1976D2)         | Yes      | Square only    |
| Difficult | Yellow-Amber (#F9A825) | Yes      | Square only    |

## Quick Workflow

### 1. Initial Setup (Before Combat)

```
┌──────────────────────────────────┐
│ 1. Go to "Combat Tracker" tab    │
│ 2. Click "Battle Map" to expand  │
│ 3. Set map dimensions             │
│ 4. Add terrain with tools         │
│ 5. Save map for reuse (optional) │
└──────────────────────────────────┘
```

### 2. Adding Combatants

```
┌──────────────────────────────────┐
│ Combat Tracker Section:           │
│ • Add All Party                   │
│ • Add from Bestiary               │
│ • Add NPCs                        │
│                                   │
│ ↓                                 │
│                                   │
│ Combatants auto-appear on map!   │
│ • PCs at bottom (green)          │
│ • Enemies at top (red)           │
│ • NPCs at top (blue)             │
└──────────────────────────────────┘
```

### 3. Moving Combatants

**Method 1: Drag-and-Drop (Recommended)**

```
Step 1: Ensure "🖐️ Move" tool is selected
   ↓
Step 2: Click and hold on a combatant
   (Cursor changes to grabbing)
   ↓
Step 3: Drag to desired position
   (Token follows cursor)
   ↓
Step 4: Release mouse button
   (Combatant snaps to grid)
```

**Method 2: Click-to-Move**

```
Step 1: Click "🖐️ Move" tool
   ↓
Step 2: Click a combatant
   (Yellow highlight appears)
   ↓
Step 3: Click destination square
   (Combatant moves instantly)
```

### 4. Adding Terrain

```
Step 1: Select terrain tool
   (🧱 Wall, 🚪 Door, 🪟 Window, 🪑 Furniture, etc.)
   ↓
Step 2: Choose draw mode (Wall/Door/Window only)
   ⬛ Square - fills whole grid squares
   ⬜ Edge   - draws thin lines on cell borders
   ↓
Step 3: Click/drag on the map to place
   ↓
Step 4: Switch to 🗑️ Erase to remove
   (Match the draw mode to erase the right type)
```

**Edge Mode tip**: Use Edge walls to draw realistic building outlines — the wall sits on the border between two squares rather than filling one, giving a clean floor-plan look. Place a Door in the same Edge Mode to create an opening in the wall line.

## Example Scenario

### Setup: Warehouse Encounter

**Map Size:** 15m × 12m

**Terrain:**

```
🧱🧱🧱🧱🧱🧱🧱🧱🧱🧱🧱🧱🧱🧱🧱
🧱  .  .  .  .  .  .  .  .  .  .  .  .  🧱
🧱  .  .  .  .  .  .  .  .  .  .  .  .  🧱
🧱  .  . 🪑🪑 .  .  .  .  .  .  .  .  🧱
🧱  .  . 🪑🪑 .  .  .  .  .  .  .  .  🧱
🧱  .  .  .  .  .  . 🪑  .  .  .  .  .  🧱
🧱  .  .  .  .  .  . 🪑  .  .  .  .  .  🧱
🧱  .  .  .  .  .  .  .  .  . 🪑🪑 .  🧱
🧱  .  .  .  .  .  .  .  .  . 🪑🪑 .  🧱
🧱  .  .  .  .  .  .  .  .  .  .  .  .  🧱
🧱  .  .  .  .  .  .  .  .  .  .  .  .  🧱
🧱🧱🧱🧱🧱🧱🧱🧱🧱🧱🧱🧱🧱🧱🧱
```

**Combatants:**

```
🧱🧱🧱🧱🧱🧱🧱🧱🧱🧱🧱🧱🧱🧱🧱
🧱  💀 .  💀 .  💀 .  .  .  .  .  .  .  🧱
🧱  .  .  .  .  .  .  .  .  .  .  .  .  🧱
🧱  .  . 🪑🪑 .  .  .  .  .  .  .  .  🧱
🧱  .  . 🪑🪑 .  .  .  .  .  .  .  .  🧱
🧱  .  .  .  .  .  . 🪑  .  .  .  .  .  🧱
🧱  .  .  .  .  .  . 🪑  .  .  .  .  .  🧱
🧱  .  .  .  .  .  .  .  .  . 🪑🪑 .  🧱
🧱  .  .  .  .  .  .  .  .  . 🪑🪑 .  🧱
🧱  .  .  .  .  .  .  .  .  .  .  .  .  🧱
🧱  🎭 .  🎭 .  🎭 .  🎭 .  .  .  .  .  🧱
🧱🧱🧱🧱🧱🧱🧱🧱🧱🧱🧱🧱🧱🧱🧱

💀 = Enemies (3x) at top
🎭 = Party (4x) at bottom
🪑 = Furniture for cover
🧱 = Walls
```

## Control Panel Layout

```
┌─────────────────────────────────────────────────┐
│ BATTLE MAP CONTROLS                              │
├─────────────────────────────────────────────────┤
│                                                  │
│ Width: [  10  ]m    Height: [  10  ]m          │
│ [➕ Zoom In] [➖ Zoom Out] [↻ Reset]           │
│                                                  │
│ WALL DRAW MODE:                                  │
│ [⬛ Square Mode]  [⬜ Edge Mode]                │
│ (visible when Wall, Door or Window selected)     │
│                                                  │
│ TERRAIN TOOLS:                                   │
│ [🧱 Wall]  [🚪 Door]   [🪟 Window]             │
│ [🪑 Furniture] [🌳 Landscape] [💧 Water]       │
│ [⚠️ Difficult] [🗑️ Erase]                      │
│                                                  │
│ [Clear All Terrain] [💾 Save Map] [📂 Load Map]│
└─────────────────────────────────────────────────┘
```

## Status Bar

At the bottom of the map, you'll see:

```
Zoom: 100% | Map Size: 10m × 10m |
Selected Tool: Move | Selected: Character Name
```

## Tips for Success

### ✅ DO:

- Set up maps before combat starts
- Save commonly-used maps
- Use zoom for precise positioning
- Keep map size reasonable (10-20m typical)

### ❌ DON'T:

- Make maps too large (slows down browser)
- Forget to save important maps
- Place combatants on impassable terrain
- Clear terrain without saving first

## Common Actions

### Rotate Combatants

1. Select the 🔄 Rotate tool
2. Click on a combatant
3. Use the directional buttons (N, E, S, W) or angle buttons (+45°, -45°, +90°, -90°)
4. Or right-click a token and use the rotation controls in the customizer menu

### Name Individual Enemies

- When adding multiple of the same enemy type, they are automatically numbered ("Cultist 1", "Cultist 2", etc.)
- Expand the enemy in the Combat Tracker to edit the "Display Name" field
- Custom names appear on the battle map and player view
- Helps distinguish between multiple identical enemies

### Measure Distance

Count squares between positions:

- Adjacent = 1m (diagonal counts as 1m)
- Use visual count for movement ranges

### Remove Combatant

- Go to Combat Tracker section
- Click "Remove" button
- Combatant disappears from map

### Reset Everything

1. Click "End Combat" in Combat Tracker
2. Combatants clear but terrain remains
3. Or click "Clear All Terrain" to reset map

## Accessibility

- **High Contrast**: Bright borders and colors
- **Large Click Targets**: Each square easily clickable
- **Visual Feedback**: Hover effects and selection highlights
- **Keyboard**: Currently mouse-only (future enhancement)

## Performance Notes

**Optimal Performance:**

- Map size: 10-20 metres
- Combatants: Up to 20
- Zoom: 50%-200%

**If Slow:**

- Reduce map size
- Use smaller zoom level
- Clear unnecessary terrain
- Remove defeated combatants

## Example Use Cases

### 1. **Haunted Manor - The Entrance Hall**

- 12m × 15m
- Walls forming rooms
- Furniture for cover
- Grand staircase (landscape)

### 2. **Alleyway Chase**

- 4m × 25m (narrow and long)
- Walls on sides
- Dumpsters (furniture)
- Difficult terrain (debris)

### 3. **Ritual Chamber**

- 20m × 20m (large open space)
- Circular water feature in center
- Candles (landscape)
- Altar (furniture)

### 4. **Forest Clearing**

- 15m × 15m
- Trees (landscape)
- Rocky difficult terrain
- Small stream (water)

## Questions?

Refer to the full **BATTLE_MAP_README.md** for detailed documentation, troubleshooting, and advanced features.
