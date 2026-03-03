/**
 * Player Multiplayer Integration
 * Handles player-side multiplayer functionality
 */

let playerMultiplayerMode = "create"; // 'create' or 'play'
let isConnectedToRoom = false;
let listenersInitialized = false; // Track if listeners are already set up

/**
 * Initialize player multiplayer based on URL parameters
 */
function initializePlayerMultiplayer() {
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get("mode");
  const roomCode = urlParams.get("room");

  playerMultiplayerMode = mode || "create";

  if (mode === "play" && roomCode) {
    // Player is joining a game session
    connectToGameSession(roomCode);
  } else if (mode === "create") {
    // Player is creating/editing their character locally
    console.log("Character creation mode");
    setupLocalCharacterMode();
  }
}

/**
 * Check if Horror Mode is already active when joining
 */
function checkInitialHorrorModeState(roomCode) {
  if (typeof firebase === "undefined" || !firebase.apps.length) return;

  firebase
    .database()
    .ref(`rooms/${roomCode}/sharedData/horrorMode`)
    .once("value")
    .then((snapshot) => {
      const horrorModeData = snapshot.val();
      if (horrorModeData && horrorModeData.enabled) {
        // Apply Horror Mode immediately without notification
        document.body.classList.add("horror-mode-active");
        console.log(
          `🎭 Joined room with Horror Mode active (Level ${horrorModeData.level})`,
        );
      }
    })
    .catch((error) => {
      console.error("Error checking Horror Mode state:", error);
    });
}

/**
 * Setup local character creation mode
 */
function setupLocalCharacterMode() {
  // Add a header notice
  const header = document.getElementById("playerViewHeader");
  if (header) {
    const notice = document.createElement("div");
    notice.style.cssText =
      "background: rgba(139, 69, 19, 0.3); padding: 8px 15px; border-radius: 4px; font-size: 0.9em;";
    notice.innerHTML =
      "📝 Character Creation Mode - Save your character when ready";
    header.appendChild(notice);
  }

  // Add save/load buttons if not present
  addCharacterManagementButtons();
}

/**
 * Connect to a game session
 */
async function connectToGameSession(roomCode) {
  try {
    // Check if Firebase is configured
    if (typeof firebase === "undefined" || !firebase.apps.length) {
      alert(
        "⚠️ Firebase not configured. Cannot connect to multiplayer session.",
      );
      window.location.href = "index.html";
      return;
    }

    // Get player info from session storage
    const playerName = sessionStorage.getItem("playerName") || "Player";
    const playerId = sessionStorage.getItem("playerId");

    // Show connection status
    showConnectionStatus("Connecting to game session...");

    // Try to load saved character
    const savedCharacter = loadPlayerCharacterData();

    // Load character data into the character sheet
    if (savedCharacter && typeof loadCharacterFromData === "function") {
      loadCharacterFromData(savedCharacter);
      console.log("✓ Character data loaded into sheet");
    }

    // Join the room
    await multiplayerManager.joinRoom(roomCode, playerName, savedCharacter);

    isConnectedToRoom = true;

    // Update UI
    const characterName = savedCharacter?.name || playerName;
    updateHeaderForMultiplayer(roomCode, playerName, characterName);
    showConnectionStatus("✅ Connected to game", "success");

    // Set up listeners
    setupMultiplayerListeners();

    // Check for existing Horror Mode state
    checkInitialHorrorModeState(roomCode);

    console.log("✅ Connected to multiplayer session");
  } catch (error) {
    console.error("Error connecting to session:", error);
    alert(
      "❌ Error connecting to game session: " +
        error.message +
        "\n\nReturning to welcome screen.",
    );
    window.location.href = "index.html";
  }
}

/**
 * Setup multiplayer event listeners
 */
function setupMultiplayerListeners() {
  // Prevent duplicate listener setup
  if (listenersInitialized) {
    console.log("⚠️ Listeners already initialized, skipping duplicate setup");
    return;
  }

  listenersInitialized = true;
  console.log("🎧 Setting up multiplayer listeners (first time)");

  // Initialize character sync with multiplayer manager
  if (typeof characterSync !== "undefined") {
    characterSync.initialize(multiplayerManager);
    console.log("✅ Character sync initialized with multiplayer");
  }

  // Listen for battle map changes
  multiplayerManager.onBattleMapChange((mapData) => {
    handleBattleMapUpdate(mapData);
  });

  // Listen for combat changes
  multiplayerManager.onCombatChange((combat) => {
    handleCombatUpdate(combat);
  });

  // Listen for GM messages
  multiplayerManager.onMessageReceived((message) => {
    showGMMessage(message);
  });

  // Listen for battle map pings
  multiplayerManager.db
    .ref(`rooms/${multiplayerManager.roomCode}/battleMapPings`)
    .on("value", (snapshot) => {
      const pingsData = snapshot.val();
      handleBattleMapPings(pingsData);
    });

  // Listen for Horror Mode changes from GM
  multiplayerManager.db
    .ref(`rooms/${multiplayerManager.roomCode}/sharedData/horrorMode`)
    .on("value", (snapshot) => {
      const horrorModeData = snapshot.val();
      if (horrorModeData) {
        applyHorrorModeToPlayer(horrorModeData.enabled, horrorModeData.level);
      }
    });

  // Listen for stress assignments from GM
  multiplayerManager.db
    .ref(
      `rooms/${multiplayerManager.roomCode}/sharedData/stressAssignments/${multiplayerManager.playerId}`,
    )
    .on("child_added", (snapshot) => {
      const stressData = snapshot.val();
      if (stressData) {
        showStressDamageNotification(
          "stress",
          stressData.amount,
          stressData.reason,
        );
      }
    });

  // Listen for damage assignments from GM
  multiplayerManager.db
    .ref(
      `rooms/${multiplayerManager.roomCode}/sharedData/damageAssignments/${multiplayerManager.playerId}`,
    )
    .on("child_added", (snapshot) => {
      const damageData = snapshot.val();
      if (damageData) {
        showStressDamageNotification(
          "damage",
          damageData.amount,
          damageData.reason,
          damageData.type,
        );
      }
    });

  // Listen for damage track changes from GM
  multiplayerManager.db
    .ref(
      `rooms/${multiplayerManager.roomCode}/players/${multiplayerManager.playerId}/character/damageTrack`,
    )
    .on("value", (snapshot) => {
      const newDamageState = snapshot.val();
      if (!newDamageState || !character) return;

      const oldDamageState = character.damageTrack || character.damageState;
      const normalizedOld = oldDamageState
        ? oldDamageState.charAt(0).toUpperCase() +
          oldDamageState.slice(1).toLowerCase()
        : null;
      const normalizedNew =
        newDamageState.charAt(0).toUpperCase() +
        newDamageState.slice(1).toLowerCase();

      // Only show notification if states are different and old state is valid
      if (normalizedOld && normalizedOld !== normalizedNew) {
        showDamageStateNotification(normalizedOld, normalizedNew);
      }

      // Update local character objects
      character.damageTrack = newDamageState;
      character.damageState = newDamageState.toLowerCase();

      // Update UI if function exists
      if (typeof updateDamageTrackUI === "function") {
        updateDamageTrackUI(newDamageState);
      }
    });

  // Listen for stress changes from GM
  multiplayerManager.db
    .ref(
      `rooms/${multiplayerManager.roomCode}/players/${multiplayerManager.playerId}/character/stress`,
    )
    .on("value", (snapshot) => {
      const newStress = snapshot.val();
      if (
        newStress !== null &&
        newStress !== undefined &&
        character &&
        character.stress !== newStress
      ) {
        const difference = newStress - (character.stress || 0);
        if (difference > 0) {
          showStressDamageNotification(
            "stress",
            difference,
            "GM updated stress",
          );
        }
        // Update local character object
        character.stress = newStress;
        // Update UI
        if (typeof updateStressDisplay === "function") {
          updateStressDisplay();
        }
      }
    });

  // Listen for supernatural stress changes from GM
  multiplayerManager.db
    .ref(
      `rooms/${multiplayerManager.roomCode}/players/${multiplayerManager.playerId}/character/supernaturalStress`,
    )
    .on("value", (snapshot) => {
      const newSupernaturalStress = snapshot.val();
      if (
        newSupernaturalStress !== null &&
        newSupernaturalStress !== undefined &&
        character &&
        character.supernaturalStress !== newSupernaturalStress
      ) {
        const difference =
          newSupernaturalStress - (character.supernaturalStress || 0);
        if (difference > 0) {
          showStressDamageNotification("supernatural", difference, "");
        }
        // Update local character object
        character.supernaturalStress = newSupernaturalStress;
        // Update UI if function exists
        if (typeof updateSupernaturalStressUI === "function") {
          updateSupernaturalStressUI(newSupernaturalStress);
        }
      }
    });

  // Listen for chat messages
  multiplayerManager.onChatMessage((message) => {
    // Filter Avatar unlock messages - only show if it's for this player
    if (message.message && message.message.startsWith("[AVATAR_UNLOCK:")) {
      const match = message.message.match(/\[AVATAR_UNLOCK:([^\]]+)\]/);
      if (match && match[1] === multiplayerManager.playerId) {
        // This is for us - strip the prefix and show it
        const cleanMessage = message.message.replace(
          /\[AVATAR_UNLOCK:[^\]]+\]\s*/,
          "",
        );
        displayPlayerChatMessage({ ...message, message: cleanMessage });
      }
      // Don't display if it's not for us
      return;
    }

    displayPlayerChatMessage(message); // Auto-detect if sent by us

    // Show notification badge if chat panel is not visible
    const chatPanel = document.getElementById("chatPanel");
    if (chatPanel && chatPanel.style.display === "none") {
      updateChatBadge(true);
    }
  });

  // Listen for Avatar unlock from GM
  const playerId = multiplayerManager.playerId;
  const roomCode = multiplayerManager.roomCode;
  if (playerId && roomCode) {
    const avatarRef = firebase
      .database()
      .ref(`rooms/${roomCode}/players/${playerId}/character/avatar/gmUnlocked`);
    avatarRef.on("value", (snapshot) => {
      const gmUnlocked = snapshot.val();
      if (gmUnlocked === true && character && character.avatar) {
        // GM has unlocked Avatar - update character object and show tab
        character.avatar.gmUnlocked = true;
        character.avatar.hasUnlockedTab = true;

        // Update Avatar tab visibility
        if (typeof updateAvatarTabVisibility === "function") {
          updateAvatarTabVisibility();
        }

        console.log("✅ Avatar tab unlocked by GM");
      }
    });
  }

  // Note: Stress/Damage/XP assignments are now handled by characterSync.js
}

// Track previous battle map visibility to only notify on changes
let previousBattleMapVisibility = false;

/**
 * Handle battle map updates
 */
function handleBattleMapUpdate(mapData) {
  console.log("🗺️ handleBattleMapUpdate called with:", mapData);

  if (!mapData) {
    console.log("⚠️ No mapData received");
    return;
  }

  console.log("Map visible status:", mapData.visible);

  // Show notification ONLY when battle map visibility changes from false to true
  if (mapData.visible && !previousBattleMapVisibility) {
    showNotification(
      "🗺️ GM has shared the Battle Map! Click the Battle Map button in the toolbar to view.",
      "info",
    );
  }

  // Update previous visibility state
  previousBattleMapVisibility = mapData.visible;

  // Render or hide the map based on visibility
  if (mapData.visible) {
    console.log("✅ Calling renderBattleMap with data");
    // Render the map
    if (typeof renderBattleMap === "function") {
      renderBattleMap(mapData);
    } else {
      console.error("❌ renderBattleMap function not found");
    }
  } else {
    console.log("⚠️ Map not visible - hiding");
    // Map is no longer visible - hide it
    if (typeof renderBattleMap === "function") {
      renderBattleMap(null);
    }
  }
}

/**
 * Handle combat updates (kept for backward compatibility)
 */
function handleCombatUpdate(combat) {
  console.log("🎯 Combat update received:", combat);

  const initiativeDisplay = document.getElementById("initiativeOrderDisplay");
  const initiativeContent = document.getElementById("initiativeOrderContent");

  if (!initiativeDisplay || !initiativeContent) {
    console.warn("⚠️ Initiative display elements not found");
    return;
  }

  if (combat && combat.active && combat.combatants) {
    console.log(
      "⚔️ Combat is active with",
      Object.keys(combat.combatants).length,
      "combatants",
    );

    // Combat is active - show initiative order
    const combatants = Object.values(combat.combatants);
    console.log(
      "📊 All combatants received:",
      combatants.map((c) => ({ name: c.name, visible: c.visible })),
    );

    // Filter out combatants hidden by fog of war
    const visibleCombatants = combatants.filter((c) => {
      const isVisible = c.visible !== false;
      if (!isVisible) {
        console.log(
          `🌫️ Hiding ${c.name} from initiative (visible: ${c.visible})`,
        );
      }
      return isVisible;
    });
    console.log(
      "👁️ Visible combatants:",
      visibleCombatants.map((c) => c.name),
    );

    // Sort by initiative (highest first)
    visibleCombatants.sort((a, b) => (b.initiative || 0) - (a.initiative || 0));

    // Recalculate current turn index for visible combatants only
    const allSorted = combatants.sort(
      (a, b) => (b.initiative || 0) - (a.initiative || 0),
    );
    const currentCombatantId = allSorted[combat.currentTurn || 0]?.id;
    const visibleCurrentTurnIndex = visibleCombatants.findIndex(
      (c) => c.id === currentCombatantId,
    );

    // Render initiative list (hide stress and health as requested)
    initiativeContent.innerHTML = visibleCombatants
      .map((c, index) => {
        const isCurrentTurn =
          index === visibleCurrentTurnIndex && visibleCurrentTurnIndex >= 0;
        const borderColor = isCurrentTurn ? "#4caf50" : "#555";
        const bgColor = isCurrentTurn
          ? "rgba(76, 175, 80, 0.1)"
          : "rgba(0, 0, 0, 0.3)";

        // Color code by type: Green for players, Red for enemies, Blue for NPCs
        let nameColor = "#fff";
        const combatantType = (c.type || "").toUpperCase();
        console.log(
          `🎨 Combatant "${c.name}" type: "${c.type}" (uppercase: "${combatantType}")`,
        );
        if (combatantType === "PC" || combatantType === "PLAYER") {
          nameColor = "#4caf50"; // Green
        } else if (
          combatantType === "ENEMY" ||
          combatantType === "CREATURE" ||
          combatantType === "MONSTER"
        ) {
          nameColor = "#f44336"; // Red
        } else if (combatantType === "NPC") {
          nameColor = "#2196f3"; // Blue
        }
        console.log(`🎨 Name color for "${c.name}": ${nameColor}`);

        return `
        <div style="
          background: ${bgColor};
          border: 2px solid ${borderColor};
          border-radius: 6px;
          padding: 10px;
          ${isCurrentTurn ? "box-shadow: 0 0 15px rgba(76, 175, 80, 0.5);" : ""}
        ">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-weight: bold; color: ${nameColor};">
                ${isCurrentTurn ? "▶ " : ""}${c.name || "Unknown"}
              </div>
            </div>
            <div style="
              background: rgba(255, 255, 255, 0.1);
              border: 1px solid ${borderColor};
              border-radius: 4px;
              padding: 3px 8px;
              font-size: 0.9em;
              color: #4caf50;
            ">
              ${c.initiative || 0}
            </div>
          </div>
        </div>
      `;
      })
      .join("");

    // Show the display when combat starts (slide in from right)
    const wasHidden = initiativeDisplay.style.display === "none";
    initiativeDisplay.style.display = "block";
    initiativeDisplay.style.transform = "translateY(-50%)";
    console.log("✅ Initiative display set to visible");

    if (wasHidden) {
      showNotification("⚔️ Combat has started!", "info");
    }
  } else {
    console.log("Combat ended or not active");

    // Combat ended or not active - hide the display
    const wasVisible = initiativeDisplay.style.display !== "none";
    initiativeDisplay.style.display = "none";

    if (combat && combat.active === false && wasVisible) {
      showNotification("Combat has ended", "success");
    }
  }
}

/**
 * Handle battle map pings from Firebase
 */
function handleBattleMapPings(pingsData) {
  if (typeof playerView === "undefined") return;

  // If pingsData is null or empty, clear all pings
  if (!pingsData || Object.keys(pingsData).length === 0) {
    playerView.activePings = [];
    if (playerView.mapData && typeof renderBattleMap === "function") {
      renderBattleMap(playerView.mapData);
    }
    return;
  }

  // Create a map of existing pings by ID for quick lookup
  const existingPingsMap = new Map();
  if (playerView.activePings) {
    playerView.activePings.forEach((ping) => {
      existingPingsMap.set(ping.id, ping);
    });
  }

  // Update/add pings from Firebase
  const newPings = [];
  Object.entries(pingsData).forEach(([id, ping]) => {
    if (ping && ping.x !== undefined && ping.y !== undefined) {
      // Use existing ping if it exists (preserves local timestamp), otherwise use Firebase data
      if (existingPingsMap.has(id)) {
        newPings.push(existingPingsMap.get(id));
      } else {
        newPings.push({
          id: id,
          x: ping.x,
          y: ping.y,
          color: ping.color || "#ff5722",
          playerName: ping.playerName || "Player",
          timestamp: ping.timestamp || Date.now(),
        });
      }
    }
  });

  // Update the array
  playerView.activePings = newPings;

  // Re-render battle map to show pings
  if (playerView.mapData && typeof renderBattleMap === "function") {
    renderBattleMap(playerView.mapData);
  }
}

/**
 * Show GM message
 */
function showGMMessage(message) {
  const { content, type } = message;
  showNotification(`📢 GM: ${content}`, type || "info");
}

/**
 * Update header for multiplayer mode
 */
function updateHeaderForMultiplayer(roomCode, playerName, characterName) {
  console.log(
    "🔧 Updating header for multiplayer:",
    roomCode,
    playerName,
    characterName,
  );

  // Update page title with character name
  const pageTitle = document.getElementById("pageTitle");
  if (pageTitle) {
    pageTitle.textContent = `${characterName || playerName}'s Character Sheet`;
  }

  // Show and update toolbar
  const toolbar = document.getElementById("playerToolbar");
  console.log("🔧 Toolbar element:", toolbar);
  if (toolbar) {
    toolbar.style.display = "grid";
    console.log("✅ Toolbar display set to grid");
  } else {
    console.error("❌ Toolbar element not found!");
  }

  const toolbarStatus = document.getElementById("toolbarStatus");
  console.log("🔧 Toolbar status element:", toolbarStatus);
  if (toolbarStatus) {
    toolbarStatus.classList.add("connected");
    toolbarStatus.innerHTML = `
      <span class="status-icon">🟢</span>
      <span class="status-text">Connected</span>
    `;
  }

  const toolbarRoomCode = document.getElementById("toolbarRoomCode");
  const toolbarRoomCodeValue = document.getElementById("toolbarRoomCodeValue");
  if (toolbarRoomCode && toolbarRoomCodeValue) {
    toolbarRoomCode.style.display = "flex";
    toolbarRoomCodeValue.textContent = roomCode;
  }

  // Sync chat badges between toolbar and button
  syncChatBadges();
}

/**
 * Show connection status message
 */
function showConnectionStatus(message, type = "info") {
  const statusText = document.getElementById("connectionStatusText");
  if (statusText) {
    statusText.textContent = message;
  }

  const statusDot = document.getElementById("connectionStatus");
  if (statusDot) {
    if (type === "success") {
      statusDot.classList.add("connected");
    } else {
      statusDot.classList.remove("connected");
    }
  }
}

/**
 * Show notification to player
 */
function showNotification(message, type = "info") {
  const notification = document.createElement("div");
  notification.className = "player-notification";

  const colors = {
    info: { bg: "rgba(33, 150, 243, 0.2)", border: "#2196F3" },
    success: { bg: "rgba(76, 175, 80, 0.2)", border: "#4caf50" },
    warning: { bg: "rgba(255, 152, 0, 0.2)", border: "#ff9800" },
    danger: { bg: "rgba(244, 67, 54, 0.2)", border: "#f44336" },
  };

  const style = colors[type] || colors.info;

  notification.style.cssText = `
        position: fixed;
        top: 70px;
        right: 20px;
        padding: 15px 20px;
        background: ${style.bg};
        border: 2px solid ${style.border};
        border-radius: 6px;
        color: #e0e0e0;
        z-index: 9999;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
        animation: slideIn 0.3s ease, fadeOut 0.3s ease 4.7s;
        max-width: 300px;
        font-size: 0.95em;
    `;

  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => notification.remove(), 5000);
}

/**
 * Play sound effect
 */
function playSound(soundType) {
  // TODO: Add sound effects
  console.log("Play sound:", soundType);
}

/**
 * Load player character data from localStorage
 */
function loadPlayerCharacterData() {
  try {
    // First check if we have character data from the join flow
    const loadedCharacter = sessionStorage.getItem("loadedCharacter");
    if (loadedCharacter) {
      const data = JSON.parse(loadedCharacter);
      console.log("✓ Loaded character from join flow:", data.name);
      return data;
    }

    // Try loading from the full character save system first
    const fullCharacter = localStorage.getItem("magnusCharacter");
    if (fullCharacter) {
      const data = JSON.parse(fullCharacter);
      console.log("✓ Loaded full character data for:", data.name);
      return data;
    }

    // Fallback to legacy system
    const savedData = localStorage.getItem("playerCharacter");
    if (savedData) {
      return JSON.parse(savedData);
    }
  } catch (error) {
    console.error("Error loading character data:", error);
  }
  return null;
}

/**
 * Save character data and sync to multiplayer
 */
function saveAndSyncCharacter() {
  try {
    // TODO: Get character data from the character sheet
    const characterData = {
      name: "Character Name",
      archetype: "Investigator",
      stats: {},
      // ... add more character data
      lastUpdated: Date.now(),
    };

    // Save locally
    localStorage.setItem("playerCharacter", JSON.stringify(characterData));

    // Sync to multiplayer if connected
    if (isConnectedToRoom) {
      multiplayerManager.updatePlayerCharacter(characterData);
      showNotification("✅ Character synced", "success");
    } else {
      showNotification("✅ Character saved locally", "success");
    }
  } catch (error) {
    console.error("Error saving character:", error);
    alert("Error saving character: " + error.message);
  }
}

/**
 * Add character management buttons
 */
function addCharacterManagementButtons() {
  const controls = document.getElementById("playerViewControls");
  if (!controls) return;

  // Check if buttons already exist
  if (controls.querySelector(".save-character-btn")) return;

  const saveBtn = document.createElement("button");
  saveBtn.className = "player-control-button save-character-btn";
  saveBtn.innerHTML = "💾 Save Character";
  saveBtn.onclick = saveAndSyncCharacter;
  saveBtn.title = "Save character data";

  controls.appendChild(saveBtn);
}

/**
 * Handle disconnect
 */
window.addEventListener("beforeunload", () => {
  if (isConnectedToRoom && multiplayerManager) {
    multiplayerManager.leaveRoom();
  }
});

// Add CSS animations
const style = document.createElement("style");
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }

    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
`;
document.head.appendChild(style);

/**
 * Chat Functions
 */

/**
 * Send chat message from player to GM
 */
function sendPlayerChatMessage() {
  const input = document.getElementById("playerChatInput");
  const message = input.value.trim();

  if (!message) {
    return;
  }

  if (!isConnectedToRoom) {
    showPlayerNotification("⚠️ Not connected to a game session", "error");
    return;
  }

  if (!multiplayerManager) {
    showPlayerNotification("⚠️ Multiplayer not initialized", "error");
    return;
  }

  // Send to GM (to = 'GM')
  multiplayerManager
    .sendChatMessage("GM", message)
    .then(() => {
      input.value = "";
      input.focus();
    })
    .catch((error) => {
      console.error("Error sending message:", error);
      showPlayerNotification("❌ Failed to send message", "error");
    });
}

/**
 * Display a chat message in the player's chat container
 * @param {Object} msg - Message object {from, fromName, to, toName, message, timestamp, fromGM, read}
 * @param {boolean} sentByUs - Whether this message was sent by the player (vs received from GM)
 */
function displayPlayerChatMessage(msg, sentByUs = false) {
  const container = document.getElementById("playerChatContainer");
  if (!container) return;

  // Clear "no messages" placeholder
  if (container.querySelector('div[style*="No messages"]')) {
    container.innerHTML = "";
  }

  // Determine if this message was sent by us by checking player ID
  const isSentByUs =
    sentByUs ||
    msg.from === multiplayerManager.playerId ||
    msg.from === multiplayerManager.playerName ||
    (msg.fromName === multiplayerManager.playerName && !msg.fromGM);

  const messageDiv = document.createElement("div");
  const timestamp = new Date(msg.timestamp).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Style based on who sent it
  let backgroundColor, borderColor, senderLabel;
  if (isSentByUs) {
    // Message sent by player
    backgroundColor = "rgba(76, 175, 80, 0.2)"; // Green
    borderColor = "#4caf50";
    senderLabel = `You → ${msg.toName || "GM"}`;
  } else {
    // Message received from GM
    backgroundColor = "rgba(33, 150, 243, 0.2)"; // Blue
    borderColor = "#2196f3";
    senderLabel = `GM`;
  }

  messageDiv.style.cssText = `
        background: ${backgroundColor};
        border-left: 4px solid ${borderColor};
        padding: 12px;
        margin-bottom: 10px;
        border-radius: 4px;
    `;

  messageDiv.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
            <strong style="color: ${borderColor};">${senderLabel}</strong>
            <span style="color: #888; font-size: 0.85em;">${timestamp}</span>
        </div>
        <div style="color: #e0e0e0; line-height: 1.5;">${highlightSwearWords(
          msg.message,
        )}</div>
    `;

  container.appendChild(messageDiv);
  container.scrollTop = container.scrollHeight;

  // Mark as read if it's from GM
  if (!sentByUs && msg.id) {
    setTimeout(() => {
      multiplayerManager?.markChatAsRead(msg.id);
    }, 1000);
  }
}

/**
 * Highlight swear words in chat messages
 */
function highlightSwearWords(text) {
  const swearWords = [
    // Common profanity
    'damn', 'hell', 'crap', 'shit', 'fuck', 'ass', 'bastard', 'bitch',
    'piss', 'dick', 'cock', 'pussy', 'cunt', 'wank', 'bollocks', 'bloody',
    'arse', 'git', 'bugger', 'twat', 'tosser', 'prick', 'douche', 'jackass',
    // Variations and compounds
    'shite', 'feck', 'frick', 'frigging', 'effing', 'goddam', 'goddamn', 'dammit',
    'asshole', 'arsehole', 'motherfucker', 'bullshit', 'horseshit', 'chickenshit',
    'apeshit', 'batshit', 'shitty', 'fucked', 'fucking', 'fucker', 'fuckface',
    // British/Australian slang
    'bellend', 'knob', 'knobhead', 'wanker', 'pillock', 'plonker', 'minger',
    'numpty', 'berk', 'muppet', 'slag', 'scrubber', 'tart', 'slapper',
    // Body parts and crude terms
    'tits', 'boobs', 'titties', 'balls', 'bollocks', 'nuts', 'schlong',
    'fanny', 'cooch', 'cooter', 'beaver', 'muff', 'taint', 'choad',
    // Insults
    'douchebag', 'dumbass', 'dipshit', 'shithead', 'dickhead', 'asswipe',
    'butthead', 'bonehead', 'numbnuts', 'douchenozzle', 'fuckwit', 'twatwaffle',
    'cumstain', 'shitstain', 'cocksucker', 'cockwomble', 'thundercunt',
    // Milder cursing
    'poo', 'poopy', 'turd', 'arse', 'butt', 'booty', 'dang', 'darn',
    'heck', 'crud', 'balls', 'ballsack', 'nuts', 'screwed', 'screw',
    // Slang and crude
    'whore', 'slut', 'ho', 'skank', 'tramp', 'hussy', 'hooker', 'prostitute',
    'pimp', 'bastards', 'bitches', 'shits', 'fucks', 'asses'
  ];

  // Escape HTML first
  const div = document.createElement('div');
  div.textContent = text;
  let escapedText = div.innerHTML;

  // Create regex pattern that matches whole words only
  const pattern = new RegExp(
    '\\b(' + swearWords.join('|') + ')\\b',
    'gi'
  );

  // Replace with highlighted version
  escapedText = escapedText.replace(pattern, (match) => {
    return `<span style="background: linear-gradient(45deg, #ff4444, #ff8800); padding: 2px 4px; border-radius: 3px; font-weight: bold; color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.5); animation: swearPulse 1.5s ease-in-out infinite;">${match}</span>`;
  });

  return escapedText;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Toggle chat panel visibility
 */
function toggleChatPanel() {
  const panel = document.getElementById("chatPanel");
  const button = document.getElementById("chatBtn");

  if (!panel) return;

  if (panel.style.display === "none" || panel.style.display === "") {
    panel.style.display = "block";
    // Clear badge when opening
    updateChatBadge(false);
  } else {
    panel.style.display = "none";
  }
}

/**
 * Update chat notification badge
 * @param {boolean} show - Whether to show the badge
 */
function updateChatBadge(show) {
  // Update toolbar badge
  const toolbarBadge = document.getElementById("toolbarChatBadge");
  if (toolbarBadge) {
    if (show) {
      toolbarBadge.style.display = "block";
      toolbarBadge.textContent = "!";
    } else {
      toolbarBadge.style.display = "none";
    }
  }
}

/**
 * Sync chat badges between toolbar and button
 */
function syncChatBadges() {
  const toolbarBadge = document.getElementById("toolbarChatBadge");

  // Set up mutation observer to sync badges if needed
  if (toolbarBadge) {
    // Initial sync
    const isVisible = toolbarBadge.style.display !== "none";
    updateChatBadge(isVisible);
  }
}

/**
 * Apply Horror Mode theming to player view
 * Called when GM broadcasts Horror Mode state changes
 */
function applyHorrorModeToPlayer(enabled, level) {
  console.log(
    `🎭 Horror Mode ${enabled ? "ACTIVATED" : "DEACTIVATED"} by GM (Level ${level})`,
  );

  if (enabled) {
    document.body.classList.add("horror-mode-active");

    // Fix Battle Map header border inline style
    setTimeout(() => {
      const battleMapHeader = document.querySelector(
        '#battleMapModal div[style*="border-bottom"]',
      );
      if (battleMapHeader) {
        battleMapHeader.style.borderBottom = "2px solid #8b0000";
      }
    }, 100);

    // Show atmospheric notification
    const notification = document.createElement("div");
    notification.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(139, 0, 0, 0.95);
      border: 3px solid #ff0000;
      border-radius: 12px;
      padding: 30px 50px;
      z-index: 10000;
      text-align: center;
      box-shadow: 0 0 40px rgba(255, 0, 0, 0.8);
      animation: horrorFadeIn 1s ease-out;
    `;
    notification.innerHTML = `
      <div style="font-size: 2em; color: #ff0000; font-weight: bold; text-shadow: 0 0 20px rgba(255, 0, 0, 0.8); margin-bottom: 10px;">
        ☠ HORROR MODE ACTIVE ☠
      </div>
      <div style="font-size: 1.2em; color: #ff6b6b; font-style: italic;">
        Intrusion Rate: ${level}
      </div>
    `;

    document.body.appendChild(notification);

    // Fade out after 3 seconds
    setTimeout(() => {
      notification.style.animation = "horrorFadeOut 1s ease-out";
      setTimeout(() => notification.remove(), 1000);
    }, 3000);
  } else {
    document.body.classList.remove("horror-mode-active");
    // Restore Battle Map header border inline style
    setTimeout(() => {
      const battleMapHeader = document.querySelector(
        '#battleMapModal div[style*="border-bottom"]',
      );
      if (battleMapHeader) {
        battleMapHeader.style.borderBottom = "2px solid #4caf50";
      }
    }, 100);
    // Show deactivation notification
    const notification = document.createElement("div");
    notification.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(49, 126, 48, 0.95);
      border: 3px solid #4caf50;
      border-radius: 12px;
      padding: 30px 50px;
      z-index: 10000;
      text-align: center;
      box-shadow: 0 0 40px rgba(76, 175, 80, 0.8);
    `;
    notification.innerHTML = `
      <div style="font-size: 1.5em; color: #4caf50; font-weight: bold; text-shadow: 0 0 10px rgba(76, 175, 80, 0.8);">
        Horror Mode Deactivated
      </div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => notification.remove(), 2000);
  }
}

/**
 * Show notification for stress/damage assignment from GM
 */
function showStressDamageNotification(type, amount, reason, damageType = null) {
  const icons = {
    stress: "😰",
    supernatural: "👁️",
    damage: "💔",
  };

  const titles = {
    stress: "Stress Assigned",
    supernatural: "Supernatural Stress Assigned",
    damage: "Damage Assigned",
  };

  const colors = {
    stress: "#ff9800",
    supernatural: "#9c27b0",
    damage: "#f44336",
  };

  const icon = icons[type] || "📋";
  const title = titles[type] || "GM Action";
  const color = colors[type] || "#888";

  let message = `${icon} <strong>${amount}</strong> ${type === "supernatural" ? "Supernatural Stress" : type.charAt(0).toUpperCase() + type.slice(1)}`;
  if (damageType) {
    message += ` (${damageType})`;
  }
  if (reason) {
    message += `<br><span style="font-size: 0.9em; opacity: 0.9;">${reason}</span>`;
  }

  const notification = document.createElement("div");
  notification.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(26, 26, 26, 0.98);
    border: 3px solid ${color};
    border-radius: 12px;
    padding: 25px 40px;
    z-index: 10000;
    text-align: center;
    box-shadow: 0 0 40px rgba(0, 0, 0, 0.8), 0 0 20px ${color}80;
    animation: notificationPulse 0.5s ease-out;
    min-width: 300px;
  `;

  notification.innerHTML = `
    <div style="font-size: 1.8em; color: ${color}; font-weight: bold; margin-bottom: 10px; text-shadow: 0 0 15px ${color}80;">
      ${title}
    </div>
    <div style="font-size: 1.2em; color: #fff;">
      ${message}
    </div>
  `;

  document.body.appendChild(notification);

  // Fade out after 4 seconds
  setTimeout(() => {
    notification.style.animation = "notificationFadeOut 1s ease-out";
    setTimeout(() => notification.remove(), 1000);
  }, 4000);
}

/**
 * Show notification for damage state change from GM
 */
function showDamageStateNotification(oldState, newState) {
  const damageStates = ["Hale", "Hurt", "Impaired", "Debilitated", "Dead"];
  const oldIndex = damageStates.indexOf(oldState);
  const newIndex = damageStates.indexOf(newState);

  // Determine if getting better or worse
  const isWorsening = newIndex > oldIndex;
  const color = isWorsening ? "#f44336" : "#4caf50";
  const icon = isWorsening ? "💔" : "💚";
  const title = isWorsening ? "Damage Worsened" : "Condition Improved";

  const notification = document.createElement("div");
  notification.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(26, 26, 26, 0.98);
    border: 3px solid ${color};
    border-radius: 12px;
    padding: 25px 40px;
    z-index: 10000;
    text-align: center;
    box-shadow: 0 0 40px rgba(0, 0, 0, 0.8), 0 0 20px ${color}80;
    animation: notificationPulse 0.5s ease-out;
    min-width: 300px;
  `;

  notification.innerHTML = `
    <div style="font-size: 1.8em; color: ${color}; font-weight: bold; margin-bottom: 10px; text-shadow: 0 0 15px ${color}80;">
      ${icon} ${title}
    </div>
    <div style="font-size: 1.2em; color: #fff;">
      <span style="opacity: 0.7;">${oldState}</span> → <strong style="color: ${color};">${newState}</strong>
    </div>
  `;

  document.body.appendChild(notification);

  // Fade out after 4 seconds
  setTimeout(() => {
    notification.style.animation = "notificationFadeOut 1s ease-out";
    setTimeout(() => notification.remove(), 1000);
  }, 4000);
}

/**
 * Toggle initiative order display collapse/expand
 */
function toggleInitiativeDisplay() {
  const sidebar = document.getElementById("initiativeOrderDisplay");
  const button = document.getElementById("initiativeToggle");

  if (!sidebar || !button) return;

  const isCollapsed = sidebar.style.transform.includes("100%");

  if (isCollapsed) {
    // Expand
    sidebar.style.transform = "translateY(-50%)";
    button.textContent = "▶";
  } else {
    // Collapse
    sidebar.style.transform = "translate(100%, -50%)";
    button.textContent = "◀";
  }
}

/**
 * Update damage track UI when GM changes it
 */
function updateDamageTrackUI(newDamageState) {
  console.log(`📊 Updating damage track UI to: ${newDamageState}`);

  // Convert to lowercase for consistency with setDamageState function
  const state = newDamageState.toLowerCase();

  // Set flag to prevent sync loop
  window.gmUpdatingDamage = true;

  if (typeof setDamageState === "function") {
    setDamageState(state);
    console.log(`✓ Damage track UI updated to ${newDamageState}`);
  } else {
    console.warn("⚠️ setDamageState function not available");
    // Fallback: Update character object and display element directly
    if (typeof character !== "undefined") {
      character.damageState = state;
      character.damage = newDamageState; // Also update legacy property
    }

    const damageStateElement = document.getElementById("damageState");
    if (damageStateElement) {
      damageStateElement.textContent = newDamageState;
      damageStateElement.className = `damage-state-value ${state}`;
      console.log(`✓ Damage track display updated (fallback method)`);
    }
  }

  // Clear flag after a short delay
  setTimeout(() => {
    window.gmUpdatingDamage = false;
  }, 100);
}

/**
 * Sync player's damage changes to GM
 */
function syncDamageToMultiplayer(damageState) {
  if (
    !isConnectedToRoom ||
    typeof multiplayerManager === "undefined" ||
    !multiplayerManager.roomCode
  ) {
    return;
  }

  // Convert to capitalized format for Firebase
  const capitalizedState =
    damageState.charAt(0).toUpperCase() + damageState.slice(1).toLowerCase();

  multiplayerManager.db
    .ref(
      `rooms/${multiplayerManager.roomCode}/players/${multiplayerManager.playerId}/character/damageTrack`,
    )
    .set(capitalizedState)
    .then(() => {
      console.log(`✓ Synced damage track to GM: ${capitalizedState}`);
    })
    .catch((error) => {
      console.error("Error syncing damage track:", error);
    });
}

/**
 * Sync player's stress changes to GM
 */
function syncStressToMultiplayer(stressValue) {
  if (
    !isConnectedToRoom ||
    typeof multiplayerManager === "undefined" ||
    !multiplayerManager.roomCode
  ) {
    return;
  }

  multiplayerManager.db
    .ref(
      `rooms/${multiplayerManager.roomCode}/players/${multiplayerManager.playerId}/character/stress`,
    )
    .set(stressValue)
    .then(() => {
      console.log(`✓ Synced stress to GM: ${stressValue}`);
    })
    .catch((error) => {
      console.error("Error syncing stress:", error);
    });
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  initializePlayerMultiplayer();
});
