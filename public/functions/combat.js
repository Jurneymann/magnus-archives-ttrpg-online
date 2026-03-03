// Magnus Archives GM Tool - Combat Tracker

let combatants = [];
let currentTurn = 0;
let combatActive = false;
let combatPhase = "setup"; // 'setup', 'initiative', 'active'
let expandedCombatants = {}; // Track which combatants are expanded

// Horror Mode State
let horrorMode = {
  enabled: false,
  level: 1, // Default horror level
};

// Horror Mode Functions
function toggleHorrorMode() {
  horrorMode.enabled = !horrorMode.enabled;

  // Reset level to 1 when disabling
  if (!horrorMode.enabled) {
    horrorMode.level = 1;
  }

  // Toggle body class for theme switching
  if (horrorMode.enabled) {
    document.body.classList.add("horror-mode-active");
  } else {
    document.body.classList.remove("horror-mode-active");
  }

  updateHorrorModeUI();
  saveHorrorModeState();
  broadcastHorrorModeToPlayers();
}

function incrementHorrorLevel() {
  if (horrorMode.level < 10) {
    horrorMode.level++;
    updateHorrorModeUI();
    saveHorrorModeState();
    broadcastHorrorModeToPlayers();
  }
}

function decrementHorrorLevel() {
  if (horrorMode.level > 1) {
    horrorMode.level--;
    updateHorrorModeUI();
    saveHorrorModeState();
    broadcastHorrorModeToPlayers();
  }
}

/**
 * Broadcast Horror Mode state to all connected players via Firebase
 */
function broadcastHorrorModeToPlayers() {
  // Only broadcast if multiplayer is active
  if (
    typeof multiplayerManager === "undefined" ||
    !multiplayerManager.roomCode
  ) {
    return;
  }

  multiplayerManager.db
    .ref(`rooms/${multiplayerManager.roomCode}/sharedData/horrorMode`)
    .set({
      enabled: horrorMode.enabled,
      level: horrorMode.level,
      timestamp: Date.now(),
    })
    .catch((error) => console.error("Error broadcasting Horror Mode:", error));

  console.log("📡 Horror Mode broadcasted to players:", horrorMode);
}

/**
 * Sync combat state to all connected players via Firebase
 */
function syncCombatToPlayers() {
  // Only sync if multiplayer is active
  if (
    typeof multiplayerManager === "undefined" ||
    !multiplayerManager.roomCode
  ) {
    return;
  }

  // Get fog of war visibility if battle map exists and fog is enabled
  let visibleCombatantIds = new Set();
  const hasBattleMap = typeof battleMap !== "undefined";
  const hasGetVisibleCells = typeof getVisibleCells === "function";
  const hasGetLightIntensity = typeof getLightIntensityAtCell === "function";
  const fogEnabled =
    hasBattleMap && battleMap.fogOfWar && battleMap.fogOfWar.enabled;

  console.log("🌫️ Fog of War enabled:", fogEnabled);
  console.log("🗺️ BattleMap available:", hasBattleMap);
  console.log("🔍 getVisibleCells available:", hasGetVisibleCells);
  console.log("💡 getLightIntensityAtCell available:", hasGetLightIntensity);

  if (fogEnabled && hasGetVisibleCells) {
    const layer =
      battleMap.layers.find((l) => l.id === battleMap.activeLayerId) ||
      battleMap.layers[0];

    // Get visible cells
    const visibleCells = getVisibleCells(layer);
    console.log("🌫️ Visible cells count:", visibleCells.size);

    // Check each combatant's position
    Object.entries(layer.combatantPositions || {}).forEach(
      ([combatantId, pos]) => {
        const combatant = combatants.find(
          (c) => c.id === parseInt(combatantId),
        );
        if (!combatant) return;

        // Check if combatant is a PC (always visible to players)
        if (combatant.type === "PC" || combatant.type === "Player") {
          visibleCombatantIds.add(combatant.id);
          console.log(`✅ ${combatant.name} (PC) - Always visible`);
          return;
        }

        // Check if combatant's position is in visible cells
        const isInLineOfSight = visibleCells.has(`${pos.x},${pos.y}`);

        if (isInLineOfSight) {
          visibleCombatantIds.add(combatant.id);
          console.log(
            `✅ ${combatant.name} at (${pos.x},${pos.y}) - In line of sight`,
          );
        } else if (hasGetLightIntensity) {
          // Not in line of sight, but check if lit by dynamic lighting
          const lightIntensity = getLightIntensityAtCell(pos.x, pos.y, layer);
          if (lightIntensity > 0.29) {
            visibleCombatantIds.add(combatant.id);
            console.log(
              `💡 ${combatant.name} at (${pos.x},${pos.y}) - Visible via lighting (${lightIntensity.toFixed(2)})`,
            );
          } else {
            console.log(
              `❌ ${combatant.name} at (${pos.x},${pos.y}) - Hidden by fog (light: ${lightIntensity.toFixed(2)})`,
            );
          }
        } else {
          console.log(
            `❌ ${combatant.name} at (${pos.x},${pos.y}) - Hidden by fog (no light calc)`,
          );
        }
      },
    );
  } else {
    // No fog of war or functions not available - all combatants visible
    if (fogEnabled && !hasGetVisibleCells) {
      console.warn(
        "⚠️ Fog enabled but getVisibleCells not available - showing all combatants",
      );
    } else {
      console.log("🌫️ Fog of war disabled - all combatants visible");
    }
    combatants.forEach((c) => visibleCombatantIds.add(c.id));
  }

  // Convert combatants array to object for Firebase
  const combatantsObj = {};
  combatants.forEach((c, index) => {
    combatantsObj[index] = {
      id: c.id,
      name: c.name,
      initiative: c.initiative,
      type: c.type,
      visible: visibleCombatantIds.has(c.id),
    };
  });

  const combatData = {
    active: combatActive,
    phase: combatPhase,
    currentTurn: currentTurn,
    combatants: combatantsObj,
    timestamp: Date.now(),
  };

  multiplayerManager.db
    .ref(`rooms/${multiplayerManager.roomCode}/combat`)
    .set(combatData)
    .catch((error) => console.error("Error syncing combat:", error));

  console.log("⚔️ Combat state synced to players:", combatData);
}

function updateHorrorModeUI() {
  const banner = document.getElementById("horrorModeBanner");
  const headerImage = document.getElementById("headerImage");
  const toggle = document.getElementById("horrorModeToggle");
  const levelDisplay = document.getElementById("horrorLevelDisplay");

  if (horrorMode.enabled) {
    banner.classList.add("visible");
    if (headerImage) headerImage.classList.add("hidden");
    document.body.classList.add("horror-mode-active");
    if (toggle) toggle.classList.add("active");
    if (levelDisplay) levelDisplay.textContent = horrorMode.level;
  } else {
    banner.classList.remove("visible");
    if (headerImage) headerImage.classList.remove("hidden");
    document.body.classList.remove("horror-mode-active");
    if (toggle) toggle.classList.remove("active");
  }
}

function saveHorrorModeState() {
  localStorage.setItem("horrorMode", JSON.stringify(horrorMode));
}

function loadHorrorModeState() {
  const saved = localStorage.getItem("horrorMode");
  if (saved) {
    horrorMode = JSON.parse(saved);
    updateHorrorModeUI();
  }
}

// ==================== SETUP PHASE ==================== //

function addPartyMemberToCombat(memberId) {
  if (typeof partyMembers === "undefined") return;

  const member = partyMembers.find((m) => m.id === memberId);
  if (!member) return;

  // Check if already added
  if (combatants.some((c) => c.sourceId === memberId && c.type === "PC")) {
    alert(`${member.name} is already in the encounter.`);
    return;
  }

  const newCombatant = {
    id: Date.now(),
    sourceId: memberId,
    type: "PC",
    name: member.name || "Unnamed PC",
    initiative: null,
    // PC Data
    stress: member.stress || 0,
    damage: member.damage || "Hale",
    might: { ...member.might },
    speed: { ...member.speed },
    intellect: { ...member.intellect },
    effort: member.effort || 1,
    location: "",
    notes: "",
    sourceToken:
      typeof sourceTokenPresets !== "undefined"
        ? sourceTokenPresets.party[memberId]
        : undefined,
  };

  // If combat is active, prompt for initiative and insert in order
  if (combatPhase === "active" && combatActive) {
    const initiativeChoice = prompt(
      `Combat is active! Set initiative for ${newCombatant.name}:\n\nEnter a number (1-20):`,
      "10",
    );

    if (initiativeChoice === null) return; // User cancelled

    newCombatant.initiative = parseInt(initiativeChoice) || 10;

    // Insert in correct initiative order
    insertCombatantInOrder(newCombatant);
  } else {
    combatants.push(newCombatant);
  }

  renderCombatTracker();
}

function addAllPartyToCombat() {
  if (typeof partyMembers === "undefined" || partyMembers.length === 0) {
    alert("No party members to add.");
    return;
  }

  let added = 0;
  partyMembers.forEach((member) => {
    if (!combatants.some((c) => c.sourceId === member.id && c.type === "PC")) {
      combatants.push({
        id: Date.now() + added,
        sourceId: member.id,
        type: "PC",
        name: member.name || "Unnamed PC",
        initiative: null,
        stress: member.stress || 0,
        damage: member.damage || "Hale",
        might: { ...member.might },
        speed: { ...member.speed },
        intellect: { ...member.intellect },
        effort: member.effort || 1,
        location: "",
        notes: "",
        sourceToken:
          typeof sourceTokenPresets !== "undefined"
            ? sourceTokenPresets.party[member.id]
            : undefined,
      });
      added++;
    }
  });

  if (added > 0) {
    renderCombatTracker();
    alert(`Added ${added} party member(s) to combat.`);
  } else {
    alert("All party members are already in combat.");
  }
}

function addNPCToCombatTracker(npcId) {
  if (typeof npcs === "undefined") return;

  const npc = npcs.find((n) => n.id === npcId);
  if (!npc) return;

  const newCombatant = {
    id: Date.now(),
    sourceId: npcId,
    type: "NPC",
    name: npc.name || "Unnamed NPC",
    initiative: null,
    level: npc.level || 1,
    health: npc.health || 3,
    currentHealth: npc.currentHealth || npc.health || 3,
    damage: npc.damage || 2,
    armor: npc.armor || 0,
    abilities: npc.abilities || "",
    location: "",
    notes: "",
    sourceToken:
      typeof sourceTokenPresets !== "undefined"
        ? sourceTokenPresets.npcs[npcId]
        : undefined,
  };

  // If combat is active, prompt for initiative and insert in order
  if (combatPhase === "active" && combatActive) {
    const initiativeChoice = prompt(
      `Combat is active! Set initiative for ${newCombatant.name}:\n\nEnter a number (1-20) or type 'random' for random roll:`,
      "random",
    );

    if (initiativeChoice === null) return; // User cancelled

    if (initiativeChoice.toLowerCase() === "random") {
      newCombatant.initiative = Math.floor(Math.random() * 20) + 1;
      alert(
        `${newCombatant.name} rolled ${newCombatant.initiative} for initiative.`,
      );
    } else {
      newCombatant.initiative = parseInt(initiativeChoice) || 10;
    }

    // Insert in correct initiative order
    insertCombatantInOrder(newCombatant);
  } else {
    combatants.push(newCombatant);
  }

  renderCombatTracker();
}

function addBestiaryToCombat(creatureName, customCreature = null) {
  let creature = customCreature;

  // If not a custom creature, look in customEnemies array
  if (!creature && typeof customEnemies !== "undefined") {
    creature = customEnemies.find((c) => c.name === creatureName);
    if (!creature) {
      alert(`Creature "${creatureName}" not found in bestiary.`);
      return;
    }
  }

  if (!creature) {
    alert("Creature data not available.");
    return;
  }

  const quantity =
    parseInt(prompt(`How many ${creatureName} to add?`, "1")) || 1;

  const inActiveCombat = combatPhase === "active" && combatActive;
  let initiativeValue = null;

  // If combat is active, ask for initiative once for all creatures
  if (inActiveCombat) {
    const initiativeChoice = prompt(
      `Combat is active! Set initiative for ${creature.name}${
        quantity > 1 ? ` (all ${quantity})` : ""
      }:\n\nEnter a number (1-20) or type 'random' for random roll:`,
      "random",
    );

    if (initiativeChoice === null) return; // User cancelled

    if (initiativeChoice.toLowerCase() === "random") {
      initiativeValue = Math.floor(Math.random() * 20) + 1;
      alert(`${creature.name} rolled ${initiativeValue} for initiative.`);
    } else {
      initiativeValue = parseInt(initiativeChoice) || 10;
    }
  }

  for (let i = 0; i < quantity; i++) {
    const suffix = quantity > 1 ? ` ${i + 1}` : "";
    const displayName = creature.name + suffix;

    const newCombatant = {
      id: Date.now() + i,
      type: "Creature",
      name: creature.name + suffix,
      displayName: displayName, // Can be edited in Combat Tracker
      creatureType: creature.name, // Original creature type for reference
      initiative: initiativeValue,
      level: creature.level || 1,
      health: creature.health || creature.level * 3,
      currentHealth: creature.health || creature.level * 3,
      damageInflicted: creature.damageInflicted || `${creature.level} points`,
      movement: creature.movement || "",
      combat: creature.combat || "",
      abilities: creature.abilities || [],
      location: "",
      notes: "",
      custom: creature.custom || false,
      sourceToken:
        typeof sourceTokenPresets !== "undefined"
          ? sourceTokenPresets.bestiary[creature.name]
          : undefined,
    };

    if (inActiveCombat) {
      insertCombatantInOrder(newCombatant);
    } else {
      combatants.push(newCombatant);
    }
  }

  renderCombatTracker();
}

function removeCombatant(id) {
  combatants = combatants.filter((c) => c.id !== id);
  delete expandedCombatants[id];
  renderCombatTracker();
}

function insertCombatantInOrder(newCombatant) {
  // Find the correct position to insert based on initiative order
  // Higher initiative comes first, ties go to existing combatants
  let insertIndex = combatants.length;

  for (let i = 0; i < combatants.length; i++) {
    if (newCombatant.initiative > combatants[i].initiative) {
      insertIndex = i;
      break;
    }
  }

  // Adjust currentTurn if inserting before the current combatant
  if (insertIndex <= currentTurn) {
    currentTurn++;
  }

  combatants.splice(insertIndex, 0, newCombatant);

  // Show where they were inserted in initiative order
  const position = insertIndex + 1;
  console.log(
    `Inserted ${newCombatant.name} at position ${position} (Initiative ${newCombatant.initiative})`,
  );
}

function quickAddCombatant() {
  const name = prompt("Combatant name:");
  if (!name) return;

  const type = confirm("Is this a player character? (OK = PC, Cancel = NPC)")
    ? "PC"
    : "NPC";

  if (type === "PC") {
    combatants.push({
      id: Date.now(),
      type: "PC",
      name: name,
      initiative: null,
      stress: 0,
      damage: "Hale",
      might: { current: 10, max: 10, edge: 0 },
      speed: { current: 10, max: 10, edge: 0 },
      intellect: { current: 10, max: 10, edge: 0 },
      effort: 1,
      location: "",
      notes: "",
    });
  } else {
    const level = parseInt(prompt("NPC Level:", "1")) || 1;
    const health = level * 3;
    combatants.push({
      id: Date.now(),
      type: "NPC",
      name: name,
      initiative: null,
      level: level,
      health: health,
      currentHealth: health,
      damage: level,
      armor: 0,
      abilities: "",
      location: "",
      notes: "",
    });
  }

  renderCombatTracker();
}

// ==================== INITIATIVE PHASE ==================== //

function updateInitiative(id, value) {
  const combatant = combatants.find((c) => c.id === id);
  if (combatant) {
    combatant.initiative = parseInt(value) || null;
  }
}

function randomizeInitiative(id) {
  const combatant = combatants.find((c) => c.id === id);
  if (combatant) {
    combatant.initiative = Math.floor(Math.random() * 20) + 1;
    const input = document.querySelector(`input[data-init-id="${id}"]`);
    if (input) input.value = combatant.initiative;
  }
}

function randomizeAllNPCInitiative() {
  combatants.forEach((c) => {
    if (c.type !== "PC") {
      c.initiative = Math.floor(Math.random() * 20) + 1;
    }
  });
  renderCombatTracker();
}

function confirmInitiativeOrder() {
  // Check all have initiative
  const missing = combatants.filter(
    (c) => c.initiative === null || c.initiative === undefined,
  );
  if (missing.length > 0) {
    alert(
      `Please set initiative for all combatants. Missing: ${missing
        .map((c) => c.name)
        .join(", ")}`,
    );
    return;
  }

  // Sort by initiative (descending), then by name for ties
  combatants.sort((a, b) => {
    if (b.initiative !== a.initiative) {
      return b.initiative - a.initiative;
    }
    return a.name.localeCompare(b.name);
  });

  // Let GM choose starting position
  const startIndex =
    parseInt(
      prompt(
        `Initiative order set! Start with which position? (1-${combatants.length})`,
        "1",
      ),
    ) || 1;
  currentTurn = Math.max(0, Math.min(startIndex - 1, combatants.length - 1));

  combatPhase = "active";
  combatActive = true;

  // Auto-switch battle map to "Use Map" mode when combat starts
  if (typeof setBattleMapMode === "function") {
    setBattleMapMode("use");
  }

  renderCombatTracker();
  syncCombatToPlayers();

  // Auto-open unified battle map view
  if (typeof openUnifiedBattleMapInMode === "function") {
    openUnifiedBattleMapInMode("use");
  }
}

// ==================== ACTIVE COMBAT PHASE ==================== //

function nextTurn() {
  if (!combatActive || combatPhase !== "active") {
    alert("Combat hasn't been started yet.");
    return;
  }

  // Check if current combatant is dead/defeated
  checkCombatantStatus();

  // Move to next alive combatant
  let attempts = 0;
  do {
    currentTurn = (currentTurn + 1) % combatants.length;
    attempts++;

    // Prevent infinite loop if all are dead
    if (attempts > combatants.length) {
      alert("All combatants are defeated!");
      return;
    }
  } while (isCombatantDefeated(combatants[currentTurn]));

  renderCombatTracker();
  syncCombatToPlayers();

  const current = combatants[currentTurn];
  if (typeof addToRollLog === "function") {
    addToRollLog("Turn", `${current.name}'s turn`);
  }
}

function isCombatantDefeated(combatant) {
  if (combatant.type === "PC") {
    return combatant.damage === "Dead";
  } else {
    return combatant.currentHealth <= 0;
  }
}

function checkCombatantStatus() {
  combatants.forEach((c) => {
    if (isCombatantDefeated(c)) {
      c.defeated = true;
    }
  });
}

function endCombat() {
  if (
    !confirm(
      "End this combat encounter? This will sync changes back to the Party tab.",
    )
  ) {
    return;
  }

  // Sync PC data back to party members
  combatants.forEach((combatant) => {
    if (combatant.type === "PC" && combatant.sourceId) {
      const member = partyMembers.find((m) => m.id === combatant.sourceId);
      if (member) {
        member.stress = combatant.stress;
        member.damage = combatant.damage;
        member.might = { ...combatant.might };
        member.speed = { ...combatant.speed };
        member.intellect = { ...combatant.intellect };
        member.effort = combatant.effort;
      }
    }
  });

  // Save and render party data
  if (typeof savePartyData === "function") {
    savePartyData();
  }
  if (typeof renderPartyList === "function") {
    renderPartyList();
  }

  // Reset combat
  combatants = [];
  expandedCombatants = {};
  currentTurn = 0;
  combatActive = false;
  combatPhase = "setup";

  // Clear battle map
  if (typeof clearBattleMap === "function") {
    clearBattleMap();
  }

  if (typeof addToRollLog === "function") {
    addToRollLog("Combat", "Ended");
  }

  renderCombatTracker();
  syncCombatToPlayers();
}

// ==================== COMBATANT UPDATES ==================== //

function updateCombatantField(id, field, value) {
  const combatant = combatants.find((c) => c.id === id);
  if (!combatant) return;

  // Handle nested fields
  if (field.includes(".")) {
    const [parent, child] = field.split(".");
    if (combatant[parent]) {
      combatant[parent][child] = isNaN(value) ? value : parseFloat(value);
    }
  } else {
    combatant[field] = isNaN(value)
      ? value
      : field === "name" ||
          field === "location" ||
          field === "notes" ||
          field === "abilities"
        ? value
        : parseFloat(value);
  }

  // Auto-update stress level for PCs
  if (field === "stress" && combatant.type === "PC") {
    // Stress level is calculated, no need to store
  }

  // Sync PC damage/stress changes to multiplayer
  if (
    combatant.type === "PC" &&
    typeof multiplayerManager !== "undefined" &&
    multiplayerManager.roomCode
  ) {
    if (field === "damage") {
      // Find matching player by character name
      const roomRef = multiplayerManager.db.ref(
        `rooms/${multiplayerManager.roomCode}/players`,
      );
      roomRef.once("value", (snapshot) => {
        snapshot.forEach((playerSnapshot) => {
          const player = playerSnapshot.val();
          const characterName = player?.character?.name || player?.name;
          if (player && characterName === combatant.name) {
            const playerId = playerSnapshot.key;
            multiplayerManager.db
              .ref(
                `rooms/${multiplayerManager.roomCode}/players/${playerId}/character/damageTrack`,
              )
              .set(value);
            console.log(
              `✓ Synced damage track '${value}' to ${characterName} (player: ${player.name})`,
            );
          }
        });
      });
    } else if (field === "stress") {
      // Find matching player by character name
      const roomRef = multiplayerManager.db.ref(
        `rooms/${multiplayerManager.roomCode}/players`,
      );
      roomRef.once("value", (snapshot) => {
        snapshot.forEach((playerSnapshot) => {
          const player = playerSnapshot.val();
          const characterName = player?.character?.name || player?.name;
          if (player && characterName === combatant.name) {
            const playerId = playerSnapshot.key;
            multiplayerManager.db
              .ref(
                `rooms/${multiplayerManager.roomCode}/players/${playerId}/character/stress`,
              )
              .set(parseFloat(value));
            console.log(
              `✓ Synced stress ${value} to ${characterName} (player: ${player.name})`,
            );
          }
        });
      });
    }
  }

  renderCombatTracker();

  // Update battle map state if the function exists
  if (typeof saveBattleMapState === "function") {
    saveBattleMapState();
  }
}

function toggleCombatantExpanded(id) {
  expandedCombatants[id] = !expandedCombatants[id];
  renderCombatTracker();
}

// ==================== RENDER FUNCTIONS ==================== //

function renderCombatTracker() {
  const container = document.getElementById("initiativeList");
  if (!container) return;

  if (combatants.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #888;">
        <p style="margin-bottom: 15px;">No combatants added yet.</p>
        <p style="font-size: 0.9em;">Add party members, NPCs, or creatures to begin.</p>
      </div>
    `;
    return;
  }

  if (combatPhase === "setup") {
    renderSetupPhase(container);
  } else if (combatPhase === "initiative") {
    renderInitiativePhase(container);
  } else {
    renderActivePhase(container);
  }

  // Sync battle map with current combatants
  if (typeof syncBattleMapWithCombat === "function") {
    syncBattleMapWithCombat();
  }

  // Also update unified view if it's open
  const unifiedModal = document.getElementById("unifiedBattleMapModal");
  if (unifiedModal && unifiedModal.style.display !== "none") {
    renderUnifiedCombatTracker();
  }
}

/**
 * Render combat tracker in the unified battle map modal
 */
function renderUnifiedCombatTracker() {
  // Render combat controls
  const controlsContainer = document.getElementById("unifiedCombatControls");
  if (controlsContainer) {
    controlsContainer.innerHTML = renderUnifiedCombatControls();
  }

  // Render initiative list
  const initiativeContainer = document.getElementById("unifiedInitiativeList");
  if (!initiativeContainer) return;

  if (combatants.length === 0) {
    initiativeContainer.innerHTML = `
      <div style="text-align: center; padding: 40px 20px; color: #888;">
        <p style="margin-bottom: 15px;">No combatants added yet.</p>
        <p style="font-size: 0.9em;">Add party members, NPCs, or creatures from the Combat Tracker tab.</p>
      </div>
    `;
    return;
  }

  if (combatPhase === "setup") {
    renderSetupPhase(initiativeContainer);
  } else if (combatPhase === "initiative") {
    renderInitiativePhase(initiativeContainer);
  } else {
    renderActivePhase(initiativeContainer);
  }

  // Sync battle map with current combatants
  if (typeof syncBattleMapWithCombat === "function") {
    syncBattleMapWithCombat();
  }

  // Re-render unified battle map to show updated combatants
  if (typeof renderUnifiedBattleMap === "function") {
    renderUnifiedBattleMap();
  }
}

/**
 * Render combat control buttons for unified view
 */
function renderUnifiedCombatControls() {
  const primaryColor = window.getThemeColor("primary");

  if (combatPhase === "setup") {
    return `
      <div style="background: rgba(255, 152, 0, 0.1); padding: 12px; border-radius: 6px; border-left: 3px solid #ff9800; margin-bottom: 15px;">
        <div style="color: #ff9800; font-weight: bold; margin-bottom: 8px;">⚔️ Prepare Combat</div>
        <button
          class="button primary-button"
          onclick="combatPhase = 'initiative'; renderUnifiedCombatTracker();"
          style="width: 100%; padding: 10px; margin-bottom: 6px;">
          📝 Set Initiative
        </button>
        <button
          class="button"
          onclick="randomizeAllNPCInitiative(); renderUnifiedCombatTracker();"
          style="width: 100%; padding: 10px;">
          🎲 Random NPC Initiative
        </button>
      </div>
    `;
  } else if (combatPhase === "initiative") {
    return `
      <div style="background: rgba(76, 175, 80, 0.1); padding: 12px; border-radius: 6px; border-left: 3px solid ${primaryColor}; margin-bottom: 15px;">
        <div style="color: ${primaryColor}; font-weight: bold; margin-bottom: 8px;">⚔️ Start Combat</div>
        <button
          class="button primary-button"
          onclick="confirmInitiativeOrder(); renderUnifiedCombatTracker();"
          style="width: 100%; padding: 10px;">
          ▶️ Start Combat
        </button>
      </div>
    `;
  } else {
    // Active combat
    return `
      <div style="background: rgba(76, 175, 80, 0.1); padding: 12px; border-radius: 6px; border-left: 3px solid ${primaryColor}; margin-bottom: 15px;">
        <div style="color: ${primaryColor}; font-weight: bold; margin-bottom: 8px;">⚔️ Combat Active</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
          <button
            class="button primary-button"
            onclick="nextTurn(); renderUnifiedCombatTracker();"
            style="padding: 10px;">
            ⏭️ Next Turn
          </button>
          <button
            class="button"
            onclick="endCombat(); renderUnifiedCombatTracker(); toggleUnifiedBattleMap();"
            style="padding: 10px; background: rgba(211, 47, 47, 0.2); border-color: #d32f2f;">
            🛑 End Combat
          </button>
        </div>
      </div>
    `;
  }
}

function renderSetupPhase(container) {
  container.innerHTML = `
    <div style="margin-bottom: 20px; padding: 15px; background: rgba(255, 152, 0, 0.1); border-left: 3px solid #ff9800; border-radius: 4px;">
      <strong style="color: #ff9800;">Setup Phase</strong>
      <p style="color: #ccc; margin-top: 5px; font-size: 0.9em;">Add all combatants, then click "Set Initiative" to continue.</p>
    </div>
    ${combatants.map((c) => renderCombatantSetup(c)).join("")}
  `;
}

function renderInitiativePhase(container) {
  const primaryColor = window.getThemeColor("primary");
  const primaryRgba = window.getThemeColor("primaryRgba");

  container.innerHTML = `
    <div style="margin-bottom: 20px; padding: 15px; background: ${primaryRgba(
      0.1,
    )}; border-left: 3px solid ${primaryColor}; border-radius: 4px;">
      <strong style="color: ${primaryColor};">Initiative Phase</strong>
      <p style="color: #ccc; margin-top: 5px; font-size: 0.9em;">Enter initiative rolls for all combatants, then confirm to start combat.</p>
    </div>
    ${combatants.map((c) => renderCombatantInitiative(c)).join("")}
  `;
}

function renderActivePhase(container) {
  container.innerHTML = combatants
    .map((c, index) => renderCombatantActive(c, index))
    .join("");
}

function renderCombatantSetup(combatant) {
  const primaryColor = window.getThemeColor("primary");

  return `
    <div style="padding: 12px; margin-bottom: 8px; background: rgba(0, 0, 0, 0.3); border-radius: 6px; border: 1px solid ${primaryColor};">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <span style="font-weight: bold; color: ${primaryColor};">${combatant.name}</span>
          <span style="color: #888; margin-left: 10px; font-size: 0.9em;">${combatant.type}</span>
        </div>
        <button onclick="removeCombatant(${combatant.id})" style="background: #d32f2f; border: none; color: white; padding: 6px 12px; border-radius: 4px; cursor: pointer;">Remove</button>
      </div>
    </div>
  `;
}

function renderCombatantInitiative(combatant) {
  const primaryColor = window.getThemeColor("primary");

  return `
    <div style="padding: 10px; margin-bottom: 8px; background: rgba(0, 0, 0, 0.3); border-radius: 6px; border: 1px solid ${primaryColor};">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
        <div>
          <span style="font-weight: bold; color: ${primaryColor};">${
            combatant.name
          }</span>
          <span style="color: #888; margin-left: 8px; font-size: 0.85em;">${
            combatant.type
          }</span>
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 6px;">
        <label style="color: #888; font-size: 0.85em;">Init:</label>
        <input 
          type="number" 
          data-init-id="${combatant.id}"
          value="${combatant.initiative || ""}" 
          onchange="updateInitiative(${combatant.id}, this.value)"
          placeholder="1-20"
          style="width: 60px; padding: 5px; background: rgba(0,0,0,0.5); border: 1px solid ${primaryColor}; border-radius: 4px; color: #e0e0e0; text-align: center; font-size: 0.9em;"
        />
        ${
          combatant.type !== "PC"
            ? `
          <button onclick="randomizeInitiative(${combatant.id})" style="background: #666; border: none; color: white; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 0.9em;" title="Random (1-20)">🎲</button>
        `
            : ""
        }
        <button onclick="removeCombatant(${
          combatant.id
        })" style="background: #d32f2f; border: none; color: white; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 0.85em; margin-left: auto;">Remove</button>
      </div>
    </div>
  `;
}

function renderCombatantActive(combatant, index) {
  const isCurrent = index === currentTurn;
  const isDefeated = isCombatantDefeated(combatant);
  const isExpanded = expandedCombatants[combatant.id];

  const primaryColor = window.getThemeColor("primary");
  const primaryRgba = window.getThemeColor("primaryRgba");

  const opacity = isDefeated ? "0.4" : "1";
  const borderColor = isCurrent
    ? primaryColor
    : isDefeated
      ? "#666"
      : primaryColor;
  const bgColor = isCurrent ? primaryRgba(0.2) : "rgba(0, 0, 0, 0.3)";

  if (combatant.type === "PC") {
    return renderPCCombatant(
      combatant,
      isCurrent,
      isDefeated,
      isExpanded,
      opacity,
      borderColor,
      bgColor,
    );
  } else {
    return renderNPCCombatant(
      combatant,
      isCurrent,
      isDefeated,
      isExpanded,
      opacity,
      borderColor,
      bgColor,
    );
  }
}

function renderPCCombatant(
  combatant,
  isCurrent,
  isDefeated,
  isExpanded,
  opacity,
  borderColor,
  bgColor,
) {
  const stressLevel = Math.floor(combatant.stress / 3);

  return `
    <div style="margin-bottom: 10px; border: 2px solid ${borderColor}; border-radius: 8px; background: ${bgColor}; opacity: ${opacity};">
      <!-- Collapsed View -->
      <div 
        onclick="toggleCombatantExpanded(${combatant.id})" 
        style="padding: 15px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;"
      >
        <div style="display: flex; align-items: center; gap: 15px; flex: 1;">
          <span style="font-size: 1.4em; font-weight: bold; color: #4CAF50; min-width: 35px;">${
            combatant.initiative
          }</span>
          <div style="flex: 1;">
            <div style="font-weight: bold; font-size: 1.1em; color: ${
              isCurrent ? "#4CAF50" : "#e0e0e0"
            };">
              ${combatant.name}
              ${
                isCurrent
                  ? '<span style="color: #4CAF50; margin-left: 10px;">◄ ACTIVE</span>'
                  : ""
              }
              ${
                isDefeated
                  ? '<span style="color: #d32f2f; margin-left: 10px;">[DEAD]</span>'
                  : ""
              }
            </div>
            <div style="color: #888; font-size: 0.9em; margin-top: 3px;">
              Stress: ${combatant.stress} (Level ${stressLevel}) • ${
                combatant.damage
              }
            </div>
          </div>
          <div style="color: #888; font-size: 1.2em;">${
            isExpanded ? "▼" : "▶"
          }</div>
        </div>
      </div>
      
      <!-- Expanded View -->
      ${
        isExpanded
          ? `
        <div style="padding: 0 8px 8px 8px; border-top: 1px solid rgba(76, 175, 80, 0.3);">
          <div style="display: flex; flex-direction: column; gap: 15px; margin-top: 15px;">
            ${
              combatant.type === "PC"
                ? `
            <!-- PC: Only Name and Notes (health/stats managed in Multiplayer Menu) -->
            <div>
              <label style="display: block; color: #888; margin-bottom: 5px; font-size: 0.85em;">Name</label>
              <input 
                type="text" 
                value="${combatant.name}" 
                onchange="updateCombatantField(${
                  combatant.id
                }, 'name', this.value)"
                style="width: 100%; padding: 6px; background: rgba(0,0,0,0.5); border: 1px solid #4CAF50; border-radius: 4px; color: #e0e0e0; font-size: 0.9em; box-sizing: border-box;"
              />
            </div>
            
            <div>
              <label style="display: block; color: #888; margin-bottom: 5px; font-size: 0.85em;">Notes</label>
              <textarea 
                onchange="updateCombatantField(${
                  combatant.id
                }, 'notes', this.value)"
                placeholder="Conditions, effects, reminders..."
                style="width: 100%; min-height: 60px; padding: 6px; background: rgba(0,0,0,0.5); border: 1px solid #4CAF50; border-radius: 4px; color: #e0e0e0; resize: vertical; box-sizing: border-box;"
              >${combatant.notes || ""}</textarea>
            </div>
            
            <div style="padding: 10px; background: rgba(76, 175, 80, 0.1); border-left: 3px solid #4CAF50; border-radius: 4px;">
              <p style="color: #888; font-size: 0.85em; margin: 0;">
                💡 <strong>Tip:</strong> Health, Stress, and Stat Pools are managed in the <strong>Multiplayer Menu</strong> and sync automatically.
              </p>
            </div>
            `
                : `
            <!-- NPC/Enemy: Full details -->
            <div>
              <label style="display: block; color: #888; margin-bottom: 5px; font-size: 0.85em;">Name</label>
              <input 
                type="text" 
                value="${combatant.name}" 
                onchange="updateCombatantField(${
                  combatant.id
                }, 'name', this.value)"
                style="width: 100%; padding: 6px; background: rgba(0,0,0,0.5); border: 1px solid #4CAF50; border-radius: 4px; color: #e0e0e0; font-size: 0.9em; box-sizing: border-box;"
              />
            </div>
            
            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 10px;">
              <div>
                <label style="display: block; color: #888; margin-bottom: 5px; font-size: 0.85em;">Stress</label>
                <input 
                  type="number" 
                  value="${combatant.stress}" 
                  onchange="updateCombatantField(${
                    combatant.id
                  }, 'stress', this.value)"
                  style="width: 100%; padding: 6px; background: rgba(0,0,0,0.5); border: 1px solid #b19cd9; border-radius: 4px; color: #b19cd9; font-size: 0.9em; box-sizing: border-box;"
                />
              </div>
              
              <div>
                <label style="display: block; color: #888; margin-bottom: 5px; font-size: 0.85em;">Level</label>
                <div style="padding: 6px; background: rgba(0,0,0,0.3); border: 1px solid #666; border-radius: 4px; color: #b19cd9; font-weight: bold; text-align: center;">
                  ${stressLevel}
                </div>
              </div>
            </div>
            
            <!-- Stat Pools & Edge -->
            <div>
              <label style="display: block; color: #4CAF50; margin-bottom: 8px; font-weight: bold; font-size: 0.9em;">Stat Pools & Edge</label>
              <div style="display: flex; flex-direction: column; gap: 6px;">
                <!-- Might -->
                <div style="display: flex; gap: 6px; align-items: center;">
                  <label style="color: #888; font-size: 0.85em; min-width: 50px;">Might</label>
                  <input type="number" value="${
                    combatant.might.current
                  }" onchange="updateCombatantField(${
                    combatant.id
                  }, 'might.current', this.value)" style="width: 50px; padding: 4px; background: rgba(0,0,0,0.5); border: 1px solid #4CAF50; border-radius: 4px; color: #e0e0e0; text-align: center; font-size: 0.85em;" />
                  <span style="color: #666; font-size: 0.85em;">/</span>
                  <div style="width: 50px; padding: 4px; background: rgba(0,0,0,0.3); border: 1px solid #666; border-radius: 4px; color: #888; text-align: center; font-size: 0.85em;">${
                    combatant.might.max
                  }</div>
                  <span style="color: #888; font-size: 0.8em; margin-left: 4px;">E:</span>
                  <div style="width: 40px; padding: 4px; background: rgba(0,0,0,0.3); border: 1px solid #666; border-radius: 4px; color: #888; text-align: center; font-size: 0.85em;">${
                    combatant.might.edge
                  }</div>
                </div>
                
                <!-- Speed -->
                <div style="display: flex; gap: 6px; align-items: center;">
                  <label style="color: #888; font-size: 0.85em; min-width: 50px;">Speed</label>
                  <input type="number" value="${
                    combatant.speed.current
                  }" onchange="updateCombatantField(${
                    combatant.id
                  }, 'speed.current', this.value)" style="width: 50px; padding: 4px; background: rgba(0,0,0,0.5); border: 1px solid #4CAF50; border-radius: 4px; color: #e0e0e0; text-align: center; font-size: 0.85em;" />
                  <span style="color: #666; font-size: 0.85em;">/</span>
                  <div style="width: 50px; padding: 4px; background: rgba(0,0,0,0.3); border: 1px solid #666; border-radius: 4px; color: #888; text-align: center; font-size: 0.85em;">${
                    combatant.speed.max
                  }</div>
                  <span style="color: #888; font-size: 0.8em; margin-left: 4px;">E:</span>
                  <div style="width: 40px; padding: 4px; background: rgba(0,0,0,0.3); border: 1px solid #666; border-radius: 4px; color: #888; text-align: center; font-size: 0.85em;">${
                    combatant.speed.edge
                  }</div>
                </div>
                
                <!-- Intellect -->
                <div style="display: flex; gap: 6px; align-items: center;">
                  <label style="color: #888; font-size: 0.85em; min-width: 50px;">Intellect</label>
                  <input type="number" value="${
                    combatant.intellect.current
                  }" onchange="updateCombatantField(${
                    combatant.id
                  }, 'intellect.current', this.value)" style="width: 50px; padding: 4px; background: rgba(0,0,0,0.5); border: 1px solid #4CAF50; border-radius: 4px; color: #e0e0e0; text-align: center; font-size: 0.85em;" />
                  <span style="color: #666; font-size: 0.85em;">/</span>
                  <div style="width: 50px; padding: 4px; background: rgba(0,0,0,0.3); border: 1px solid #666; border-radius: 4px; color: #888; text-align: center; font-size: 0.85em;">${
                    combatant.intellect.max
                  }</div>
                  <span style="color: #888; font-size: 0.8em; margin-left: 4px;">E:</span>
                  <div style="width: 40px; padding: 4px; background: rgba(0,0,0,0.3); border: 1px solid #666; border-radius: 4px; color: #888; text-align: center; font-size: 0.85em;">${
                    combatant.intellect.edge
                  }</div>
                </div>
              </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 10px;">
              <div>
                <label style="display: block; color: #888; margin-bottom: 5px; font-size: 0.85em;">Damage State</label>
                <select 
                  onchange="updateCombatantField(${
                    combatant.id
                  }, 'damage', this.value)"
                  style="width: 100%; padding: 6px; background: rgba(0,0,0,0.5); border: 1px solid #4CAF50; border-radius: 4px; color: #e0e0e0; font-size: 0.9em; box-sizing: border-box;"
                >
                  <option value="Hale" ${
                    (combatant.damage || "").toLowerCase() === "hale"
                      ? "selected"
                      : ""
                  }>Hale</option>
                  <option value="Hurt" ${
                    (combatant.damage || "").toLowerCase() === "hurt"
                      ? "selected"
                      : ""
                  }>Hurt</option>
                  <option value="Impaired" ${
                    (combatant.damage || "").toLowerCase() === "impaired"
                      ? "selected"
                      : ""
                  }>Impaired</option>
                  <option value="Debilitated" ${
                    (combatant.damage || "").toLowerCase() === "debilitated"
                      ? "selected"
                      : ""
                  }>Debilitated</option>
                  <option value="Dead" ${
                    (combatant.damage || "").toLowerCase() === "dead"
                      ? "selected"
                      : ""
                  }>Dead</option>
                </select>
              </div>
              
              <div>
                <label style="display: block; color: #888; margin-bottom: 5px; font-size: 0.85em;">Effort</label>
                <div style="padding: 6px; background: rgba(0,0,0,0.3); border: 1px solid #666; border-radius: 4px; color: #888; text-align: center;">
                  ${combatant.effort}
                </div>
              </div>
            </div>
            
            <div>
              <label style="display: block; color: #888; margin-bottom: 5px; font-size: 0.85em;">Location</label>
              <input 
                type="text" 
                value="${combatant.location || ""}" 
                onchange="updateCombatantField(${
                  combatant.id
                }, 'location', this.value)"
                placeholder="e.g., Behind cover"
                style="width: 100%; padding: 6px; background: rgba(0,0,0,0.5); border: 1px solid #4CAF50; border-radius: 4px; color: #e0e0e0; font-size: 0.9em; box-sizing: border-box;"
              />
            </div>
            
            <div>
              <label style="display: block; color: #888; margin-bottom: 5px; font-size: 0.85em;">Notes</label>
              <textarea 
                onchange="updateCombatantField(${
                  combatant.id
                }, 'notes', this.value)"
                placeholder="Conditions, effects, reminders..."
                style="width: 100%; min-height: 60px; padding: 6px; background: rgba(0,0,0,0.5); border: 1px solid #4CAF50; border-radius: 4px; color: #e0e0e0; resize: vertical; box-sizing: border-box;"
              >${combatant.notes || ""}</textarea>
            </div>
            `
            }
            </div>
            
            <!-- Battle Map Facing Controls -->
            <div style="grid-column: 1 / -1; margin-top: 8px; padding: 6px; background: rgba(156, 39, 176, 0.1); border: 1px solid #9C27B0; border-radius: 6px;">
              <label style="display: block; margin-bottom: 5px; color: #BA68C8; font-size: 0.8em; font-weight: bold;">🔄 Facing</label>
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; margin-bottom: 4px;">
                <button class="button" onclick="rotateCombatant(45, ${
                  combatant.id
                })" style="padding: 5px 6px; font-size: 0.8em;">↻ 45°</button>
                <button class="button" onclick="rotateCombatant(-45, ${
                  combatant.id
                })" style="padding: 5px 6px; font-size: 0.8em;">↺ -45°</button>
                <span id="facing-display-${
                  combatant.id
                }" style="color: #BA68C8; font-size: 0.8em; text-align: center; padding: 5px;">
                  ${
                    typeof battleMap !== "undefined" &&
                    battleMap.combatantFacing &&
                    battleMap.combatantFacing[combatant.id] !== undefined
                      ? battleMap.combatantFacing[combatant.id] + "°"
                      : "0°"
                  }
                </span>
              </div>
              <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px;">
                <button class="button" onclick="setCombatantFacing(0, ${
                  combatant.id
                })" style="padding: 5px 6px; font-size: 0.8em;">⬆️ N</button>
                <button class="button" onclick="setCombatantFacing(90, ${
                  combatant.id
                })" style="padding: 5px 6px; font-size: 0.8em;">➡️ E</button>
                <button class="button" onclick="setCombatantFacing(180, ${
                  combatant.id
                })" style="padding: 5px 6px; font-size: 0.8em;">⬇️ S</button>
                <button class="button" onclick="setCombatantFacing(270, ${
                  combatant.id
                })" style="padding: 5px 6px; font-size: 0.8em;">⬅️ W</button>
              </div>
            </div>
            
            <!-- Map Layer Selector -->
            ${
              typeof battleMap !== "undefined" &&
              typeof renderLayerSelector === "function" &&
              battleMap.layers &&
              battleMap.layers.length > 1
                ? (() => {
                    let combatantLayerId = null;
                    for (const layer of battleMap.layers) {
                      if (
                        layer.combatantPositions &&
                        layer.combatantPositions[combatant.id]
                      ) {
                        combatantLayerId = layer.id;
                        break;
                      }
                    }
                    if (combatantLayerId) {
                      return `<div style="grid-column: 1 / -1; margin-top: 8px;">
                        <div style="padding: 6px; background: rgba(33, 150, 243, 0.1); border: 1px solid #2196F3; border-radius: 6px;">
                          ${renderLayerSelector(
                            combatant.id,
                            combatantLayerId,
                            false,
                          )
                            .replace("color: #888", "color: #64B5F6")
                            .replace("Map Layer", "🗺️ Map Layer")}
                        </div>
                      </div>`;
                    }
                    return "";
                  })()
                : ""
            }
          </div>
        </div>
      `
          : ""
      }
    </div>
  `;
}

function renderNPCCombatant(
  combatant,
  isCurrent,
  isDefeated,
  isExpanded,
  opacity,
  borderColor,
  bgColor,
) {
  return `
    <div style="margin-bottom: 10px; border: 2px solid ${borderColor}; border-radius: 8px; background: ${bgColor}; opacity: ${opacity};">
      <!-- Collapsed View -->
      <div 
        onclick="toggleCombatantExpanded(${combatant.id})" 
        style="padding: 15px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;"
      >
        <div style="display: flex; align-items: center; gap: 15px; flex: 1;">
          <span style="font-size: 1.4em; font-weight: bold; color: #4CAF50; min-width: 35px;">${
            combatant.initiative
          }</span>
          <div style="flex: 1;">
            <div style="font-weight: bold; font-size: 1.1em; color: ${
              isCurrent ? "#4CAF50" : "#e0e0e0"
            };">
              ${combatant.displayName || combatant.name}
              ${
                combatant.displayName &&
                combatant.displayName !== combatant.name &&
                combatant.creatureType
                  ? `<span style="color: #888; font-size: 0.85em; font-weight: normal;"> (${combatant.creatureType})</span>`
                  : ""
              }
              ${
                isCurrent
                  ? '<span style="color: #4CAF50; margin-left: 10px;">◄ ACTIVE</span>'
                  : ""
              }
              ${
                isDefeated
                  ? '<span style="color: #d32f2f; margin-left: 10px;">[DEFEATED]</span>'
                  : ""
              }
            </div>
            <div style="color: #888; font-size: 0.9em; margin-top: 3px;">
              Level ${combatant.level} • Health: ${combatant.currentHealth}/${
                combatant.health
              }
            </div>
          </div>
          <div style="color: #888; font-size: 1.2em;">${
            isExpanded ? "▼" : "▶"
          }</div>
        </div>
      </div>
      
      <!-- Expanded View -->
      ${
        isExpanded
          ? `
        <div style="padding: 0 8px 8px 8px; border-top: 1px solid rgba(76, 175, 80, 0.3);">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
            <!-- Row 1: Display Name, Level -->
            <div>
              <label style="display: block; color: #888; margin-bottom: 5px; font-size: 0.85em;">
                Display Name
                ${
                  combatant.creatureType
                    ? `<span style="font-size: 0.85em; color: #666;"> (${combatant.creatureType})</span>`
                    : ""
                }
              </label>
              <input 
                type="text" 
                value="${combatant.displayName || combatant.name}" 
                onchange="updateCombatantField(${
                  combatant.id
                }, 'displayName', this.value)"
                placeholder="${combatant.creatureType || combatant.name}"
                style="width: 100%; padding: 6px; background: rgba(0,0,0,0.5); border: 1px solid #4CAF50; border-radius: 4px; color: #e0e0e0; font-size: 0.9em; box-sizing: border-box;"
              />
            </div>
            
            <div>
              <label style="display: block; color: #888; margin-bottom: 5px; font-size: 0.85em;">Level</label>
              <input 
                type="number" 
                value="${combatant.level}" 
                onchange="updateCombatantField(${
                  combatant.id
                }, 'level', this.value)"
                min="1"
                style="width: 70px; padding: 5px; background: rgba(0,0,0,0.5); border: 1px solid #4CAF50; border-radius: 4px; color: #e0e0e0; font-size: 0.9em; box-sizing: border-box;"
              />
            </div>
            
            <!-- Row 2: Health, Location -->
            <div>
              <label style="display: block; color: #888; margin-bottom: 5px; font-size: 0.85em;">Health</label>
              <div style="display: flex; gap: 5px; align-items: center;">
                <input 
                  type="number" 
                  value="${combatant.currentHealth}" 
                  onchange="updateCombatantField(${
                    combatant.id
                  }, 'currentHealth', this.value)"
                  style="width: 55px; padding: 5px; background: rgba(0,0,0,0.5); border: 1px solid ${
                    combatant.currentHealth <= 0 ? "#d32f2f" : "#4CAF50"
                  }; border-radius: 4px; color: ${
                    combatant.currentHealth <= 0 ? "#d32f2f" : "#e0e0e0"
                  }; text-align: center; font-size: 0.85em;"
                />
                <span style="color: #666;">/</span>
                <div style="width: 55px; padding: 5px; background: rgba(0,0,0,0.3); border: 1px solid #666; border-radius: 4px; color: #888; text-align: center; font-size: 0.85em;">${
                  combatant.health
                }</div>
              </div>
            </div>
            
            <div>
              <label style="display: block; color: #888; margin-bottom: 5px; font-size: 0.85em;">Location</label>
              <input 
                type="text" 
                value="${combatant.location || ""}" 
                onchange="updateCombatantField(${
                  combatant.id
                }, 'location', this.value)"
                placeholder="e.g., On rooftop"
                style="width: 100%; padding: 6px; background: rgba(0,0,0,0.5); border: 1px solid #4CAF50; border-radius: 4px; color: #e0e0e0; font-size: 0.9em; box-sizing: border-box;"
              />
            </div>
            
            <!-- Row 3: Notes -->
            <div style="grid-column: 1 / -1;">
              <label style="display: block; color: #888; margin-bottom: 5px; font-size: 0.85em;">Notes</label>
              <textarea 
                onchange="updateCombatantField(${
                  combatant.id
                }, 'notes', this.value)"
                placeholder="Conditions, tactics, reminders..."
                style="width: 100%; min-height: 45px; padding: 5px; background: rgba(0,0,0,0.5); border: 1px solid #4CAF50; border-radius: 4px; color: #e0e0e0; resize: vertical; font-size: 0.85em; box-sizing: border-box;"
              >${combatant.notes || ""}</textarea>
            </div>
            
            <!-- Row 4: Movement, Damage Inflicted -->
            ${
              combatant.movement
                ? `
            <div>
              <label style="display: block; color: #888; margin-bottom: 5px; font-size: 0.85em;">Movement</label>
              <div style="padding: 6px; background: rgba(0,0,0,0.3); border: 1px solid #666; border-radius: 4px; color: #ccc; font-size: 0.85em;">
                ${combatant.movement}
              </div>
            </div>
            `
                : ""
            }
            
            <div ${combatant.movement ? "" : 'style="grid-column: 1 / -1;"'}>
              <label style="display: block; color: #888; margin-bottom: 5px; font-size: 0.85em;">Damage Inflicted</label>
              <div style="padding: 6px; background: rgba(0,0,0,0.3); border: 1px solid #666; border-radius: 4px; color: #ccc; font-size: 0.85em;">
                ${combatant.damageInflicted || "Unknown"}
              </div>
            </div>
            
            <!-- Row 5: Combat -->
            ${
              combatant.combat
                ? `
            <div style="grid-column: 1 / -1;">
              <label style="display: block; color: #888; margin-bottom: 5px; font-size: 0.85em;">Combat</label>
              <div style="padding: 6px; background: rgba(0,0,0,0.3); border: 1px solid #666; border-radius: 4px; color: #ccc; font-size: 0.85em;">
                ${combatant.combat}
              </div>
            </div>
            `
                : ""
            }
            
            <!-- Row 6: Abilities -->
            <div style="grid-column: 1 / -1;">
              <label style="display: block; color: #888; margin-bottom: 5px; font-size: 0.85em;">Abilities</label>
              ${
                Array.isArray(combatant.abilities) &&
                combatant.abilities.length > 0
                  ? `
                <div style="padding: 6px; background: rgba(0,0,0,0.3); border: 1px solid #666; border-radius: 4px;">
                  ${combatant.abilities
                    .map(
                      (ability) => `
                    <div style="margin-bottom: 8px;">
                      <strong style="color: #66bb6a;">${ability.name}:</strong>
                      <span style="color: #ccc;"> ${ability.effect}</span>
                    </div>
                  `,
                    )
                    .join("")}
                </div>
              `
                  : `
                <textarea 
                  onchange="updateCombatantField(${
                    combatant.id
                  }, 'abilities', this.value)"
                  placeholder="Special abilities, attacks, resistances..."
                  style="width: 100%; min-height: 45px; padding: 5px; background: rgba(0,0,0,0.5); border: 1px solid #4CAF50; border-radius: 4px; color: #e0e0e0; resize: vertical; font-size: 0.85em; box-sizing: border-box;"
                >${
                  typeof combatant.abilities === "string"
                    ? combatant.abilities
                    : ""
                }</textarea>
              `
              }
            </div>
            
            <!-- Battle Map Facing Controls -->
            <div style="grid-column: 1 / -1; margin-top: 8px; padding: 6px; background: rgba(156, 39, 176, 0.1); border: 1px solid #9C27B0; border-radius: 6px;">
              <label style="display: block; margin-bottom: 5px; color: #BA68C8; font-size: 0.8em; font-weight: bold;">🔄 Facing</label>
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; margin-bottom: 4px;">
                <button class="button" onclick="rotateCombatant(45, ${
                  combatant.id
                })" style="padding: 5px 6px; font-size: 0.8em;">↻ 45°</button>
                <button class="button" onclick="rotateCombatant(-45, ${
                  combatant.id
                })" style="padding: 5px 6px; font-size: 0.8em;">↺ -45°</button>
                <span id="facing-display-${
                  combatant.id
                }" style="color: #BA68C8; font-size: 0.8em; text-align: center; padding: 5px;">
                  ${
                    typeof battleMap !== "undefined" &&
                    battleMap.combatantFacing &&
                    battleMap.combatantFacing[combatant.id] !== undefined
                      ? battleMap.combatantFacing[combatant.id] + "°"
                      : "0°"
                  }
                </span>
              </div>
              <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px;">
                <button class="button" onclick="setCombatantFacing(0, ${
                  combatant.id
                })" style="padding: 5px 6px; font-size: 0.8em;">⬆️ N</button>
                <button class="button" onclick="setCombatantFacing(90, ${
                  combatant.id
                })" style="padding: 5px 6px; font-size: 0.8em;">➡️ E</button>
                <button class="button" onclick="setCombatantFacing(180, ${
                  combatant.id
                })" style="padding: 5px 6px; font-size: 0.8em;">⬇️ S</button>
                <button class="button" onclick="setCombatantFacing(270, ${
                  combatant.id
                })" style="padding: 5px 6px; font-size: 0.8em;">⬅️ W</button>
              </div>
            </div>
            
            <!-- Map Layer Selector -->
            ${
              typeof battleMap !== "undefined" &&
              typeof renderLayerSelector === "function" &&
              battleMap.layers &&
              battleMap.layers.length > 1
                ? (() => {
                    let combatantLayerId = null;
                    for (const layer of battleMap.layers) {
                      if (
                        layer.combatantPositions &&
                        layer.combatantPositions[combatant.id]
                      ) {
                        combatantLayerId = layer.id;
                        break;
                      }
                    }
                    if (combatantLayerId) {
                      return `<div style="grid-column: 1 / -1; margin-top: 8px;">
                        <div style="padding: 6px; background: rgba(33, 150, 243, 0.1); border: 1px solid #2196F3; border-radius: 6px;">
                          ${renderLayerSelector(
                            combatant.id,
                            combatantLayerId,
                            false,
                          )
                            .replace("color: #888", "color: #64B5F6")
                            .replace("Map Layer", "🗺️ Map Layer")}
                        </div>
                      </div>`;
                    }
                    return "";
                  })()
                : ""
            }
          </div>
        </div>
      `
          : ""
      }
    </div>
  `;
}

// ==================== NAVIGATION HELPERS ==================== //
function navigateToPartyTab() {
  if (
    confirm(
      "Would you like to navigate to the Party tab to add individual party members?",
    )
  ) {
    switchToTab("players");
  }
}

function navigateToBestiaryTab() {
  if (
    confirm(
      "Would you like to navigate to the Bestiary tab to add creatures to the encounter?",
    )
  ) {
    switchToTab("bestiary");
  }
}

function navigateToNPCsTab() {
  if (
    confirm(
      "Would you like to navigate to the NPCs tab to add NPCs to the encounter?",
    )
  ) {
    switchToTab("npcs");
  }
}

// ==================== INITIALIZATION ==================== //

function initializeCombatTracker() {
  renderCombatTracker();
}

// Initialize on load
document.addEventListener("DOMContentLoaded", () => {
  initializeCombatTracker();
});
