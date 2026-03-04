// Magnus Archives GM Tool - Battle Map System

let battleMap = {
  layers: [
    {
      id: 1,
      name: "Ground Floor",
      width: 10,
      height: 10,
      terrain: [],
      edgeWalls: [], // Array of {x, y, edge: 'n'|'s'|'e'|'w', type: 'wall'|etc}
      backgroundImage: null,
      combatantPositions: {},
      combatantFacing: {},
      lights: [], // Array of {id, x, y, radius, color, intensity}
    },
  ],
  activeLayerId: 1,
  nextLayerId: 2,
  gridSize: 60, // pixels per square
  zoom: 1.0,
  selectedCombatant: null,
  selectedTool: "move", // 'move', 'wall', 'furniture', 'landscape', 'erase', 'measure', 'rotate'
  wallDrawMode: "square", // 'square' (fill squares) or 'edge' (draw on cell edges)
  edgeWallDrawing: {
    active: false,
    startCornerX: null,
    startCornerY: null,
  },
  showNames: false, // Toggle to show all names
  showLineOfSight: true, // Toggle to show facing indicators
  customTokens: {}, // {combatantId: {type: 'emoji'|'image', value: '🎭'|'base64...'}}
  pingActive: false,
  pingColor: "#ff5722",
  activePings: [],
  mode: "use", // 'setup' or 'use' - controls which controls are shown
  uiState: {
    setupMapOpen: false,
    useMapOpen: false,
    // Setup Map subsections
    mapLayersOpen: false,
    mapDesignOpen: false,
    dynamicLightingOpen: false,
    backgroundsOpen: false,
    saveLoadOpen: false,
    // Use Map subsections
    movementOpen: false,
    viewControlsOpen: false,
    fogOfWarOpen: false,
    areaOfEffectOpen: false,
    gridMovementOpen: false,
  },
  dragging: {
    active: false,
    combatantId: null,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
  },
  measuring: {
    active: false,
    startX: null,
    startY: null,
    endX: null,
    endY: null,
  },
  aoeTemplates: [], // Array of {id, type, x, y, size, color, rotation, coneWidth}
  nextAoeId: 1,
  selectedAoeTool: null, // 'circle', 'cone', 'line', 'square'
  aoeSize: 3, // Default size in grid squares (length for cone/line)
  aoeConeWidth: 3, // Cone width in grid squares (separate from length)
  aoePlacementMode: false, // True when waiting for user to click to place AoE
  aoePreview: null, // Preview data while placing {x, y, rotation}
  // Grid Snapping Options
  snapMode: "full", // 'full', 'half', 'free'
  snapType: "center", // 'center', 'corner'
  showMoveDistance: true, // Show distance when moving combatants
  combatantSizes: {}, // {combatantId: size} - size: 1 (medium), 2 (large), 3 (huge), 4 (gargantuan)
  combatantElevations: {}, // {combatantId: elevation} - elevation in squares (0 = ground, negative = underground)
  movePreview: null, // {fromX, fromY, toX, toY, distance} - shown when dragging
  hoverCell: null, // {x, y} - cell being hovered during combatant movement
  viewMode: "2d", // '2d' or 'isometric'
  // Lighting
  selectedLightTool: null, // 'light' when placing lights
  nextLightId: 1,
  defaultLightRadius: 5, // Default light radius in squares
  defaultLightColor: "#ffeb3b", // Default light color (yellow)
  defaultLightIntensity: 0.8, // Default light intensity (0-1)
  // Fog of War
  fogOfWar: {
    enabled: false,
    mode: "lineOfSight", // 'lineOfSight' or 'exploration'
    visionDistance: 5, // Distance in grid squares
    revealedCells: {}, // {layerId: {"x,y": true}} - permanently revealed in exploration mode
    lightTransparency: 0.6, // How much lights reduce fog opacity (0=no effect, 1=full transparency)
  },
  // Keyboard navigation
  keyboard: {
    focusedCell: null, // {x, y} - currently focused cell for keyboard navigation
    enabled: true, // Whether keyboard navigation is enabled
  },
};

// ==================== UNDO/REDO HISTORY ==================== //

const battleMapHistory = {
  past: [],    // Terrain snapshots (oldest → newest)
  future: [],  // Terrain snapshots for redo (most recent first)
  maxSize: 50, // Cap to prevent memory bloat
};

/**
 * Capture a lightweight snapshot of all layers' terrain before a destructive action.
 * Must be called immediately before any terrain mutation.
 */
function saveBattleMapSnapshot() {
  const snapshot = battleMap.layers.map((layer) => ({
    id: layer.id,
    terrain: JSON.parse(JSON.stringify(layer.terrain)),
    edgeWalls: JSON.parse(JSON.stringify(layer.edgeWalls)),
  }));

  battleMapHistory.past.push(snapshot);

  // Enforce size cap
  if (battleMapHistory.past.length > battleMapHistory.maxSize) {
    battleMapHistory.past.shift();
  }

  // Any new edit clears the redo stack
  battleMapHistory.future = [];
  updateUndoRedoButtons();
}

/** Return the current terrain state as a snapshot (used by undo/redo internally). */
function getCurrentTerrainSnapshot() {
  return battleMap.layers.map((layer) => ({
    id: layer.id,
    terrain: JSON.parse(JSON.stringify(layer.terrain)),
    edgeWalls: JSON.parse(JSON.stringify(layer.edgeWalls)),
  }));
}

/** Restore a terrain snapshot to the live layers. */
function applyTerrainSnapshot(snapshot) {
  snapshot.forEach((snap) => {
    const layer = battleMap.layers.find((l) => l.id === snap.id);
    if (layer) {
      layer.terrain = snap.terrain;
      layer.edgeWalls = snap.edgeWalls;
    }
  });
}

/** Undo the last terrain operation. */
function undoBattleMapAction() {
  if (battleMapHistory.past.length === 0) return;
  battleMapHistory.future.push(getCurrentTerrainSnapshot());
  const previous = battleMapHistory.past.pop();
  applyTerrainSnapshot(previous);
  renderBattleMap();
  saveBattleMapState();
  updateUndoRedoButtons();
}

/** Redo the last undone terrain operation. */
function redoBattleMapAction() {
  if (battleMapHistory.future.length === 0) return;
  battleMapHistory.past.push(getCurrentTerrainSnapshot());
  const next = battleMapHistory.future.pop();
  applyTerrainSnapshot(next);
  renderBattleMap();
  saveBattleMapState();
  updateUndoRedoButtons();
}

/** Sync undo/redo button appearances with history stack lengths. */
function updateUndoRedoButtons() {
  const undoBtn = document.getElementById("bmUndoBtn");
  const redoBtn = document.getElementById("bmRedoBtn");
  if (undoBtn) {
    undoBtn.disabled = battleMapHistory.past.length === 0;
    undoBtn.style.opacity = battleMapHistory.past.length === 0 ? "0.35" : "1";
    undoBtn.title = `Undo (Ctrl+Z) — ${battleMapHistory.past.length} step${battleMapHistory.past.length !== 1 ? "s" : ""}`;
  }
  if (redoBtn) {
    redoBtn.disabled = battleMapHistory.future.length === 0;
    redoBtn.style.opacity = battleMapHistory.future.length === 0 ? "0.35" : "1";
    redoBtn.title = `Redo (Ctrl+Y) — ${battleMapHistory.future.length} step${battleMapHistory.future.length !== 1 ? "s" : ""}`;
  }
}

// Helper functions to work with active layer
function getActiveLayer() {
  return (
    battleMap.layers.find((l) => l.id === battleMap.activeLayerId) ||
    battleMap.layers[0]
  );
}

function setActiveLayer(layerId) {
  battleMap.activeLayerId = layerId;
  renderBattleMapControls();
  renderBattleMap();
  saveBattleMapState();
}

// Isometric view coordinate conversion functions
function gridToIsometric(gridX, gridY, cellSize, elevation = 0) {
  // Standard isometric projection (2:1 ratio)
  const tileWidth = cellSize;
  const tileHeight = cellSize / 2;

  const isoX = (gridX - gridY) * (tileWidth / 2);
  const isoY = (gridX + gridY) * (tileHeight / 2) - elevation * tileHeight;

  return { x: isoX, y: isoY };
}

function isometricToGrid(isoX, isoY, cellSize, layer) {
  // Convert from isometric screen coordinates back to grid coordinates
  const tileWidth = cellSize;
  const tileHeight = cellSize / 2;

  // Adjust for the isometric offset to center the map
  const centerOffsetX = (layer.height * tileWidth) / 2;
  const adjustedX = isoX - centerOffsetX;

  const gridX = (adjustedX / (tileWidth / 2) + isoY / (tileHeight / 2)) / 2;
  const gridY = (isoY / (tileHeight / 2) - adjustedX / (tileWidth / 2)) / 2;

  return { x: Math.floor(gridX), y: Math.floor(gridY) };
}

const terrainTypes = {
  wall: { color: "#424242", label: "Wall", passable: false },
  door: { color: "#8B4513", label: "Door", passable: true },
  window: { color: "#87CEEB", label: "Window", passable: false },
  furniture: { color: "#6D4C41", label: "Furniture", passable: false },
  landscape: { color: "#2E7D32", label: "Landscape", passable: true },
  water: { color: "#1976D2", label: "Water", passable: true },
  difficult: { color: "#F9A825", label: "Difficult Terrain", passable: true },
};

const tokenOptions = {
  PC: [
    { emoji: "🎭", label: "Theater Mask" },
    { emoji: "⚔️", label: "Sword" },
    { emoji: "🛡️", label: "Shield" },
    { emoji: "🏹", label: "Bow" },
    { emoji: "🔮", label: "Crystal Ball" },
    { emoji: "📖", label: "Book" },
    { emoji: "🗡️", label: "Dagger" },
    { emoji: "🪄", label: "Wand" },
    { emoji: "👤", label: "Person" },
    { emoji: "🧙", label: "Mage" },
    { emoji: "⚡", label: "Lightning" },
    { emoji: "🌟", label: "Star" },
    { emoji: "🔥", label: "Fire" },
    { emoji: "❄️", label: "Ice" },
    { emoji: "💎", label: "Gem" },
    { emoji: "🏺", label: "Amphora" },
    { emoji: "🎯", label: "Target" },
    { emoji: "🗝️", label: "Key" },
    { emoji: "⚗️", label: "Alchemist" },
    { emoji: "📜", label: "Scroll" },
    { emoji: "🦅", label: "Eagle" },
    { emoji: "🐺", label: "Wolf" },
    { emoji: "🦁", label: "Lion" },
    { emoji: "🐉", label: "Dragon" },
  ],
  NPC: [
    { emoji: "👤", label: "Person" },
    { emoji: "🧑", label: "Adult" },
    { emoji: "👨", label: "Man" },
    { emoji: "👩", label: "Woman" },
    { emoji: "🧓", label: "Elder" },
    { emoji: "👮", label: "Guard" },
    { emoji: "🤴", label: "Noble" },
    { emoji: "🧑‍⚕️", label: "Healer" },
    { emoji: "🧑‍🔬", label: "Scholar" },
    { emoji: "💂", label: "Soldier" },
    { emoji: "🧑‍🌾", label: "Farmer" },
    { emoji: "🧑‍🍳", label: "Cook" },
    { emoji: "🧑‍🎨", label: "Artist" },
    { emoji: "🧑‍⚖️", label: "Judge" },
    { emoji: "👷", label: "Worker" },
    { emoji: "🕵️", label: "Detective" },
    { emoji: "🧑‍🏫", label: "Teacher" },
    { emoji: "🤵", label: "Formal" },
    { emoji: "👰", label: "Bride" },
    { emoji: "🦸", label: "Hero" },
  ],
  Enemy: [
    { emoji: "💀", label: "Skull" },
    { emoji: "👹", label: "Ogre" },
    { emoji: "👁️", label: "Eye" },
    { emoji: "🦷", label: "Tooth" },
    { emoji: "👺", label: "Goblin" },
    { emoji: "👻", label: "Ghost" },
    { emoji: "🐺", label: "Wolf" },
    { emoji: "🦇", label: "Bat" },
    { emoji: "🕷️", label: "Spider" },
    { emoji: "🐍", label: "Snake" },
    { emoji: "🦂", label: "Scorpion" },
    { emoji: "🦴", label: "Skeleton" },
    { emoji: "🧟", label: "Zombie" },
    { emoji: "🧛", label: "Vampire" },
    { emoji: "🔥", label: "Fire" },
    { emoji: "⚡", label: "Lightning" },
    { emoji: "💥", label: "Explosion" },
    { emoji: "🐙", label: "Octopus" },
    { emoji: "🐊", label: "Crocodile" },
    { emoji: "🐻", label: "Bear" },
    { emoji: "🦎", label: "Lizard" },
    { emoji: "🐀", label: "Rat" },
    { emoji: "🦟", label: "Mosquito" },
    { emoji: "🐛", label: "Bug" },
    { emoji: "🦗", label: "Cricket" },
    { emoji: "🕸️", label: "Web" },
    { emoji: "👿", label: "Demon" },
    { emoji: "😈", label: "Devil" },
    { emoji: "👾", label: "Invader" },
    { emoji: "🌑", label: "Dark" },
  ],
};

// ==================== INITIALIZATION ==================== //

function initializeBattleMap() {
  renderBattleMapControls();
  renderBattleMap();
  setupBattleMapEventListeners();
}

/**
 * Initialize Unified Battle Map (in modal)
 */
function initializeUnifiedBattleMap() {
  // Render controls in unified panel
  renderUnifiedBattleMapControls();

  // Render map in unified canvas
  renderUnifiedBattleMap();

  // Setup event listeners for unified view
  setupUnifiedBattleMapEventListeners();
}

// ==================== MODE TOGGLE ==================== //

/**
 * Toggle between Setup Map and Use Map modes
 * @param {string} mode - 'setup' or 'use'
 */
function setBattleMapMode(mode) {
  battleMap.mode = mode;

  // Auto-open the selected mode and close the other
  if (mode === "setup") {
    battleMap.uiState.setupMapOpen = true;
    battleMap.uiState.useMapOpen = false;
  } else {
    battleMap.uiState.setupMapOpen = false;
    battleMap.uiState.useMapOpen = true;
  }

  renderBattleMapControls();
  saveBattleMapState();
}

function setWallDrawMode(mode) {
  battleMap.wallDrawMode = mode;
  updateToolButtonStates();
  renderBattleMapControls();
  saveBattleMapState();
  updateUndoRedoButtons();
}

/**
 * Quick action to show the battle map and switch to a specific mode
 * @param {string} mode - 'setup' or 'use'
 */
function showBattleMapInMode(mode) {
  // Expand battle map if collapsed
  const battleMapContent = document.getElementById("battleMapContent");
  const toggleIcon = document.getElementById("battleMapToggleIcon");

  if (battleMapContent && battleMapContent.style.display === "none") {
    battleMapContent.style.display = "block";
    if (toggleIcon) toggleIcon.textContent = "▼";
  }

  // Set the mode
  setBattleMapMode(mode);

  // Scroll to battle map
  const battleMapSection = document.getElementById("battleMapSection");
  if (battleMapSection) {
    battleMapSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

function renderBattleMapControls() {
  // Save current state of details elements before re-render
  const setupDetails = document.querySelector(
    '.battle-map-controls details[data-section="setupMap"]',
  );
  const useDetails = document.querySelector(
    '.battle-map-controls details[data-section="useMap"]',
  );

  if (setupDetails) battleMap.uiState.setupMapOpen = setupDetails.open;
  if (useDetails) battleMap.uiState.useMapOpen = useDetails.open;

  // Save state of Setup Map subsections
  const mapLayersDetails = document.querySelector(
    '.battle-map-controls details[data-section="mapLayers"]',
  );
  const mapDesignDetails = document.querySelector(
    '.battle-map-controls details[data-section="mapDesign"]',
  );
  const dynamicLightingDetails = document.querySelector(
    '.battle-map-controls details[data-section="dynamicLighting"]',
  );
  const backgroundsDetails = document.querySelector(
    '.battle-map-controls details[data-section="backgrounds"]',
  );
  const saveLoadDetails = document.querySelector(
    '.battle-map-controls details[data-section="saveLoad"]',
  );

  if (mapLayersDetails) battleMap.uiState.mapLayersOpen = mapLayersDetails.open;
  if (mapDesignDetails) battleMap.uiState.mapDesignOpen = mapDesignDetails.open;
  if (dynamicLightingDetails)
    battleMap.uiState.dynamicLightingOpen = dynamicLightingDetails.open;
  if (backgroundsDetails)
    battleMap.uiState.backgroundsOpen = backgroundsDetails.open;
  if (saveLoadDetails) battleMap.uiState.saveLoadOpen = saveLoadDetails.open;

  // Save state of Use Map subsections
  const movementDetails = document.querySelector(
    '.battle-map-controls details[data-section="movement"]',
  );
  const viewControlsDetails = document.querySelector(
    '.battle-map-controls details[data-section="viewControls"]',
  );
  const fogOfWarDetails = document.querySelector(
    '.battle-map-controls details[data-section="fogOfWar"]',
  );
  const areaOfEffectDetails = document.querySelector(
    '.battle-map-controls details[data-section="areaOfEffect"]',
  );
  const gridMovementDetails = document.querySelector(
    '.battle-map-controls details[data-section="gridMovement"]',
  );

  if (movementDetails) battleMap.uiState.movementOpen = movementDetails.open;
  if (viewControlsDetails)
    battleMap.uiState.viewControlsOpen = viewControlsDetails.open;
  if (fogOfWarDetails) battleMap.uiState.fogOfWarOpen = fogOfWarDetails.open;
  if (areaOfEffectDetails)
    battleMap.uiState.areaOfEffectOpen = areaOfEffectDetails.open;
  if (gridMovementDetails)
    battleMap.uiState.gridMovementOpen = gridMovementDetails.open;

  const controlsHTML = `
    <div class="battle-map-controls" style="margin-bottom: 15px;">
      
      <!-- Setup Map Section -->
      <details ${
        battleMap.mode === "setup" ? "open" : ""
      } data-section="setupMap" style="margin-bottom: 10px;">
        <summary style="padding: 12px 15px; cursor: pointer; font-weight: bold; color: ${battleMap.mode === "setup" ? "#4caf50" : "#888"}; user-select: none; list-style: none;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="details-arrow" style="font-size: 0.8em; transition: transform 0.2s;">▶</span>
            🛠️ Setup Map
          </div>
        </summary>
        <div style="padding: 15px 15px 15px 0;">
          
          <!-- Map Layers (Collapsible) -->
          <details ${
            battleMap.uiState.mapLayersOpen ? "open" : ""
          } data-section="mapLayers" style="margin-bottom: 10px; background: rgba(33, 150, 243, 0.05); border: 1px solid #2196F3; border-radius: 6px;">
            <summary style="padding: 10px; cursor: pointer; color: #64B5F6; font-size: 0.9em; font-weight: bold; user-select: none;">
              🗂️ Map Layers
            </summary>
            <div style="padding: 10px; padding-top: 0;">
              <div style="display: flex; gap: 5px; margin-bottom: 8px; flex-wrap: wrap;">
                ${battleMap.layers
                  .map(
                    (layer) => `
                  <button class="button ${
                    layer.id === battleMap.activeLayerId ? "primary-button" : ""
                  }" 
                    onclick="setActiveLayer(${layer.id})" 
                    style="flex: 1; min-width: 80px; padding: 6px; font-size: 0.85em;">
                    ${layer.name}
                  </button>
                `,
                  )
                  .join("")}
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px;">
                <button class="button" onclick="addNewLayer()" style="padding: 5px; font-size: 0.7em; background: rgba(76, 175, 80, 0.2); border-color: #4caf50;">
                  ➕ Add
                </button>
                <button class="button" onclick="renameActiveLayer()" style="padding: 5px; font-size: 0.7em;">
                  ✏️
                </button>
                <button class="button" onclick="deleteActiveLayer()" style="padding: 5px; font-size: 0.7em; background: rgba(211, 47, 47, 0.2); border-color: #d32f2f;" ${
                  battleMap.layers.length === 1 ? "disabled" : ""
                }>
                  🗑️
                </button>
              </div>
            </div>
          </details>
          
          <!-- Map Design (Collapsible) -->
          <details ${
            battleMap.uiState.mapDesignOpen ? "open" : ""
          } data-section="mapDesign" style="margin-bottom: 10px; background: rgba(76, 175, 80, 0.05); border: 1px solid #4caf50; border-radius: 6px;">
            <summary style="padding: 10px; cursor: pointer; color: #81C784; font-size: 0.9em; font-weight: bold; user-select: none;">
              📐 Map Design
            </summary>
            <div style="padding: 10px; padding-top: 5px;">
              <!-- Map Dimensions -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                <div>
                  <label style="display: block; margin-bottom: 5px; color: #ccc; font-size: 0.85em;">Width (metres)</label>
                  <input type="number" id="mapWidth" value="${
                    getActiveLayer().width
                  }" min="5" max="50" 
                    onchange="updateMapSize()" 
                    style="width: 100%; padding: 6px; background: rgba(0, 0, 0, 0.3); border: 1px solid #4caf50; border-radius: 4px; color: #e0e0e0;">
                </div>
                <div>
                  <label style="display: block; margin-bottom: 5px; color: #ccc; font-size: 0.85em;">Height (metres)</label>
                  <input type="number" id="mapHeight" value="${
                    getActiveLayer().height
                  }" min="5" max="50" 
                    onchange="updateMapSize()" 
                    style="width: 100%; padding: 6px; background: rgba(0, 0, 0, 0.3); border: 1px solid #4caf50; border-radius: 4px; color: #e0e0e0;">
                </div>
              </div>

              <!-- Terrain Tools -->
              <label style="display: block; margin-bottom: 4px; color: #aaa; font-size: 0.75em;">Terrain</label>
              
              <!-- Wall Draw Mode Toggle -->
              <div style="display: flex; gap: 4px; margin-bottom: 6px; padding: 4px; background: rgba(0, 0, 0, 0.3); border-radius: 4px;">
                <button 
                  class="button ${battleMap.wallDrawMode === "square" ? "primary-button" : ""}" 
                  onclick="setWallDrawMode('square')" 
                  style="flex: 1; padding: 4px; font-size: 0.65em; ${battleMap.wallDrawMode === "square" ? "box-shadow: 0 0 8px rgba(76, 175, 80, 0.4);" : "opacity: 0.6;"}"
                  title="Fill entire grid squares">
                  ⬛ Square
                </button>
                <button 
                  class="button ${battleMap.wallDrawMode === "edge" ? "primary-button" : ""}" 
                  onclick="setWallDrawMode('edge')" 
                  style="flex: 1; padding: 4px; font-size: 0.65em; ${battleMap.wallDrawMode === "edge" ? "box-shadow: 0 0 8px rgba(76, 175, 80, 0.4);" : "opacity: 0.6;"}"
                  title="Draw walls on cell edges">
                  ⬜ Edge
                </button>
              </div>
              
              <!-- Undo / Redo -->
              <div style="display: flex; gap: 4px; margin-bottom: 6px;">
                <button 
                  id="bmUndoBtn"
                  onclick="undoBattleMapAction()"
                  ${battleMapHistory.past.length === 0 ? "disabled" : ""}
                  style="flex: 1; padding: 5px 4px; font-size: 0.7em; background: rgba(33, 150, 243, 0.15); border: 1px solid #2196f3; border-radius: 4px; color: #90CAF9; cursor: pointer; opacity: ${battleMapHistory.past.length === 0 ? "0.35" : "1"};"
                  title="Undo (Ctrl+Z) &mdash; ${battleMapHistory.past.length} step${battleMapHistory.past.length !== 1 ? "s" : ""}"
                >
                  ↩ Undo
                </button>
                <button 
                  id="bmRedoBtn"
                  onclick="redoBattleMapAction()"
                  ${battleMapHistory.future.length === 0 ? "disabled" : ""}
                  style="flex: 1; padding: 5px 4px; font-size: 0.7em; background: rgba(33, 150, 243, 0.15); border: 1px solid #2196f3; border-radius: 4px; color: #90CAF9; cursor: pointer; opacity: ${battleMapHistory.future.length === 0 ? "0.35" : "1"};"
                  title="Redo (Ctrl+Y) &mdash; ${battleMapHistory.future.length} step${battleMapHistory.future.length !== 1 ? "s" : ""}"
                >
                  ↪ Redo
                </button>
              </div>
              
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; margin-bottom: 6px;">
                <button class="tool-button ${
                  battleMap.selectedTool === "wall" ? "active" : ""
                }" 
                  onclick="selectBattleMapTool('wall')" 
                  title="Wall"
                  style="padding: 5px; background: rgba(102, 102, 102, 0.2); border: 1px solid #666; border-radius: 4px; color: #999; cursor: pointer; font-size: 0.65em; display: flex; flex-direction: column; align-items: center; gap: 2px;">
                  <span style="font-size: 1.2em;">🧱</span>
                  <span style="font-size: 0.85em;">Wall</span>
                </button>
                <button class="tool-button ${
                  battleMap.selectedTool === "door" ? "active" : ""
                }" 
                  onclick="selectBattleMapTool('door')" 
                  title="Door"
                  style="padding: 5px; background: rgba(139, 69, 19, 0.2); border: 1px solid #8B4513; border-radius: 4px; color: #CD853F; cursor: pointer; font-size: 0.65em; display: flex; flex-direction: column; align-items: center; gap: 2px;">
                  <span style="font-size: 1.2em;">🚪</span>
                  <span style="font-size: 0.85em;">Door</span>
                </button>
                <button class="tool-button ${
                  battleMap.selectedTool === "window" ? "active" : ""
                }" 
                  onclick="selectBattleMapTool('window')" 
                  title="Window"
                  style="padding: 5px; background: rgba(135, 206, 235, 0.2); border: 1px solid #87CEEB; border-radius: 4px; color: #ADD8E6; cursor: pointer; font-size: 0.65em; display: flex; flex-direction: column; align-items: center; gap: 2px;">
                  <span style="font-size: 1.2em;">🪟</span>
                  <span style="font-size: 0.85em;">Window</span>
                </button>
                <button class="tool-button ${
                  battleMap.selectedTool === "furniture" ? "active" : ""
                }" 
                  onclick="selectBattleMapTool('furniture')" 
                  title="Furniture"
                  style="padding: 5px; background: rgba(139, 69, 19, 0.2); border: 1px solid #8B4513; border-radius: 4px; color: #A0522D; cursor: pointer; font-size: 0.65em; display: flex; flex-direction: column; align-items: center; gap: 2px;">
                  <span style="font-size: 1.2em;">🪑</span>
                  <span style="font-size: 0.85em;">Furniture</span>
                </button>
                <button class="tool-button ${
                  battleMap.selectedTool === "landscape" ? "active" : ""
                }" 
                  onclick="selectBattleMapTool('landscape')" 
                  title="Landscape"
                  style="padding: 5px; background: rgba(46, 125, 50, 0.2); border: 1px solid #2E7D32; border-radius: 4px; color: #4CAF50; cursor: pointer; font-size: 0.65em; display: flex; flex-direction: column; align-items: center; gap: 2px;">
                  <span style="font-size: 1.2em;">🌳</span>
                  <span style="font-size: 0.85em;">Landscape</span>
                </button>
                <button class="tool-button ${
                  battleMap.selectedTool === "water" ? "active" : ""
                }" 
                  onclick="selectBattleMapTool('water')" 
                  title="Water"
                  style="padding: 5px; background: rgba(25, 118, 210, 0.2); border: 1px solid #1976D2; border-radius: 4px; color: #42A5F5; cursor: pointer; font-size: 0.65em; display: flex; flex-direction: column; align-items: center; gap: 2px;">
                  <span style="font-size: 1.2em;">💧</span>
                  <span style="font-size: 0.85em;">Water</span>
                </button>
                <button class="tool-button ${
                  battleMap.selectedTool === "difficult" ? "active" : ""
                }" 
                  onclick="selectBattleMapTool('difficult')" 
                  title="Difficult Terrain"
                  style="padding: 5px; background: rgba(255, 111, 0, 0.2); border: 1px solid #FF6F00; border-radius: 4px; color: #FF9800; cursor: pointer; font-size: 0.65em; display: flex; flex-direction: column; align-items: center; gap: 2px;">
                  <span style="font-size: 1.2em;">⚠️</span>
                  <span style="font-size: 0.85em;">Difficult</span>
                </button>
                <button class="tool-button ${
                  battleMap.selectedTool === "erase" ? "active" : ""
                }" 
                  onclick="selectBattleMapTool('erase')" 
                  title="Erase"
                  style="padding: 5px; background: rgba(211, 47, 47, 0.2); border: 1px solid #d32f2f; border-radius: 4px; color: #f44336; cursor: pointer; font-size: 0.65em; display: flex; flex-direction: column; align-items: center; gap: 2px;">
                  <span style="font-size: 1.2em;">🗑️</span>
                  <span style="font-size: 0.85em;">Erase</span>
                </button>
              </div>
              <button class="button" onclick="clearBattleMapTerrain()" style="padding: 6px; width: 100%; background: rgba(211, 47, 47, 0.2); border-color: #d32f2f; font-size: 0.75em;">
                Clear All Terrain
              </button>
            </div>
          </details>

          <!-- Dynamic Lighting (Collapsible) -->
          <details ${
            battleMap.uiState.dynamicLightingOpen ? "open" : ""
          } data-section="dynamicLighting" style="margin-bottom: 10px; background: rgba(255, 235, 59, 0.05); border: 1px solid #FFEB3B; border-radius: 6px;">
            <summary style="padding: 10px; cursor: pointer; color: #FFF59D; font-size: 0.9em; font-weight: bold; user-select: none;">
              💡 Dynamic Lighting
            </summary>
            <div style="padding: 10px; padding-top: 5px;">
              <!-- Lighting controls -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 6px;">
                <button class="tool-button ${
                  battleMap.selectedLightTool === "light" ? "active" : ""
                }" 
                  onclick="selectLightTool()" 
                  style="padding: 6px; background: rgba(255, 235, 59, 0.2); border: 2px solid #FFEB3B; border-radius: 4px; color: #FFF59D; cursor: pointer; font-weight: bold; font-size: 0.7em;">
                  ${
                    battleMap.selectedLightTool === "light"
                      ? "🔆 Active"
                      : "💡 Place"
                  }
                </button>
                <button class="button" onclick="clearAllLights()" style="padding: 6px; background: rgba(211, 47, 47, 0.2); border-color: #d32f2f; font-size: 0.7em;" ${
                  (getActiveLayer().lights || []).length === 0 ? "disabled" : ""
                }>
                  Clear
                </button>
              </div>
              <div style="margin-bottom: 6px;">
                <label style="font-size: 0.7em; color: #aaa;">Color:</label>
                <input type="color" id="lightColor" value="${
                  battleMap.defaultLightColor
                }" 
                  oninput="updateLightColor(this.value)" 
                  style="width: 100%; height: 30px; border: 1px solid #FFEB3B; border-radius: 4px; cursor: pointer;"
                  title="Light Color">
              </div>
              
              <!-- Light Radius and Intensity -->
              <div style="margin-bottom: 8px;">
                <label style="display: block; margin-bottom: 3px; color: #aaa; font-size: 0.8em;">Radius: <span id="lightRadiusValue">${
                  battleMap.defaultLightRadius
                }</span> squares</label>
                <input type="range" id="lightRadius" min="1" max="15" value="${
                  battleMap.defaultLightRadius
                }" 
                  oninput="updateLightRadius(this.value)" 
                  style="width: 100%; accent-color: #FFEB3B;">
              </div>
              <div>
                <label style="display: block; margin-bottom: 3px; color: #aaa; font-size: 0.8em;">Intensity: <span id="lightIntensityValue">${Math.round(
                  battleMap.defaultLightIntensity * 100,
                )}%</span></label>
                <input type="range" id="lightIntensity" min="0" max="100" value="${
                  battleMap.defaultLightIntensity * 100
                }" 
                  oninput="updateLightIntensity(this.value)" 
                  style="width: 100%; accent-color: #FFEB3B;">
              </div>
            </div>
          </details>

          <!-- Backgrounds and Maps (Collapsible) -->
          <details ${
            battleMap.uiState.backgroundsOpen ? "open" : ""
          } data-section="backgrounds" style="margin-bottom: 10px; background: rgba(156, 39, 176, 0.05); border: 1px solid #9C27B0; border-radius: 6px;">
            <summary style="padding: 10px; cursor: pointer; color: #BA68C8; font-size: 0.9em; font-weight: bold; user-select: none;">
              🖼️ Backgrounds and Maps
            </summary>
            <div style="padding: 10px; padding-top: 5px;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
                <button class="button" onclick="uploadBackgroundImage()" style="padding: 6px; font-size: 0.75em;">
                  📤 Upload
                </button>
                <button class="button" onclick="clearBackgroundImage()" style="padding: 6px; background: rgba(211, 47, 47, 0.2); border-color: #d32f2f; font-size: 0.75em;" ${
                  !getActiveLayer().backgroundImage ? "disabled" : ""
                }>
                  Clear
                </button>
              </div>
            </div>
          </details>

          <!-- Save/Load (Collapsible) -->
          <details ${
            battleMap.uiState.saveLoadOpen ? "open" : ""
          } data-section="saveLoad" style="margin-bottom: 10px; background: rgba(33, 150, 243, 0.05); border: 1px solid #2196F3; border-radius: 6px;">
            <summary style="padding: 10px; cursor: pointer; color: #64B5F6; font-size: 0.9em; font-weight: bold; user-select: none;">
              💾 Save/Load
            </summary>
            <div style="padding: 10px; padding-top: 5px;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
                <button class="button primary-button" onclick="saveBattleMapPreset()" style="padding: 6px; font-size: 0.75em;">
                  💾 Save
                </button>
                <button class="button" onclick="loadBattleMapPreset()" style="padding: 6px; font-size: 0.75em;">
                  📂 Load
                </button>
              </div>
            </div>
          </details>
          
        </div>
      </details>
      
    </div>

    <div class="battle-map-controls" style="margin-bottom: 15px;">
      
      <!-- Use Map Section -->
      <details ${
        battleMap.mode === "use" ? "open" : ""
      } data-section="useMap" style="margin-bottom: 10px;">
        <summary style="padding: 12px 15px; cursor: pointer; font-weight: bold; color: ${battleMap.mode === "use" ? "#4caf50" : "#888"}; user-select: none; list-style: none;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="details-arrow" style="font-size: 0.8em; transition: transform 0.2s;">▶</span>
            🎮 Use Map
          </div>
        </summary>
        <div style="padding: 15px 15px 15px 0;">
          
          <!-- Active Layer Switcher -->
          ${
            battleMap.layers.length > 1
              ? `<div style="margin-bottom: 15px; padding: 10px; background: rgba(33, 150, 243, 0.1); border: 1px solid #2196F3; border-radius: 6px;">
            <label style="display: block; margin-bottom: 8px; color: #64B5F6; font-size: 0.9em; font-weight: bold;">🗺️ Active Layer</label>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 5px;">
              ${battleMap.layers
                .map(
                  (layer) => `
                <button class="button ${
                  layer.id === battleMap.activeLayerId ? "primary-button" : ""
                }" 
                  onclick="event.stopPropagation(); setActiveLayer(${layer.id})" 
                  style="padding: 8px; font-size: 0.85em; ${
                    layer.id === battleMap.activeLayerId
                      ? "background: rgba(76, 175, 80, 0.3); border-color: #4caf50;"
                      : ""
                  }">
                  ${layer.name || "Layer " + layer.id}
                </button>
              `,
                )
                .join("")}
            </div>
          </div>`
              : ""
          }
          
          <!-- Movement (Collapsible) -->
          <details ${
            battleMap.uiState.movementOpen ? "open" : ""
          } data-section="movement" style="margin-bottom: 8px; background: rgba(76, 175, 80, 0.05); border: 1px solid #4caf50; border-radius: 6px;">
            <summary style="padding: 8px; cursor: pointer; color: #81C784; font-size: 0.85em; font-weight: bold; user-select: none;">
              🖐️ Movement
            </summary>
            <div style="padding: 8px; padding-top: 5px;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
                <button class="tool-button ${
                  battleMap.selectedTool === "move" ? "active" : ""
                }" 
                  onclick="selectBattleMapTool('move')" 
                  style="padding: 5px; background: rgba(76, 175, 80, 0.2); border: 1px solid #4caf50; border-radius: 4px; color: #4caf50; cursor: pointer; font-size: 0.7em;">
                  🖐️ Move
                </button>
                <button class="tool-button ${
                  battleMap.selectedTool === "rotate" ? "active" : ""
                }" 
                  onclick="selectBattleMapTool('rotate')" 
                  style="padding: 5px; background: rgba(255, 152, 0, 0.2); border: 1px solid #FF9800; border-radius: 4px; color: #FFB74D; cursor: pointer; font-size: 0.7em;">
                  🔄 Rotate
                </button>
                <button class="tool-button ${
                  battleMap.selectedTool === "elevation" ? "active" : ""
                }" 
                  onclick="selectBattleMapTool('elevation')" 
                  style="padding: 5px; background: rgba(33, 150, 243, 0.2); border: 1px solid #2196F3; border-radius: 4px; color: #64B5F6; cursor: pointer; font-size: 0.7em;">
                  ⬆️ Elev
                </button>
                <button class="tool-button ${
                  battleMap.selectedTool === "measure" ? "active" : ""
                }" 
                  onclick="selectBattleMapTool('measure')" 
                  style="padding: 5px; background: rgba(156, 39, 176, 0.2); border: 1px solid #9C27B0; border-radius: 4px; color: #BA68C8; cursor: pointer; font-size: 0.7em;">
                  📏 Measure
                </button>
              </div>
            </div>
          </details>

          <!-- View Controls (Collapsible) -->
          <details ${
            battleMap.uiState.viewControlsOpen ? "open" : ""
          } data-section="viewControls" style="margin-bottom: 8px; background: rgba(33, 150, 243, 0.05); border: 1px solid #2196F3; border-radius: 6px;">
            <summary style="padding: 8px; cursor: pointer; color: #64B5F6; font-size: 0.85em; font-weight: bold; user-select: none;">
              👁️ View Controls
            </summary>
            <div style="padding: 8px; padding-top: 5px;">
              <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; margin-bottom: 4px;">
                <button class="button" onclick="zoomBattleMap(0.1)" style="padding: 5px; font-size: 0.7em;">➕ In</button>
                <button class="button" onclick="zoomBattleMap(-0.1)" style="padding: 5px; font-size: 0.7em;">➖ Out</button>
                <button class="button" onclick="resetBattleMapZoom()" style="padding: 5px; font-size: 0.7em;">↻ Reset</button>
                <button class="button" onclick="fitBattleMapToScreen()" style="padding: 5px; font-size: 0.7em;">⛶ Fit</button>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px; margin-bottom: 4px;">
                <button class="button ${
                  battleMap.showNames ? "primary-button" : ""
                }" onclick="event.stopPropagation(); toggleNames()" style="padding: 5px; font-size: 0.7em;">
                  ${battleMap.showNames ? "👁️" : "👁️‍🗨️"}
                </button>
                <button class="button ${
                  battleMap.showLineOfSight ? "primary-button" : ""
                }" onclick="event.stopPropagation(); toggleLineOfSight()" style="padding: 5px; font-size: 0.7em;">
                  🔦
                </button>
                <button class="button ${
                  battleMap.viewMode === "isometric" ? "primary-button" : ""
                }" onclick="event.stopPropagation(); toggleViewMode()" style="padding: 5px; font-size: 0.7em;">
                  ${battleMap.viewMode === "isometric" ? "Iso" : "2D"}
                </button>
              </div>
              <div>
                <button class="button" onclick="toggleKeyboardHelp()" style="padding: 5px; font-size: 0.7em; width: 100%;">
                  ⌨️ Keys
                </button>
              </div>
            </div>
          </details>

          <!-- Fog of War (Collapsible) -->
          <details ${
            battleMap.uiState.fogOfWarOpen ? "open" : ""
          } data-section="fogOfWar" style="margin-bottom: 8px; background: rgba(158, 158, 158, 0.05); border: 1px solid #9E9E9E; border-radius: 6px;">
            <summary style="padding: 8px; cursor: pointer; color: #BDBDBD; font-size: 0.85em; font-weight: bold; user-select: none;">
              🌫️ Fog of War
            </summary>
            <div style="padding: 8px; padding-top: 5px;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 6px;">
                <button class="button ${
                  battleMap.fogOfWar.enabled ? "primary-button" : ""
                }" onclick="toggleFogOfWar()" style="padding: 5px; font-size: 0.7em;">
                  ${battleMap.fogOfWar.enabled ? "ON" : "OFF"}
                </button>
                <button class="button" onclick="clearFogOfWar()" style="padding: 5px; font-size: 0.7em;" ${
                  !battleMap.fogOfWar.enabled ? "disabled" : ""
                }>
                  Reset
                </button>
              </div>
              <div style="margin-bottom: 6px;" ${
                !battleMap.fogOfWar.enabled
                  ? "opacity: 0.5; pointer-events: none;"
                  : ""
              }>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 6px;">
                  <button class="button ${
                    battleMap.fogOfWar.mode === "lineOfSight"
                      ? "primary-button"
                      : ""
                  }" onclick="event.stopPropagation(); setFogOfWarMode('lineOfSight')" style="padding: 5px; font-size: 0.65em;">
                    👁️ Line
                  </button>
                  <button class="button ${
                    battleMap.fogOfWar.mode === "exploration"
                      ? "primary-button"
                      : ""
                  }" onclick="event.stopPropagation(); setFogOfWarMode('exploration')" style="padding: 5px; font-size: 0.65em;">
                    🗺️ Explore
                  </button>
                </div>
                <label style="display: block; margin-bottom: 3px; color: #aaa; font-size: 0.75em;">
                  Vision: <span id="fogVisionValue">${
                    battleMap.fogOfWar.visionDistance
                  }</span> squares
                </label>
                <input type="range" id="fogVisionSlider" min="1" max="15" value="${
                  battleMap.fogOfWar.visionDistance
                }" 
                  oninput="updateFogVisionDistance(this.value)" 
                  style="width: 100%; accent-color: #4caf50; margin-bottom: 6px;">
                <label style="display: block; margin-bottom: 3px; color: #aaa; font-size: 0.75em;">
                  💡 Light Transparency: <span id="fogLightTransparencyValue">${Math.round(
                    battleMap.fogOfWar.lightTransparency * 100,
                  )}%</span>
                </label>
                <input type="range" id="fogLightTransparency" min="0" max="100" value="${
                  battleMap.fogOfWar.lightTransparency * 100
                }" 
                  oninput="updateFogLightTransparency(this.value)" 
                  style="width: 100%; accent-color: #FFEB3B;">
              </div>
            </div>
          </details>

          <!-- Area of Effect (Collapsible) -->
          <details ${
            battleMap.uiState.areaOfEffectOpen ? "open" : ""
          } data-section="areaOfEffect" style="margin-bottom: 8px; background: rgba(255, 87, 34, 0.05); border: 1px solid #FF5722; border-radius: 6px;">
            <summary style="padding: 8px; cursor: pointer; color: #FF8A65; font-size: 0.85em; font-weight: bold; user-select: none;">
              💥 Area of Effect
            </summary>
            <div style="padding: 8px; padding-top: 5px;">
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px; margin-bottom: 6px;">
                <button class="tool-button ${
                  battleMap.selectedAoeTool === "circle" ? "active" : ""
                }" 
                  onclick="selectAoeTool('circle')" 
                  style="padding: 5px; background: rgba(255, 87, 34, 0.2); border: 1px solid ${
                    battleMap.selectedAoeTool === "circle" ? "#FF5722" : "#555"
                  }; border-radius: 4px; color: #FF8A65; cursor: pointer; font-size: 0.7em;">
                  🔴
                </button>
                <button class="tool-button ${
                  battleMap.selectedAoeTool === "cone" ? "active" : ""
                }" 
                  onclick="selectAoeTool('cone')" 
                  style="padding: 5px; background: rgba(255, 152, 0, 0.2); border: 1px solid ${
                    battleMap.selectedAoeTool === "cone" ? "#FF9800" : "#555"
                  }; border-radius: 4px; color: #FFB74D; cursor: pointer; font-size: 0.7em;">
                  🔶
                </button>
                <button class="tool-button ${
                  battleMap.selectedAoeTool === "line" ? "active" : ""
                }" 
                  onclick="selectAoeTool('line')" 
                  style="padding: 5px; background: rgba(33, 150, 243, 0.2); border: 1px solid ${
                    battleMap.selectedAoeTool === "line" ? "#2196F3" : "#555"
                  }; border-radius: 4px; color: #64B5F6; cursor: pointer; font-size: 0.7em;">
                  ➖
                </button>
                <button class="tool-button ${
                  battleMap.selectedAoeTool === "square" ? "active" : ""
                }" 
                  onclick="selectAoeTool('square')" 
                  style="padding: 5px; background: rgba(156, 39, 176, 0.2); border: 1px solid ${
                    battleMap.selectedAoeTool === "square" ? "#9C27B0" : "#555"
                  }; border-radius: 4px; color: #BA68C8; cursor: pointer; font-size: 0.7em;">
                  ⬛
                </button>
              </div>
              ${
                battleMap.selectedAoeTool
                  ? `<div style="padding: 6px; background: rgba(255, 87, 34, 0.1); border: 1px solid #FF5722; border-radius: 4px;">
                ${
                  battleMap.aoePlacementMode
                    ? `<div style="padding: 6px; background: rgba(76, 175, 80, 0.2); border: 1px solid #4caf50; border-radius: 4px; margin-bottom: 6px; text-align: center;">
                  <div style="color: #4caf50; font-weight: bold; font-size: 0.75em;">🎯 Placement Active</div>
                  <div style="color: #81C784; font-size: 0.7em;">Click map to place</div>
                </div>`
                    : ""
                }
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                  <label style="color: #FF8A65; font-size: 0.75em; flex-shrink: 0;">${
                    battleMap.selectedAoeTool === "cone" ? "Length:" : "Size:"
                  }</label>
                  <input type="range" min="1" max="10" value="${
                    battleMap.aoeSize
                  }" 
                    oninput="updateAoeSize(this.value)"
                    style="flex-grow: 1;">
                  <span style="color: #FF8A65; font-size: 0.75em; min-width: 50px;">${
                    battleMap.aoeSize
                  } sq</span>
                </div>
                ${
                  battleMap.selectedAoeTool === "cone"
                    ? `<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                  <label style="color: #FF8A65; font-size: 0.75em; flex-shrink: 0;">Width:</label>
                  <input type="range" min="1" max="10" value="${battleMap.aoeConeWidth}" 
                    oninput="updateAoeConeWidth(this.value)"
                    style="flex-grow: 1;">
                  <span style="color: #FF8A65; font-size: 0.75em; min-width: 50px;">${battleMap.aoeConeWidth} sq</span>
                </div>`
                    : ""
                }
              <div style="display: flex; gap: 4px;">
                <button class="button ${
                  battleMap.aoePlacementMode ? "primary-button" : ""
                }" onclick="toggleAoePlacement()" style="flex: 1; padding: 5px; font-size: 0.7em; background: rgba(76, 175, 80, 0.2); border-color: #4caf50;">
                  ${battleMap.aoePlacementMode ? "❌" : "📍 Place"}
                </button>
                <button class="button" onclick="clearAoeTemplates()" style="flex: 1; padding: 5px; font-size: 0.7em; background: rgba(211, 47, 47, 0.2); border-color: #d32f2f;">
                  Clear
                </button>
              </div>
            </div>`
                  : ""
              }
          </details>

          <!-- Grid & Movement Options (Collapsible) -->
          <details ${
            battleMap.uiState.gridMovementOpen ? "open" : ""
          } data-section="gridMovement" style="margin-bottom: 8px; background: rgba(158, 158, 158, 0.05); border: 1px solid #757575; border-radius: 6px;">
            <summary style="padding: 8px; cursor: pointer; color: #BDBDBD; font-size: 0.85em; font-weight: bold; user-select: none;">
              ⚙️ Grid & Movement Options
            </summary>
            <div style="padding: 8px; padding-top: 5px;">
              
              <!-- Snap Mode -->
              <div style="margin-bottom: 6px;">
                <label style="display: block; margin-bottom: 3px; color: #aaa; font-size: 0.75em;">Snap Mode:</label>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 5px;">
                  <button class="button ${
                    battleMap.snapMode === "full" ? "primary-button" : ""
                  }" onclick="event.stopPropagation(); setSnapMode('full')" style="padding: 5px; font-size: 0.7em;">
                    Full Grid
                  </button>
                  <button class="button ${
                    battleMap.snapMode === "half" ? "primary-button" : ""
                  }" onclick="event.stopPropagation(); setSnapMode('half')" style="padding: 5px; font-size: 0.7em;">
                    Half Grid
                  </button>
                  <button class="button ${
                    battleMap.snapMode === "free" ? "primary-button" : ""
                  }" onclick="event.stopPropagation(); setSnapMode('free')" style="padding: 5px; font-size: 0.7em;">
                    Free
                  </button>
                </div>
              </div>

              <!-- Snap Type -->
              <div style="margin-bottom: 6px;">
                <label style="display: block; margin-bottom: 3px; color: #aaa; font-size: 0.75em;">Snap To:</label>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">
                  <button class="button ${
                    battleMap.snapType === "center" ? "primary-button" : ""
                  }" onclick="event.stopPropagation(); setSnapType('center')" style="padding: 5px; font-size: 0.7em;">
                    Center
                  </button>
                  <button class="button ${
                    battleMap.snapType === "corner" ? "primary-button" : ""
                  }" onclick="event.stopPropagation(); setSnapType('corner')" style="padding: 5px; font-size: 0.7em;">
                    Corner
                  </button>
                </div>
              </div>

              <!-- Show Distance -->
              <div style="margin-bottom: 6px;">
                <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; color: #aaa; font-size: 0.75em;">
                  <input type="checkbox" ${
                    battleMap.showMoveDistance ? "checked" : ""
                  } onchange="event.stopPropagation(); toggleMoveDistance()" style="cursor: pointer;">
                  <span>Show Distance When Moving</span>
                </label>
              </div>

              <!-- Combatant Size (when selected) -->
              ${
                battleMap.selectedCombatant
                  ? `<div>
                <label style="display: block; margin-bottom: 3px; color: #aaa; font-size: 0.75em;">Combatant Size:</label>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px; margin-bottom: 6px;">
                  <button class="button ${
                    (battleMap.combatantSizes[battleMap.selectedCombatant] ||
                      1) === 1
                      ? "primary-button"
                      : ""
                  }" onclick="event.stopPropagation(); setCombatantSize(${
                    battleMap.selectedCombatant
                  }, 1)" style="padding: 5px; font-size: 0.65em;">
                    Medium
                  </button>
                  <button class="button ${
                    (battleMap.combatantSizes[battleMap.selectedCombatant] ||
                      1) === 2
                      ? "primary-button"
                      : ""
                  }" onclick="event.stopPropagation(); setCombatantSize(${
                    battleMap.selectedCombatant
                  }, 2)" style="padding: 5px; font-size: 0.65em;">
                    Large
                  </button>
                  <button class="button ${
                    (battleMap.combatantSizes[battleMap.selectedCombatant] ||
                      1) === 3
                      ? "primary-button"
                      : ""
                  }" onclick="event.stopPropagation(); setCombatantSize(${
                    battleMap.selectedCombatant
                  }, 3)" style="padding: 5px; font-size: 0.65em;">
                    Huge
                  </button>
                  <button class="button ${
                    (battleMap.combatantSizes[battleMap.selectedCombatant] ||
                      1) === 4
                      ? "primary-button"
                      : ""
                  }" onclick="event.stopPropagation(); setCombatantSize(${
                    battleMap.selectedCombatant
                  }, 4)" style="padding: 5px; font-size: 0.65em;">
                    Garg
                  </button>
                </div>
                <div>
                  <label style="display: block; margin-bottom: 3px; color: #aaa; font-size: 0.75em;">Elevation:</label>
                  <div style="display: flex; gap: 5px; align-items: center;">
                    <button class="button" onclick="event.stopPropagation(); adjustElevation(${
                      battleMap.selectedCombatant
                    }, -1)" style="padding: 5px; font-size: 0.75em;">⬇️</button>
                    <input type="number" value="${
                      battleMap.combatantElevations[
                        battleMap.selectedCombatant
                      ] || 0
                    }" onchange="event.stopPropagation(); setElevation(${
                      battleMap.selectedCombatant
                    }, this.value)" style="flex: 1; padding: 5px; background: rgba(0,0,0,0.5); border: 1px solid #555; color: #fff; text-align: center; border-radius: 4px; font-size: 0.75em;">
                    <button class="button" onclick="event.stopPropagation(); adjustElevation(${
                      battleMap.selectedCombatant
                    }, 1)" style="padding: 5px; font-size: 0.75em;">⬆️</button>
                  </div>
                </div>
              </div>`
                  : ""
              }
            </div>
          </details>

          <!-- Rotation Controls (when rotate tool active or combatant selected) -->
          <div id="rotationControls" style="padding: 10px; background: rgba(255, 152, 0, 0.1); border: 1px solid #FF9800; border-radius: 6px; display: ${
            battleMap.selectedTool === "rotate" || battleMap.selectedCombatant
              ? "block"
              : "none"
          };">
            <label style="display: block; margin-bottom: 8px; color: #FFB74D; font-size: 0.9em; font-weight: bold;">🔄 Rotate Combatant</label>
            ${
              battleMap.selectedTool === "rotate" &&
              !battleMap.selectedCombatant
                ? '<p style="color: #FFB74D; font-size: 0.85em; margin: 0 0 8px 0; font-style: italic;">Click a combatant on the map to rotate them</p>'
                : ""
            }
            <div style="display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 8px;">
              <button class="button" onclick="rotateCombatant(45)" style="flex: 1; min-width: 70px; padding: 6px; font-size: 0.85em;" ${
                !battleMap.selectedCombatant ? "disabled" : ""
              }>↻ 45°</button>
              <button class="button" onclick="rotateCombatant(-45)" style="flex: 1; min-width: 70px; padding: 6px; font-size: 0.85em;" ${
                !battleMap.selectedCombatant ? "disabled" : ""
              }>↺ -45°</button>
              <button class="button" onclick="rotateCombatant(90)" style="flex: 1; min-width: 70px; padding: 6px; font-size: 0.85em;" ${
                !battleMap.selectedCombatant ? "disabled" : ""
              }>↻ 90°</button>
              <button class="button" onclick="rotateCombatant(-90)" style="flex: 1; min-width: 70px; padding: 6px; font-size: 0.85em;" ${
                !battleMap.selectedCombatant ? "disabled" : ""
              }>↺ -90°</button>
            </div>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; margin-bottom: 8px;">
              <button class="button" onclick="setCombatantFacing(0)" style="padding: 6px; font-size: 0.85em;" ${
                !battleMap.selectedCombatant ? "disabled" : ""
              }>⬆️ N</button>
              <button class="button" onclick="setCombatantFacing(90)" style="padding: 6px; font-size: 0.85em;" ${
                !battleMap.selectedCombatant ? "disabled" : ""
              }>➡️ E</button>
              <button class="button" onclick="setCombatantFacing(180)" style="padding: 6px; font-size: 0.85em;" ${
                !battleMap.selectedCombatant ? "disabled" : ""
              }>⬇️ S</button>
              <button class="button" onclick="setCombatantFacing(270)" style="padding: 6px; font-size: 0.85em;" ${
                !battleMap.selectedCombatant ? "disabled" : ""
              }>⬅️ W</button>
            </div>
            <div style="text-align: center; color: #FFB74D; font-size: 0.85em;">
              Current: <span id="currentFacing">0</span>° (${(() => {
                const layer = getActiveLayer();
                return [
                  "⬆️ N",
                  "↗️ NE",
                  "➡️ E",
                  "↘️ SE",
                  "⬇️ S",
                  "↙️ SW",
                  "⬅️ W",
                  "↖️ NW",
                ][
                  Math.floor(
                    ((layer.combatantFacing[battleMap.selectedCombatant] || 0) %
                      360) /
                      45,
                  )
                ];
              })()})
            </div>
          </div>

          <!-- Map Ping Tool (Collapsible) -->
          <details data-section="mapPing" style="margin-bottom: 8px; background: rgba(255, 87, 34, 0.05); border: 1px solid #FF5722; border-radius: 6px;">
            <summary style="padding: 8px; cursor: pointer; color: #FF8A65; font-size: 0.85em; font-weight: bold; user-select: none;">
              \ud83d\udc46 Map Ping Tool
            </summary>
            <div style="padding: 8px; padding-top: 5px;">
              <p style="color: #aaa; font-size: 0.75em; margin: 0 0 8px 0; line-height: 1.4;">
                Click to place temporary location markers visible to all players. Pings auto-fade after 5 seconds.
              </p>
              
              <button class="button ${
                battleMap.pingActive ? "primary-button" : ""
              }" 
                onclick="event.stopPropagation(); togglePingTool()" 
                style="width: 100%; padding: 8px; margin-bottom: 8px; font-size: 0.85em; background: ${
                  battleMap.pingActive
                    ? "rgba(76, 175, 80, 0.3)"
                    : "rgba(255, 87, 34, 0.2)"
                }; border-color: ${battleMap.pingActive ? "#4caf50" : "#FF5722"};">
                ${battleMap.pingActive ? "✓ Pinging..." : "📍 Activate Ping Tool"}
              </button>

              <label style="display: block; margin-bottom: 4px; color: #FF8A65; font-size: 0.75em;">Ping Color:</label>
              <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 4px;">
                <div onclick="event.stopPropagation(); setPingColor('#ff5722')" 
                  style="width: 100%; aspect-ratio: 1; background: #ff5722; border: 2px solid ${
                    battleMap.pingColor === "#ff5722" ? "#fff" : "#555"
                  }; border-radius: 4px; cursor: pointer; box-shadow: ${
                    battleMap.pingColor === "#ff5722"
                      ? "0 0 8px #ff5722"
                      : "none"
                  };"></div>
                <div onclick="event.stopPropagation(); setPingColor('#2196f3')" 
                  style="width: 100%; aspect-ratio: 1; background: #2196f3; border: 2px solid ${
                    battleMap.pingColor === "#2196f3" ? "#fff" : "#555"
                  }; border-radius: 4px; cursor: pointer; box-shadow: ${
                    battleMap.pingColor === "#2196f3"
                      ? "0 0 8px #2196f3"
                      : "none"
                  };"></div>
                <div onclick="event.stopPropagation(); setPingColor('#4caf50')" 
                  style="width: 100%; aspect-ratio: 1; background: #4caf50; border: 2px solid ${
                    battleMap.pingColor === "#4caf50" ? "#fff" : "#555"
                  }; border-radius: 4px; cursor: pointer; box-shadow: ${
                    battleMap.pingColor === "#4caf50"
                      ? "0 0 8px #4caf50"
                      : "none"
                  };"></div>
                <div onclick="event.stopPropagation(); setPingColor('#ffeb3b')" 
                  style="width: 100%; aspect-ratio: 1; background: #ffeb3b; border: 2px solid ${
                    battleMap.pingColor === "#ffeb3b" ? "#fff" : "#555"
                  }; border-radius: 4px; cursor: pointer; box-shadow: ${
                    battleMap.pingColor === "#ffeb3b"
                      ? "0 0 8px #ffeb3b"
                      : "none"
                  };"></div>
                <div onclick="event.stopPropagation(); setPingColor('#9c27b0')" 
                  style="width: 100%; aspect-ratio: 1; background: #9c27b0; border: 2px solid ${
                    battleMap.pingColor === "#9c27b0" ? "#fff" : "#555"
                  }; border-radius: 4px; cursor: pointer; box-shadow: ${
                    battleMap.pingColor === "#9c27b0"
                      ? "0 0 8px #9c27b0"
                      : "none"
                  };"></div>
                <div onclick="event.stopPropagation(); setPingColor('#ff9800')" 
                  style="width: 100%; aspect-ratio: 1; background: #ff9800; border: 2px solid ${
                    battleMap.pingColor === "#ff9800" ? "#fff" : "#555"
                  }; border-radius: 4px; cursor: pointer; box-shadow: ${
                    battleMap.pingColor === "#ff9800"
                      ? "0 0 8px #ff9800"
                      : "none"
                  };"></div>
              </div>
              
              ${
                battleMap.pingActive
                  ? `<div style="margin-top: 8px; padding: 6px; background: rgba(76, 175, 80, 0.2); border: 1px solid #4caf50; border-radius: 4px; text-align: center;">
                <div style="color: #4caf50; font-size: 0.75em; font-weight: bold;">🎯 Click map to place ping</div>
              </div>`
                  : ""
              }
            </div>
          </details>
          
        </div>
      </details>
      
    </div>
  `;

  const container = document.getElementById("battleMapControls");
  if (container) {
    container.innerHTML = controlsHTML;
  }

  // Also update unified view if it's open
  const unifiedModal = document.getElementById("unifiedBattleMapModal");
  if (unifiedModal && unifiedModal.style.display !== "none") {
    const unifiedContainer = document.getElementById(
      "unifiedBattleMapControls",
    );
    if (unifiedContainer) {
      unifiedContainer.innerHTML = controlsHTML;
    }
  }
}

/**
 * Render battle map controls in the unified modal sidebar
 */
function renderUnifiedBattleMapControls() {
  // Re-use the same rendering logic but target unified container
  // First, temporarily store old queries and use unified container class
  const oldRender = renderBattleMapControls;

  // Get the regular controls HTML
  const tempDiv = document.createElement("div");
  tempDiv.className = "battle-map-controls";
  const regularContainer = document.getElementById("battleMapControls");
  if (regularContainer) {
    tempDiv.innerHTML = regularContainer.innerHTML;
  } else {
    // Generate fresh if regular doesn't exist
    renderBattleMapControls();
    const regularContainer2 = document.getElementById("battleMapControls");
    if (regularContainer2) {
      tempDiv.innerHTML = regularContainer2.innerHTML;
    }
  }

  // Now render to unified container
  const unifiedContainer = document.getElementById("unifiedBattleMapControls");
  if (unifiedContainer) {
    // Copy the battleMapControls content
    renderBattleMapControls();
    const source = document.getElementById("battleMapControls");
    if (source) {
      unifiedContainer.innerHTML = source.innerHTML;
    }
  }
}

function renderBattleMap() {
  const container = document.getElementById("battleMapCanvas");
  if (!container) return;

  const layer = getActiveLayer();

  // Check view mode and render accordingly
  if (battleMap.viewMode === "isometric") {
    renderBattleMapIsometric(container, layer);
  } else {
    renderBattleMap2D(container, layer);
  }

  // Also update unified view if it's open
  const unifiedModal = document.getElementById("unifiedBattleMapModal");
  if (unifiedModal && unifiedModal.style.display !== "none") {
    renderUnifiedBattleMap();
  }
}

/**
 * Render battle map in the unified modal canvas
 */
function renderUnifiedBattleMap() {
  const container = document.getElementById("unifiedBattleMapCanvas");
  if (!container) return;

  const layer = getActiveLayer();

  // Check view mode and render accordingly
  if (battleMap.viewMode === "isometric") {
    renderBattleMapIsometric(container, layer);
  } else {
    renderBattleMap2D(container, layer);
  }
}

// Update combatant positions smoothly without full re-render
function updateCombatantPositions() {
  const layer = getActiveLayer();
  const cellSize = battleMap.gridSize * battleMap.zoom;

  Object.entries(layer.combatantPositions).forEach(([combatantId, pos]) => {
    const token = document.querySelector(
      `.combatant-token[data-combatant-id="${combatantId}"]`,
    );
    if (!token) return;

    const facing = layer.combatantFacing[combatantId] || 0;
    const size = battleMap.combatantSizes[combatantId] || 1;

    // Only update if not currently being dragged
    if (
      !battleMap.dragging.active ||
      battleMap.dragging.combatantId !== parseInt(combatantId)
    ) {
      if (battleMap.viewMode === "isometric") {
        const elevation = battleMap.combatantElevations[combatantId] || 0;
        const iso = gridToIsometric(pos.x, pos.y, cellSize, elevation);
        const tileWidth = cellSize * 2;
        const tileHeight = cellSize;
        const centerOffsetX = (layer.width * cellSize) / 2;
        const centerOffsetY = 0;
        const isoX = iso.x + centerOffsetX + cellSize / 2;
        const tokenSize = Math.min(tileWidth, tileHeight * 1.5) * size * 0.9;
        const isoY = iso.y + tokenSize;

        token.style.left = `${isoX}px`;
        token.style.top = `${isoY - tokenSize / 2}px`;
        token.style.transform = `translateX(-50%) rotate(${facing}deg)`;
      } else {
        token.style.left = `${(pos.x + 0.5) * cellSize}px`;
        token.style.top = `${(pos.y + 0.5) * cellSize}px`;
        token.style.transform = `translate(-50%, -50%) rotate(${facing}deg)`;
      }
    }
  });
}

function renderBattleMap2D(container, layer) {
  const totalWidth = layer.width * battleMap.gridSize * battleMap.zoom;
  const totalHeight = layer.height * battleMap.gridSize * battleMap.zoom;
  const cellSize = battleMap.gridSize * battleMap.zoom;

  let gridHTML = `<div class="battle-map-grid" style="position: relative; display: inline-block; width: ${totalWidth}px; height: ${totalHeight}px; background: #1a1a1a; border: 2px solid #4caf50; box-shadow: 0 0 20px rgba(76, 175, 80, 0.3);">`;

  // Draw background image if set
  if (layer.backgroundImage) {
    gridHTML += `
      <div style="
        position: absolute;
        left: 0;
        top: 0;
        width: ${totalWidth}px;
        height: ${totalHeight}px;
        background-image: url(${layer.backgroundImage});
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
        opacity: 0.7;
        z-index: 0;
        pointer-events: none;
      "></div>
    `;
  }

  // Draw grid cells
  for (let y = 0; y < layer.height; y++) {
    for (let x = 0; x < layer.width; x++) {
      const terrain = layer.terrain.find((t) => t.x === x && t.y === y);
      const bgColor = terrain
        ? terrainTypes[terrain.type].color
        : "transparent";
      const opacity = terrain ? "0.6" : "0.25";

      // Check if this cell is keyboard focused
      const isFocused =
        battleMap.keyboard.focusedCell &&
        battleMap.keyboard.focusedCell.x === x &&
        battleMap.keyboard.focusedCell.y === y;

      // Add texture pattern for terrain cells
      const terrainPattern = terrain
        ? `repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)`
        : "none";

      gridHTML += `
        <div class="grid-cell ${isFocused ? "keyboard-focused" : ""}" 
          data-x="${x}" 
          data-y="${y}"
          tabindex="${isFocused ? "0" : "-1"}"
          aria-label="Grid cell ${String.fromCharCode(65 + x)}${y + 1}${
            terrain ? `, ${terrain.type} terrain` : ""
          }"
          style="
            position: absolute;
            left: ${x * cellSize}px;
            top: ${y * cellSize}px;
            width: ${cellSize}px;
            height: ${cellSize}px;
            border: ${
              isFocused
                ? "3px solid #ffeb3b"
                : terrain
                  ? `2px solid ${terrainTypes[terrain.type].color}`
                  : typeof horrorMode !== "undefined" && horrorMode.enabled
                    ? `0.5px solid rgba(76, 175, 80, ${opacity * 0.15})`
                    : `1px solid rgba(76, 175, 80, ${opacity})`
            };
            background-color: ${bgColor};
            background-image: ${terrainPattern};
            opacity: ${terrain ? 0.85 : 1};
            cursor: ${
              battleMap.aoePlacementMode
                ? "crosshair"
                : battleMap.selectedTool === "move"
                  ? "pointer"
                  : "crosshair"
            };
            box-sizing: border-box;
            transition: background-color 0.1s, border 0.1s;
            ${isFocused ? "box-shadow: 0 0 0 4px rgba(255, 235, 59, 0.3);" : ""}
          "
          onmouseover="this.style.borderColor='${typeof horrorMode !== "undefined" && horrorMode.enabled ? "rgba(76, 175, 80, 0.3)" : "rgba(76, 175, 80, 0.8)"}'"
          onmouseout="this.style.borderColor='${
            isFocused
              ? "#ffeb3b"
              : typeof horrorMode !== "undefined" && horrorMode.enabled
                ? `rgba(76, 175, 80, ${opacity * 0.15})`
                : `rgba(76, 175, 80, ${opacity})`
          }'"
          onclick="handleBattleMapClickEvent(event, ${x}, ${y})"
        >
        </div>
      `;
    }
  }

  // Draw edge walls
  if (layer.edgeWalls) {
    layer.edgeWalls.forEach((wall) => {
      const wallThickness = Math.max(6, cellSize * 0.12);
      let wallStyle = {
        position: "absolute",
        background: terrainTypes[wall.type]?.color || "#666",
        zIndex: 50,
        pointerEvents: "none",
      };

      let left, top, width, height;

      switch (wall.edge) {
        case "n": // North edge (top)
          left = wall.x * cellSize;
          top = wall.y * cellSize - wallThickness / 2;
          width = cellSize;
          height = wallThickness;
          break;
        case "s": // South edge (bottom)
          left = wall.x * cellSize;
          top = (wall.y + 1) * cellSize - wallThickness / 2;
          width = cellSize;
          height = wallThickness;
          break;
        case "w": // West edge (left)
          left = wall.x * cellSize - wallThickness / 2;
          top = wall.y * cellSize;
          width = wallThickness;
          height = cellSize;
          break;
        case "e": // East edge (right)
          left = (wall.x + 1) * cellSize - wallThickness / 2;
          top = wall.y * cellSize;
          width = wallThickness;
          height = cellSize;
          break;
      }

      gridHTML += `
        <div style="
          position: absolute;
          left: ${left}px;
          top: ${top}px;
          width: ${width}px;
          height: ${height}px;
          background: ${wallStyle.background};
          z-index: ${wallStyle.zIndex};
          pointer-events: ${wallStyle.pointerEvents};
          box-shadow: 0 0 8px rgba(0,0,0,0.7), inset 0 0 0 1px rgba(0,0,0,0.4);
          opacity: 0.95;
          border: 1px solid rgba(0,0,0,0.3);
        "></div>
      `;
    });
  }

  // Calculate visible cells once for fog and combatant checks
  const visibleCells = battleMap.fogOfWar.enabled
    ? getVisibleCells(layer)
    : null;

  // Draw combatants
  Object.entries(layer.combatantPositions).forEach(([combatantId, pos]) => {
    const combatant = combatants.find((c) => c.id === parseInt(combatantId));
    if (!combatant) return;

    const color = getCombatantColor(combatant);
    const icon = getCombatantIcon(combatant);
    const isSelected = battleMap.selectedCombatant === parseInt(combatantId);
    const isEnemy = combatant.type === "Enemy" || combatant.type === "Creature";
    const isNPC = combatant.type === "NPC";
    const customToken = battleMap.customTokens[combatant.id];
    const sourceToken = combatant.sourceToken;
    const hasCustomImage =
      (customToken && customToken.type === "image") ||
      (sourceToken && sourceToken.type === "image");

    // Get combatant size (1=Medium, 2=Large, 3=Huge, 4=Gargantuan)
    const size = battleMap.combatantSizes[combatantId] || 1;
    const elevation = battleMap.combatantElevations[combatantId] || 0;
    const facing = layer.combatantFacing[combatantId] || 0;

    gridHTML += `
        <div class="combatant-token ${isSelected ? "selected" : ""}"
          data-combatant-id="${combatantId}"
          style="
            position: absolute;
            left: ${(pos.x + 0.5) * cellSize}px;
            top: ${(pos.y + 0.5) * cellSize}px;
            transform: translate(-50%, -50%) rotate(${facing}deg);
            width: ${cellSize * size * 0.9}px;
            height: ${cellSize * size * 0.9}px;
            background: ${
              hasCustomImage ? "transparent" : isEnemy ? "#DC143C" : color
            };
            border: ${isSelected ? "3px" : "2px"} solid ${
              isSelected ? "#ffeb3b" : "#fff"
            };
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: ${isEnemy ? cellSize * 0.35 : cellSize * 0.4}px;
            cursor: ${battleMap.selectedTool === "move" ? "grab" : "pointer"};
            box-shadow: 0 2px 8px rgba(0,0,0,0.5), ${
              isSelected ? "0 0 15px rgba(255, 235, 59, 0.8)" : "none"
            };
            z-index: 100;
            transition: ${
              battleMap.dragging.active &&
              battleMap.dragging.combatantId === parseInt(combatantId)
                ? "none"
                : "left 0.4s ease-in-out, top 0.4s ease-in-out, transform 0.4s ease-in-out, border 0.2s, box-shadow 0.2s"
            };
            user-select: none;
            overflow: hidden;
            ${
              isEnemy && !hasCustomImage
                ? "line-height: 1; text-shadow: 0 0 3px rgba(0,0,0,0.5);"
                : ""
            }
          "
          oncontextmenu="event.preventDefault(); event.stopPropagation(); openTokenCustomizer(${combatantId}); return false;"
          onclick="event.stopPropagation(); selectCombatantOnMap(${combatantId})"
          onmousedown="event.stopPropagation(); if(event.button === 0) startDragCombatant(event, ${combatantId})"
          title="${
            combatant.displayName || combatant.name
          } (Right-click to customize token)"
        >
          ${
            hasCustomImage
              ? `<img src="${
                  customToken?.value || sourceToken?.value
                }" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" />`
              : icon
          }
          ${
            elevation !== 0
              ? `
            <div style="
              position: absolute;
              top: 4px;
              right: 4px;
              background: ${
                elevation > 0
                  ? "rgba(135, 206, 250, 0.95)"
                  : "rgba(139, 69, 19, 0.95)"
              };
              color: #fff;
              padding: 2px 6px;
              border-radius: 10px;
              font-size: ${Math.max(10, cellSize * 0.25)}px;
              font-weight: bold;
              border: 1px solid ${elevation > 0 ? "#4169E1" : "#8B4513"};
              box-shadow: 0 1px 3px rgba(0,0,0,0.5);
              pointer-events: none;
            ">
              ${elevation > 0 ? "+" : ""}${elevation}
            </div>
          `
              : ""
          }
        </div>
        <div class="combatant-name-label" data-combatant-id="${combatantId}" style="
          position: absolute;
          left: ${pos.x * cellSize + cellSize * size * 0.5}px;
          top: ${pos.y * cellSize - 5}px;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.85);
          color: #fff;
          padding: 3px 8px;
          border-radius: 4px;
          font-size: ${Math.max(10, cellSize * 0.25)}px;
          font-weight: bold;
          white-space: nowrap;
          pointer-events: none;
          z-index: 150;
          border: 1px solid ${color};
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.7);
          opacity: ${battleMap.showNames ? "1" : "0"};
          transition: opacity 0.2s;
        ">
          ${combatant.displayName || combatant.displayName || combatant.name}
        </div>
      `;
  });

  // Add single SVG layer for all facing indicators
  if (battleMap.showLineOfSight) {
    let svgContent = "";
    const layer = getActiveLayer();

    Object.entries(layer.combatantPositions).forEach(([combatantId, pos]) => {
      const combatant = combatants.find((c) => c.id === parseInt(combatantId));
      if (!combatant) return;

      const color = getCombatantColor(combatant);
      const facing = layer.combatantFacing[combatantId] || 0;
      const indicatorLength = cellSize * 1.5;

      console.log(
        "Adding facing indicator to SVG for combatant:",
        combatantId,
        "facing:",
        facing,
      ); // Debug

      // Calculate cone endpoint
      const radians = (facing * Math.PI) / 180;
      const centerX = pos.x * cellSize + cellSize * 0.5;
      const centerY = pos.y * cellSize + cellSize * 0.5;
      const endX = centerX + Math.sin(radians) * indicatorLength;
      const endY = centerY - Math.cos(radians) * indicatorLength;

      // Create a triangle/cone shape for line of sight
      const coneSpread = 30; // degrees on each side
      const leftAngle = ((facing - coneSpread) * Math.PI) / 180;
      const rightAngle = ((facing + coneSpread) * Math.PI) / 180;
      const leftX = centerX + Math.sin(leftAngle) * indicatorLength;
      const leftY = centerY - Math.cos(leftAngle) * indicatorLength;
      const rightX = centerX + Math.sin(rightAngle) * indicatorLength;
      const rightY = centerY - Math.cos(rightAngle) * indicatorLength;

      svgContent += `
        <defs>
          <linearGradient id="facingGradient${combatantId}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:${color};stop-opacity:0.4" />
            <stop offset="100%" style="stop-color:${color};stop-opacity:0.05" />
          </linearGradient>
        </defs>
        <polygon points="${centerX},${centerY} ${leftX},${leftY} ${rightX},${rightY}" 
          fill="url(#facingGradient${combatantId})" 
          stroke="${color}" 
          stroke-width="2"
          opacity="0.7"/>
        <line x1="${centerX}" y1="${centerY}" x2="${endX}" y2="${endY}" 
          stroke="${color}" 
          stroke-width="3" 
          stroke-dasharray="5,5"
          opacity="0.8"/>
      `;
    });

    if (svgContent) {
      gridHTML += `
        <svg style="position: absolute; left: 0; top: 0; width: ${totalWidth}px; height: ${totalHeight}px; pointer-events: none; z-index: 90; overflow: visible;">
          ${svgContent}
        </svg>
      `;
    }
  }

  // Draw AoE Templates
  if (battleMap.aoeTemplates && battleMap.aoeTemplates.length > 0) {
    let aoeHTML = "";

    battleMap.aoeTemplates.forEach((template) => {
      const centerX = (template.x + 0.5) * cellSize;
      const centerY = (template.y + 0.5) * cellSize;
      const size = template.size * cellSize;

      if (template.type === "circle") {
        const radius = size / 2;
        aoeHTML += `
          <div style="
            position: absolute;
            left: ${centerX - radius}px;
            top: ${centerY - radius}px;
            width: ${size}px;
            height: ${size}px;
            background: ${template.color};
            border: 3px solid ${template.color.replace("0.3", "0.8")};
            border-radius: 50%;
            z-index: 85;
            pointer-events: auto;
            cursor: pointer;
            box-shadow: 0 0 15px ${template.color};
          " onclick="removeAoeTemplate(${
            template.id
          })" title="Click to remove"></div>
        `;
      } else if (template.type === "square") {
        const halfSize = size / 2;
        aoeHTML += `
          <div style="
            position: absolute;
            left: ${centerX - halfSize}px;
            top: ${centerY - halfSize}px;
            width: ${size}px;
            height: ${size}px;
            background: ${template.color};
            border: 3px solid ${template.color.replace("0.3", "0.8")};
            z-index: 85;
            pointer-events: auto;
            cursor: pointer;
            box-shadow: 0 0 15px ${template.color};
          " onclick="removeAoeTemplate(${
            template.id
          })" title="Click to remove"></div>
        `;
      } else if (template.type === "cone") {
        // Create SVG cone
        const coneLength = size;
        const coneWidth = (template.coneWidth || 3) * cellSize; // Use stored width or default
        const radians = (template.rotation * Math.PI) / 180;

        // Calculate cone angle based on width and length
        const halfAngle = Math.atan2(coneWidth / 2, coneLength);

        // Calculate three points of the cone
        const tipX = centerX;
        const tipY = centerY;
        const leftX = tipX + Math.cos(radians - halfAngle) * coneLength;
        const leftY = tipY + Math.sin(radians - halfAngle) * coneLength;
        const rightX = tipX + Math.cos(radians + halfAngle) * coneLength;
        const rightY = tipY + Math.sin(radians + halfAngle) * coneLength;

        aoeHTML += `
          <svg style="position: absolute; left: 0; top: 0; width: ${totalWidth}px; height: ${totalHeight}px; z-index: 85; pointer-events: none;">
            <polygon points="${tipX},${tipY} ${leftX},${leftY} ${rightX},${rightY}" 
              fill="${template.color}" 
              stroke="${template.color.replace("0.3", "0.8")}" 
              stroke-width="3"
              style="pointer-events: auto; cursor: pointer;"
              onclick="removeAoeTemplate(${template.id})"
              filter="drop-shadow(0 0 10px ${template.color})">
              <title>Click to remove</title>
            </polygon>
          </svg>
        `;
      } else if (template.type === "line") {
        const lineWidth = cellSize * 0.8;
        const lineLength = size;
        const radians = (template.rotation * Math.PI) / 180;

        const endX = centerX + Math.cos(radians) * lineLength;
        const endY = centerY + Math.sin(radians) * lineLength;

        aoeHTML += `
          <svg style="position: absolute; left: 0; top: 0; width: ${totalWidth}px; height: ${totalHeight}px; z-index: 85; pointer-events: none;">
            <line x1="${centerX}" y1="${centerY}" x2="${endX}" y2="${endY}" 
              stroke="${template.color}" 
              stroke-width="${lineWidth}" 
              stroke-linecap="round"
              style="pointer-events: auto; cursor: pointer;"
              onclick="removeAoeTemplate(${template.id})"
              filter="drop-shadow(0 0 10px ${template.color})">
              <title>Click to remove</title>
            </line>
            <circle cx="${centerX}" cy="${centerY}" r="${lineWidth / 2}" 
              fill="${template.color}" 
              stroke="${template.color.replace("0.3", "0.8")}" 
              stroke-width="2"
              style="pointer-events: auto; cursor: pointer;"
              onclick="removeAoeTemplate(${template.id})"/>
          </svg>
        `;
      }
    });

    gridHTML += aoeHTML;
  }

  // Draw AoE Preview (when placing)
  if (
    battleMap.aoePlacementMode &&
    battleMap.aoePreview &&
    battleMap.selectedAoeTool
  ) {
    const preview = battleMap.aoePreview;
    const centerX = (preview.x + 0.5) * cellSize;
    const centerY = (preview.y + 0.5) * cellSize;
    const size = battleMap.aoeSize * cellSize;

    const colors = {
      circle: "rgba(255, 87, 34, 0.5)",
      cone: "rgba(255, 152, 0, 0.5)",
      line: "rgba(33, 150, 243, 0.5)",
      square: "rgba(156, 39, 176, 0.5)",
    };
    const color = colors[battleMap.selectedAoeTool];

    let previewHTML = "";

    if (battleMap.selectedAoeTool === "circle") {
      const radius = size / 2;
      previewHTML = `
        <div style="
          position: absolute;
          left: ${centerX - radius}px;
          top: ${centerY - radius}px;
          width: ${size}px;
          height: ${size}px;
          background: ${color};
          border: 3px dashed ${color.replace("0.5", "1.0")};
          border-radius: 50%;
          z-index: 95;
          pointer-events: none;
          box-shadow: 0 0 20px ${color};
          animation: pulse 1s infinite;
        "></div>
      `;
    } else if (battleMap.selectedAoeTool === "square") {
      const halfSize = size / 2;
      previewHTML = `
        <div style="
          position: absolute;
          left: ${centerX - halfSize}px;
          top: ${centerY - halfSize}px;
          width: ${size}px;
          height: ${size}px;
          background: ${color};
          border: 3px dashed ${color.replace("0.5", "1.0")};
          z-index: 95;
          pointer-events: none;
          box-shadow: 0 0 20px ${color};
          animation: pulse 1s infinite;
        "></div>
      `;
    } else if (battleMap.selectedAoeTool === "cone") {
      const coneLength = size;
      const coneWidth = battleMap.aoeConeWidth * cellSize;
      const radians = (preview.rotation * Math.PI) / 180; // Convert degrees to radians

      // Calculate cone angle based on width and length
      const halfAngle = Math.atan2(coneWidth / 2, coneLength);

      const tipX = centerX;
      const tipY = centerY;
      const leftX = tipX + Math.cos(radians - halfAngle) * coneLength;
      const leftY = tipY + Math.sin(radians - halfAngle) * coneLength;
      const rightX = tipX + Math.cos(radians + halfAngle) * coneLength;
      const rightY = tipY + Math.sin(radians + halfAngle) * coneLength;

      previewHTML = `
        <svg style="position: absolute; left: 0; top: 0; width: ${totalWidth}px; height: ${totalHeight}px; z-index: 95; pointer-events: none;">
          <polygon points="${tipX},${tipY} ${leftX},${leftY} ${rightX},${rightY}" 
            fill="${color}" 
            stroke="${color.replace("0.5", "1.0")}" 
            stroke-width="3"
            stroke-dasharray="10,5"
            filter="drop-shadow(0 0 15px ${color})">
          </polygon>
        </svg>
      `;
    } else if (battleMap.selectedAoeTool === "line") {
      const lineWidth = cellSize * 0.8;
      const lineLength = size;
      const radians = (preview.rotation * Math.PI) / 180; // Convert degrees to radians

      const endX = centerX + Math.cos(radians) * lineLength;
      const endY = centerY + Math.sin(radians) * lineLength;

      previewHTML = `
        <svg style="position: absolute; left: 0; top: 0; width: ${totalWidth}px; height: ${totalHeight}px; z-index: 95; pointer-events: none;">
          <line x1="${centerX}" y1="${centerY}" x2="${endX}" y2="${endY}" 
            stroke="${color}" 
            stroke-width="${lineWidth}" 
            stroke-linecap="round"
            stroke-dasharray="10,5"
            filter="drop-shadow(0 0 15px ${color})">
          </line>
          <circle cx="${centerX}" cy="${centerY}" r="${lineWidth / 2}" 
            fill="${color}" 
            stroke="${color.replace("0.5", "1.0")}" 
            stroke-width="2"
            stroke-dasharray="5,3"/>
        </svg>
      `;
    }

    gridHTML += previewHTML;
  }

  // Add CSS for hover effect
  if (!battleMap.showNames) {
    const style = document.createElement("style");
    style.id = "battle-map-hover-style";
    style.textContent = `
      .combatant-token:hover + .combatant-name-label {
        opacity: 1 !important;
      }
      @keyframes pulse {
        0%, 100% { opacity: 0.7; }
        50% { opacity: 1.0; }
      }
    `;
    // Remove old style if exists
    const oldStyle = document.getElementById("battle-map-hover-style");
    if (oldStyle) oldStyle.remove();
    document.head.appendChild(style);
  } else {
    // Remove hover style when names are always shown
    const style = document.createElement("style");
    style.id = "battle-map-hover-style";
    style.textContent = `
      @keyframes pulse {
        0%, 100% { opacity: 0.7; }
        50% { opacity: 1.0; }
      }
    `;
    const oldStyle = document.getElementById("battle-map-hover-style");
    if (oldStyle) oldStyle.remove();
    document.head.appendChild(style);
  }

  // Draw measurement line if active
  if (
    battleMap.measuring.active &&
    battleMap.measuring.startX !== null &&
    battleMap.measuring.endX !== null
  ) {
    const startX = (battleMap.measuring.startX + 0.5) * cellSize;
    const startY = (battleMap.measuring.startY + 0.5) * cellSize;
    const endX = (battleMap.measuring.endX + 0.5) * cellSize;
    const endY = (battleMap.measuring.endY + 0.5) * cellSize;

    const distance = calculateDistance(
      battleMap.measuring.startX,
      battleMap.measuring.startY,
      battleMap.measuring.endX,
      battleMap.measuring.endY,
    );

    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;

    // Draw line
    const angle = Math.atan2(endY - startY, endX - startX);
    const length = Math.sqrt(
      Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2),
    );

    gridHTML += `
      <div style="
        position: absolute;
        left: ${startX}px;
        top: ${startY}px;
        width: ${length}px;
        height: 3px;
        background: #BA68C8;
        transform-origin: 0 50%;
        transform: rotate(${angle}rad);
        z-index: 200;
        pointer-events: none;
        box-shadow: 0 0 10px rgba(186, 104, 200, 0.8);
      "></div>
      
      <div style="
        position: absolute;
        left: ${startX - 8}px;
        top: ${startY - 8}px;
        width: 16px;
        height: 16px;
        background: #BA68C8;
        border: 2px solid #fff;
        border-radius: 50%;
        z-index: 201;
        pointer-events: none;
        box-shadow: 0 0 10px rgba(186, 104, 200, 0.8);
      "></div>
      
      <div style="
        position: absolute;
        left: ${endX - 8}px;
        top: ${endY - 8}px;
        width: 16px;
        height: 16px;
        background: #BA68C8;
        border: 2px solid #fff;
        border-radius: 50%;
        z-index: 201;
        pointer-events: none;
        box-shadow: 0 0 10px rgba(186, 104, 200, 0.8);
      "></div>
      
      <div style="
        position: absolute;
        left: ${midX}px;
        top: ${midY - 20}px;
        transform: translateX(-50%);
        background: rgba(186, 104, 200, 0.95);
        color: #fff;
        padding: 6px 12px;
        border-radius: 6px;
        font-weight: bold;
        font-size: ${Math.max(12, cellSize * 0.3)}px;
        white-space: nowrap;
        z-index: 202;
        pointer-events: none;
        border: 2px solid #fff;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
      ">
        ${distance.toFixed(1)}m (${distance.toFixed(0)} squares)
      </div>
    `;
  }

  // Draw move distance preview
  if (battleMap.movePreview && battleMap.showMoveDistance) {
    const { fromX, fromY, toX, toY, distance } = battleMap.movePreview;
    const startX = (fromX + 0.5) * cellSize;
    const startY = (fromY + 0.5) * cellSize;
    const endX = (toX + 0.5) * cellSize;
    const endY = (toY + 0.5) * cellSize;
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;

    gridHTML += `
      <svg style="position: absolute; left: 0; top: 0; width: ${totalWidth}px; height: ${totalHeight}px; pointer-events: none; z-index: 200; overflow: visible;">
        <line x1="${startX}" y1="${startY}" x2="${endX}" y2="${endY}" 
          stroke="#4CAF50" 
          stroke-width="3" 
          stroke-dasharray="5,5"
          opacity="0.8"/>
        <circle cx="${startX}" cy="${startY}" r="5" fill="#4CAF50" opacity="0.8"/>
        <circle cx="${endX}" cy="${endY}" r="5" fill="#4CAF50" opacity="0.8"/>
      </svg>
      
      <div style="
        position: absolute;
        left: ${midX}px;
        top: ${midY - 20}px;
        transform: translateX(-50%);
        background: rgba(76, 175, 80, 0.95);
        color: #fff;
        padding: 6px 12px;
        border-radius: 6px;
        font-weight: bold;
        font-size: ${Math.max(12, cellSize * 0.3)}px;
        white-space: nowrap;
        z-index: 201;
        pointer-events: none;
        border: 2px solid #fff;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
      ">
        Moved: ${distance.toFixed(1)}m (${distance.toFixed(0)} squares)
      </div>
    `;
  }

  // Draw hover cell highlight (when dragging or moving combatant)
  if (battleMap.hoverCell) {
    gridHTML += `
      <div style="
        position: absolute;
        left: ${(battleMap.hoverCell.x + 0.5) * cellSize}px;
        top: ${(battleMap.hoverCell.y + 0.5) * cellSize}px;
        transform: translate(-50%, -50%);
        width: ${cellSize * 0.9}px;
        height: ${cellSize * 0.9}px;
        background: rgba(76, 175, 80, 0.4);
        border: 3px solid rgba(76, 175, 80, 1);
        pointer-events: none;
        z-index: 149;
        box-shadow: 0 0 15px rgba(76, 175, 80, 0.6);
        animation: pulse 1s infinite;
      ">
      </div>
    `;
  }

  // Draw dynamic lights
  if (layer.lights && layer.lights.length > 0) {
    layer.lights.forEach((light) => {
      const centerX = (light.x + 0.5) * cellSize;
      const centerY = (light.y + 0.5) * cellSize;
      const radius = light.radius * cellSize;

      // Render light cell-by-cell to respect terrain blocking
      for (let dy = -light.radius; dy <= light.radius; dy++) {
        for (let dx = -light.radius; dx <= light.radius; dx++) {
          const targetX = light.x + dx;
          const targetY = light.y + dy;

          // Skip if outside map bounds
          if (
            targetX < 0 ||
            targetX >= layer.width ||
            targetY < 0 ||
            targetY >= layer.height
          ) {
            continue;
          }

          const distance = Math.sqrt(dx * dx + dy * dy);

          // Skip if outside light radius
          if (distance > light.radius) {
            continue;
          }

          // Calculate light intensity with blocking
          const blockingFactor = calculateLightBlocking(
            light.x,
            light.y,
            targetX,
            targetY,
            layer,
          );

          if (blockingFactor > 0) {
            const falloff = 1 - distance / light.radius;
            const intensity = falloff * light.intensity * blockingFactor;

            // Convert intensity to opacity (0-255 range)
            const alpha = Math.round(intensity * 255);
            const alphaHex = alpha.toString(16).padStart(2, "0");

            // Render individual light cell
            gridHTML += `
              <div style="
                position: absolute;
                left: ${targetX * cellSize}px;
                top: ${targetY * cellSize}px;
                width: ${cellSize}px;
                height: ${cellSize}px;
                background: ${light.color}${alphaHex};
                pointer-events: none;
                z-index: 160;
              ">
              </div>
            `;
          }
        }
      }

      // Light source indicator (clickable to remove)
      gridHTML += `
        <div style="
          position: absolute;
          left: ${centerX}px;
          top: ${centerY}px;
          transform: translate(-50%, -50%);
          width: ${cellSize * 0.4}px;
          height: ${cellSize * 0.4}px;
          background: ${light.color};
          border: 2px solid #fff;
          border-radius: 50%;
          cursor: pointer;
          z-index: 161;
          box-shadow: 0 0 10px ${light.color}, 0 2px 5px rgba(0,0,0,0.5);
        "
        onclick="removeLight(${light.id})"
        title="Light Source (Radius: ${light.radius}, Intensity: ${Math.round(
          light.intensity * 100,
        )}%) - Click to remove">
          <div style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: ${cellSize * 0.25}px;
          ">💡</div>
        </div>
      `;
    });
  }

  // Draw Fog of War overlay (GM view shows concealed areas with indicator)
  if (battleMap.fogOfWar.enabled) {
    const visibleCells = getVisibleCells(layer);

    for (let y = 0; y < layer.height; y++) {
      for (let x = 0; x < layer.width; x++) {
        const isVisible = isCellVisible(x, y, visibleCells);

        if (!isVisible) {
          // Check if this cell is lit
          const lightIntensity = getLightIntensityAtCell(x, y, layer);
          const baseOpacity = 0.6;
          const lightTransparency = battleMap.fogOfWar.lightTransparency;
          // Reduce opacity based on light intensity and transparency setting
          const finalOpacity =
            baseOpacity * (1 - lightIntensity * lightTransparency);

          // GM sees a semi-transparent overlay on concealed cells
          gridHTML += `
            <div style="
              position: absolute;
              left: ${x * cellSize}px;
              top: ${y * cellSize}px;
              width: ${cellSize}px;
              height: ${cellSize}px;
              background: rgba(0, 0, 0, ${finalOpacity});
              border: 1px solid rgba(50, 50, 50, ${finalOpacity * 0.5});
              pointer-events: none;
              z-index: 150;
            ">
            </div>
          `;
        }
      }
    }
  }

  // Draw wall drawing preview (if in edge mode and first corner selected)
  if (battleMap.edgeWallDrawing.active && battleMap.wallDrawMode === "edge") {
    const cornerX = battleMap.edgeWallDrawing.startCornerX;
    const cornerY = battleMap.edgeWallDrawing.startCornerY;

    // Draw indicator at the start corner
    gridHTML += `
      <div style="
        position: absolute;
        left: ${cornerX * cellSize - 8}px;
        top: ${cornerY * cellSize - 8}px;
        width: 16px;
        height: 16px;
        background: #ffeb3b;
        border: 2px solid #ffc107;
        border-radius: 50%;
        box-shadow: 0 0 10px rgba(255, 235, 59, 0.8);
        z-index: 200;
        pointer-events: none;
        animation: pulse 1s ease-in-out infinite;
      "></div>
    `;
  }

  // Draw map pings (after everything else)
  gridHTML += drawPingsHTML(layer, cellSize);

  gridHTML += `</div>`;

  // Check if this is the unified battle map container
  const isUnified = container.id === "unifiedBattleMapCanvas";

  // Add wrapper with scroll - different styling for unified view
  if (isUnified) {
    // Unified view: wrap map with padding for scrollable space around edges
    // Use nested flex wrapper to center when small, scroll when large
    // Extra horizontal padding (400px) allows scrolling left/right to avoid panel obstruction
    container.innerHTML = `
      <div style="min-width: 100%; min-height: 100%; display: flex; justify-content: center; align-items: center;">
        <div style="padding: 100px 400px; display: inline-block;">
          ${gridHTML}
        </div>
      </div>
    `;

    // Add info bar to the parent container (unifiedBattleMapCanvasContainer)
    const parentContainer = document.getElementById(
      "unifiedBattleMapCanvasContainer",
    );
    if (parentContainer) {
      // Remove existing info bar if present
      const existingInfo = parentContainer.querySelector(
        ".battle-map-info-bar",
      );
      if (existingInfo) existingInfo.remove();

      // Create new info bar
      const infoBar = document.createElement("div");
      infoBar.className = "battle-map-info-bar";
      infoBar.style.cssText = `
        position: fixed;
        bottom: 50px;
        left: 370px;
        right: 370px;
        padding: 10px;
        background: rgba(0, 0, 0, 0.95);
        border-radius: 4px;
        color: #888;
        font-size: 0.9em;
        border: 1px solid #4caf50;
        z-index: 10000;
        pointer-events: none;
        text-align: center;
      `;
      infoBar.innerHTML = `
        <strong>Zoom:</strong> ${Math.round(battleMap.zoom * 100)}% | 
        <strong>Map Size:</strong> ${layer.width}m × ${layer.height}m | 
        <strong>Selected Tool:</strong> ${
          battleMap.selectedLightTool === "light"
            ? "💡 Light Placement"
            : terrainTypes[battleMap.selectedTool]?.label ||
              (battleMap.selectedTool
                ? battleMap.selectedTool.charAt(0).toUpperCase() +
                  battleMap.selectedTool.slice(1)
                : "None")
        }${
          battleMap.selectedCombatant
            ? ` | <strong>Selected:</strong> ${
                combatants.find((c) => c.id === battleMap.selectedCombatant)
                  ?.name || "Unknown"
              }`
            : ""
        }
      `;
      parentContainer.appendChild(infoBar);
    }
  } else {
    // Regular battle tab view: keep original wrapper
    container.innerHTML = `
      <div style="overflow: auto; max-width: 100%; max-height: 80vh; border-radius: 8px; background: #0a0a0a; padding: 10px;">
        <div style="padding: ${Math.max(50, cellSize)}px; display: inline-block;">
          ${gridHTML}
        </div>
      </div>
      <div style="margin-top: 10px; padding: 10px; background: rgba(0, 0, 0, 0.3); border-radius: 4px; color: #888; font-size: 0.9em;">
        <strong>Zoom:</strong> ${Math.round(
          battleMap.zoom * 100,
        )}% | <strong>Map Size:</strong> ${layer.width}m × ${layer.height}m | 
        <strong>Selected Tool:</strong> ${
          battleMap.selectedLightTool === "light"
            ? "💡 Light Placement"
            : terrainTypes[battleMap.selectedTool]?.label ||
              (battleMap.selectedTool
                ? battleMap.selectedTool.charAt(0).toUpperCase() +
                  battleMap.selectedTool.slice(1)
                : "None")
        }
        ${
          battleMap.selectedCombatant
            ? ` | <strong>Selected:</strong> ${
                combatants.find((c) => c.id === battleMap.selectedCombatant)
                  ?.name || "Unknown"
              }`
            : ""
        }
      </div>
    `;
  }
}

function renderBattleMapIsometric(container, layer) {
  const cellSize = battleMap.gridSize * battleMap.zoom;
  const tileWidth = cellSize;
  const tileHeight = cellSize / 2;

  // Calculate isometric map dimensions
  const isoWidth = (layer.width + layer.height) * (tileWidth / 2);
  const isoHeight = (layer.width + layer.height) * (tileHeight / 2);
  const centerOffsetX = (layer.height * tileWidth) / 2;
  const centerOffsetY = 0;

  const totalWidth = isoWidth + cellSize;
  const totalHeight = isoHeight + cellSize * 2;

  let gridHTML = `<div class="battle-map-grid" style="position: relative; display: inline-block; background: #1a1a1a; border: 2px solid #4caf50; box-shadow: 0 0 20px rgba(76, 175, 80, 0.3); width: ${totalWidth}px; height: ${totalHeight}px;">`;

  // Draw background image if set
  if (layer.backgroundImage) {
    // Size the background to the grid dimensions
    const gridImageWidth = layer.width * cellSize;
    const gridImageHeight = layer.height * cellSize;

    // Apply isometric transformation matrix
    // isoX = (gridX - gridY) * 0.5, isoY = (gridX + gridY) * 0.5 * (tileHeight/tileWidth)
    // This translates to CSS matrix(a, b, c, d, tx, ty) = matrix(0.5, 0.25, -0.5, 0.25, 0, 0) scaled by cellSize
    const a = 0.5;
    const b = 0.25;
    const c = -0.5;
    const d = 0.25;

    gridHTML += `
      <div style="
        position: absolute;
        left: ${centerOffsetX + cellSize / 2}px;
        top: ${cellSize}px;
        width: ${gridImageWidth}px;
        height: ${gridImageHeight}px;
        background-image: url(${layer.backgroundImage});
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
        opacity: 0.7;
        z-index: 0;
        pointer-events: none;
        transform: matrix(${a}, ${b}, ${c}, ${d}, 0, 0);
        transform-origin: top left;
      "></div>
    `;
  }

  // Draw grid cells in isometric view (back to front, bottom to top for proper layering)
  for (let y = 0; y < layer.height; y++) {
    for (let x = 0; x < layer.width; x++) {
      const terrain = layer.terrain.find((t) => t.x === x && t.y === y);
      const bgColor = terrain
        ? terrainTypes[terrain.type].color
        : "rgba(50, 50, 50, 0.3)";
      const borderColor = terrain
        ? terrainTypes[terrain.type].color
        : typeof horrorMode !== "undefined" && horrorMode.enabled
          ? "rgba(76, 175, 80, 0.1)"
          : "rgba(76, 175, 80, 0.3)";
      const strokeWidth =
        typeof horrorMode !== "undefined" && horrorMode.enabled ? "0.5" : "1";

      const iso = gridToIsometric(x, y, cellSize);
      const isoX = iso.x + centerOffsetX + cellSize / 2;
      const isoY = iso.y + cellSize;

      // Draw isometric diamond
      gridHTML += `
        <div class="grid-cell-iso" 
          data-x="${x}" 
          data-y="${y}"
          style="
            position: absolute;
            left: ${isoX}px;
            top: ${isoY}px;
            width: ${tileWidth}px;
            height: ${tileHeight}px;
            transform: translateX(-50%);
            cursor: pointer;
            pointer-events: all;
          "
          onclick="handleBattleMapClickIso(event, ${x}, ${y})"
        >
          <svg width="${tileWidth}" height="${tileHeight}" style="display: block;">
            <polygon points="${tileWidth / 2},0 ${tileWidth},${
              tileHeight / 2
            } ${tileWidth / 2},${tileHeight} 0,${tileHeight / 2}"
              fill="${bgColor}"
              stroke="${borderColor}"
              stroke-width="${strokeWidth}"
              opacity="${terrain ? 0.8 : 0.6}"
            />
          </svg>
        </div>
      `;
    }
  }

  // Draw hover cell highlight in isometric view
  if (battleMap.hoverCell) {
    const iso = gridToIsometric(
      battleMap.hoverCell.x,
      battleMap.hoverCell.y,
      cellSize,
    );
    const isoX = iso.x + centerOffsetX + cellSize / 2;
    const isoY = iso.y + cellSize;
    const highlightWidth = tileWidth * 0.9;
    const highlightHeight = tileHeight * 0.9;

    gridHTML += `
      <div style="
        position: absolute;
        left: ${isoX}px;
        top: ${isoY}px;
        width: ${highlightWidth}px;
        height: ${highlightHeight}px;
        transform: translateX(-50%);
        pointer-events: none;
        z-index: ${1499 + battleMap.hoverCell.y * 10 + battleMap.hoverCell.x};
      ">
        <svg width="${highlightWidth}" height="${highlightHeight}" style="display: block;">
          <polygon points="${highlightWidth / 2},0 ${highlightWidth},${
            highlightHeight / 2
          } ${highlightWidth / 2},${highlightHeight} 0,${highlightHeight / 2}"
            fill="rgba(76, 175, 80, 0.4)"
            stroke="rgba(76, 175, 80, 1)"
            stroke-width="3"
          />
        </svg>
      </div>
    `;
  }

  // Draw combatants in isometric view
  Object.entries(layer.combatantPositions).forEach(([combatantId, pos]) => {
    const combatant = combatants.find((c) => c.id === parseInt(combatantId));
    if (!combatant) return;

    const color = getCombatantColor(combatant);
    const icon = getCombatantIcon(combatant);
    const isSelected = battleMap.selectedCombatant === parseInt(combatantId);
    const isEnemy = combatant.type === "Enemy" || combatant.type === "Creature";
    const isNPC = combatant.type === "NPC";
    const customToken = battleMap.customTokens[combatant.id];
    const sourceToken = combatant.sourceToken;
    const hasCustomImage =
      (customToken && customToken.type === "image") ||
      (sourceToken && sourceToken.type === "image");

    const size = battleMap.combatantSizes[combatantId] || 1;
    const elevation = battleMap.combatantElevations[combatantId] || 0;
    const facing = layer.combatantFacing[combatantId] || 0;

    const iso = gridToIsometric(pos.x, pos.y, cellSize, elevation);
    const isoX = iso.x + centerOffsetX + cellSize / 2;
    const isoY = iso.y + cellSize;

    const tokenSize = Math.min(tileWidth, tileHeight * 1.5) * size * 0.9;

    gridHTML += `
      <div class="combatant-token-iso ${isSelected ? "selected" : ""}"
        data-combatant-id="${combatantId}"
        style="
          position: absolute;
          left: ${isoX}px;
          top: ${isoY - tokenSize / 2}px;
          width: ${tokenSize}px;
          height: ${tokenSize}px;
          transform: translateX(-50%) rotate(${facing}deg);
          background: ${
            hasCustomImage ? "transparent" : isEnemy ? "#DC143C" : color
          };
          border: ${isSelected ? "3px" : "2px"} solid ${
            isSelected ? "#ffeb3b" : "#fff"
          };
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${tokenSize * 0.5}px;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,0,0,0.7), ${
            isSelected ? "0 0 20px rgba(255, 235, 59, 0.9)" : "none"
          };
          z-index: ${1000 + pos.y * 10 + pos.x};
          pointer-events: all;
          transition: ${
            battleMap.dragging.active &&
            battleMap.dragging.combatantId === parseInt(combatantId)
              ? "none"
              : "left 0.4s ease-in-out, top 0.4s ease-in-out, transform 0.4s ease-in-out, border 0.2s, box-shadow 0.2s"
          };
        "
        onclick="event.stopPropagation(); selectCombatantOnMap(${combatantId})"
        onmousedown="event.stopPropagation(); if(event.button === 0) startDragCombatant(event, ${combatantId})"
        title="${combatant.displayName || combatant.name}"
      >
        ${
          hasCustomImage
            ? `<img src="${
                customToken?.value || sourceToken?.value
              }" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" />`
            : icon
        }
        ${
          elevation !== 0
            ? `
          <div style="
            position: absolute;
            top: 2px;
            right: 2px;
            background: ${
              elevation > 0
                ? "rgba(135, 206, 250, 0.95)"
                : "rgba(139, 69, 19, 0.95)"
            };
            color: #fff;
            padding: 2px 5px;
            border-radius: 8px;
            font-size: ${Math.max(8, tokenSize * 0.2)}px;
            font-weight: bold;
            border: 1px solid ${elevation > 0 ? "#4169E1" : "#8B4513"};
            box-shadow: 0 1px 3px rgba(0,0,0,0.5);
            pointer-events: none;
          ">
            ${elevation > 0 ? "+" : ""}${elevation}
          </div>
        `
            : ""
        }
      </div>
    `;

    // Draw name label if enabled
    if (battleMap.showNames) {
      gridHTML += `
        <div style="
          position: absolute;
          left: ${isoX}px;
          top: ${isoY - tokenSize - 10}px;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.85);
          color: #fff;
          padding: 3px 8px;
          border-radius: 4px;
          font-size: ${Math.max(10, cellSize * 0.25)}px;
          font-weight: bold;
          white-space: nowrap;
          pointer-events: none;
          z-index: ${1000 + pos.y * 10 + pos.x + 1};
          border: 1px solid ${color};
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.7);
        ">
          ${combatant.displayName || combatant.name}
        </div>
      `;
    }
  });

  // Draw dynamic lights in isometric view
  if (layer.lights && layer.lights.length > 0) {
    layer.lights.forEach((light) => {
      const iso = gridToIsometric(light.x, light.y, cellSize);
      const isoX = iso.x + centerOffsetX + cellSize / 2;
      const isoY = iso.y + cellSize;
      const lightRadius = light.radius * tileWidth;

      // Light glow effect
      gridHTML += `
        <div style="
          position: absolute;
          left: ${isoX}px;
          top: ${isoY}px;
          transform: translateX(-50%);
          width: ${lightRadius * 2}px;
          height: ${lightRadius}px;
          background: radial-gradient(ellipse, ${light.color}${Math.round(
            light.intensity * 100,
          )
            .toString(16)
            .padStart(2, "0")} 0%, transparent 70%);
          pointer-events: none;
          z-index: ${1900 + light.y * 10 + light.x};
        ">
        </div>
      `;

      // Light source indicator
      const lightSize = tileWidth * 0.4;
      gridHTML += `
        <div style="
          position: absolute;
          left: ${isoX}px;
          top: ${isoY}px;
          transform: translateX(-50%);
          width: ${lightSize}px;
          height: ${lightSize}px;
          background: ${light.color};
          border: 2px solid #fff;
          border-radius: 50%;
          cursor: pointer;
          z-index: ${1910 + light.y * 10 + light.x};
          box-shadow: 0 0 10px ${light.color}, 0 2px 5px rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${lightSize * 0.6}px;
        "
        onclick="removeLight(${light.id})"
        title="Light Source (Radius: ${light.radius}, Intensity: ${Math.round(
          light.intensity * 100,
        )}%) - Click to remove">
          💡
        </div>
      `;
    });
  }

  // Draw Fog of War overlay in isometric view
  if (battleMap.fogOfWar.enabled) {
    const visibleCells = getVisibleCells(layer);

    for (let y = 0; y < layer.height; y++) {
      for (let x = 0; x < layer.width; x++) {
        const isVisible = isCellVisible(x, y, visibleCells);

        if (!isVisible) {
          const iso = gridToIsometric(x, y, cellSize);
          const isoX = iso.x + centerOffsetX + cellSize / 2;
          const isoY = iso.y + cellSize;

          // Check if this cell is lit
          const lightIntensity = getLightIntensityAtCell(x, y, layer);
          const baseOpacity = 0.7;
          const lightTransparency = battleMap.fogOfWar.lightTransparency;
          const finalOpacity =
            baseOpacity * (1 - lightIntensity * lightTransparency);

          // GM sees a semi-transparent isometric diamond on concealed cells
          gridHTML += `
            <div style="
              position: absolute;
              left: ${isoX}px;
              top: ${isoY}px;
              width: ${tileWidth}px;
              height: ${tileHeight}px;
              transform: translateX(-50%);
              pointer-events: none;
              z-index: ${1500 + y * 10 + x};
            ">
              <svg width="${tileWidth}" height="${tileHeight}" style="display: block;">
                <polygon points="${tileWidth / 2},0 ${tileWidth},${
                  tileHeight / 2
                } ${tileWidth / 2},${tileHeight} 0,${tileHeight / 2}"
                  fill="rgba(0, 0, 0, ${finalOpacity})"
                  stroke="rgba(50, 50, 50, ${finalOpacity * 0.5})"
                  stroke-width="2"
                />
              </svg>
            </div>
          `;
        }
      }
    }
  }

  // Draw wall drawing preview (if in edge mode and first corner selected)
  if (battleMap.edgeWallDrawing.active && battleMap.wallDrawMode === "edge") {
    const cornerX = battleMap.edgeWallDrawing.startCornerX;
    const cornerY = battleMap.edgeWallDrawing.startCornerY;

    // Convert corner to isometric coordinates
    const isoX = (cornerX - cornerY) * (cellSize * 0.5) + totalWidth / 2;
    const isoY = (cornerX + cornerY) * (cellSize * 0.25);

    // Draw indicator at the start corner
    gridHTML += `
      <div style="
        position: absolute;
        left: ${isoX - 8}px;
        top: ${isoY - 8}px;
        width: 16px;
        height: 16px;
        background: #ffeb3b;
        border: 2px solid #ffc107;
        border-radius: 50%;
        box-shadow: 0 0 10px rgba(255, 235, 59, 0.8);
        z-index: 3000;
        pointer-events: none;
      "></div>
    `;
  }

  // Draw map pings (after everything else)
  gridHTML += drawPingsHTML(layer, cellSize);

  gridHTML += `</div>`;

  // Check if this is the unified battle map container
  const isUnified = container.id === "unifiedBattleMapCanvas";

  // Add wrapper with scroll - different styling for unified view
  if (isUnified) {
    // Unified view: wrap map with padding for scrollable space around edges
    // Use nested flex wrapper to center when small, scroll when large
    // Extra horizontal padding (400px) allows scrolling left/right to avoid panel obstruction
    container.innerHTML = `
      <div style="min-width: 100%; min-height: 100%; display: flex; justify-content: center; align-items: center;">
        <div style="padding: 100px 400px; display: inline-block;">
          ${gridHTML}
        </div>
      </div>
    `;

    // Add info bar to the parent container (unifiedBattleMapCanvasContainer)
    const parentContainer = document.getElementById(
      "unifiedBattleMapCanvasContainer",
    );
    if (parentContainer) {
      // Remove existing info bar if present
      const existingInfo = parentContainer.querySelector(
        ".battle-map-info-bar",
      );
      if (existingInfo) existingInfo.remove();

      // Create new info bar
      const infoBar = document.createElement("div");
      infoBar.className = "battle-map-info-bar";
      infoBar.style.cssText = `
        position: fixed;
        bottom: 50px;
        left: 370px;
        right: 370px;
        padding: 10px;
        background: rgba(0, 0, 0, 0.95);
        border-radius: 4px;
        color: #888;
        font-size: 0.9em;
        border: 1px solid #4caf50;
        z-index: 10000;
        pointer-events: none;
        text-align: center;
      `;
      infoBar.innerHTML = `
        <strong>View:</strong> Isometric | 
        <strong>Zoom:</strong> ${Math.round(battleMap.zoom * 100)}% | 
        <strong>Map Size:</strong> ${layer.width}m × ${layer.height}m${
          battleMap.selectedCombatant
            ? ` | <strong>Selected:</strong> ${
                combatants.find((c) => c.id === battleMap.selectedCombatant)
                  ?.name || "Unknown"
              }`
            : ""
        }
      `;
      parentContainer.appendChild(infoBar);
    }
  } else {
    // Regular battle tab view: keep original wrapper
    container.innerHTML = `
      <div style="overflow: auto; max-width: 100%; max-height: 80vh; border-radius: 8px; background: #0a0a0a; padding: 10px;">
        <div style="padding: ${Math.max(100, cellSize * 2)}px; display: inline-block;">
          ${gridHTML}
        </div>
      </div>
      <div style="margin-top: 10px; padding: 10px; background: rgba(0, 0, 0, 0.3); border-radius: 4px; color: #888; font-size: 0.9em;">
        <strong>View:</strong> Isometric | <strong>Zoom:</strong> ${Math.round(
          battleMap.zoom * 100,
        )}% | 
        <strong>Map Size:</strong> ${layer.width}m × ${layer.height}m
        ${
          battleMap.selectedCombatant
            ? ` | <strong>Selected:</strong> ${
                combatants.find((c) => c.id === battleMap.selectedCombatant)
                  ?.name || "Unknown"
              }`
            : ""
        }
      </div>
    `;
  }
}

// ==================== COMBATANT UTILITIES ==================== //

function getCombatantColor(combatant) {
  // Check for Horror Mode
  const isHorrorMode = document.body.classList.contains("horror-mode-active");
  const pcColor = isHorrorMode ? "#ff0000" : "#4CAF50";

  if (combatant.type === "PC") return pcColor; // Red in Horror Mode, Green otherwise
  if (combatant.type === "NPC") return "#2196F3"; // Blue for NPCs
  if (combatant.type === "Enemy" || combatant.type === "Creature")
    return "#DC143C"; // Red for enemies/creatures
  return "#9E9E9E"; // Gray default
}

function getCombatantIcon(combatant) {
  // Check if there's a custom token set for this combatant
  const customToken = battleMap.customTokens[combatant.id];
  if (customToken) {
    if (customToken.type === "emoji") {
      return customToken.value;
    } else if (customToken.type === "image") {
      // Return null to signal image rendering
      return null;
    }
  }

  // Check if there's a preset token from the source entity
  if (combatant.sourceToken) {
    if (combatant.sourceToken.type === "emoji") {
      return combatant.sourceToken.value;
    } else if (combatant.sourceToken.type === "image") {
      return null;
    }
  }

  // Default icons
  if (combatant.type === "PC") return "🎭";
  if (combatant.type === "NPC") return "👤";
  if (combatant.type === "Enemy" || combatant.type === "Creature") return "💀";
  return "❓";
}

function placeCombatantsOnMap() {
  const layer = getActiveLayer();
  // Auto-place combatants that don't have positions
  combatants.forEach((combatant, index) => {
    if (!layer.combatantPositions[combatant.id]) {
      // Place in a line along the top or bottom based on type
      const yPos = combatant.type === "PC" ? layer.height - 2 : 1;
      const xPos = Math.min(2 + index, layer.width - 2);
      layer.combatantPositions[combatant.id] = {
        x: Math.max(0, xPos),
        y: yPos,
      };
    }
    // Initialize facing if not set (PCs face north, enemies face south)
    if (layer.combatantFacing[combatant.id] === undefined) {
      layer.combatantFacing[combatant.id] = combatant.type === "PC" ? 0 : 180;
    }
  });
  renderBattleMap();
}

function selectCombatantOnMap(combatantId) {
  // Allow selection with move, rotate, and elevation tools
  if (
    battleMap.selectedTool !== "move" &&
    battleMap.selectedTool !== "rotate" &&
    battleMap.selectedTool !== "elevation"
  )
    return;
  // Don't toggle selection during drag
  if (battleMap.dragging.active) return;

  if (battleMap.selectedCombatant === combatantId) {
    battleMap.selectedCombatant = null;
  } else {
    battleMap.selectedCombatant = combatantId;
    const layer = getActiveLayer();
    // Initialize facing to 0 if not set
    if (layer.combatantFacing[combatantId] === undefined) {
      layer.combatantFacing[combatantId] = 0;
    }
  }

  // Regenerate controls to show/hide rotation panel
  renderBattleMapControls();
  updateRotationDisplay();
  renderBattleMap();
}

// ==================== DRAG AND DROP ==================== //

function startDragCombatant(event, combatantId) {
  if (battleMap.selectedTool !== "move") return;

  event.preventDefault();
  event.stopPropagation();

  const token = event.currentTarget;
  const rect = token.getBoundingClientRect();
  const gridContainer = token.parentElement;
  const gridRect = gridContainer.getBoundingClientRect();

  // Store original position for distance calculation
  const layer = getActiveLayer();
  const originalPos = layer.combatantPositions[combatantId];

  battleMap.dragging = {
    active: true,
    combatantId: combatantId,
    startX: event.clientX,
    startY: event.clientY,
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top,
    gridOffsetX: gridRect.left,
    gridOffsetY: gridRect.top,
    originalPos: originalPos ? { x: originalPos.x, y: originalPos.y } : null,
  };

  // Change cursor
  token.style.cursor = "grabbing";
  token.style.zIndex = "200";
  token.style.opacity = "0.8";

  // Add global mouse event listeners
  document.addEventListener("mousemove", dragCombatant);
  document.addEventListener("mouseup", endDragCombatant);
}

function dragCombatant(event) {
  if (!battleMap.dragging.active) return;

  event.preventDefault();

  const token = document.querySelector(
    `[data-combatant-id="${battleMap.dragging.combatantId}"]`,
  );
  if (!token) return;

  // Calculate new position
  const newLeft =
    event.clientX - battleMap.dragging.gridOffsetX - battleMap.dragging.offsetX;
  const newTop =
    event.clientY - battleMap.dragging.gridOffsetY - battleMap.dragging.offsetY;

  // Update token position
  token.style.left = newLeft + "px";
  token.style.top = newTop + "px";
  token.style.transition = "none";

  // Calculate grid position for hover highlight and distance
  const layer = getActiveLayer();
  const cellSize = battleMap.gridSize * battleMap.zoom;
  const tokenCenterX = event.clientX - battleMap.dragging.gridOffsetX;
  const tokenCenterY = event.clientY - battleMap.dragging.gridOffsetY;
  const rawGridX = tokenCenterX / cellSize;
  const rawGridY = tokenCenterY / cellSize;
  const snapped = applyGridSnap(rawGridX, rawGridY);

  // Update hover cell and calculate distance
  if (
    snapped.x >= 0 &&
    snapped.x < layer.width &&
    snapped.y >= 0 &&
    snapped.y < layer.height
  ) {
    battleMap.hoverCell = { x: snapped.x, y: snapped.y };

    // Calculate and display distance while dragging
    if (battleMap.showMoveDistance && battleMap.dragging.originalPos) {
      const distance = calculateDistance(
        battleMap.dragging.originalPos.x,
        battleMap.dragging.originalPos.y,
        snapped.x,
        snapped.y,
      );

      // Update or create distance indicator
      let distanceIndicator = document.getElementById(
        "drag-distance-indicator",
      );
      if (!distanceIndicator) {
        distanceIndicator = document.createElement("div");
        distanceIndicator.id = "drag-distance-indicator";
        distanceIndicator.style.cssText = `
          position: fixed;
          background: rgba(76, 175, 80, 0.95);
          color: #fff;
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: bold;
          font-size: 14px;
          white-space: nowrap;
          z-index: 10000;
          pointer-events: none;
          border: 2px solid #fff;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
        `;
        document.body.appendChild(distanceIndicator);
      }

      distanceIndicator.style.left = event.clientX + 20 + "px";
      distanceIndicator.style.top = event.clientY - 40 + "px";
      distanceIndicator.textContent = `${distance.toFixed(1)}m (${Math.round(
        distance,
      )} squares)`;
      distanceIndicator.style.display = "block";
    }

    // Update hover highlight without full re-render
    updateHoverHighlight(snapped.x, snapped.y, cellSize);
  }
}

// Update or create hover highlight element
function updateHoverHighlight(x, y, cellSize) {
  let hoverHighlight = document.getElementById("hover-highlight");
  if (!hoverHighlight) {
    hoverHighlight = document.createElement("div");
    hoverHighlight.id = "hover-highlight";
    hoverHighlight.style.cssText = `
      position: absolute;
      background: rgba(76, 175, 80, 0.4);
      border: 3px solid rgba(76, 175, 80, 1);
      pointer-events: none;
      z-index: 149;
      box-shadow: 0 0 15px rgba(76, 175, 80, 0.6);
      transition: left 0.1s, top 0.1s;
    `;
    const gridContainer = document.querySelector(".battle-map-grid");
    if (gridContainer) {
      gridContainer.appendChild(hoverHighlight);
    }
  }

  hoverHighlight.style.left = (x + 0.5) * cellSize + "px";
  hoverHighlight.style.top = (y + 0.5) * cellSize + "px";
  hoverHighlight.style.width = cellSize * 0.9 + "px";
  hoverHighlight.style.height = cellSize * 0.9 + "px";
  hoverHighlight.style.transform = "translate(-50%, -50%)";
  hoverHighlight.style.display = "block";
}

function endDragCombatant(event) {
  if (!battleMap.dragging.active) return;

  event.preventDefault();

  const combatantId = battleMap.dragging.combatantId;
  const token = document.querySelector(`[data-combatant-id="${combatantId}"]`);
  const layer = getActiveLayer();

  // Calculate grid position
  const cellSize = battleMap.gridSize * battleMap.zoom;
  const tokenCenterX = event.clientX - battleMap.dragging.gridOffsetX;
  const tokenCenterY = event.clientY - battleMap.dragging.gridOffsetY;

  const rawGridX = tokenCenterX / cellSize;
  const rawGridY = tokenCenterY / cellSize;

  // Apply grid snapping
  const snapped = applyGridSnap(rawGridX, rawGridY);
  const gridX = snapped.x;
  const gridY = snapped.y;

  // Validate position
  if (gridX >= 0 && gridX < layer.width && gridY >= 0 && gridY < layer.height) {
    const oldPos = layer.combatantPositions[combatantId];

    // Track move distance if enabled
    if (battleMap.showMoveDistance && oldPos) {
      const distance = calculateDistance(oldPos.x, oldPos.y, gridX, gridY);

      battleMap.movePreview = {
        fromX: oldPos.x,
        fromY: oldPos.y,
        toX: gridX,
        toY: gridY,
        distance: distance,
      };

      // Clear preview after 2 seconds
      setTimeout(() => {
        battleMap.movePreview = null;
        renderBattleMap();
      }, 2000);
    }

    // Calculate movement direction and update facing
    if (oldPos) {
      const dx = gridX - oldPos.x;
      const dy = gridY - oldPos.y;
      if (dx !== 0 || dy !== 0) {
        // Calculate angle: atan2(dx, -dy) gives angle where 0° = North
        let angle = Math.atan2(dx, -dy) * (180 / Math.PI);
        if (angle < 0) angle += 360;
        // Round to nearest 45° increment for 8-directional system
        angle = Math.round(angle / 45) * 45;
        if (angle >= 360) angle = 0;
        layer.combatantFacing[combatantId] = angle;
      }
    }

    layer.combatantPositions[combatantId] = { x: gridX, y: gridY };

    // Update fog of war if in exploration mode
    if (
      battleMap.fogOfWar.enabled &&
      battleMap.fogOfWar.mode === "exploration"
    ) {
      getVisibleCells(layer); // This updates revealedCells
    }

    saveBattleMapState();

    // Re-sync combat if fog is enabled (combatant might have moved into/out of visibility)
    if (
      typeof syncCombatToPlayers === "function" &&
      typeof combatActive !== "undefined" &&
      combatActive &&
      battleMap.fogOfWar.enabled
    ) {
      console.log(
        "🌫️ Combatant moved with fog active - re-syncing combat visibility",
      );
      syncCombatToPlayers();
    }
  }

  // Reset dragging state
  battleMap.dragging = {
    active: false,
    combatantId: null,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
    originalPos: null,
  };

  // Clear hover cell
  battleMap.hoverCell = null;

  // Remove distance indicator and hover highlight
  const distanceIndicator = document.getElementById("drag-distance-indicator");
  if (distanceIndicator) {
    distanceIndicator.style.display = "none";
  }
  const hoverHighlight = document.getElementById("hover-highlight");
  if (hoverHighlight) {
    hoverHighlight.style.display = "none";
  }

  // Clean up event listeners
  document.removeEventListener("mousemove", dragCombatant);
  document.removeEventListener("mouseup", endDragCombatant);

  // Re-render to snap to grid
  renderBattleMap();
}

// ==================== MAP INTERACTION ==================== //

// Handle click event from grid cells - calculates precise position
function handleBattleMapClickEvent(event, cellX, cellY) {
  // Check if we need precise fractional coordinates for edge wall corner detection
  const needsFractionalCoords =
    battleMap.wallDrawMode === "edge" &&
    (battleMap.selectedTool === "wall" ||
      battleMap.selectedTool === "door" ||
      battleMap.selectedTool === "window" ||
      battleMap.selectedTool === "furniture") &&
    terrainTypes[battleMap.selectedTool];

  // Also need fractional coords for edge wall erasing
  const isEdgeErasing =
    battleMap.selectedTool === "erase" && battleMap.wallDrawMode === "edge";

  if (needsFractionalCoords || isEdgeErasing) {
    // Get the grid container element for precise coordinate calculation
    const gridElement = event.currentTarget.closest(".battle-map-grid");
    if (!gridElement) {
      handleBattleMapClick(cellX, cellY);
      return;
    }

    const cellSize = battleMap.gridSize * battleMap.zoom;

    // Get click position relative to the grid element
    const rect = gridElement.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    // Calculate which cell and position within cell
    const rawCellX = clickX / cellSize;
    const rawCellY = clickY / cellSize;

    // Pass the raw fractional cell coordinates
    handleBattleMapClick(rawCellX, rawCellY);
  } else {
    // For all other tools, use the simple integer cell coordinates
    handleBattleMapClick(cellX, cellY);
  }
}

function handleBattleMapClick(rawX, rawY) {
  // Apply grid snapping
  const snapped = applyGridSnap(rawX, rawY);
  const x = snapped.x;
  const y = snapped.y;

  // Handle ping placement mode first
  if (battleMap.pingActive) {
    placePing(x, y);
    return;
  }

  // Handle light placement mode first
  if (battleMap.selectedLightTool === "light") {
    placeLightSource(x, y);
    return;
  }

  // Handle AoE placement mode first
  if (battleMap.aoePlacementMode && battleMap.selectedAoeTool) {
    const rotation = battleMap.aoePreview ? battleMap.aoePreview.rotation : 0;
    placeAoeTemplateAt(x, y, rotation);
    return;
  }

  if (battleMap.selectedTool === "move") {
    // Move selected combatant
    if (battleMap.selectedCombatant) {
      const layer = getActiveLayer();
      const oldPos = layer.combatantPositions[battleMap.selectedCombatant];

      // Calculate and store distance if enabled
      if (battleMap.showMoveDistance && oldPos) {
        const distance = calculateDistance(oldPos.x, oldPos.y, x, y);
        battleMap.movePreview = {
          fromX: oldPos.x,
          fromY: oldPos.y,
          toX: x,
          toY: y,
          distance: distance,
        };
      }

      // Calculate movement direction and update facing
      const dx = x - oldPos.x;
      const dy = y - oldPos.y;
      if (dx !== 0 || dy !== 0) {
        // Calculate angle: atan2(dx, -dy) gives angle where 0° = North
        let angle = Math.atan2(dx, -dy) * (180 / Math.PI);
        if (angle < 0) angle += 360;
        // Round to nearest 45° increment for 8-directional system
        angle = Math.round(angle / 45) * 45;
        if (angle >= 360) angle = 0;
        layer.combatantFacing[battleMap.selectedCombatant] = angle;
      }

      layer.combatantPositions[battleMap.selectedCombatant] = { x, y };
      battleMap.selectedCombatant = null;

      // Update fog of war if in exploration mode
      if (
        battleMap.fogOfWar.enabled &&
        battleMap.fogOfWar.mode === "exploration"
      ) {
        getVisibleCells(layer); // This updates revealedCells
      }

      renderBattleMap();

      // Clear move preview after a delay
      if (battleMap.movePreview) {
        setTimeout(() => {
          battleMap.movePreview = null;
          renderBattleMap();
        }, 2000);
      }

      saveBattleMapState();
    }
  } else if (battleMap.selectedTool === "measure") {
    // Handle distance measurement
    if (!battleMap.measuring.active || battleMap.measuring.startX === null) {
      // Start measurement
      battleMap.measuring = {
        active: true,
        startX: x,
        startY: y,
        endX: x,
        endY: y,
      };
    } else {
      // Complete measurement and reset
      battleMap.measuring = {
        active: false,
        startX: null,
        startY: null,
        endX: null,
        endY: null,
      };
    }
    renderBattleMap();
  } else if (battleMap.selectedTool === "erase") {
    // Remove terrain or edge walls
    const layer = getActiveLayer();

    saveBattleMapSnapshot(); // snapshot before erase

    if (battleMap.wallDrawMode === "edge") {
      // Determine which edge was clicked based on raw coordinates
      const edge = determineNearestEdge(rawX, rawY, x, y);

      // Remove edge wall at this location and edge, plus check adjacent cells
      const initialCount = layer.edgeWalls.length;
      layer.edgeWalls = layer.edgeWalls.filter((w) => {
        // Direct match
        if (w.x === x && w.y === y && w.edge === edge) return false;

        // Check for edge walls on adjacent cells that share this edge
        if (edge === "n" && w.x === x && w.y === y - 1 && w.edge === "s")
          return false;
        if (edge === "s" && w.x === x && w.y === y + 1 && w.edge === "n")
          return false;
        if (edge === "w" && w.x === x - 1 && w.y === y && w.edge === "e")
          return false;
        if (edge === "e" && w.x === x + 1 && w.y === y && w.edge === "w")
          return false;

        return true;
      });

      // If no walls were removed, try erasing any edge wall very close to the click
      if (layer.edgeWalls.length === initialCount) {
        const tolerance = 0.15; // Within 15% of a cell from the edge
        const localX = rawX - Math.floor(rawX);
        const localY = rawY - Math.floor(rawY);

        layer.edgeWalls = layer.edgeWalls.filter((w) => {
          if (
            Math.floor(w.x) !== Math.floor(rawX) ||
            Math.floor(w.y) !== Math.floor(rawY)
          ) {
            // Not in the same cell vicinity
            return true;
          }

          // Check if click is near this edge
          if (w.edge === "n" && localY < tolerance) return false;
          if (w.edge === "s" && localY > 1 - tolerance) return false;
          if (w.edge === "w" && localX < tolerance) return false;
          if (w.edge === "e" && localX > 1 - tolerance) return false;

          return true;
        });
      }
    } else {
      // Remove square terrain at this location
      layer.terrain = layer.terrain.filter((t) => !(t.x === x && t.y === y));
    }

    renderBattleMap();
    saveBattleMapState();
  } else if (terrainTypes[battleMap.selectedTool]) {
    // Add terrain
    const layer = getActiveLayer();

    if (
      battleMap.wallDrawMode === "edge" &&
      (battleMap.selectedTool === "wall" ||
        battleMap.selectedTool === "door" ||
        battleMap.selectedTool === "window" ||
        battleMap.selectedTool === "furniture")
    ) {
      // Edge wall drawing: corner-to-corner line
      const corner = determineNearestCorner(rawX, rawY);

      if (!battleMap.edgeWallDrawing.active) {
        // First click - start the line
        battleMap.edgeWallDrawing.active = true;
        battleMap.edgeWallDrawing.startCornerX = corner.x;
        battleMap.edgeWallDrawing.startCornerY = corner.y;
        renderBattleMap(); // Show preview
      } else {
        // Second click - complete the line
        const startX = battleMap.edgeWallDrawing.startCornerX;
        const startY = battleMap.edgeWallDrawing.startCornerY;
        const endX = corner.x;
        const endY = corner.y;

        saveBattleMapSnapshot(); // snapshot before committing edge wall line

        // Draw walls between corners
        drawWallsBetweenCorners(
          startX,
          startY,
          endX,
          endY,
          battleMap.selectedTool,
        );

        // Reset for next line
        battleMap.edgeWallDrawing.active = false;
        battleMap.edgeWallDrawing.startCornerX = null;
        battleMap.edgeWallDrawing.startCornerY = null;

        renderBattleMap();
        saveBattleMapState();
      }
    } else {
      // Place square terrain (normal mode)
      saveBattleMapSnapshot(); // snapshot before placing square terrain
      // Remove existing terrain at this location first
      layer.terrain = layer.terrain.filter((t) => !(t.x === x && t.y === y));
      // Add new terrain
      layer.terrain.push({
        x,
        y,
        type: battleMap.selectedTool,
        color: terrainTypes[battleMap.selectedTool].color,
      });

      renderBattleMap();
      saveBattleMapState();
    }
  }
}

// Determine which corner of the grid was clicked based on raw coordinates
function determineNearestCorner(rawX, rawY) {
  // rawX and rawY are fractional cell coordinates (e.g., 2.7, 3.2)

  // Find which cell we're in
  const cellX = Math.floor(rawX);
  const cellY = Math.floor(rawY);

  // Calculate position within the cell (0 to 1)
  const localX = rawX - cellX;
  const localY = rawY - cellY;

  // Determine which corner is closest
  const cornerX = localX < 0.5 ? cellX : cellX + 1;
  const cornerY = localY < 0.5 ? cellY : cellY + 1;

  return { x: cornerX, y: cornerY };
}

// Draw walls between two corners
function drawWallsBetweenCorners(startX, startY, endX, endY, wallType) {
  const layer = getActiveLayer();
  console.log(
    `🏗️ drawWallsBetweenCorners called: (${startX},${startY}) → (${endX},${endY}), type: ${wallType}`,
  );
  console.log(`🏗️ Current layer:`, layer);
  console.log(`🏗️ Layer edgeWalls before:`, layer.edgeWalls?.length || 0);

  // Handle horizontal line (same Y)
  if (startY === endY) {
    const minX = Math.min(startX, endX);
    const maxX = Math.max(startX, endX);
    const y = startY;

    for (let x = minX; x < maxX; x++) {
      // Determine if this is a north or south edge
      const edge = y === 0 ? "n" : "s";
      const cellY = edge === "n" ? y : y - 1;

      // Remove existing wall at this location
      layer.edgeWalls = layer.edgeWalls.filter(
        (w) => !(w.x === x && w.y === cellY && w.edge === edge),
      );

      // Add new wall
      layer.edgeWalls.push({
        x: x,
        y: cellY,
        edge: edge,
        type: wallType,
        color: terrainTypes[wallType].color,
      });
    }
  }
  // Handle vertical line (same X)
  else if (startX === endX) {
    const minY = Math.min(startY, endY);
    const maxY = Math.max(startY, endY);
    const x = startX;

    for (let y = minY; y < maxY; y++) {
      // Determine if this is a west or east edge
      const edge = x === 0 ? "w" : "e";
      const cellX = edge === "w" ? x : x - 1;

      // Remove existing wall at this location
      layer.edgeWalls = layer.edgeWalls.filter(
        (w) => !(w.x === cellX && w.y === y && w.edge === edge),
      );

      // Add new wall
      layer.edgeWalls.push({
        x: cellX,
        y: y,
        edge: edge,
        type: wallType,
        color: terrainTypes[wallType].color,
      });
    }
  }
  // Handle diagonal or L-shaped path
  else {
    // Draw horizontal segment first, then vertical
    const midX = endX;
    const midY = startY;

    // Horizontal part
    drawWallsBetweenCorners(startX, startY, midX, midY, wallType);
    // Vertical part
    drawWallsBetweenCorners(midX, midY, endX, endY, wallType);
  }
}

// Determine which edge of a cell was clicked based on raw coordinates
function determineNearestEdge(rawX, rawY, cellX, cellY) {
  // rawX, rawY are fractional cell coordinates (e.g., 2.7, 3.2)
  // cellX, cellY are the snapped integer cell coordinates (e.g., 2, 3)

  // Calculate position within the cell (0 to 1)
  const localX = rawX - cellX;
  const localY = rawY - cellY;

  // Determine which edge is closest
  const distToNorth = localY;
  const distToSouth = 1 - localY;
  const distToWest = localX;
  const distToEast = 1 - localX;

  const minDist = Math.min(distToNorth, distToSouth, distToWest, distToEast);

  if (minDist === distToNorth) return "n";
  if (minDist === distToSouth) return "s";
  if (minDist === distToWest) return "w";
  return "e";
}

function handleBattleMapClickIso(event, gridX, gridY) {
  // Handle clicks in isometric view - coordinates are already converted
  handleBattleMapClick(gridX, gridY);
}

// Update tool button active states without full re-render
function updateToolButtonStates() {
  // Update regular tool buttons
  const allToolButtons = document.querySelectorAll(".tool-button");
  allToolButtons.forEach((button) => {
    button.classList.remove("active");
  });

  if (battleMap.selectedTool) {
    const activeButtons = document.querySelectorAll(
      `.tool-button[onclick*="'${battleMap.selectedTool}'"]`,
    );
    activeButtons.forEach((button) => {
      button.classList.add("active");
    });
  }

  // Update light tool buttons
  const lightButtons = document.querySelectorAll(
    'button[onclick="selectLightTool()"]',
  );
  lightButtons.forEach((button) => {
    if (battleMap.selectedLightTool) {
      button.style.background = "rgba(255, 193, 7, 0.3)";
      button.style.borderColor = "#FFC107";
    } else {
      button.style.background = "rgba(255, 193, 7, 0.1)";
      button.style.borderColor = "#FFA000";
    }
  });

  // Update AoE tool buttons
  const aoeButtons = document.querySelectorAll('[onclick^="selectAoeTool"]');
  aoeButtons.forEach((button) => {
    const toolMatch = button
      .getAttribute("onclick")
      .match(/selectAoeTool\('(\w+)'\)/);
    if (toolMatch && toolMatch[1] === battleMap.selectedAoeTool) {
      button.style.background = "rgba(156, 39, 176, 0.3)";
    } else {
      button.style.background = "rgba(156, 39, 176, 0.1)";
    }
  });
}

function selectBattleMapTool(tool) {
  battleMap.selectedTool = tool;
  battleMap.selectedCombatant = null;

  // Reset measurement when switching tools
  if (tool !== "measure") {
    battleMap.measuring = {
      active: false,
      startX: null,
      startY: null,
      endX: null,
      endY: null,
    };
  }

  // Reset edge wall drawing when switching tools
  battleMap.edgeWallDrawing = {
    active: false,
    startCornerX: null,
    startCornerY: null,
  };

  // Update button states without full re-render to preserve menu state
  updateToolButtonStates();
  renderBattleMap();
}

// Calculate distance between two points (Euclidean distance)
function calculateDistance(x1, y1, x2, y2) {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

// Handle mouse movement for live measurement preview
function handleMeasurePreview(event) {
  // Handle AoE placement preview
  if (battleMap.aoePlacementMode && battleMap.selectedAoeTool) {
    // Find the grid within the current container (event.currentTarget)
    const canvas = event.currentTarget.querySelector(".battle-map-grid");
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const cellSize = battleMap.gridSize * battleMap.zoom;

    const x = Math.floor((event.clientX - rect.left) / cellSize);
    const y = Math.floor((event.clientY - rect.top) / cellSize);

    const layer = getActiveLayer();
    if (x >= 0 && x < layer.width && y >= 0 && y < layer.height) {
      // Calculate rotation for cone and line
      let rotation = 0;
      if (
        battleMap.selectedAoeTool === "cone" ||
        battleMap.selectedAoeTool === "line"
      ) {
        // Calculate angle from center of cell to mouse position
        const centerX = (x + 0.5) * cellSize;
        const centerY = (y + 0.5) * cellSize;
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        // Calculate in radians, then convert to degrees for storage
        const radians = Math.atan2(mouseY - centerY, mouseX - centerX);
        rotation = (radians * 180) / Math.PI;
      }

      updateAoePreview(x, y, rotation);
    }
    return;
  }

  // Handle measurement preview
  if (
    battleMap.selectedTool !== "measure" ||
    !battleMap.measuring.active ||
    battleMap.measuring.startX === null
  ) {
    return;
  }

  // Find the grid within the current container (event.currentTarget)
  const canvas = event.currentTarget.querySelector(".battle-map-grid");
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const cellSize = battleMap.gridSize * battleMap.zoom;

  const x = Math.floor((event.clientX - rect.left) / cellSize);
  const y = Math.floor((event.clientY - rect.top) / cellSize);

  const layer = getActiveLayer();
  if (x >= 0 && x < layer.width && y >= 0 && y < layer.height) {
    battleMap.measuring.endX = x;
    battleMap.measuring.endY = y;
    renderBattleMap();
  }
}

// ==================== LAYER MANAGEMENT ==================== //

function addNewLayer() {
  const layerName = prompt(
    "Enter name for new layer:",
    `Floor ${battleMap.layers.length + 1}`,
  );
  if (!layerName) return;

  const newLayer = {
    id: battleMap.nextLayerId++,
    name: layerName,
    width: 10,
    height: 10,
    terrain: [],
    edgeWalls: [],
    backgroundImage: null,
    combatantPositions: {},
    combatantFacing: {},
    lights: [],
  };

  battleMap.layers.push(newLayer);
  battleMap.activeLayerId = newLayer.id;
  renderBattleMapControls();
  renderBattleMap();
  saveBattleMapState();
}

function renameActiveLayer() {
  const layer = getActiveLayer();
  const newName = prompt("Enter new name for layer:", layer.name);
  if (newName && newName.trim()) {
    layer.name = newName.trim();
    renderBattleMapControls();
    saveBattleMapState();
  }
}

function deleteActiveLayer() {
  if (battleMap.layers.length === 1) {
    alert("Cannot delete the last layer.");
    return;
  }

  const layer = getActiveLayer();
  if (
    !confirm(
      `Are you sure you want to delete the layer "${layer.name}"?\n\nAll terrain, combatants, and background images on this layer will be lost.`,
    )
  ) {
    return;
  }

  battleMap.layers = battleMap.layers.filter((l) => l.id !== layer.id);
  battleMap.activeLayerId = battleMap.layers[0].id;
  renderBattleMapControls();
  renderBattleMap();
  saveBattleMapState();
}

// ==================== MAP SIZE ==================== //

function updateMapSize() {
  // Check if unified modal is active
  const unifiedModal = document.getElementById("unifiedBattleMapModal");
  const isUnifiedActive = unifiedModal && unifiedModal.style.display !== "none";

  // Get inputs from the appropriate container
  let widthInput, heightInput;
  if (isUnifiedActive) {
    // Get from unified controls
    const unifiedControls = document.getElementById("unifiedBattleMapControls");
    if (unifiedControls) {
      widthInput = unifiedControls.querySelector("#mapWidth");
      heightInput = unifiedControls.querySelector("#mapHeight");
    }
  } else {
    // Get from regular controls
    widthInput = document.getElementById("mapWidth");
    heightInput = document.getElementById("mapHeight");
  }

  if (!widthInput || !heightInput) return;

  const width = parseInt(widthInput.value);
  const height = parseInt(heightInput.value);
  const layer = getActiveLayer();

  if (width >= 5 && width <= 50 && height >= 5 && height <= 50) {
    layer.width = width;
    layer.height = height;

    // Remove terrain and combatants outside new bounds
    layer.terrain = layer.terrain.filter((t) => t.x < width && t.y < height);
    Object.keys(layer.combatantPositions).forEach((id) => {
      const pos = layer.combatantPositions[id];
      if (pos.x >= width || pos.y >= height) {
        delete layer.combatantPositions[id];
      }
    });

    renderBattleMap();
    saveBattleMapState();
  }
}

function zoomBattleMap(delta) {
  battleMap.zoom = Math.max(0.5, Math.min(2.0, battleMap.zoom + delta));
  renderBattleMap();
}

function resetBattleMapZoom() {
  battleMap.zoom = 1.0;
  renderBattleMap();
}

function fitBattleMapToScreen() {
  const layer = getActiveLayer();
  if (!layer) return;

  // Get the container element
  const container = document.getElementById("unifiedBattleMapCanvasContainer");
  if (!container) {
    // Fallback to regular container if unified not found
    battleMap.zoom = 1.0;
    renderBattleMap();
    return;
  }

  // Get container dimensions (accounting for padding)
  const containerWidth = container.clientWidth - 40; // Account for padding/margins
  const containerHeight = container.clientHeight - 150; // Account for padding, info bar, and toolbar space

  // Calculate map dimensions at 100% zoom
  const baseMapWidth = layer.width * battleMap.gridSize;
  const baseMapHeight = layer.height * battleMap.gridSize;

  // Calculate zoom factors to fit width and height
  const zoomX = containerWidth / baseMapWidth;
  const zoomY = containerHeight / baseMapHeight;

  // Use the smaller zoom to ensure map fits in both dimensions
  const optimalZoom = Math.min(zoomX, zoomY);

  // Clamp zoom to allowed range
  battleMap.zoom = Math.max(0.5, Math.min(2.0, optimalZoom));

  renderBattleMap();
  console.log(`🔍 Fit to screen: ${Math.round(battleMap.zoom * 100)}%`);
}

function toggleNames() {
  battleMap.showNames = !battleMap.showNames;
  renderBattleMap();
  saveBattleMapState();
}

function toggleLineOfSight() {
  battleMap.showLineOfSight = !battleMap.showLineOfSight;
  console.log("Line of sight toggled:", battleMap.showLineOfSight); // Debug
  renderBattleMap();
  saveBattleMapState();
}

function toggleViewMode() {
  battleMap.viewMode = battleMap.viewMode === "2d" ? "isometric" : "2d";
  renderBattleMap();
  saveBattleMapState();
}

// ==================== FOG OF WAR ==================== //

function toggleFogOfWar() {
  battleMap.fogOfWar.enabled = !battleMap.fogOfWar.enabled;
  renderBattleMapControls();
  renderBattleMap();
  saveBattleMapState();

  // Re-sync combat to update initiative visibility when fog changes
  if (
    typeof syncCombatToPlayers === "function" &&
    typeof combatActive !== "undefined" &&
    combatActive
  ) {
    console.log("🌫️ Fog toggled - re-syncing combat for visibility");
    syncCombatToPlayers();
  }
}

function setFogOfWarMode(mode) {
  battleMap.fogOfWar.mode = mode;
  if (mode === "lineOfSight") {
    // Line of sight mode doesn't need revealed cells
  } else {
    // Exploration mode: initialize revealed cells for current layer if needed
    const layer = getActiveLayer();
    if (!battleMap.fogOfWar.revealedCells[layer.id]) {
      battleMap.fogOfWar.revealedCells[layer.id] = {};
    }
  }
  renderBattleMap();
  saveBattleMapState();
}

function updateFogVisionDistance(value) {
  battleMap.fogOfWar.visionDistance = parseInt(value);
  document.getElementById("fogVisionValue").textContent = value;
  renderBattleMap();
  saveBattleMapState();
}

function clearFogOfWar() {
  if (
    confirm("Reset all revealed areas? This will re-conceal the entire map.")
  ) {
    battleMap.fogOfWar.revealedCells = {};
    renderBattleMap();
    saveBattleMapState();
  }
}

function updateFogLightTransparency(value) {
  battleMap.fogOfWar.lightTransparency = parseInt(value) / 100;
  document.getElementById("fogLightTransparencyValue").textContent =
    value + "%";
  renderBattleMap();
  saveBattleMapState();
}

// ==================== DYNAMIC LIGHTING ==================== //

function selectLightTool() {
  if (battleMap.selectedLightTool === "light") {
    battleMap.selectedLightTool = null;
  } else {
    battleMap.selectedLightTool = "light";
    battleMap.selectedTool = null; // Deselect other tools
    battleMap.selectedAoeTool = null;
    battleMap.aoePlacementMode = false;
  }
  updateToolButtonStates();
  renderBattleMap();
}

function updateLightRadius(value) {
  battleMap.defaultLightRadius = parseInt(value);
  const valueDisplays = document.querySelectorAll("#lightRadiusValue");
  valueDisplays.forEach((display) => {
    display.textContent = value;
  });
}

function updateLightIntensity(value) {
  battleMap.defaultLightIntensity = parseInt(value) / 100;
  document.getElementById("lightIntensityValue").textContent = value + "%";
  renderBattleMapControls();
}

function updateLightColor(value) {
  battleMap.defaultLightColor = value;
  renderBattleMapControls();
}

function placeLightSource(x, y) {
  const layer = getActiveLayer();
  if (!layer.lights) {
    layer.lights = [];
  }

  const newLight = {
    id: battleMap.nextLightId++,
    x: x,
    y: y,
    radius: battleMap.defaultLightRadius,
    color: battleMap.defaultLightColor,
    intensity: battleMap.defaultLightIntensity,
  };

  layer.lights.push(newLight);
  battleMap.selectedLightTool = null; // Deselect tool after placing
  renderBattleMapControls();
  renderBattleMap();
  saveBattleMapState();
}

function removeLight(lightId) {
  const layer = getActiveLayer();
  if (layer.lights) {
    layer.lights = layer.lights.filter((l) => l.id !== lightId);
    renderBattleMapControls();
    renderBattleMap();
    saveBattleMapState();
  }
}

function clearAllLights() {
  if (confirm("Remove all light sources from this layer?")) {
    const layer = getActiveLayer();
    layer.lights = [];
    renderBattleMapControls();
    renderBattleMap();
    saveBattleMapState();
  }
}
window.clearAllLights = clearAllLights;

// Check if light is blocked by terrain between two points
function calculateLightBlocking(x0, y0, x1, y1, layer) {
  // Early exit if no terrain or edge walls to check
  if (
    (!layer.terrain || layer.terrain.length === 0) &&
    (!layer.edgeWalls || layer.edgeWalls.length === 0)
  ) {
    return 1.0;
  }

  // Bresenham's line algorithm to trace ray from light to cell
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);

  // If adjacent cells, check for edge walls but skip terrain ray tracing
  if (dx <= 1 && dy <= 1 && dx + dy > 0) {
    // Check for edge wall between adjacent cells
    if (layer.edgeWalls && layer.edgeWalls.length > 0) {
      const xDiff = x1 - x0;
      const yDiff = y1 - y0;

      // Moving horizontally
      if (xDiff === 1) {
        // Moving east: check 'e' edge of (x0,y0) or 'w' edge of (x1,y1)
        const edgeWall = layer.edgeWalls.find(
          (w) =>
            (w.x === x0 && w.y === y0 && w.edge === "e") ||
            (w.x === x1 && w.y === y1 && w.edge === "w"),
        );
        if (edgeWall) {
          if (edgeWall.type === "wall" || edgeWall.type === "door") return 0.0;
          if (edgeWall.type === "window") return 0.9;
          if (edgeWall.type === "furniture") return 0.5;
          if (edgeWall.type === "landscape") return 0.7;
        }
      } else if (xDiff === -1) {
        // Moving west: check 'w' edge of (x0,y0) or 'e' edge of (x1,y1)
        const edgeWall = layer.edgeWalls.find(
          (w) =>
            (w.x === x0 && w.y === y0 && w.edge === "w") ||
            (w.x === x1 && w.y === y1 && w.edge === "e"),
        );
        if (edgeWall) {
          if (edgeWall.type === "wall" || edgeWall.type === "door") return 0.0;
          if (edgeWall.type === "window") return 0.9;
          if (edgeWall.type === "furniture") return 0.5;
          if (edgeWall.type === "landscape") return 0.7;
        }
      }

      // Moving vertically
      if (yDiff === 1) {
        // Moving south: check 's' edge of (x0,y0) or 'n' edge of (x1,y1)
        const edgeWall = layer.edgeWalls.find(
          (w) =>
            (w.x === x0 && w.y === y0 && w.edge === "s") ||
            (w.x === x1 && w.y === y1 && w.edge === "n"),
        );
        if (edgeWall) {
          if (edgeWall.type === "wall" || edgeWall.type === "door") return 0.0;
          if (edgeWall.type === "window") return 0.9;
          if (edgeWall.type === "furniture") return 0.5;
          if (edgeWall.type === "landscape") return 0.7;
        }
      } else if (yDiff === -1) {
        // Moving north: check 'n' edge of (x0,y0) or 's' edge of (x1,y1)
        const edgeWall = layer.edgeWalls.find(
          (w) =>
            (w.x === x0 && w.y === y0 && w.edge === "n") ||
            (w.x === x1 && w.y === y1 && w.edge === "s"),
        );
        if (edgeWall) {
          if (edgeWall.type === "wall" || edgeWall.type === "door") return 0.0;
          if (edgeWall.type === "window") return 0.9;
          if (edgeWall.type === "furniture") return 0.5;
          if (edgeWall.type === "landscape") return 0.7;
        }
      }
    }
    return 1.0;
  }

  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let currentX = x0;
  let currentY = y0;
  let lightReduction = 1.0; // 1.0 = no blocking, 0.0 = fully blocked

  while (true) {
    // Don't check the starting cell (light source) or ending cell (destination)
    if (
      (currentX !== x0 || currentY !== y0) &&
      (currentX !== x1 || currentY !== y1)
    ) {
      // Check terrain cells
      if (layer.terrain && layer.terrain.length > 0) {
        const terrainCell = layer.terrain.find(
          (t) => t.x === currentX && t.y === currentY,
        );

        if (terrainCell) {
          if (terrainCell.type === "wall" || terrainCell.type === "door") {
            // Walls and doors completely block light
            return 0.0;
          } else if (terrainCell.type === "window") {
            // Windows allow 90% of light through
            lightReduction *= 0.9;
          } else if (terrainCell.type === "furniture") {
            // Furniture reduces light by 50%
            lightReduction *= 0.5;
          } else if (terrainCell.type === "landscape") {
            // Landscape reduces light by 30%
            lightReduction *= 0.7;
          }
          // Other terrain types (water, difficult) don't block light
        }
      }

      // If light is reduced to near-zero, no need to continue
      if (lightReduction < 0.01) {
        return 0.0;
      }
    }

    // Reached destination
    if (currentX === x1 && currentY === y1) {
      break;
    }

    const e2 = 2 * err;
    const prevX = currentX;
    const prevY = currentY;
    let movedHorizontally = false;
    let movedVertically = false;

    if (e2 > -dy) {
      err -= dy;
      currentX += sx;
      movedHorizontally = true;

      // Check for edge wall when crossing horizontal boundary
      if (layer.edgeWalls && layer.edgeWalls.length > 0) {
        let edgeWall = null;
        if (sx > 0) {
          // Moving east: check 'e' edge of previous cell or 'w' edge of current cell
          edgeWall = layer.edgeWalls.find(
            (w) =>
              (w.x === prevX && w.y === currentY && w.edge === "e") ||
              (w.x === currentX && w.y === currentY && w.edge === "w"),
          );
        } else {
          // Moving west: check 'w' edge of previous cell or 'e' edge of current cell
          edgeWall = layer.edgeWalls.find(
            (w) =>
              (w.x === prevX && w.y === currentY && w.edge === "w") ||
              (w.x === currentX && w.y === currentY && w.edge === "e"),
          );
        }

        if (edgeWall) {
          if (edgeWall.type === "wall" || edgeWall.type === "door") {
            return 0.0;
          } else if (edgeWall.type === "window") {
            lightReduction *= 0.9;
          } else if (edgeWall.type === "furniture") {
            lightReduction *= 0.5;
          } else if (edgeWall.type === "landscape") {
            lightReduction *= 0.7;
          }

          if (lightReduction < 0.01) {
            return 0.0;
          }
        }
      }
    }

    if (e2 < dx) {
      err += dx;
      currentY += sy;
      movedVertically = true;

      // Check for edge wall when crossing vertical boundary
      if (layer.edgeWalls && layer.edgeWalls.length > 0) {
        let edgeWall = null;
        if (sy > 0) {
          // Moving south: check 's' edge of previous cell or 'n' edge of current cell
          edgeWall = layer.edgeWalls.find(
            (w) =>
              (w.x === currentX && w.y === prevY && w.edge === "s") ||
              (w.x === currentX && w.y === currentY && w.edge === "n"),
          );
        } else {
          // Moving north: check 'n' edge of previous cell or 's' edge of current cell
          edgeWall = layer.edgeWalls.find(
            (w) =>
              (w.x === currentX && w.y === prevY && w.edge === "n") ||
              (w.x === currentX && w.y === currentY && w.edge === "s"),
          );
        }

        if (edgeWall) {
          if (edgeWall.type === "wall" || edgeWall.type === "door") {
            return 0.0;
          } else if (edgeWall.type === "window") {
            lightReduction *= 0.9;
          } else if (edgeWall.type === "furniture") {
            lightReduction *= 0.5;
          } else if (edgeWall.type === "landscape") {
            lightReduction *= 0.7;
          }

          if (lightReduction < 0.01) {
            return 0.0;
          }
        }
      }
    }

    // Check for corner blocking when moving diagonally
    // Only check when both horizontal and vertical movement happened this iteration
    if (
      movedHorizontally &&
      movedVertically &&
      layer.edgeWalls &&
      layer.edgeWalls.length > 0
    ) {
      // When moving diagonally from (prevX,prevY) to (currentX,currentY),
      // we pass through one of two intermediate corners:
      // - (prevX, currentY) - if we moved horizontally then vertically
      // - (currentX, prevY) - if we moved vertically then horizontally
      // Check BOTH corners as the ray could cut through either
      const corners = [
        { x: prevX, y: currentY },
        { x: currentX, y: prevY },
      ];

      // For each corner, check if horizontal and vertical walls meet there (within 0.5 distance)
      for (const corner of corners) {
        // Find horizontal walls near this corner
        const horizontalWalls = layer.edgeWalls.filter((w) => {
          if (w.edge !== "n" && w.edge !== "s") return false;
          const wallY = w.edge === "n" ? w.y : w.y + 1;
          // Check if wall passes through or near this corner Y coordinate
          if (Math.abs(wallY - corner.y) > 0.1) return false;
          // Check if corner X is on or near the wall (between wall start and end)
          return corner.x >= w.x - 0.1 && corner.x <= w.x + 1 + 0.1;
        });

        // Find vertical walls near this corner
        const verticalWalls = layer.edgeWalls.filter((w) => {
          if (w.edge !== "e" && w.edge !== "w") return false;
          const wallX = w.edge === "w" ? w.x : w.x + 1;
          // Check if wall passes through or near this corner X coordinate
          if (Math.abs(wallX - corner.x) > 0.1) return false;
          // Check if corner Y is on or near the wall (between wall start and end)
          return corner.y >= w.y - 0.1 && corner.y <= w.y + 1 + 0.1;
        });

        // If both horizontal and vertical walls meet at this corner, block light
        if (horizontalWalls.length > 0 && verticalWalls.length > 0) {
          const blockingTypes = ["wall", "door"];
          const hasBlockingH = horizontalWalls.some((w) =>
            blockingTypes.includes(w.type),
          );
          const hasBlockingV = verticalWalls.some((w) =>
            blockingTypes.includes(w.type),
          );

          if (hasBlockingH || hasBlockingV) {
            console.log(
              `  🚫 BLOCKING light at corner (${corner.x},${corner.y})!`,
            );
            return 0.0;
          }
        }
      }
    }
  }

  return lightReduction;
}

function getLightIntensityAtCell(x, y, layer) {
  if (!layer.lights || layer.lights.length === 0) {
    return 0;
  }

  let maxIntensity = 0;
  layer.lights.forEach((light) => {
    const dx = x - light.x;
    const dy = y - light.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= light.radius) {
      // Check for terrain blocking light
      const blockingFactor = calculateLightBlocking(
        light.x,
        light.y,
        x,
        y,
        layer,
      );

      if (blockingFactor > 0) {
        // Linear falloff from center to edge
        const falloff = 1 - distance / light.radius;
        const intensity = falloff * light.intensity * blockingFactor;
        maxIntensity = Math.max(maxIntensity, intensity);
      }
    }
  });

  return maxIntensity;
}

function getVisibleCells(layer) {
  // Calculate which cells should be visible to players
  const visibleCells = new Set();
  const visionDistance = battleMap.fogOfWar.visionDistance;

  // Get all PC combatant positions with their IDs
  const pcData = Object.entries(layer.combatantPositions)
    .filter(([id, pos]) => {
      const combatant = combatants.find((c) => c.id === parseInt(id));
      return combatant && combatant.type === "PC";
    })
    .map(([id, pos]) => ({ id: parseInt(id), pos }));

  if (battleMap.fogOfWar.mode === "lineOfSight") {
    // Line of Sight: Only show cells within vision distance of PCs
    // Full distance in front, 50% distance for peripheral (behind/sides)
    pcData.forEach((pc) => {
      const pcPos = pc.pos;
      const facing = layer.combatantFacing[pc.id] || 0; // 0-360 degrees (0 = North)
      const facingRad = (facing * Math.PI) / 180;

      for (let y = 0; y < layer.height; y++) {
        for (let x = 0; x < layer.width; x++) {
          const dx = x - pcPos.x;
          const dy = y - pcPos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance === 0) {
            // PC's own cell is always visible
            visibleCells.add(`${x},${y}`);
            continue;
          }

          // Calculate angle from PC to cell (-PI to PI)
          // Adjust so 0 degrees = North (negative Y direction)
          let angleToCell = Math.atan2(dx, -dy);

          // Calculate relative angle (how far from facing direction)
          let relativeAngle = angleToCell - facingRad;

          // Normalize to -PI to PI
          while (relativeAngle > Math.PI) relativeAngle -= 2 * Math.PI;
          while (relativeAngle < -Math.PI) relativeAngle += 2 * Math.PI;

          // Determine if cell is in front (within 90° each side) or peripheral
          const isInFront = Math.abs(relativeAngle) <= Math.PI / 2;
          const effectiveVisionDistance = isInFront
            ? visionDistance
            : visionDistance * 0.5;

          if (distance <= effectiveVisionDistance) {
            // Check if there's a wall blocking line of sight
            const visionBlocking = calculateLightBlocking(
              pcPos.x,
              pcPos.y,
              x,
              y,
              layer,
            );
            if (visionBlocking > 0.0) {
              // Only add if not completely blocked (walls block 100%, return 0.0)
              visibleCells.add(`${x},${y}`);
            }
          }
        }
      }
    });
  } else {
    // Exploration: Reveal cells as PCs move through them, keep them revealed
    if (!battleMap.fogOfWar.revealedCells[layer.id]) {
      battleMap.fogOfWar.revealedCells[layer.id] = {};
    }

    // Reveal cells near current PC positions with directional vision
    pcData.forEach((pc) => {
      const pcPos = pc.pos;
      const facing = layer.combatantFacing[pc.id] || 0; // 0-360 degrees (0 = North)
      const facingRad = (facing * Math.PI) / 180;

      for (let dy = -visionDistance; dy <= visionDistance; dy++) {
        for (let dx = -visionDistance; dx <= visionDistance; dx++) {
          const x = pcPos.x + dx;
          const y = pcPos.y + dy;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (x >= 0 && x < layer.width && y >= 0 && y < layer.height) {
            if (distance === 0) {
              // PC's own cell is always visible
              const key = `${x},${y}`;
              battleMap.fogOfWar.revealedCells[layer.id][key] = true;
              visibleCells.add(key);
              continue;
            }

            // Calculate angle from PC to cell
            let angleToCell = Math.atan2(dx, -dy);

            // Calculate relative angle
            let relativeAngle = angleToCell - facingRad;

            // Normalize to -PI to PI
            while (relativeAngle > Math.PI) relativeAngle -= 2 * Math.PI;
            while (relativeAngle < -Math.PI) relativeAngle += 2 * Math.PI;

            // Determine if cell is in front or peripheral
            const isInFront = Math.abs(relativeAngle) <= Math.PI / 2;
            const effectiveVisionDistance = isInFront
              ? visionDistance
              : visionDistance * 0.5;

            if (distance <= effectiveVisionDistance) {
              // Check if there's a wall blocking line of sight
              const visionBlocking = calculateLightBlocking(
                pcPos.x,
                pcPos.y,
                x,
                y,
                layer,
              );
              if (visionBlocking > 0.0) {
                // Only add if not completely blocked (walls block 100%, return 0.0)
                const key = `${x},${y}`;
                battleMap.fogOfWar.revealedCells[layer.id][key] = true;
                visibleCells.add(key);
              }
            }
          }
        }
      }
    });

    // Add all previously revealed cells
    Object.keys(battleMap.fogOfWar.revealedCells[layer.id] || {}).forEach(
      (key) => {
        visibleCells.add(key);
      },
    );
  }

  return visibleCells;
}

function isCellVisible(x, y, visibleCells) {
  return visibleCells.has(`${x},${y}`);
}

// ==================== GRID & MOVEMENT OPTIONS ==================== //

function setSnapMode(mode) {
  battleMap.snapMode = mode;
  saveBattleMapState();
}

function setSnapType(type) {
  battleMap.snapType = type;
  saveBattleMapState();
}

function toggleMoveDistance() {
  battleMap.showMoveDistance = !battleMap.showMoveDistance;
  saveBattleMapState();
}

function setCombatantSize(combatantId, size) {
  battleMap.combatantSizes[combatantId] = size;
  renderBattleMap();
  saveBattleMapState();
}

function setElevation(combatantId, value) {
  battleMap.combatantElevations[combatantId] = parseInt(value);
  renderBattleMap();
  saveBattleMapState();
}

function adjustElevation(combatantId, delta) {
  const current = battleMap.combatantElevations[combatantId] || 0;
  const newElevation = current + delta;
  battleMap.combatantElevations[combatantId] = newElevation;

  // Update input field in token customizer modal if it exists
  const elevationInput = document.getElementById(
    `elevationInput_${combatantId}`,
  );
  if (elevationInput) {
    elevationInput.value = newElevation;
  }

  renderBattleMap();
  saveBattleMapState();
}

// Wrapper functions for token customizer
function setCombatantElevation(combatantId, value) {
  setElevation(combatantId, value);
}

function adjustCombatantElevation(combatantId, delta) {
  adjustElevation(combatantId, delta);
}

function applyGridSnap(x, y) {
  if (battleMap.snapMode === "free") {
    return { x, y };
  }

  let snappedX, snappedY;

  if (battleMap.snapMode === "half") {
    // Snap to 0.5 increments
    snappedX = Math.round(x * 2) / 2;
    snappedY = Math.round(y * 2) / 2;
  } else {
    // Full grid snapping
    snappedX = Math.round(x);
    snappedY = Math.round(y);
  }

  // Apply snap type (center vs corner)
  if (battleMap.snapType === "corner") {
    // For corner snapping, floor instead of round
    snappedX = Math.floor(x);
    snappedY = Math.floor(y);
  }

  return { x: snappedX, y: snappedY };
}

// ==================== AOE TEMPLATES ==================== //

function selectAoeTool(type) {
  if (battleMap.selectedAoeTool === type) {
    battleMap.selectedAoeTool = null;
    battleMap.aoePlacementMode = false;
    battleMap.aoePreview = null;
  } else {
    battleMap.selectedAoeTool = type;
  }
  updateToolButtonStates();
  renderBattleMap();
}

function updateAoeSize(value) {
  battleMap.aoeSize = parseInt(value);
  const valueDisplays = document.querySelectorAll("#aoeSizeValue");
  valueDisplays.forEach((display) => {
    display.textContent = value;
  });
  if (battleMap.aoePlacementMode) {
    renderBattleMap(); // Update preview
  }
}

function updateAoeConeWidth(value) {
  battleMap.aoeConeWidth = parseInt(value);
  const valueDisplays = document.querySelectorAll("#aoeConeWidthValue");
  valueDisplays.forEach((display) => {
    display.textContent = value;
  });
  if (battleMap.aoePlacementMode) {
    renderBattleMap(); // Update preview
  }
}

function toggleAoePlacement() {
  battleMap.aoePlacementMode = !battleMap.aoePlacementMode;
  if (!battleMap.aoePlacementMode) {
    battleMap.aoePreview = null;
  }
  renderBattleMapControls();
  renderBattleMap();
}

function placeAoeTemplateAt(x, y, rotation = 0) {
  if (!battleMap.selectedAoeTool) return;

  const colors = {
    circle: "rgba(255, 87, 34, 0.3)",
    cone: "rgba(255, 152, 0, 0.3)",
    line: "rgba(33, 150, 243, 0.3)",
    square: "rgba(156, 39, 176, 0.3)",
  };

  const template = {
    id: battleMap.nextAoeId++,
    type: battleMap.selectedAoeTool,
    x: x,
    y: y,
    size: battleMap.aoeSize,
    color: colors[battleMap.selectedAoeTool],
    rotation: rotation,
  };

  // Only add coneWidth for cone templates (Firebase rejects undefined values)
  if (battleMap.selectedAoeTool === "cone") {
    template.coneWidth = battleMap.aoeConeWidth;
  }

  battleMap.aoeTemplates.push(template);
  battleMap.aoePlacementMode = false;
  battleMap.aoePreview = null;
  renderBattleMapControls();
  renderBattleMap();
  saveBattleMapState();
}

function updateAoePreview(x, y, rotation = 0) {
  battleMap.aoePreview = { x, y, rotation };
  renderBattleMap();
}

function placeAoeTemplate() {
  // Legacy function - kept for backwards compatibility
  if (!battleMap.selectedAoeTool) return;

  const layer = getActiveLayer();
  const centerX = Math.floor(layer.width / 2);
  const centerY = Math.floor(layer.height / 2);

  placeAoeTemplateAt(centerX, centerY, 0);
}

function clearAoeTemplates() {
  if (
    battleMap.aoeTemplates.length > 0 &&
    confirm("Clear all AoE templates from the map?")
  ) {
    battleMap.aoeTemplates = [];
    renderBattleMap();
    saveBattleMapState();
  }
}

function removeAoeTemplate(id) {
  battleMap.aoeTemplates = battleMap.aoeTemplates.filter((t) => t.id !== id);
  renderBattleMap();
  saveBattleMapState();
}

// ==================== ROTATION & FACING ==================== //

function rotateCombatant(degrees, combatantId) {
  // If combatantId provided, use it; otherwise use selected combatant
  const targetId =
    combatantId !== undefined ? combatantId : battleMap.selectedCombatant;

  if (targetId === null || targetId === undefined) {
    alert("Please select a combatant first by clicking on them.");
    return;
  }

  const layer = getActiveLayer();
  const currentFacing = layer.combatantFacing[targetId] || 0;
  const newFacing = (currentFacing + degrees + 360) % 360;
  layer.combatantFacing[targetId] = newFacing;

  // Update display in combat tracker if it exists
  const facingDisplay = document.getElementById(`facing-display-${targetId}`);
  if (facingDisplay) {
    facingDisplay.textContent = newFacing + "°";
  }

  // Update input field in token customizer modal if it exists
  const facingInput = document.getElementById(`facingInput_${targetId}`);
  if (facingInput) {
    facingInput.value = newFacing;
  }

  updateRotationDisplay();
  renderBattleMap(); // Full re-render to update facing indicators
  saveBattleMapState();
}

function setCombatantFacing(degrees, combatantId) {
  // If combatantId provided, use it; otherwise use selected combatant
  const targetId =
    combatantId !== undefined ? combatantId : battleMap.selectedCombatant;

  if (targetId === null || targetId === undefined) {
    alert("Please select a combatant first by clicking on them.");
    return;
  }

  const layer = getActiveLayer();
  layer.combatantFacing[targetId] = degrees;

  // Update display in combat tracker if it exists
  const facingDisplay = document.getElementById(`facing-display-${targetId}`);
  if (facingDisplay) {
    facingDisplay.textContent = degrees + "°";
  }

  updateRotationDisplay();
  renderBattleMap(); // Full re-render to update facing indicators
  saveBattleMapState();
}

function updateRotationDisplay() {
  const facingDisplay = document.getElementById("currentFacing");
  if (facingDisplay && battleMap.selectedCombatant !== null) {
    const layer = getActiveLayer();
    const facing = layer.combatantFacing[battleMap.selectedCombatant] || 0;
    facingDisplay.textContent = facing;

    // Update directional label
    const directions = [
      "⬆️ North",
      "↗️ NE",
      "➡️ East",
      "↘️ SE",
      "⬇️ South",
      "↙️ SW",
      "⬅️ West",
      "↖️ NW",
    ];
    const dirIndex = Math.round(facing / 45) % 8;
    const dirLabel = facingDisplay.parentElement;
    if (dirLabel) {
      dirLabel.innerHTML = `Current: <span id="currentFacing">${facing}</span>° (${directions[dirIndex]})`;
    }
  }
}

// ==================== TOKEN CUSTOMIZATION ==================== //

function openTokenCustomizer(combatantId) {
  const combatant = combatants.find((c) => c.id === combatantId);
  if (!combatant) return;

  const layer = getActiveLayer();
  const position = layer.combatantPositions[combatantId];
  const facing = layer.combatantFacing[combatantId] || 0;
  const elevation = battleMap.combatantElevations[combatantId] || 0;

  const combatantType =
    combatant.type === "Enemy" || combatant.type === "Creature"
      ? "Enemy"
      : combatant.type;
  const options = tokenOptions[combatantType] || tokenOptions.Enemy;

  let optionsHTML = options
    .map(
      (opt, idx) =>
        `<button onclick="setTokenEmoji(${combatantId}, '${opt.emoji}')" 
       style="padding: 10px; font-size: 24px; border: 2px solid #4caf50; background: rgba(0,0,0,0.3); border-radius: 8px; cursor: pointer; transition: all 0.2s;"
       onmouseover="this.style.background='rgba(76, 175, 80, 0.3)'; this.style.transform='scale(1.1)';"
       onmouseout="this.style.background='rgba(0,0,0,0.3)'; this.style.transform='scale(1)';">
       ${opt.emoji}
    </button>`,
    )
    .join("");

  // Find which layer this combatant is on
  let combatantLayerId = layer.id;
  for (const l of battleMap.layers) {
    if (l.combatantPositions[combatantId]) {
      combatantLayerId = l.id;
      break;
    }
  }

  // Build Position section
  const positionHTML = position
    ? `
    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 15px;">
      <div>
        <label style="color: #888; font-size: 0.9em; display: block; margin-bottom: 5px;">Rotation (°)</label>
        <div style="display: flex; gap: 5px;">
          <input type="number" id="facingInput_${combatantId}" value="${facing}" min="0" max="359" 
            style="flex: 1; padding: 8px; background: #2a2a2a; border: 1px solid #4caf50; color: #e0e0e0; border-radius: 4px;"
            onchange="setCombatantFacing(parseInt(this.value), ${combatantId})">
          <button onclick="rotateCombatant(-45, ${combatantId})" class="button" style="padding: 8px; width: 40px;">↶</button>
          <button onclick="rotateCombatant(45, ${combatantId})" class="button" style="padding: 8px; width: 40px;">↷</button>
        </div>
      </div>
      <div>
        <label style="color: #888; font-size: 0.9em; display: block; margin-bottom: 5px;">Elevation</label>
        <div style="display: flex; gap: 5px;">
          <input type="number" id="elevationInput_${combatantId}" value="${elevation}" 
            style="flex: 1; padding: 8px; background: #2a2a2a; border: 1px solid #4caf50; color: #e0e0e0; border-radius: 4px;"
            onchange="setCombatantElevation(${combatantId}, parseInt(this.value))">
          <button onclick="adjustCombatantElevation(${combatantId}, -1)" class="button" style="padding: 8px; width: 40px;">−</button>
          <button onclick="adjustCombatantElevation(${combatantId}, 1)" class="button" style="padding: 8px; width: 40px;">+</button>
        </div>
      </div>
      <div style="grid-column: span 2;">
        <label style="color: #888; font-size: 0.9em; display: block; margin-bottom: 5px;">Location (X, Y)</label>
        <div style="display: flex; gap: 10px;">
          <input type="number" id="locationX_${combatantId}" value="${
            position.x
          }" min="0" max="${layer.width - 1}"
            style="flex: 1; padding: 8px; background: #2a2a2a; border: 1px solid #4caf50; color: #e0e0e0; border-radius: 4px;"
            onchange="setCombatantLocation(${combatantId}, parseInt(this.value), parseInt(document.getElementById('locationY_${combatantId}').value))">
          <input type="number" id="locationY_${combatantId}" value="${
            position.y
          }" min="0" max="${layer.height - 1}"
            style="flex: 1; padding: 8px; background: #2a2a2a; border: 1px solid #4caf50; color: #e0e0e0; border-radius: 4px;"
            onchange="setCombatantLocation(${combatantId}, parseInt(document.getElementById('locationX_${combatantId}').value), parseInt(this.value))">
        </div>
      </div>
      ${
        battleMap.layers.length > 1
          ? `<div style="grid-column: span 2;">
        ${renderLayerSelector(combatantId, combatantLayerId, false)}
      </div>`
          : ""
      }
    </div>
  `
    : '<p style="color: #888; margin-top: 10px;">Combatant not placed on map</p>';

  // Build Health section based on combatant type
  let healthHTML = "";
  if (combatant.type === "PC") {
    // Player: No health editing (managed in Multiplayer Menu)
    healthHTML = "";
  } else if (
    combatant.type === "NPC" ||
    combatant.type === "Enemy" ||
    combatant.type === "Creature"
  ) {
    // NPC/Enemy: Health
    healthHTML = `
      <div style="margin-top: 15px;">
        <label style="color: #888; font-size: 0.9em; display: block; margin-bottom: 5px;">Health</label>
        <div style="display: flex; gap: 5px; align-items: center;">
          <input type="number" value="${
            combatant.currentHealth || 0
          }" min="0" max="${combatant.health || 999}"
            style="flex: 1; padding: 8px; background: #2a2a2a; border: 1px solid #4caf50; color: #e0e0e0; border-radius: 4px;"
            onchange="updateCombatantHealth(${combatantId}, parseInt(this.value))">
          <span style="color: #888;">/</span>
          <span style="color: #4caf50;">${combatant.health || 0}</span>
        </div>
      </div>
    `;
  }

  const modal = document.createElement("div");
  modal.id = "tokenCustomizerModal";
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;

  modal.innerHTML = `
    <div style="
      background: #1a1a1a;
      border: 2px solid #4caf50;
      border-radius: 12px;
      padding: 30px;
      max-width: 650px;
      width: 90%;
      max-height: 85vh;
      overflow-y: auto;
      box-shadow: 0 0 30px rgba(76, 175, 80, 0.5);
    ">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h2 style="margin: 0; color: #4caf50;">${
          combatant.displayName || combatant.name
        }</h2>
        <button onclick="closeTokenCustomizer()" style="
          background: rgba(211, 47, 47, 0.3);
          border: 2px solid #d32f2f;
          color: #f44336;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: bold;
        ">✖ Close</button>
      </div>
      
      <!-- Position Section -->
      <div style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #333;">
        <button onclick="toggleSection('position_${combatantId}')" style="
          width: 100%;
          text-align: left;
          background: rgba(76, 175, 80, 0.1);
          border: 1px solid #4caf50;
          color: #4caf50;
          padding: 12px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: bold;
          font-size: 1em;
          display: flex;
          justify-content: space-between;
          align-items: center;
        ">
          <span>📍 Position</span>
          <span id="position_${combatantId}_toggle">▼</span>
        </button>
        <div id="position_${combatantId}" style="display: block;">
          ${positionHTML}
        </div>
      </div>

      <!-- Health Section -->
      ${
        healthHTML
          ? `
      <div style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #333;">
        <button onclick="toggleSection('health_${combatantId}')" style="
          width: 100%;
          text-align: left;
          background: rgba(76, 175, 80, 0.1);
          border: 1px solid #4caf50;
          color: #4caf50;
          padding: 12px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: bold;
          font-size: 1em;
          display: flex;
          justify-content: space-between;
          align-items: center;
        ">
          <span>❤️ Health</span>
          <span id="health_${combatantId}_toggle">▶</span>
        </button>
        <div id="health_${combatantId}" style="display: none;">
          ${healthHTML}
        </div>
      </div>
      `
          : ""
      }

      <!-- Token Section -->
      <div style="margin-bottom: 0;">
        <button onclick="toggleSection('token_${combatantId}')" style="
          width: 100%;
          text-align: left;
          background: rgba(76, 175, 80, 0.1);
          border: 1px solid #4caf50;
          color: #4caf50;
          padding: 12px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: bold;
          font-size: 1em;
          display: flex;
          justify-content: space-between;
          align-items: center;
        ">
          <span>🎭 Token</span>
          <span id="token_${combatantId}_toggle">▶</span>
        </button>
        <div id="token_${combatantId}" style="display: none;">
          <div style="margin-top: 15px;">
            <h3 style="color: #ccc; margin-bottom: 10px;">Choose Icon:</h3>
            <div style="
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
              gap: 10px;
              margin-bottom: 15px;
            ">
              ${optionsHTML}
            </div>
          </div>

          <div style="margin-bottom: 15px; padding-top: 15px; border-top: 1px solid #333;">
            <h3 style="color: #ccc; margin-bottom: 10px;">Upload Custom Image:</h3>
            <input type="file" id="customTokenImage" accept="image/*" style="display: none;" onchange="handleCustomTokenImage(event, ${combatantId})">
            <button onclick="document.getElementById('customTokenImage').click()" class="button" style="width: 100%; padding: 12px;">
              🖼️ Upload Custom Image
            </button>
            <p style="color: #888; font-size: 0.9em; margin-top: 10px;">Recommended: Square images work best (max 2MB)</p>
          </div>

          <div style="padding-top: 15px; border-top: 1px solid #333;">
            <button onclick="resetTokenToDefault(${combatantId})" class="button" style="width: 100%; padding: 12px; background: rgba(255, 111, 0, 0.2); border-color: #FF6F00; color: #FF9800;">
              🔄 Reset to Default
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.onclick = (e) => {
    if (e.target === modal) closeTokenCustomizer();
  };
}

function closeTokenCustomizer() {
  const modal = document.getElementById("tokenCustomizerModal");
  if (modal) modal.remove();
}

function setTokenEmoji(combatantId, emoji) {
  battleMap.customTokens[combatantId] = {
    type: "emoji",
    value: emoji,
  };
  saveBattleMapState();
  renderBattleMap();
  closeTokenCustomizer();
}

function handleCustomTokenImage(event, combatantId) {
  const file = event.target.files[0];
  if (!file) return;

  if (file.size > 2 * 1024 * 1024) {
    alert("Image is too large. Please use an image smaller than 2MB.");
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    battleMap.customTokens[combatantId] = {
      type: "image",
      value: e.target.result,
    };
    saveBattleMapState();
    renderBattleMap();
    closeTokenCustomizer();
  };
  reader.onerror = () => {
    alert("Failed to read image file. Please try again.");
  };
  reader.readAsDataURL(file);
}

function resetTokenToDefault(combatantId) {
  delete battleMap.customTokens[combatantId];
  saveBattleMapState();
  renderBattleMap();
  closeTokenCustomizer();
}

/**
 * Migrate sourceToken data to customTokens for all combatants
 * This ensures icons assigned from NPCs/Enemies are visible to players
 * Note: This happens automatically when syncing, but this function can be used to preview/force migration
 */
function migrateSourceTokensToCustomTokens() {
  console.log("🎭 Starting migration...");
  console.log("🎭 Total combatants:", combatants.length);
  console.log("🎭 Current customTokens:", battleMap.customTokens);

  let migrationCount = 0;
  let alreadyCustomCount = 0;
  let noSourceTokenCount = 0;

  combatants.forEach((combatant) => {
    console.log(`🎭 Checking ${combatant.name || combatant.displayName}:`, {
      hasCustomToken: !!battleMap.customTokens[combatant.id],
      hasSourceToken: !!combatant.sourceToken,
      sourceToken: combatant.sourceToken,
    });

    // Check if already has a custom token set
    if (battleMap.customTokens[combatant.id]) {
      alreadyCustomCount++;
      return;
    }

    // Check if combatant has a sourceToken
    if (
      combatant.sourceToken &&
      combatant.sourceToken.type &&
      combatant.sourceToken.value
    ) {
      if (!battleMap.customTokens) battleMap.customTokens = {};
      battleMap.customTokens[combatant.id] = {
        type: combatant.sourceToken.type,
        value: combatant.sourceToken.value,
      };
      console.log(`✅ Migrated ${combatant.name || combatant.displayName}`);
      migrationCount++;
    } else {
      noSourceTokenCount++;
    }
  });

  console.log("🎭 Migration complete:", {
    migrated: migrationCount,
    alreadyCustom: alreadyCustomCount,
    noSourceToken: noSourceTokenCount,
  });
  console.log("🎭 Final customTokens:", battleMap.customTokens);

  if (migrationCount > 0) {
    console.log(`🎭 Migrated ${migrationCount} source tokens to custom tokens`);
    saveBattleMapState();
    renderBattleMap();
    alert(
      `✅ Migrated ${migrationCount} combatant icon${migrationCount > 1 ? "s" : ""}.${alreadyCustomCount > 0 ? ` ${alreadyCustomCount} already had custom tokens.` : ""}`,
    );
  } else if (alreadyCustomCount > 0) {
    alert(
      `✅ All ${alreadyCustomCount} combatants already have custom tokens set.`,
    );
  } else {
    alert(
      `ℹ️ No tokens to migrate.\n\n${noSourceTokenCount} combatant(s) have no sourceToken data.\n\nSourceTokens are only set when adding NPCs/Enemies from the Bestiary that have custom icons assigned. PCs and manually-added combatants use default icons and don't have sourceToken.\n\nTo set custom icons:\n• Right-click a combatant on the map\n• Select "Set Token"`,
    );
  }
}

// Toggle collapsible sections in token customizer
function toggleSection(sectionId) {
  const section = document.getElementById(sectionId);
  const toggle = document.getElementById(sectionId + "_toggle");
  if (section && toggle) {
    if (section.style.display === "none") {
      section.style.display = "block";
      toggle.textContent = "▼";
    } else {
      section.style.display = "none";
      toggle.textContent = "▶";
    }
  }
}

// Update combatant location
function setCombatantLocation(combatantId, x, y) {
  const layer = getActiveLayer();
  if (!layer) return;

  // Validate coordinates
  if (x < 0 || x >= layer.width || y < 0 || y >= layer.height) {
    alert(
      `Invalid coordinates. Must be within 0-${layer.width - 1} for X and 0-${
        layer.height - 1
      } for Y.`,
    );
    return;
  }

  layer.combatantPositions[combatantId] = { x, y };
  saveBattleMapState();
  updateCombatantPositions(); // Use smooth update instead of full re-render
}

/**
 * Generate HTML for a layer dropdown selector
 * @param {number} combatantId - The combatant ID
 * @param {number} currentLayerId - The current layer ID the combatant is on
 * @param {boolean} hideIfSingleLayer - Whether to hide the selector if there's only one layer
 * @returns {string} HTML string for the layer selector
 */
function renderLayerSelector(
  combatantId,
  currentLayerId,
  hideIfSingleLayer = true,
) {
  // Hide if only one layer and hideIfSingleLayer is true
  if (hideIfSingleLayer && battleMap.layers.length <= 1) {
    return "";
  }

  const layerOptions = battleMap.layers
    .map(
      (layer) => `
      <option value="${layer.id}" ${layer.id === currentLayerId ? "selected" : ""}>
        ${layer.name || "Layer " + layer.id}
      </option>
    `,
    )
    .join("");

  return `
    <div>
      <label style="color: #888; font-size: 0.9em; display: block; margin-bottom: 5px;">Map Layer</label>
      <select 
        onchange="moveCombatantToLayer(${combatantId}, parseInt(this.value))"
        style="width: 100%; padding: 8px; background: #2a2a2a; border: 1px solid #4caf50; color: #e0e0e0; border-radius: 4px;">
        ${layerOptions}
      </select>
    </div>
  `;
}

/**
 * Move a combatant from its current layer to a new layer
 * @param {number} combatantId - The combatant ID to move
 * @param {number} newLayerId - The destination layer ID
 */
function moveCombatantToLayer(combatantId, newLayerId) {
  const newLayer = battleMap.layers.find((l) => l.id === newLayerId);
  if (!newLayer) {
    console.error(`Layer ${newLayerId} not found`);
    return;
  }

  // Find which layer the combatant is currently on
  let currentLayer = null;
  let currentPosition = null;
  let currentFacing = null;

  for (const layer of battleMap.layers) {
    if (layer.combatantPositions[combatantId]) {
      currentLayer = layer;
      currentPosition = layer.combatantPositions[combatantId];
      currentFacing = layer.combatantFacing[combatantId];
      break;
    }
  }

  // If combatant is not on any layer, just return
  if (!currentLayer) {
    console.log(`Combatant ${combatantId} is not on any layer`);
    return;
  }

  // If already on the target layer, no need to move
  if (currentLayer.id === newLayerId) {
    return;
  }

  // Remove from current layer
  delete currentLayer.combatantPositions[combatantId];
  if (currentLayer.combatantFacing[combatantId] !== undefined) {
    delete currentLayer.combatantFacing[combatantId];
  }

  // Add to new layer, maintaining position if it fits on the new layer
  const x = Math.min(currentPosition.x, newLayer.width - 1);
  const y = Math.min(currentPosition.y, newLayer.height - 1);

  newLayer.combatantPositions[combatantId] = { x, y };
  if (currentFacing !== undefined) {
    newLayer.combatantFacing[combatantId] = currentFacing;
  }

  // Save state and re-render
  saveBattleMapState();
  renderBattleMap();
  renderBattleMapControls();

  // Update unified view if open
  const unifiedModal = document.getElementById("unifiedBattleMapModal");
  if (unifiedModal && unifiedModal.style.display !== "none") {
    renderUnifiedBattleMap();
  }

  // Refresh token customizer if it's open for this combatant
  const customizerModal = document.getElementById("tokenCustomizerModal");
  if (customizerModal) {
    closeTokenCustomizer();
    openTokenCustomizer(combatantId);
  }

  console.log(
    `Moved combatant ${combatantId} to layer ${newLayer.name} at (${x}, ${y})`,
  );
}

// Update combatant health (NPC/Enemy)
function updateCombatantHealth(combatantId, newHealth) {
  const combatant = combatants.find((c) => c.id === combatantId);
  if (combatant) {
    combatant.currentHealth = Math.max(
      0,
      Math.min(newHealth, combatant.health),
    );
    renderCombatTracker();
    renderBattleMap();
  }
}

// Update party member property (stress, damage state)
function updatePartyMemberProperty(memberId, property, value) {
  const member = partyMembers.find((m) => m.id === memberId);
  if (member) {
    member[property] = value;
    savePartyData();
    renderPartyList();
    renderCombatTracker();

    // Sync damage track and stress to multiplayer
    if (
      typeof multiplayerManager !== "undefined" &&
      multiplayerManager.roomCode
    ) {
      const roomRef = multiplayerManager.db.ref(
        `rooms/${multiplayerManager.roomCode}/players`,
      );
      roomRef.once("value", (snapshot) => {
        snapshot.forEach((playerSnapshot) => {
          const player = playerSnapshot.val();
          const characterName = player?.character?.name || player?.name;
          if (player && characterName === member.name) {
            const playerId = playerSnapshot.key;
            if (property === "damage") {
              multiplayerManager.db
                .ref(
                  `rooms/${multiplayerManager.roomCode}/players/${playerId}/character/damageTrack`,
                )
                .set(value);
              console.log(
                `✓ Synced damage track '${value}' to ${characterName} (player: ${player.name})`,
              );
            } else if (property === "stress") {
              multiplayerManager.db
                .ref(
                  `rooms/${multiplayerManager.roomCode}/players/${playerId}/character/stress`,
                )
                .set(value);
              console.log(
                `✓ Synced stress ${value} to ${characterName} (player: ${player.name})`,
              );
            }
          }
        });
      });
    }
  }
}

// Update party member stat pool
function updatePartyMemberPool(memberId, poolName, property, value) {
  const member = partyMembers.find((m) => m.id === memberId);
  if (member && member[poolName]) {
    member[poolName][property] = Math.max(
      0,
      Math.min(value, member[poolName].max),
    );
    savePartyData();
    renderPartyList();
    renderCombatTracker();
  }
}

// ==================== SOURCE ENTITY TOKEN CUSTOMIZATION ==================== //

// Storage for preset tokens from source entities
const sourceTokenPresets = {
  bestiary: {}, // {creatureName: {type: 'emoji'|'image', value: '...'}}
  npcs: {}, // {npcId: {type: 'emoji'|'image', value: '...'}}
  party: {}, // {memberId: {type: 'emoji'|'image', value: '...'}}
};

function loadSourceTokenPresets() {
  const saved = localStorage.getItem("sourceTokenPresets");
  if (saved) {
    try {
      const data = JSON.parse(saved);
      Object.assign(sourceTokenPresets, data);
    } catch (e) {
      console.error("Failed to load source token presets:", e);
    }
  }
}

function saveSourceTokenPresets() {
  localStorage.setItem(
    "sourceTokenPresets",
    JSON.stringify(sourceTokenPresets),
  );
}

// Call this on initialization
loadSourceTokenPresets();

// Expose functions to window for global access
window.customizeBestiaryToken = customizeBestiaryToken;
window.customizeNPCToken = customizeNPCToken;
window.customizePartyMemberToken = customizePartyMemberToken;
window.closeSourceTokenCustomizer = closeSourceTokenCustomizer;
window.setSourceTokenEmoji = setSourceTokenEmoji;
window.handleSourceTokenImage = handleSourceTokenImage;
window.resetSourceToken = resetSourceToken;

function customizeBestiaryToken(creatureName) {
  const existingToken = sourceTokenPresets.bestiary[creatureName];
  openSourceTokenCustomizer("Enemy", creatureName, "bestiary", existingToken);
}

function customizeNPCToken(npcId) {
  const existingToken = sourceTokenPresets.npcs[npcId];
  openSourceTokenCustomizer(
    "NPC",
    `NPC-${npcId}`,
    "npcs",
    existingToken,
    npcId,
  );
}

function customizePartyMemberToken(memberId) {
  const existingToken = sourceTokenPresets.party[memberId];
  openSourceTokenCustomizer(
    "PC",
    `Party Member-${memberId}`,
    "party",
    existingToken,
    memberId,
  );
}

function openSourceTokenCustomizer(
  type,
  displayName,
  sourceType,
  existingToken,
  entityId,
) {
  const options = tokenOptions[type] || tokenOptions.Enemy;

  let optionsHTML = options
    .map(
      (opt) =>
        `<button onclick="setSourceTokenEmoji('${sourceType}', '${
          entityId || displayName.replace(/'/g, "\\'")
        }', '${opt.emoji}')" 
       style="padding: 10px; font-size: 24px; border: 2px solid #4caf50; background: rgba(0,0,0,0.3); border-radius: 8px; cursor: pointer; transition: all 0.2s;"
       onmouseover="this.style.background='rgba(76, 175, 80, 0.3)'; this.style.transform='scale(1.1)';"
       onmouseout="this.style.background='rgba(0,0,0,0.3)'; this.style.transform='scale(1)';">
       ${opt.emoji}
    </button>`,
    )
    .join("");

  const modal = document.createElement("div");
  modal.id = "sourceTokenCustomizerModal";
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;

  const currentTokenDisplay = existingToken
    ? existingToken.type === "emoji"
      ? `<div style="font-size: 48px; text-align: center; margin-bottom: 15px;">${existingToken.value}</div>`
      : `<div style="text-align: center; margin-bottom: 15px;"><img src="${existingToken.value}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 50%; border: 3px solid #4caf50;" /></div>`
    : '<div style="color: #888; text-align: center; margin-bottom: 15px; font-style: italic;">No custom token set</div>';

  modal.innerHTML = `
    <div style="
      background: #1a1a1a;
      border: 2px solid #4caf50;
      border-radius: 12px;
      padding: 30px;
      max-width: 600px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 0 30px rgba(76, 175, 80, 0.5);
    ">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h2 style="margin: 0; color: #4caf50;">Set Battle Map Token</h2>
        <button onclick="closeSourceTokenCustomizer()" style="
          background: rgba(211, 47, 47, 0.3);
          border: 2px solid #d32f2f;
          color: #f44336;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: bold;
        ">✖ Close</button>
      </div>
      
      <div style="margin-bottom: 20px; padding: 15px; background: rgba(76, 175, 80, 0.1); border-radius: 8px;">
        <h3 style="margin: 0 0 10px 0; color: #ccc; font-size: 0.95em;">Current Token:</h3>
        ${currentTokenDisplay}
        <p style="color: #888; font-size: 0.85em; margin: 0; text-align: center;">This token will be used for all new combat instances</p>
      </div>
      
      <div style="margin-bottom: 25px;">
        <h3 style="color: #ccc; margin-bottom: 10px;">Choose Icon:</h3>
        <div style="
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
          gap: 10px;
          margin-bottom: 15px;
        ">
          ${optionsHTML}
        </div>
      </div>

      <div style="margin-bottom: 20px; padding-top: 20px; border-top: 1px solid #4caf50;">
        <h3 style="color: #ccc; margin-bottom: 10px;">Upload Custom Image:</h3>
        <input type="file" id="sourceTokenImage" accept="image/*" style="display: none;" onchange="handleSourceTokenImage(event, '${sourceType}', '${
          entityId || displayName.replace(/'/g, "\\'")
        }')">
        <button onclick="document.getElementById('sourceTokenImage').click()" class="button" style="width: 100%; padding: 12px;">
          🖼️ Upload Custom Image
        </button>
        <p style="color: #888; font-size: 0.9em; margin-top: 10px;">Recommended: Square images work best (max 2MB)</p>
      </div>

      ${
        existingToken
          ? `
      <div style="padding-top: 20px; border-top: 1px solid #4caf50;">
        <button onclick="resetSourceToken('${sourceType}', '${
          entityId || displayName.replace(/'/g, "\\'")
        }');" class="button" style="width: 100%; padding: 12px; background: rgba(255, 111, 0, 0.2); border-color: #FF6F00; color: #FF9800;">
          🔄 Reset to Default
        </button>
      </div>
      `
          : ""
      }
    </div>
  `;

  document.body.appendChild(modal);
  modal.onclick = (e) => {
    if (e.target === modal) closeSourceTokenCustomizer();
  };
}

function closeSourceTokenCustomizer() {
  const modal = document.getElementById("sourceTokenCustomizerModal");
  if (modal) modal.remove();
}

function setSourceTokenEmoji(sourceType, entityKey, emoji) {
  sourceTokenPresets[sourceType][entityKey] = {
    type: "emoji",
    value: emoji,
  };
  saveSourceTokenPresets();
  closeSourceTokenCustomizer();
  alert("Token preset saved! It will be used when adding this to combat.");
}

function handleSourceTokenImage(event, sourceType, entityKey) {
  const file = event.target.files[0];
  if (!file) return;

  if (file.size > 2 * 1024 * 1024) {
    alert("Image is too large. Please use an image smaller than 2MB.");
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    sourceTokenPresets[sourceType][entityKey] = {
      type: "image",
      value: e.target.result,
    };
    saveSourceTokenPresets();
    closeSourceTokenCustomizer();
    alert("Token preset saved! It will be used when adding this to combat.");
  };
  reader.onerror = () => {
    alert("Failed to read image file. Please try again.");
  };
  reader.readAsDataURL(file);
}

function resetSourceToken(sourceType, entityKey) {
  delete sourceTokenPresets[sourceType][entityKey];
  saveSourceTokenPresets();
  closeSourceTokenCustomizer();
  alert("Token reset to default.");
}

function clearBattleMapTerrain() {
  if (
    confirm(
      "Are you sure you want to clear all terrain from the map?\n\nCombatant positions will be preserved.",
    )
  ) {
    saveBattleMapSnapshot(); // snapshot before clearing
    const layer = getActiveLayer();
    layer.terrain = [];
    renderBattleMap();
    saveBattleMapState();
  }
}

// ==================== PLAYER VIEW ==================== //

function openPlayerView() {
  // Save current state to ensure player view has latest data
  saveBattleMapState();

  // Open player view in a new window
  const playerWindow = window.open(
    "player-view.html",
    "playerView",
    "width=1200,height=800,menubar=no,toolbar=no,location=no,status=no",
  );

  if (!playerWindow) {
    alert("Unable to open player view. Please check if popups are blocked.");
  }
}

// ==================== BACKGROUND IMAGE ==================== //

function uploadBackgroundImage() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image file is too large. Please use an image smaller than 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const layer = getActiveLayer();
      layer.backgroundImage = event.target.result;
      renderBattleMapControls();
      renderBattleMap();
      saveBattleMapState();
      alert("Background image uploaded successfully!");
    };
    reader.onerror = () => {
      alert("Failed to read image file. Please try again.");
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

function clearBackgroundImage() {
  if (confirm("Are you sure you want to remove the background image?")) {
    const layer = getActiveLayer();
    layer.backgroundImage = null;
    renderBattleMapControls();
    renderBattleMap();
    saveBattleMapState();
  }
  window.clearBackgroundImage = clearBackgroundImage;
}

// ==================== SAVE/LOAD ==================== //

function saveBattleMapState() {
  // Create a snapshot of combatants for player view
  const combatantsSnapshot =
    typeof combatants !== "undefined"
      ? combatants.map((c) => ({
          id: c.id,
          name: c.name,
          displayName: c.displayName,
          creatureType: c.creatureType,
          type: c.type,
          sourceToken: c.sourceToken,
        }))
      : [];

  const state = {
    layers: battleMap.layers,
    activeLayerId: battleMap.activeLayerId,
    nextLayerId: battleMap.nextLayerId,
    showLineOfSight: battleMap.showLineOfSight,
    showNames: battleMap.showNames,
    customTokens: battleMap.customTokens,
    combatants: combatantsSnapshot,
    aoeTemplates: battleMap.aoeTemplates || [],
    nextAoeId: battleMap.nextAoeId || 1,
    snapMode: battleMap.snapMode || "full",
    snapType: battleMap.snapType || "center",
    showMoveDistance: battleMap.showMoveDistance || false,
    combatantSizes: battleMap.combatantSizes || {},
    combatantElevations: battleMap.combatantElevations || {},
    viewMode: battleMap.viewMode || "2d",
    wallDrawMode: battleMap.wallDrawMode || "square",
    nextLightId: battleMap.nextLightId || 1,
    defaultLightRadius: battleMap.defaultLightRadius || 5,
    defaultLightColor: battleMap.defaultLightColor || "#ffeb3b",
    defaultLightIntensity: battleMap.defaultLightIntensity || 0.8,
    fogOfWar: battleMap.fogOfWar || {
      enabled: false,
      mode: "lineOfSight",
      visionDistance: 5,
      revealedCells: {},
      lightTransparency: 0.6,
    },
  };
  localStorage.setItem("battleMapState", JSON.stringify(state));

  // Log active layer edge walls count
  const activeLayer = battleMap.layers.find(
    (l) => l.id === battleMap.activeLayerId,
  );
  console.log(
    `💾 Saving battle map state - Active layer edgeWalls: ${activeLayer?.edgeWalls?.length || 0}`,
  );

  // Sync to multiplayer if active
  if (typeof syncBattleMapToMultiplayer === "function") {
    syncBattleMapToMultiplayer();
  }
}

function loadBattleMapState() {
  const saved = localStorage.getItem("battleMapState");
  if (saved) {
    try {
      const state = JSON.parse(saved);

      // Handle legacy format (single map) or new format (layers)
      if (state.layers) {
        battleMap.layers = state.layers;
        battleMap.activeLayerId =
          state.activeLayerId || state.layers[0]?.id || 1;
        battleMap.nextLayerId =
          state.nextLayerId || Math.max(...state.layers.map((l) => l.id)) + 1;

        // Ensure all layers have edgeWalls array (backwards compatibility)
        battleMap.layers.forEach((layer) => {
          if (!layer.edgeWalls) {
            layer.edgeWalls = [];
          }
        });
      } else {
        // Convert old format to layer format
        battleMap.layers = [
          {
            id: 1,
            name: "Ground Floor",
            width: state.width || 10,
            height: state.height || 10,
            terrain: state.terrain || [],
            edgeWalls: [],
            backgroundImage: state.backgroundImage || null,
            combatantPositions: state.combatantPositions || {},
            combatantFacing: state.combatantFacing || {},
            lights: [],
          },
        ];
        battleMap.activeLayerId = 1;
        battleMap.nextLayerId = 2;
      }

      battleMap.showLineOfSight = state.showLineOfSight || false;
      battleMap.showNames = state.showNames || false;
      battleMap.customTokens = state.customTokens || {};
      battleMap.aoeTemplates = state.aoeTemplates || [];
      battleMap.nextAoeId = state.nextAoeId || 1;
      battleMap.snapMode = state.snapMode || "full";
      battleMap.snapType = state.snapType || "center";
      battleMap.showMoveDistance = state.showMoveDistance || false;
      battleMap.combatantSizes = state.combatantSizes || {};
      battleMap.combatantElevations = state.combatantElevations || {};
      battleMap.viewMode = state.viewMode || "2d";
      battleMap.wallDrawMode = state.wallDrawMode || "square";
      battleMap.nextLightId = state.nextLightId || 1;
      battleMap.defaultLightRadius = state.defaultLightRadius || 5;
      battleMap.defaultLightColor = state.defaultLightColor || "#ffeb3b";
      battleMap.defaultLightIntensity = state.defaultLightIntensity || 0.8;
      battleMap.fogOfWar = state.fogOfWar || {
        enabled: false,
        mode: "lineOfSight",
        visionDistance: 5,
        revealedCells: {},
        lightTransparency: 0.6,
      };

      // Ensure layers have lights array and edgeWalls array
      battleMap.layers.forEach((layer) => {
        if (!layer.lights) {
          layer.lights = [];
        }
        if (!layer.edgeWalls) {
          layer.edgeWalls = [];
        }
      });

      // Update UI
      const layer = getActiveLayer();
      const widthInput = document.getElementById("mapWidth");
      const heightInput = document.getElementById("mapHeight");
      if (widthInput) widthInput.value = layer.width;
      if (heightInput) heightInput.value = layer.height;

      renderBattleMap();
    } catch (e) {
      console.error("Failed to load battle map state:", e);
    }
  }
}

function saveBattleMapPreset() {
  const layer = getActiveLayer();
  const preset = {
    name:
      prompt("Enter a name for this map preset:", "My Battle Map") ||
      "Unnamed Map",
    width: layer.width,
    height: layer.height,
    terrain: layer.terrain,
    edgeWalls: layer.edgeWalls || [],
    backgroundImage: layer.backgroundImage,
    combatantPositions: layer.combatantPositions || {},
    combatantFacing: layer.combatantFacing || {},
    lights: layer.lights || [],
    // Global settings
    wallDrawMode: battleMap.wallDrawMode || "square",
    aoeTemplates: battleMap.aoeTemplates || [],
    combatantSizes: battleMap.combatantSizes || {},
    combatantElevations: battleMap.combatantElevations || {},
    customTokens: battleMap.customTokens || {},
  };

  if (!preset.name) return;

  const presets = JSON.parse(localStorage.getItem("battleMapPresets") || "[]");
  presets.push(preset);
  localStorage.setItem("battleMapPresets", JSON.stringify(presets));

  // Also download as JSON
  const blob = new Blob([JSON.stringify(preset, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `battle-map-${preset.name
    .toLowerCase()
    .replace(/\s+/g, "-")}.json`;
  a.click();
  URL.revokeObjectURL(url);

  alert(`Map "${preset.name}" saved and downloaded!`);
}

function loadBattleMapPreset() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const preset = JSON.parse(event.target.result);
        const layer = getActiveLayer();
        layer.width = preset.width || 10;
        layer.height = preset.height || 10;
        layer.terrain = preset.terrain || [];
        layer.edgeWalls = preset.edgeWalls || [];
        layer.backgroundImage = preset.backgroundImage || null;
        layer.combatantPositions = preset.combatantPositions || {};
        layer.combatantFacing = preset.combatantFacing || {};
        layer.lights = preset.lights || [];

        // Load global settings
        if (preset.wallDrawMode) battleMap.wallDrawMode = preset.wallDrawMode;
        if (preset.aoeTemplates) battleMap.aoeTemplates = preset.aoeTemplates;
        if (preset.combatantSizes)
          battleMap.combatantSizes = preset.combatantSizes;
        if (preset.combatantElevations)
          battleMap.combatantElevations = preset.combatantElevations;
        if (preset.customTokens) battleMap.customTokens = preset.customTokens;

        // Update UI
        document.getElementById("mapWidth").value = layer.width;
        document.getElementById("mapHeight").value = layer.height;

        renderBattleMapControls();
        renderBattleMap();
        saveBattleMapState();

        alert(`Map "${preset.name || "Unnamed"}" loaded successfully!`);
      } catch (error) {
        alert("Failed to load map preset. Please check the file format.");
        console.error(error);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

// ==================== KEYBOARD NAVIGATION ==================== //

function handleBattleMapKeyPress(e) {
  // Don't interfere with input fields
  if (
    e.target.tagName === "INPUT" ||
    e.target.tagName === "TEXTAREA" ||
    e.target.tagName === "SELECT"
  ) {
    return;
  }

  // Check if we're on the Battle Map tab or in the unified battle map modal
  const battleMapSection = document.getElementById("battleMapCanvas");
  const unifiedModal = document.getElementById("unifiedBattleMapModal");
  const isBattleMapVisible = battleMapSection && battleMapSection.offsetParent;
  const isUnifiedModalVisible =
    unifiedModal && unifiedModal.style.display !== "none";

  if (!isBattleMapVisible && !isUnifiedModalVisible) {
    return; // Battle map not visible
  }

  const layer = getActiveLayer();

  // Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z — Undo/Redo
  if (e.ctrlKey && !e.altKey) {
    if (e.key === "z" && !e.shiftKey) {
      e.preventDefault();
      undoBattleMapAction();
      return;
    }
    if (e.key === "y" || (e.key === "z" && e.shiftKey) || (e.key === "Z" && e.shiftKey)) {
      e.preventDefault();
      redoBattleMapAction();
      return;
    }
  }

  // Tool shortcuts (M, T, L, R, E, Z, F, A, G)
  if (!e.ctrlKey && !e.altKey && !e.metaKey) {
    switch (e.key.toLowerCase()) {
      case "m":
        e.preventDefault();
        selectBattleMapTool("move");
        announceAction(
          "Move tool selected. Use arrow keys to move combatants.",
        );
        return;
      case "t":
        e.preventDefault();
        if (battleMap.selectedTool !== "wall") {
          selectBattleMapTool("wall");
          announceAction("Wall terrain tool selected.");
        } else {
          selectBattleMapTool("furniture");
          announceAction("Furniture terrain tool selected.");
        }
        return;
      case "l":
        e.preventDefault();
        selectLightTool();
        announceAction("Light placement tool selected.");
        return;
      case "r":
        e.preventDefault();
        selectBattleMapTool("rotate");
        announceAction("Rotate tool selected. Click a combatant to rotate.");
        return;
      case "e":
        e.preventDefault();
        selectBattleMapTool("erase");
        announceAction("Erase tool selected.");
        return;
      case "z":
        e.preventDefault();
        if (battleMap.zoom < 2.0) {
          zoomBattleMap(0.1);
          announceAction(`Zoomed in to ${Math.round(battleMap.zoom * 100)}%`);
        }
        return;
      case "x":
        e.preventDefault();
        if (battleMap.zoom > 0.5) {
          zoomBattleMap(-0.1);
          announceAction(`Zoomed out to ${Math.round(battleMap.zoom * 100)}%`);
        }
        return;
      case "w":
        e.preventDefault();
        fitBattleMapToScreen();
        announceAction(`Fit to screen: ${Math.round(battleMap.zoom * 100)}%`);
        return;
      case "f":
        e.preventDefault();
        toggleFogOfWar();
        announceAction(
          `Fog of war ${battleMap.fogOfWar.enabled ? "enabled" : "disabled"}`,
        );
        return;
      case "a":
        e.preventDefault();
        // Toggle AoE tool selection
        if (battleMap.selectedAoeTool) {
          selectAoeTool(null);
          announceAction("AoE tool deselected");
        } else {
          selectAoeTool("circle");
          announceAction("Circle AoE tool selected");
        }
        return;
      case "g":
        e.preventDefault();
        // Toggle grid coordinates display
        battleMap.showMoveDistance = !battleMap.showMoveDistance;
        renderBattleMapControls();
        announceAction(
          `Distance display ${
            battleMap.showMoveDistance ? "enabled" : "disabled"
          }`,
        );
        return;
      case "?":
        e.preventDefault();
        toggleKeyboardHelp();
        return;
    }
  }

  // Arrow keys for navigation
  if (e.key.startsWith("Arrow")) {
    e.preventDefault();

    // Initialize focused cell if not set
    if (!battleMap.keyboard.focusedCell) {
      battleMap.keyboard.focusedCell = { x: 0, y: 0 };
    }

    const cell = battleMap.keyboard.focusedCell;

    // Move focused cell
    switch (e.key) {
      case "ArrowUp":
        if (cell.y > 0) cell.y--;
        break;
      case "ArrowDown":
        if (cell.y < layer.height - 1) cell.y++;
        break;
      case "ArrowLeft":
        if (cell.x > 0) cell.x--;
        break;
      case "ArrowRight":
        if (cell.x < layer.width - 1) cell.x++;
        break;
    }

    // If a combatant is selected, move them
    if (battleMap.selectedCombatant && battleMap.selectedTool === "move") {
      moveCombatantTo(battleMap.selectedCombatant, cell.x, cell.y);
      const combatant = combatants.find(
        (c) => c.id === battleMap.selectedCombatant,
      );
      if (combatant) {
        announceAction(
          `${combatant.name} moved to ${getGridLabel(cell.x, cell.y)}`,
        );
      }
    }

    renderBattleMap();
    return;
  }

  // Space or Enter - Select/activate
  if (e.key === " " || e.key === "Enter") {
    e.preventDefault();

    if (battleMap.keyboard.focusedCell) {
      const cell = battleMap.keyboard.focusedCell;

      // Check if there's a combatant at this cell
      const combatantId = Object.entries(layer.combatantPositions).find(
        ([id, pos]) => pos.x === cell.x && pos.y === cell.y,
      )?.[0];

      if (combatantId) {
        selectCombatantOnMap(parseInt(combatantId));
        const combatant = combatants.find(
          (c) => c.id === parseInt(combatantId),
        );
        if (combatant) {
          announceAction(
            `${combatant.name} selected at ${getGridLabel(cell.x, cell.y)}`,
          );
        }
      } else if (
        battleMap.selectedTool === "move" &&
        battleMap.selectedCombatant
      ) {
        // Move selected combatant to this cell
        moveCombatantTo(battleMap.selectedCombatant, cell.x, cell.y);
        const combatant = combatants.find(
          (c) => c.id === battleMap.selectedCombatant,
        );
        if (combatant) {
          announceAction(
            `${combatant.name} moved to ${getGridLabel(cell.x, cell.y)}`,
          );
        }
      } else {
        // Click the cell (for terrain placement, light placement, etc.)
        handleBattleMapClick(cell.x, cell.y);
      }
    }
    return;
  }

  // Escape - Cancel/deselect
  if (e.key === "Escape") {
    e.preventDefault();

    if (battleMap.aoePlacementMode) {
      toggleAoePlacement();
      announceAction("AoE placement cancelled");
    } else if (battleMap.measuring.active) {
      battleMap.measuring.active = false;
      battleMap.measuring.startX = null;
      battleMap.measuring.startY = null;
      renderBattleMap();
      announceAction("Measurement cancelled");
    } else if (battleMap.selectedCombatant) {
      battleMap.selectedCombatant = null;
      renderBattleMap();
      announceAction("Combatant deselected");
    } else if (battleMap.selectedAoeTool) {
      selectAoeTool(null);
      announceAction("AoE tool deselected");
    }
    return;
  }

  // Delete - Remove selected combatant or terrain
  if (e.key === "Delete" || e.key === "Backspace") {
    e.preventDefault();

    if (battleMap.selectedCombatant) {
      const combatant = combatants.find(
        (c) => c.id === battleMap.selectedCombatant,
      );
      if (combatant && confirm(`Remove ${combatant.name} from the map?`)) {
        delete layer.combatantPositions[battleMap.selectedCombatant];
        battleMap.selectedCombatant = null;
        renderBattleMap();
        saveBattleMapState();
        announceAction(`${combatant.name} removed from map`);
      }
    }
    return;
  }

  // Tab - Cycle through combatants
  if (e.key === "Tab") {
    e.preventDefault();

    const combatantIds = Object.keys(layer.combatantPositions).map((id) =>
      parseInt(id),
    );
    if (combatantIds.length === 0) return;

    let currentIndex = battleMap.selectedCombatant
      ? combatantIds.indexOf(battleMap.selectedCombatant)
      : -1;

    // Shift+Tab goes backwards
    if (e.shiftKey) {
      currentIndex =
        currentIndex <= 0 ? combatantIds.length - 1 : currentIndex - 1;
    } else {
      currentIndex =
        currentIndex >= combatantIds.length - 1 ? 0 : currentIndex + 1;
    }

    const nextCombatantId = combatantIds[currentIndex];
    selectCombatantOnMap(nextCombatantId);

    // Update focused cell to combatant position
    const pos = layer.combatantPositions[nextCombatantId];
    if (pos) {
      battleMap.keyboard.focusedCell = { x: pos.x, y: pos.y };
    }

    const combatant = combatants.find((c) => c.id === nextCombatantId);
    if (combatant) {
      announceAction(
        `${combatant.name} selected at ${getGridLabel(pos.x, pos.y)}`,
      );
    }
    return;
  }

  // Number keys 1-4 - Set combatant size
  if (battleMap.selectedCombatant && e.key >= "1" && e.key <= "4") {
    e.preventDefault();
    const size = parseInt(e.key);
    setCombatantSize(battleMap.selectedCombatant, size);
    const sizeNames = ["", "Medium", "Large", "Huge", "Gargantuan"];
    announceAction(`Combatant size set to ${sizeNames[size]}`);
    return;
  }

  // Plus/Minus - Adjust elevation
  if (
    battleMap.selectedCombatant &&
    (e.key === "+" || e.key === "=" || e.key === "-" || e.key === "_")
  ) {
    e.preventDefault();
    const currentElevation =
      battleMap.combatantElevations[battleMap.selectedCombatant] || 0;
    const newElevation =
      e.key === "+" || e.key === "="
        ? currentElevation + 1
        : currentElevation - 1;
    setCombatantElevation(battleMap.selectedCombatant, newElevation);
    announceAction(
      `Elevation set to ${newElevation > 0 ? "+" : ""}${newElevation}`,
    );
    return;
  }
}

// Helper function to convert grid coordinates to readable labels (A1, B2, etc.)
function getGridLabel(x, y) {
  const letter = String.fromCharCode(65 + x); // A, B, C...
  const number = y + 1;
  return `${letter}${number}`;
}

// Helper function to announce actions for screen readers
function announceAction(message) {
  // Create or update live region for screen reader announcements
  let liveRegion = document.getElementById("battleMapAnnouncements");
  if (!liveRegion) {
    liveRegion = document.createElement("div");
    liveRegion.id = "battleMapAnnouncements";
    liveRegion.setAttribute("role", "status");
    liveRegion.setAttribute("aria-live", "polite");
    liveRegion.setAttribute("aria-atomic", "true");
    liveRegion.style.position = "absolute";
    liveRegion.style.left = "-10000px";
    liveRegion.style.width = "1px";
    liveRegion.style.height = "1px";
    liveRegion.style.overflow = "hidden";
    document.body.appendChild(liveRegion);
  }

  liveRegion.textContent = message;

  // Also log to console for debugging
  console.log(`[Battle Map] ${message}`);
}

// Show/hide keyboard shortcuts help overlay
function toggleKeyboardHelp() {
  let helpOverlay = document.getElementById("battleMapKeyboardHelp");

  if (helpOverlay) {
    helpOverlay.remove();
    return;
  }

  helpOverlay = document.createElement("div");
  helpOverlay.id = "battleMapKeyboardHelp";
  helpOverlay.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(20, 20, 20, 0.98);
    border: 2px solid #4CAF50;
    border-radius: 12px;
    padding: 24px;
    z-index: 10000;
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
  `;

  helpOverlay.innerHTML = `
    <div style="position: relative;">
      <button onclick="toggleKeyboardHelp()" style="position: absolute; top: -12px; right: -12px; background: #d32f2f; border: none; color: white; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 18px; font-weight: bold;">✕</button>
      
      <h2 style="color: #4CAF50; margin-top: 0; margin-bottom: 16px; font-size: 1.5em;">⌨️ Keyboard Shortcuts</h2>
      
      <div style="display: grid; gap: 16px;">
        <div>
          <h3 style="color: #64B5F6; margin: 0 0 8px 0; font-size: 1.1em;">🛠️ Tools</h3>
          <div style="display: grid; gap: 4px; color: #e0e0e0; font-size: 0.9em;">
            <div><kbd style="background: #333; padding: 2px 8px; border-radius: 4px; border: 1px solid #555;">M</kbd> Move tool</div>
            <div><kbd style="background: #333; padding: 2px 8px; border-radius: 4px; border: 1px solid #555;">T</kbd> Terrain tool (wall/furniture)</div>
            <div><kbd style="background: #333; padding: 2px 8px; border-radius: 4px; border: 1px solid #555;">L</kbd> Light placement tool</div>
            <div><kbd style="background: #333; padding: 2px 8px; border-radius: 4px; border: 1px solid #555;">R</kbd> Rotate tool</div>
            <div><kbd style="background: #333; padding: 2px 8px; border-radius: 4px; border: 1px solid #555;">E</kbd> Erase tool</div>
            <div><kbd style="background: #333; padding: 2px 8px; border-radius: 4px; border: 1px solid #555;">A</kbd> Area of Effect tool</div>
          </div>
        </div>
        
        <div>
          <h3 style="color: #64B5F6; margin: 0 0 8px 0; font-size: 1.1em;">🎮 Navigation</h3>
          <div style="display: grid; gap: 4px; color: #e0e0e0; font-size: 0.9em;">
            <div><kbd style="background: #333; padding: 2px 8px; border-radius: 4px; border: 1px solid #555;">Arrow Keys</kbd> Navigate grid / Move selected combatant</div>
            <div><kbd style="background: #333; padding: 2px 8px; border-radius: 4px; border: 1px solid #555;">Space</kbd> or <kbd style="background: #333; padding: 2px 8px; border-radius: 4px; border: 1px solid #555;">Enter</kbd> Select/activate cell</div>
            <div><kbd style="background: #333; padding: 2px 8px; border-radius: 4px; border: 1px solid #555;">Tab</kbd> Cycle through combatants</div>
            <div><kbd style="background: #333; padding: 2px 8px; border-radius: 4px; border: 1px solid #555;">Shift</kbd> + <kbd style="background: #333; padding: 2px 8px; border-radius: 4px; border: 1px solid #555;">Tab</kbd> Cycle backwards</div>
          </div>
        </div>
        
        <div>
          <h3 style="color: #64B5F6; margin: 0 0 8px 0; font-size: 1.1em;">🎯 Combatant Actions</h3>
          <div style="display: grid; gap: 4px; color: #e0e0e0; font-size: 0.9em;">
            <div><kbd style="background: #333; padding: 2px 8px; border-radius: 4px; border: 1px solid #555;">1-4</kbd> Set combatant size (Medium/Large/Huge/Gargantuan)</div>
            <div><kbd style="background: #333; padding: 2px 8px; border-radius: 4px; border: 1px solid #555;">+</kbd> / <kbd style="background: #333; padding: 2px 8px; border-radius: 4px; border: 1px solid #555;">-</kbd> Adjust elevation</div>
            <div><kbd style="background: #333; padding: 2px 8px; border-radius: 4px; border: 1px solid #555;">Delete</kbd> Remove selected combatant from map</div>
          </div>
        </div>
        
        <div>
          <h3 style="color: #64B5F6; margin: 0 0 8px 0; font-size: 1.1em;">👁️ View Controls</h3>
          <div style="display: grid; gap: 4px; color: #e0e0e0; font-size: 0.9em;">
            <div><kbd style="background: #333; padding: 2px 8px; border-radius: 4px; border: 1px solid #555;">Z</kbd> Zoom in</div>
            <div><kbd style="background: #333; padding: 2px 8px; border-radius: 4px; border: 1px solid #555;">X</kbd> Zoom out</div>
            <div><kbd style="background: #333; padding: 2px 8px; border-radius: 4px; border: 1px solid #555;">W</kbd> Fit to screen</div>
            <div><kbd style="background: #333; padding: 2px 8px; border-radius: 4px; border: 1px solid #555;">F</kbd> Toggle fog of war</div>
            <div><kbd style="background: #333; padding: 2px 8px; border-radius: 4px; border: 1px solid #555;">G</kbd> Toggle distance display</div>
          </div>
        </div>
        
        <div>
          <h3 style="color: #64B5F6; margin: 0 0 8px 0; font-size: 1.1em;">⚡ General</h3>
          <div style="display: grid; gap: 4px; color: #e0e0e0; font-size: 0.9em;">
            <div><kbd style="background: #333; padding: 2px 8px; border-radius: 4px; border: 1px solid #555;">Escape</kbd> Cancel action / Deselect</div>
            <div><kbd style="background: #333; padding: 2px 8px; border-radius: 4px; border: 1px solid #555;">?</kbd> Show this help</div>
          </div>
        </div>
      </div>
      
      <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #555; color: #888; font-size: 0.85em; text-align: center;">
        Press <kbd style="background: #333; padding: 2px 8px; border-radius: 4px; border: 1px solid #555;">Escape</kbd> or click ✕ to close
      </div>
    </div>
  `;

  document.body.appendChild(helpOverlay);

  // Close on Escape key
  const closeOnEscape = (e) => {
    if (e.key === "Escape") {
      toggleKeyboardHelp();
      document.removeEventListener("keydown", closeOnEscape);
    }
  };
  document.addEventListener("keydown", closeOnEscape);

  // Close on click outside
  helpOverlay.addEventListener("click", (e) => {
    if (e.target === helpOverlay) {
      toggleKeyboardHelp();
    }
  });
}

function setupBattleMapEventListeners() {
  // Load state when combat tracker is shown
  loadBattleMapState();

  // Add mousemove listener for measurement preview
  const container = document.getElementById("battleMapCanvas");
  if (container) {
    container.addEventListener("mousemove", handleMeasurePreview);
  }

  // Add keyboard navigation listeners (safe to call multiple times due to flag)
  if (!window.battleMapKeyboardListenerAdded) {
    document.addEventListener("keydown", handleBattleMapKeyPress);
    window.battleMapKeyboardListenerAdded = true;
  }
}

/**
 * Setup event listeners for unified battle map modal
 */
function setupUnifiedBattleMapEventListeners() {
  // Load state
  loadBattleMapState();

  // Add mousemove listener for measurement preview
  const container = document.getElementById("unifiedBattleMapCanvas");
  if (container) {
    container.addEventListener("mousemove", handleMeasurePreview);
  }

  // Ensure keyboard listener is set up (safe to call multiple times due to flag)
  if (!window.battleMapKeyboardListenerAdded) {
    document.addEventListener("keydown", handleBattleMapKeyPress);
    window.battleMapKeyboardListenerAdded = true;
  }
}

// ==================== INTEGRATION WITH COMBAT ==================== //

// Call this when combatants change
function syncBattleMapWithCombat() {
  // Remove positions for combatants no longer in combat
  const layer = getActiveLayer();
  Object.keys(layer.combatantPositions).forEach((id) => {
    if (!combatants.find((c) => c.id === parseInt(id))) {
      delete layer.combatantPositions[id];
    }
  });

  // Auto-place new combatants
  placeCombatantsOnMap();
  saveBattleMapState();
}

// Call when clearing combat
function clearBattleMap() {
  const layer = getActiveLayer();
  layer.combatantPositions = {};
  battleMap.selectedCombatant = null;
  renderBattleMap();
  saveBattleMapState();
}

// ==================== MAP PING FUNCTIONS ==================== //

function togglePingTool() {
  battleMap.pingActive = !battleMap.pingActive;

  console.log("🎯 Ping tool toggled:", battleMap.pingActive);
}

function setPingColor(color) {
  battleMap.pingColor = color;
  console.log("🎨 Ping color set to:", color);
}

function placePing(x, y) {
  if (
    !isMultiplayerActive ||
    !multiplayerManager ||
    !multiplayerManager.roomCode
  ) {
    console.log("⚠️ Not connected to multiplayer - ping not sent");
    alert("You must be connected to a multiplayer session to place pings.");
    return;
  }

  const layer = getActiveLayer();
  const cellSize = battleMap.gridSize; // Use base grid size without zoom
  // Convert grid coordinates to pixel coordinates for display
  const pixelX = x * cellSize + cellSize / 2;
  const pixelY = y * cellSize + cellSize / 2;

  const gmName = "Game Master";
  const randomStr = Math.floor(Math.random() * 1000000).toString();
  const ping = {
    x: pixelX,
    y: pixelY,
    color: battleMap.pingColor,
    playerName: gmName,
    timestamp: Date.now(),
    id: `${multiplayerManager.roomCode}_${Date.now()}_${randomStr}`,
  };

  console.log("📍 GM placing ping:", ping);

  // Add to local pings
  battleMap.activePings.push(ping);
  renderBattleMap();

  // Send to Firebase
  if (multiplayerManager.db && multiplayerManager.roomCode) {
    multiplayerManager.db
      .ref(`rooms/${multiplayerManager.roomCode}/battleMapPings/${ping.id}`)
      .set({
        x: ping.x,
        y: ping.y,
        color: ping.color,
        playerName: ping.playerName,
        timestamp: ping.timestamp,
      });

    // Auto-remove after 5 seconds
    setTimeout(() => {
      removePing(ping.id);
      multiplayerManager.db
        .ref(`rooms/${multiplayerManager.roomCode}/battleMapPings/${ping.id}`)
        .remove();
    }, 5000);
  }
}

function removePing(pingId) {
  const index = battleMap.activePings.findIndex((p) => p.id === pingId);
  if (index !== -1) {
    battleMap.activePings.splice(index, 1);
    if (typeof renderBattleMap === "function") {
      renderBattleMap();
    }
  }
}

function drawPingsHTML(layer, cellSize) {
  const now = Date.now();
  // Filter out very old pings as safety (beyond 10 seconds)
  battleMap.activePings = battleMap.activePings.filter((ping) => {
    const age = now - ping.timestamp;
    return age < 10000;
  });

  let pingsHTML = "";

  battleMap.activePings.forEach((ping) => {
    const age = now - ping.timestamp;
    const opacity = Math.max(0, 1 - age / 5000); // Fade out over 5 seconds
    const scale = 1 + (age / 5000) * 0.5; // Grow slightly as they fade

    // ping.x and ping.y are in base coordinate system (cellSize = 40)
    // Apply zoom to position them correctly in the zoomed grid
    const pingX = ping.x * battleMap.zoom;
    const pingY = ping.y * battleMap.zoom;

    // Main ping diamond (rotated square)
    pingsHTML += `
      <div style="
        position: absolute;
        left: ${pingX}px;
        top: ${pingY}px;
        width: 18px;
        height: 18px;
        margin-left: -9px;
        margin-top: -9px;
        background: ${ping.color};
        border: 3px solid white;
        transform: rotate(45deg) scale(${scale});
        pointer-events: none;
        z-index: 300;
        box-shadow: 0 0 10px ${ping.color};
        opacity: ${opacity};
      "></div>
    `;

    // Expanding ring
    const ringScale = 1 + (age / 5000) * 2;
    const ringOpacity = opacity * 0.5;
    pingsHTML += `
      <div style="
        position: absolute;
        left: ${pingX}px;
        top: ${pingY}px;
        width: 30px;
        height: 30px;
        margin-left: -15px;
        margin-top: -15px;
        border: 2px solid ${ping.color};
        border-radius: 50%;
        opacity: ${ringOpacity};
        transform: scale(${ringScale});
        pointer-events: none;
        z-index: 299;
      "></div>
    `;

    // Player name label
    pingsHTML += `
      <div style="
        position: absolute;
        left: ${pingX}px;
        top: ${pingY + 25}px;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 11px;
        white-space: nowrap;
        opacity: ${opacity};
        pointer-events: none;
        z-index: 301;
        border: 1px solid ${ping.color};
      ">${ping.playerName}'s ping</div>
    `;
  });

  return pingsHTML;
}
