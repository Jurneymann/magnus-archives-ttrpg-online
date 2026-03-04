/**
 * GM Multiplayer Integration
 * Handles multiplayer features in the GM tool
 */

let isMultiplayerActive = false;

// Player color assignments for chat
const playerColors = [
  "#2196f3", // Blue
  "#9c27b0", // Purple
  "#f44336", // Red
  "#ff9800", // Orange
  "#00bcd4", // Cyan
  "#ffeb3b", // Yellow
  "#e91e63", // Pink
  "#3f51b5", // Indigo
  "#009688", // Teal
  "#ff5722", // Deep Orange
];
const playerColorMap = new Map(); // Maps player ID to color
let nextColorIndex = 0;

/**
 * Assign a color to a player
 */
function assignPlayerColor(playerId) {
  if (!playerColorMap.has(playerId)) {
    const color = playerColors[nextColorIndex % playerColors.length];
    playerColorMap.set(playerId, color);
    nextColorIndex++;
  }
  return playerColorMap.get(playerId);
}

/**
 * Get player color
 */
function getPlayerColor(playerId) {
  return playerColorMap.get(playerId) || "#2196f3"; // Default blue
}

/**
 * Initialize multiplayer based on URL parameters
 */
function initializeMultiplayer() {
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get("mode");

  if (mode === "gm") {
    console.log("GM mode detected");
    // GM can choose to start multiplayer later
  }
}

/**
 * Toggle multiplayer panel visibility
 */
function toggleMultiplayerPanel() {
  const panel = document.getElementById("multiplayerPanel");
  if (panel.style.display === "none") {
    panel.style.display = "flex";
  } else {
    panel.style.display = "none";
  }
}

/**
 * Create a new multiplayer room
 */
async function createMultiplayerRoom() {
  try {
    // Check if Firebase is configured
    if (typeof firebase === "undefined" || !firebase.apps.length) {
      alert(
        "⚠️ Firebase not configured.\n\nPlease set up firebase-config.js with your Firebase project credentials.\n\nSee MULTIPLAYER_SETUP.md for instructions.",
      );
      return;
    }

    const gmName =
      prompt("Enter your name as Game Master:", "Game Master") || "Game Master";

    const roomCode = await multiplayerManager.createRoom(gmName);

    // Update UI
    document.getElementById("roomCodeLarge").textContent = roomCode;
    document.getElementById("multiplayerNotConnected").style.display = "none";
    document.getElementById("multiplayerConnected").style.display = "block";
    document.getElementById("chatButton").style.display = "flex";

    isMultiplayerActive = true;

    // Set up player connection listener
    multiplayerManager.onPlayersChange((players) => {
      updateConnectedPlayersList(players);
    });

    // Set up listener for player character changes (damage/stress)
    setupPlayerCharacterListeners(roomCode);

    // Set up message listener for testing
    multiplayerManager.onMessageReceived((message) => {
      console.log("Message broadcast:", message);
    });

    // Set up chat listener
    // Set up chat listener
    multiplayerManager.onChatMessage((message) => {
      displayChatMessage(message);
    });

    // Set up typing indicator listener
    multiplayerManager.onTypingStatus((typingUsers) => {
      const indicator = document.getElementById("gmTypingIndicator");
      const span = indicator?.querySelector("span");

      if (indicator && span) {
        if (typingUsers.length > 0) {
          span.textContent =
            typingUsers.length === 1
              ? `${typingUsers[0]} is typing`
              : `${typingUsers.length} players are typing`;
          indicator.style.display = "block";
        } else {
          indicator.style.display = "none";
        }
      }
    });

    // Set up dice roll listener
    multiplayerManager.onDiceRollBroadcast((rollData) => {
      displayDiceRollNotification(rollData);
    });

    // Set up ping listener
    multiplayerManager.db
      .ref(`rooms/${roomCode}/battleMapPings`)
      .on("value", (snapshot) => {
        const pingsData = snapshot.val();
        // Always call handler, even when null/empty, to sync removals
        handleBattleMapPings(pingsData);
      });

    // Update chat recipient dropdown with connected players
    updateChatRecipients();

    alert(
      `✅ Multiplayer session created!\n\nRoom Code: ${roomCode}\n\nShare this code with your players so they can join.`,
    );
  } catch (error) {
    console.error("Error creating room:", error);
    alert("❌ Error creating multiplayer session: " + error.message);
  }
}

/**
 * Update the connected players list UI
 */
function updateConnectedPlayersList(players) {
  const listContainer = document.getElementById("connectedPlayersList");
  const playerCount = document.getElementById("playerCount");

  // Filter to only show connected players (not GM, has name, and is connected)
  const playerArray = Object.values(players).filter(
    (p) =>
      p.id !== multiplayerManager.playerId && p.name && p.connected === true,
  );

  // Assign colors to new players
  playerArray.forEach((player) => {
    assignPlayerColor(player.id);
  });
  playerCount.textContent = playerArray.length;

  // Sync connected players to party management
  syncPlayersToParty(playerArray);

  if (playerArray.length === 0) {
    listContainer.innerHTML =
      '<p style="text-align: center; color: #666; padding: 20px;">No players connected yet.</p>';
    return;
  }

  listContainer.innerHTML = playerArray
    .map((player) => {
      const char = player.character || {};

      // Debug: Log character data to see structure
      console.log("Character data for", player.name, ":", char);

      // Try multiple possible property names for pools
      const mightPool = char.mightPool ||
        char.might || {
          current: char.mightCurrent || 0,
          max: char.mightMax || 0,
        };
      const speedPool = char.speedPool ||
        char.speed || {
          current: char.speedCurrent || 0,
          max: char.speedMax || 0,
        };
      const intellectPool = char.intellectPool ||
        char.intellect || {
          current: char.intellectCurrent || 0,
          max: char.intellectMax || 0,
        };
      const mightEdge = char.mightEdge || 0;
      const speedEdge = char.speedEdge || 0;
      const intellectEdge = char.intellectEdge || 0;

      const xp = char.xp || 0;
      const tier = char.tier || 1;
      const effort = char.effort || 1;

      const damageTrack = char.damageTrack || "Hale";
      const stress = char.stress || 0;
      const stressLevel = Math.floor(stress / 3);
      const supernaturalStress = char.supernaturalStress || 0;

      // Check Avatar status
      const isAvatar = char.avatar && char.avatar.isAvatar === true;
      const avatarEntity = isAvatar
        ? char.avatar.entityName || "Unknown Entity"
        : null;

      const characterStatement = char.name
        ? `${char.descriptor || ""} ${char.type || ""} ${char.focus1 || ""}`.trim() +
          (isAvatar ? ` and Avatar of Fear in service to ${avatarEntity}` : "")
        : "No character loaded";

      return `
        <div class="player-card" style="background: ${isAvatar ? "rgba(139, 0, 0, 0.3)" : "rgba(40, 40, 40, 0.6)"}; border: 1px solid ${isAvatar ? "#8b0000" : "#555"}; border-radius: 4px; padding: 15px; margin-bottom: 15px;">
            <!-- Player Name & Character Statement -->
            <div style="font-weight: bold; color: ${isAvatar ? "#ff6b6b" : "#d4a574"}; margin-bottom: 8px; font-size: 1.1em;">
                ${player.connected ? "🟢" : "🔴"} ${player.name}: ${char.name || "Unnamed Character"}
                ${isAvatar ? `<span style="color: #ff6b6b; font-size: 0.85em; margin-left: 8px;">⚠️ AVATAR</span>` : ""}
            </div>
            <div style="font-size: 0.9em; color: #aaa; margin-bottom: 12px; font-style: italic;">
                ${characterStatement}
            </div>
            ${
              isAvatar
                ? `
            <div style="background: rgba(139, 0, 0, 0.3); border: 1px solid #8b0000; border-radius: 4px; padding: 10px; margin-bottom: 12px;">
                <div style="color: #ff6b6b; font-weight: bold; font-size: 0.9em;">
                    🎭 Avatar of: <span style="color: #ffb3b3;">${avatarEntity}</span>
                </div>
            </div>
            `
                : ""
            }
            
            ${
              char.name
                ? `
            <!-- XP, Tier, Effort -->
            <div style="display: flex; gap: 20px; margin-bottom: 12px; font-size: 0.9em; color: #c8e6c9;">
                <div><strong>XP:</strong> ${xp}</div>
                <div><strong>Tier:</strong> ${tier}</div>
                <div><strong>Effort:</strong> ${effort}</div>
            </div>
            
            <!-- Stats (Current/Pool and Edge) -->
            <div style="margin-bottom: 12px; font-size: 0.85em;">
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; color: #e0e0e0;">
                    <div style="background: rgba(244, 67, 54, 0.15); padding: 8px; border-radius: 4px; border: 1px solid rgba(244, 67, 54, 0.3);">
                        <div style="font-weight: bold; color: #ef5350; margin-bottom: 4px;">Might</div>
                        <div>${mightPool.current}/${mightPool.max}</div>
                        <div style="font-size: 0.85em; color: #aaa;">Edge: ${mightEdge}</div>
                    </div>
                    <div style="background: rgba(33, 150, 243, 0.15); padding: 8px; border-radius: 4px; border: 1px solid rgba(33, 150, 243, 0.3);">
                        <div style="font-weight: bold; color: #42a5f5; margin-bottom: 4px;">Speed</div>
                        <div>${speedPool.current}/${speedPool.max}</div>
                        <div style="font-size: 0.85em; color: #aaa;">Edge: ${speedEdge}</div>
                    </div>
                    <div style="background: rgba(156, 39, 176, 0.15); padding: 8px; border-radius: 4px; border: 1px solid rgba(156, 39, 176, 0.3);">
                        <div style="font-weight: bold; color: #ab47bc; margin-bottom: 4px;">Intellect</div>
                        <div>${intellectPool.current}/${intellectPool.max}</div>
                        <div style="font-size: 0.85em; color: #aaa;">Edge: ${intellectEdge}</div>
                    </div>
                </div>
            </div>
            
            <!-- Damage Track, Stress, Supernatural Stress (One Row) -->
            <div style="margin-bottom: 15px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; font-size: 0.85em;">
                <div style="padding: 8px; background: rgba(255, 152, 0, 0.15); border: 1px solid rgba(255, 152, 0, 0.3); border-radius: 4px;">
                    <div style="color: #ffb74d;"><strong>Damage:</strong> ${damageTrack}</div>
                </div>
                <div style="padding: 8px; background: rgba(156, 39, 176, 0.15); border: 1px solid rgba(156, 39, 176, 0.3); border-radius: 4px;">
                    <div style="color: #ce93d8;"><strong>Stress:</strong> ${stress} (Lvl ${stressLevel})</div>
                </div>
                <div style="padding: 8px; background: rgba(76, 175, 80, 0.15); border: 1px solid rgba(76, 175, 80, 0.3); border-radius: 4px;">
                    <div style="color: #a5d6a7;"><strong>Supernatural:</strong> ${supernaturalStress}</div>
                </div>
            </div>
            
            <!-- Collapsible Detail Sections -->
            <div style="margin-bottom: 15px;">
                ${generateCollapsibleSection(player.id, "characterArc", "Character Arc", formatCharacterArc(char.characterArc))}
                ${generateCollapsibleSection(player.id, "skills", "Skills", formatSkills(char.skillsData, char.descriptorSkills))}
                ${generateCollapsibleSection(player.id, "characteristics", "Descriptor Characteristics", formatCharacteristics(char.descriptorCharacteristics))}
                ${generateCollapsibleSection(player.id, "abilities", "Abilities", formatAbilities(char.selectedTypeAbilities, char.selectedFocusAbilities))}
                ${generateCollapsibleSection(player.id, "weapons", "Weapons", formatWeapons(char.weapons))}
                ${generateCollapsibleSection(player.id, "items", "Equipment", formatItems(char.items))}
                ${generateCollapsibleSection(player.id, "cyphers", "Cyphers", formatCyphers(char.assignedCyphers))}
                ${isAvatar && char.avatar && char.avatar.tetheredPowerName ? generateCollapsibleSection(player.id, "avatarPower", "Avatar Power", formatAvatarPower(char.avatar)) : ""}
            </div>

            <!-- Action Buttons -->
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button class="button" onclick="assignStressToPlayer('${player.id}', '${player.name}')" 
                    style="font-size: 0.85em; padding: 8px 12px; flex: 1; min-width: 140px;" 
                    title="Assign Stress">
                    Assign Stress
                </button>
                <button class="button" onclick="assignSupernaturalStressToPlayer('${player.id}', '${player.name}')" 
                    style="font-size: 0.85em; padding: 8px 12px; flex: 1; min-width: 140px; background: rgba(76, 175, 80, 0.2); border-color: #4caf50;" 
                    title="Assign Supernatural Stress">
                    Supernatural Stress
                </button>
                <button class="button" onclick="assignXPToPlayer('${player.id}', '${player.name}')" 
                    style="font-size: 0.85em; padding: 8px 12px; flex: 1; min-width: 140px;" 
                    title="Assign XP">
                    Assign XP
                </button>
                <button class="button" onclick="updatePlayerDamageTrack('${player.id}', '${player.name}')" 
                    style="font-size: 0.85em; padding: 8px 12px; flex: 1; min-width: 140px;" 
                    title="Update Damage Track">
                    Damage Track
                </button>
                <button class="button" onclick="showAvatarUnlockModal('${player.id}', '${char.name || player.name}')" 
                    style="font-size: 0.85em; padding: 8px 12px; flex: 1; min-width: 140px; background: rgba(139, 0, 0, 0.3); border-color: #8b0000;" 
                    title="Unlock Avatar Tab for this player">
                    Unlock Avatar
                </button>
            </div>
            `
                : '<div style="font-size: 0.85em; color: #666; padding: 20px; text-align: center;">No character loaded</div>'
            }
        </div>
    `;
    })
    .join("");

  // Update chat recipients dropdown
  updateChatRecipients(playerArray);
  // Update Voice of the Fears target dropdown
  if (typeof updateFearTargetDropdown === "function")
    updateFearTargetDropdown(playerArray);
}

/**
 * Sync connected multiplayer players to the party management system
 */
function syncPlayersToParty(playerArray) {
  if (
    typeof partyMembers === "undefined" ||
    typeof renderPartyList === "undefined"
  ) {
    // Party system not loaded yet
    return;
  }

  playerArray.forEach((player) => {
    if (!player.character) return; // Skip players without character data

    const character = player.character;

    // Check if this player already exists in party
    // Match by multiplayerId OR by player name + character name (for reconnections)
    const existingIndex = partyMembers.findIndex(
      (m) =>
        m.multiplayerId === player.id ||
        (m.playerName === player.name &&
          m.name === (character.name || "Unknown")),
    );

    const member = {
      id:
        existingIndex >= 0
          ? partyMembers[existingIndex].id
          : Date.now() + Math.random(),
      multiplayerId: player.id, // Track multiplayer connection
      playerName: player.name, // Real player name
      name: character.name || "Unknown", // Character name
      descriptor: character.descriptor || "",
      type: character.type || "",
      focus: character.focus1 || "",
      tier: character.tier || 1,
      xp: character.xp || 0,
      effort: character.effort || 1,
      might: {
        current:
          character.currentPools?.Might || character.mightPool?.current || 10,
        max: character.stats?.Might || character.mightPool?.max || 10,
        edge: character.edge?.Might || character.mightEdge || 0,
      },
      speed: {
        current:
          character.currentPools?.Speed || character.speedPool?.current || 10,
        max: character.stats?.Speed || character.speedPool?.max || 10,
        edge: character.edge?.Speed || character.speedEdge || 0,
      },
      intellect: {
        current:
          character.currentPools?.Intellect ||
          character.intellectPool?.current ||
          10,
        max: character.stats?.Intellect || character.intellectPool?.max || 10,
        edge: character.edge?.Intellect || character.intellectEdge || 0,
      },
      damage:
        character.damageTrack ||
        character.damageState ||
        character.damage ||
        "Hale",
      stress: character.stress || character.stressLevel || 0,
      cyphers: character.assignedCyphers || [],
      cypherLimit: character.cypherSlots || 2,
      notes: existingIndex >= 0 ? partyMembers[existingIndex].notes : "",
      imported: true,
      connected: player.connected, // Track connection status
      fullData: {
        ...character,
        supernaturalStress: character.supernaturalStress || 0,
        superStress: 10,
      },
      lastUpdated: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      // Update existing party member
      partyMembers[existingIndex] = member;
    } else {
      // Add new party member
      partyMembers.push(member);
    }
  });

  // Remove disconnected players that are no longer in the player array
  const currentPlayerIds = playerArray.map((p) => p.id);
  partyMembers = partyMembers.filter((m) => {
    // Keep manually added party members (no multiplayerId)
    if (!m.multiplayerId) return true;
    // Keep connected multiplayer players
    return currentPlayerIds.includes(m.multiplayerId);
  });

  // Refresh party UI
  renderPartyList();
}

/**
 * Assign stress to a specific player
 */
function assignStressToPlayer(playerId, playerName) {
  showPushDialog("stress", playerId, playerName);
}

/**
 * Assign damage to a specific player
 */
function assignDamageToPlayer(playerId, playerName) {
  showPushDialog("damage", playerId, playerName);
}

/**
 * Assign XP to a specific player
 */
function assignXPToPlayer(playerId, playerName) {
  showPushDialog("xp", playerId, playerName);
}

/**
 * Assign supernatural stress to a specific player
 */
function assignSupernaturalStressToPlayer(playerId, playerName) {
  showPushDialog("supernatural", playerId, playerName);
}

/**
 * Update a player's damage track state
 */
function updatePlayerDamageTrack(playerId, playerName) {
  const damageStates = ["Hale", "Hurt", "Impaired", "Debilitated", "Dead"];

  const currentState = prompt(
    `Update Damage Track for ${playerName}\n\nCurrent states:\n` +
      damageStates.map((s, i) => `${i + 1}. ${s}`).join("\n") +
      "\n\nEnter number (1-5):",
    "1",
  );

  if (currentState === null) return; // Cancelled

  const stateIndex = parseInt(currentState) - 1;
  if (stateIndex < 0 || stateIndex >= damageStates.length) {
    alert("Invalid selection. Please choose a number between 1 and 5.");
    return;
  }

  const newState = damageStates[stateIndex];

  // Update the player's damage track in Firebase
  multiplayerManager.db
    .ref(
      `rooms/${multiplayerManager.roomCode}/players/${playerId}/character/damageTrack`,
    )
    .set(newState)
    .then(() => {
      alert(`✅ ${playerName}'s damage track updated to: ${newState}`);
    })
    .catch((error) => {
      console.error("Error updating damage track:", error);
      alert("❌ Failed to update damage track: " + error.message);
    });
}

/**
 * Show push dialog for stress/damage/XP
 */
function showPushDialog(type, playerId, playerName) {
  // Create or get existing modal
  let modal = document.getElementById("pushDialog");
  if (!modal) {
    modal = createPushDialog();
    document.body.appendChild(modal);
  }

  // Configure dialog based on type
  const title =
    type === "stress"
      ? "Assign Stress"
      : type === "supernatural"
        ? "Assign Supernatural Stress"
        : type === "damage"
          ? "Assign Damage"
          : "Assign XP";
  const icon =
    type === "stress"
      ? "😰"
      : type === "supernatural"
        ? "👁️"
        : type === "damage"
          ? "💔"
          : "📈";
  const amountLabel =
    type === "xp"
      ? "XP Amount"
      : type === "stress"
        ? "Stress Amount"
        : type === "supernatural"
          ? "Supernatural Stress Amount"
          : "Damage Amount";

  document.getElementById("pushDialogTitle").innerHTML = `${icon} ${title}`;
  document.getElementById("pushDialogPlayer").textContent = playerName;
  document.getElementById("pushDialogAmountLabel").textContent =
    amountLabel + ":";
  document.getElementById("pushDialogAmount").value = type === "xp" ? "1" : "1";
  document.getElementById("pushDialogReason").value = "";

  // Show/hide damage type selector
  const damageTypeGroup = document.getElementById("pushDialogDamageTypeGroup");
  if (type === "damage") {
    damageTypeGroup.style.display = "block";
    document.getElementById("pushDialogDamageType").value = "physical";
  } else {
    damageTypeGroup.style.display = "none";
  }

  // Set up submit handler
  const submitBtn = document.getElementById("pushDialogSubmit");
  submitBtn.onclick = () => submitPushDialog(type, playerId, playerName);

  // Show modal
  modal.style.display = "flex";

  // Focus amount input
  setTimeout(() => document.getElementById("pushDialogAmount").focus(), 100);
}

/**
 * Create push dialog modal
 */
function createPushDialog() {
  const modal = document.createElement("div");
  modal.id = "pushDialog";
  modal.style.cssText = `
        display: none;
        position: fixed;
        z-index: 10000;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.8);
        align-items: center;
        justify-content: center;
    `;

  modal.innerHTML = `
        <div style="
            background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
            border: 2px solid #d4a574;
            border-radius: 8px;
            width: 90%;
            max-width: 450px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        ">
            <div style="
                background: #1a1a1a;
                border-bottom: 2px solid #d4a574;
                padding: 15px 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            ">
                <h3 id="pushDialogTitle" style="margin: 0; color: #d4a574;">Assign</h3>
                <button onclick="closePushDialog()" style="
                    background: transparent;
                    color: #d4a574;
                    border: none;
                    font-size: 1.5em;
                    cursor: pointer;
                    padding: 0;
                    width: 30px;
                    height: 30px;
                ">✕</button>
            </div>
            <div style="padding: 20px;">
                <div style="margin-bottom: 15px; color: #aaa; font-size: 0.9em;">
                    Player: <span id="pushDialogPlayer" style="color: #d4a574; font-weight: bold;"></span>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label id="pushDialogAmountLabel" for="pushDialogAmount" style="display: block; margin-bottom: 5px; color: #d4a574; font-weight: bold;">Amount:</label>
                    <input type="number" id="pushDialogAmount" min="1" value="1" style="
                        width: 100%;
                        padding: 10px;
                        background: rgba(0,0,0,0.3);
                        border: 1px solid #555;
                        border-radius: 4px;
                        color: #e0e0e0;
                        font-size: 1.1em;
                        box-sizing: border-box;
                    " />
                </div>
                
                <div id="pushDialogDamageTypeGroup" style="margin-bottom: 15px; display: none;">
                    <label for="pushDialogDamageType" style="display: block; margin-bottom: 5px; color: #d4a574; font-weight: bold;">Damage Type:</label>
                    <select id="pushDialogDamageType" style="
                        width: 100%;
                        padding: 10px;
                        background: rgba(0,0,0,0.3);
                        border: 1px solid #555;
                        border-radius: 4px;
                        color: #e0e0e0;
                        font-size: 1em;
                        box-sizing: border-box;
                    ">
                        <option value="physical">Physical</option>
                        <option value="mental">Mental</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label for="pushDialogReason" style="display: block; margin-bottom: 5px; color: #d4a574; font-weight: bold;">Reason (Optional):</label>
                    <input type="text" id="pushDialogReason" placeholder="e.g., Failed intimidation check" style="
                        width: 100%;
                        padding: 10px;
                        background: rgba(0,0,0,0.3);
                        border: 1px solid #555;
                        border-radius: 4px;
                        color: #e0e0e0;
                        font-size: 1em;
                        box-sizing: border-box;
                    " />
                </div>
                
                <div style="display: flex; gap: 10px;">
                    <button id="pushDialogSubmit" style="
                        flex: 1;
                        background: #d4a574;
                        color: #1a1a1a;
                        border: none;
                        padding: 12px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-weight: bold;
                        font-size: 1em;
                    ">Assign</button>
                    <button onclick="closePushDialog()" style="
                        flex: 1;
                        background: rgba(255,255,255,0.1);
                        color: #e0e0e0;
                        border: 1px solid #555;
                        padding: 12px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 1em;
                    ">Cancel</button>
                </div>
            </div>
        </div>
    `;

  // Handle Enter key
  modal.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      document.getElementById("pushDialogSubmit").click();
    }
  });

  return modal;
}

/**
 * Close push dialog
 */
function closePushDialog() {
  const modal = document.getElementById("pushDialog");
  if (modal) {
    modal.style.display = "none";
  }
}

/**
 * Submit push dialog
 */
function submitPushDialog(type, playerId, playerName) {
  const amount = parseInt(document.getElementById("pushDialogAmount").value);
  const reason = document.getElementById("pushDialogReason").value.trim();

  // Validate amount
  if (isNaN(amount) || amount < 1) {
    alert("Please enter a valid amount (minimum 1).");
    return;
  }

  // Close dialog
  closePushDialog();

  // Execute appropriate action
  if (type === "stress") {
    multiplayerManager.assignStress(playerId, amount, reason);
    showPushNotification(`✅ Assigned ${amount} stress to ${playerName}`);
  } else if (type === "supernatural") {
    // Get current supernatural stress
    multiplayerManager.db
      .ref(
        `rooms/${multiplayerManager.roomCode}/players/${playerId}/character/supernaturalStress`,
      )
      .once("value")
      .then((snapshot) => {
        const currentSuper = snapshot.val() || 0;
        const newSuper = Math.min(currentSuper + amount, 10); // Cap at 10

        multiplayerManager.db
          .ref(
            `rooms/${multiplayerManager.roomCode}/players/${playerId}/character/supernaturalStress`,
          )
          .set(newSuper)
          .then(() => {
            if (newSuper >= 10) {
              showPushNotification(
                `⚠️ ${playerName} has reached max Supernatural Stress (10/10)!`,
              );
            } else {
              showPushNotification(
                `✅ Assigned ${amount} Supernatural Stress to ${playerName}. Total: ${newSuper}/10`,
              );
            }
          })
          .catch((error) => {
            console.error("Error assigning supernatural stress:", error);
            alert("❌ Failed to assign supernatural stress: " + error.message);
          });
      })
      .catch((error) => {
        console.error("Error reading supernatural stress:", error);
        alert(
          "❌ Failed to read current supernatural stress: " + error.message,
        );
      });
  } else if (type === "damage") {
    const damageType = document.getElementById("pushDialogDamageType").value;
    multiplayerManager.assignDamage(playerId, amount, damageType, reason);
    showPushNotification(
      `✅ Assigned ${amount} ${damageType} damage to ${playerName}`,
    );
  } else if (type === "xp") {
    multiplayerManager.assignXP(playerId, amount, reason);
    showPushNotification(`✅ Assigned ${amount} XP to ${playerName}`);
  }
}

/**
 * Show push notification
 */
function showPushNotification(message) {
  // Create notification element
  const notification = document.createElement("div");
  notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%);
        color: #d4a574;
        padding: 15px 20px;
        border-radius: 4px;
        border: 2px solid #d4a574;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        z-index: 10001;
        font-weight: bold;
        animation: slideInRight 0.3s ease-out;
    `;
  notification.textContent = message;

  document.body.appendChild(notification);

  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = "slideOutRight 0.3s ease-in";
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

/**
 * Copy room code to clipboard
 */
function copyRoomCode() {
  const roomCode = multiplayerManager.roomCode;
  if (!roomCode) return;

  navigator.clipboard
    .writeText(roomCode)
    .then(() => {
      alert("✅ Room code copied to clipboard!");
    })
    .catch((err) => {
      console.error("Error copying to clipboard:", err);
      prompt("Room Code (copy manually):", roomCode);
    });
}

/**
 * Update chat recipient dropdown with connected players
 */
function updateChatRecipients(players) {
  const select = document.getElementById("chatRecipient");
  if (!select) return;

  // Keep "All Players" option
  const allOption = '<option value="all">All Players</option>';

  // Use provided players or empty array
  const playerList = players || [];

  const playerOptions = playerList
    .map((p) => `<option value="${p.id}">${p.name}</option>`)
    .join("");

  select.innerHTML = allOption + playerOptions;
}

/**
 * Send chat message
 */
function sendChatMessage() {
  const input = document.getElementById("chatMessageInput");
  const recipientSelect = document.getElementById("chatRecipient");

  if (!input || !recipientSelect) return;

  const message = input.value.trim();
  const recipient = recipientSelect.value;

  if (!message) {
    alert("Please enter a message");
    return;
  }

  // Send via multiplayer manager
  multiplayerManager.sendChatMessage(recipient, message);

  // Clear input
  input.value = "";
}

/**
 * Highlight swear words in chat messages
 */
function highlightSwearWords(text) {
  const swearWords = [
    // Common profanity
    "damn",
    "hell",
    "crap",
    "shit",
    "fuck",
    "ass",
    "bastard",
    "bitch",
    "piss",
    "dick",
    "cock",
    "pussy",
    "cunt",
    "wank",
    "bollocks",
    "bloody",
    "arse",
    "git",
    "bugger",
    "twat",
    "tosser",
    "prick",
    "douche",
    "jackass",
    // Variations and compounds
    "shite",
    "feck",
    "frick",
    "frigging",
    "effing",
    "goddam",
    "goddamn",
    "dammit",
    "asshole",
    "arsehole",
    "motherfucker",
    "bullshit",
    "horseshit",
    "chickenshit",
    "apeshit",
    "batshit",
    "shitty",
    "fucked",
    "fucking",
    "fucker",
    "fuckface",
    // British/Australian slang
    "bellend",
    "knob",
    "knobhead",
    "wanker",
    "pillock",
    "plonker",
    "minger",
    "numpty",
    "berk",
    "muppet",
    "slag",
    "scrubber",
    "tart",
    "slapper",
    // Body parts and crude terms
    "tits",
    "boobs",
    "titties",
    "balls",
    "bollocks",
    "nuts",
    "schlong",
    "fanny",
    "cooch",
    "cooter",
    "beaver",
    "muff",
    "taint",
    "choad",
    // Insults
    "douchebag",
    "dumbass",
    "dipshit",
    "shithead",
    "dickhead",
    "asswipe",
    "butthead",
    "bonehead",
    "numbnuts",
    "douchenozzle",
    "fuckwit",
    "twatwaffle",
    "cumstain",
    "shitstain",
    "cocksucker",
    "cockwomble",
    "thundercunt",
    // Milder cursing
    "poo",
    "poopy",
    "turd",
    "arse",
    "butt",
    "booty",
    "dang",
    "darn",
    "heck",
    "crud",
    "balls",
    "ballsack",
    "nuts",
    "screwed",
    "screw",
    // Slang and crude
    "whore",
    "slut",
    "ho",
    "skank",
    "tramp",
    "hussy",
    "hooker",
    "prostitute",
    "pimp",
    "bastards",
    "bitches",
    "shits",
    "fucks",
    "asses",
  ];

  // Escape HTML first
  const div = document.createElement("div");
  div.textContent = text;
  let escapedText = div.innerHTML;

  // Create regex pattern that matches whole words only
  const pattern = new RegExp("\\b(" + swearWords.join("|") + ")\\b", "gi");

  // Replace with highlighted version
  escapedText = escapedText.replace(pattern, (match) => {
    return `<span style="background: linear-gradient(45deg, #ff4444, #ff8800); padding: 2px 4px; border-radius: 3px; font-weight: bold; color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.5); animation: swearPulse 1.5s ease-in-out infinite;">${match}</span>`;
  });

  return escapedText;
}

/**
 * Display chat message in UI
 */
function displayChatMessage(msg) {
  const container = document.getElementById("chatMessagesContainer");
  if (!container) return;

  // Check if message already exists (prevent duplicates)
  if (msg.id && container.querySelector(`[data-message-id="${msg.id}"]`)) {
    return;
  }

  // Remove "no messages" placeholder if it exists
  const placeholder = container.querySelector(
    'div[style*="text-align: center"]',
  );
  if (placeholder) {
    container.innerHTML = "";
  }

  // Determine if this is sent or received by checking if from GM
  const isSent = msg.from === "gm" || msg.fromName === "GM";
  const isFromGM = isSent;

  // Get player-specific color for received messages
  let playerColor = "#2196f3"; // Default blue
  if (!isSent && msg.from) {
    playerColor = getPlayerColor(msg.from);
  }

  // Format timestamp
  const time = new Date(msg.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Get recipient name
  let recipientText = "";
  if (msg.to === "all") {
    recipientText = "to All Players";
  } else if (msg.to && msg.to !== multiplayerManager.playerId) {
    recipientText = `to ${msg.toName || "Player"}`;
  }

  // Create message element
  const msgDiv = document.createElement("div");
  msgDiv.setAttribute("data-message-id", msg.id || Date.now());

  // Use player color for border and background
  const messageColor = isSent ? "#4caf50" : playerColor;
  const backgroundColor = isSent
    ? "rgba(76, 175, 80, 0.1)"
    : `${playerColor}1a`; // Add alpha to player color

  msgDiv.style.cssText = `
        margin-bottom: 10px;
        padding: 10px;
        border-radius: 6px;
        background: ${backgroundColor};
        border-left: 3px solid ${messageColor};
    `;

  msgDiv.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 5px;">
            <div style="font-weight: bold; color: ${messageColor}; font-size: 0.9em;">
                ${isFromGM ? "👑 " : ""}${
                  msg.fromName || "Player"
                } ${recipientText}
            </div>
            <div style="font-size: 0.75em; color: #888;">${time}</div>
        </div>
        <div style="color: #e0e0e0; font-size: 0.9em; line-height: 1.4;">
            ${highlightSwearWords(msg.message)}
        </div>
        ${
          isSent
            ? `<div class="message-status ${msg.read ? "read" : "delivered"}" style="text-align: right; margin-top: 4px;">
                ${msg.read ? "✓✓ Read" : "✓ Delivered"}
              </div>`
            : ""
        }
    `;

  container.appendChild(msgDiv);

  // Auto-scroll to bottom
  container.scrollTop = container.scrollHeight;

  // Show notification badge if message is from player and chat panel is closed
  if (!isSent && msg.from !== "gm") {
    const panel = document.getElementById("chatPanel");
    const badge = document.getElementById("chatNotificationBadge");

    if (panel && badge && panel.style.display === "none") {
      badge.style.display = "inline-block";
      badge.textContent = "!";

      // Add pulse animation
      badge.style.animation = "pulse 1.5s infinite";
    }
  }
}

/**
 * Toggle chat panel visibility
 */
function toggleChatPanel() {
  const panel = document.getElementById("chatPanel");
  const badge = document.getElementById("chatNotificationBadge");

  if (!panel) return;

  if (panel.style.display === "none" || panel.style.display === "") {
    panel.style.display = "flex";
    // Clear badge when opening
    if (badge) badge.style.display = "none";
  } else {
    panel.style.display = "none";
  }
}

/**
 * Send test message to all players
 */
function sendTestMessage() {
  if (!multiplayerManager) {
    alert("Not connected to multiplayer session");
    return;
  }

  multiplayerManager.sendChatMessage(
    "all",
    "📢 This is a test message from the GM!",
  );
  alert("Test message sent to all players");
}

/**
 * Handle GM typing in chat input
 */
let gmTypingTimeout;
function handleGMChatTyping() {
  if (!multiplayerManager) return;

  // Set typing status
  multiplayerManager.setTypingStatus(true);

  // Clear previous timeout
  clearTimeout(gmTypingTimeout);

  // Auto-clear typing status after 2 seconds of no typing
  gmTypingTimeout = setTimeout(() => {
    multiplayerManager.setTypingStatus(false);
  }, 2000);
}

/**
 * Toggle battle map visibility for players
 */
function toggleBattleMapVisibility() {
  const checkbox = document.getElementById("battleMapVisibleToggle");
  const statusDiv = document.getElementById("battleMapSyncStatus");
  const visible = checkbox.checked;

  // Update status text
  if (visible) {
    statusDiv.innerHTML =
      '<span style="color: #4caf50;">✅ Battle map is visible to players</span>';
  } else {
    statusDiv.innerHTML = "Battle map is hidden from players";
  }

  // Set visibility in Firebase
  multiplayerManager.setBattleMapVisibility(visible);

  // Sync current battle map state if enabling
  if (visible && typeof saveBattleMapState === "function") {
    syncBattleMapToMultiplayer();
  }
}

/**
 * Sync battle map state to multiplayer
 */
function syncBattleMapToMultiplayer() {
  if (!isMultiplayerActive || !multiplayerManager) return;

  // Get current battle map state
  if (typeof battleMap === "undefined") return;

  // Get active layer
  const activeLayer =
    battleMap.layers.find((l) => l.id === battleMap.activeLayerId) ||
    battleMap.layers[0];
  if (!activeLayer) return;

  // Prepare map configuration
  const config = {
    width: activeLayer.width,
    height: activeLayer.height,
    gridSize: battleMap.gridSize,
    zoom: battleMap.zoom,
    showNames: battleMap.showNames,
    showLineOfSight: battleMap.showLineOfSight,
    viewMode: battleMap.viewMode,
  };

  // Get combatants data with positions
  const combatantsData = {};
  if (typeof combatants !== "undefined") {
    combatants.forEach((c) => {
      const pos = activeLayer.combatantPositions[c.id];
      if (pos) {
        const combatantData = {
          id: c.id,
          name: c.displayName || c.name,
          type: c.type?.toLowerCase() || "enemy",
          x: pos.x,
          y: pos.y,
          facing: activeLayer.combatantFacing[c.id] || 0,
          size: battleMap.combatantSizes
            ? battleMap.combatantSizes[c.id] || 1
            : 1,
          elevation: battleMap.combatantElevations
            ? battleMap.combatantElevations[c.id] || 0
            : 0,
        };

        // Only include health if it's defined
        if (c.health !== undefined && c.health !== null) {
          combatantData.health = c.health;
        }
        if (c.maxHealth !== undefined && c.maxHealth !== null) {
          combatantData.maxHealth = c.maxHealth;
        }

        combatantsData[c.id] = combatantData;
      }
    });
  }

  // Get terrain from active layer (convert to player-friendly format)
  const terrain = [];
  if (activeLayer.terrain) {
    activeLayer.terrain.forEach((t) => {
      terrain.push({
        x: t.x,
        y: t.y,
        width: 1,
        height: 1,
        type: t.type,
        color: t.color,
      });
    });
  }

  // Get edge walls from active layer
  const edgeWalls = [];
  if (activeLayer.edgeWalls) {
    activeLayer.edgeWalls.forEach((w) => {
      edgeWalls.push({
        x: w.x,
        y: w.y,
        edge: w.edge,
        type: w.type,
        color: w.color,
      });
    });
  }
  console.log(`🧱 Syncing ${edgeWalls.length} edge walls to multiplayer`);

  // Migrate sourceToken to customTokens for all combatants (unless already set)
  combatants.forEach((combatant) => {
    // Skip if already has a custom token set
    if (battleMap.customTokens[combatant.id]) return;

    // Check if combatant has a sourceToken - migrate it
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
      console.log(
        `🎭 Auto-migrated sourceToken for ${combatant.name || combatant.displayName}`,
      );
    }
  });

  // Get custom tokens (now includes migrated sourceTokens)
  const customTokens = battleMap.customTokens || {};
  console.log("🎭 Custom tokens being sent:", customTokens);
  console.log("🎭 Custom tokens count:", Object.keys(customTokens).length);

  // Get AoE templates
  const aoeTemplates = battleMap.aoeTemplates || [];

  // Get lights from active layer
  const lights = activeLayer.lights || [];

  // Get fog of war data
  let fogOfWar = { enabled: false };
  if (battleMap.fogOfWar && battleMap.fogOfWar.enabled) {
    const visibleCells = getVisibleCells(activeLayer);
    fogOfWar = {
      enabled: true,
      mode: battleMap.fogOfWar.mode,
      visionDistance: battleMap.fogOfWar.visionDistance,
      visibleCells: visibleCells || {},
      lightTransparency: battleMap.fogOfWar.lightTransparency,
    };
  }

  // Get visibility status from checkbox
  const visibilityCheckbox = document.getElementById("battleMapVisibleToggle");
  const isVisible = visibilityCheckbox ? visibilityCheckbox.checked : false;

  // Push to Firebase
  multiplayerManager.updateBattleMap({
    config: config,
    combatants: combatantsData,
    terrain: terrain,
    edgeWalls: edgeWalls,
    customTokens: customTokens,
    aoeTemplates: aoeTemplates,
    lights: lights,
    fogOfWar: fogOfWar,
    backgroundImage: activeLayer.backgroundImage || null,
    showLineOfSight: battleMap.showLineOfSight,
    showNames: battleMap.showNames,
    visible: isVisible,
  });
}

/**
 * Close the multiplayer room
 */
async function closeMultiplayerRoom() {
  if (
    !confirm(
      "Are you sure you want to end this multiplayer session?\n\nAll players will be disconnected.",
    )
  ) {
    return;
  }

  try {
    await multiplayerManager.closeRoom();

    // Reset UI
    document.getElementById("multiplayerNotConnected").style.display = "block";
    document.getElementById("multiplayerConnected").style.display = "none";
    document.getElementById("roomCodeLarge").textContent = "------";

    isMultiplayerActive = false;

    alert("✅ Multiplayer session ended.");

    toggleMultiplayerPanel();
  } catch (error) {
    console.error("Error closing room:", error);
    alert("❌ Error closing session: " + error.message);
  }
}

/**
 * Sync combat state to multiplayer
 */
function syncCombatToMultiplayer() {
  if (!isMultiplayerActive) return;

  // This will be called when combat state changes
  // TODO: Integrate with existing combat system
}

/**
 * Handle battle map pings from Firebase
 */
function handleBattleMapPings(pingsData) {
  if (typeof battleMap === "undefined") return;

  // If pingsData is null or empty, clear all pings
  if (!pingsData || Object.keys(pingsData).length === 0) {
    battleMap.activePings = [];
    if (typeof renderBattleMap === "function") {
      renderBattleMap();
    }
    return;
  }

  // Create a map of existing pings by ID for quick lookup
  const existingPingsMap = new Map();
  if (battleMap.activePings) {
    battleMap.activePings.forEach((ping) => {
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
  battleMap.activePings = newPings;

  // Re-render battle map to show pings
  if (typeof renderBattleMap === "function") {
    renderBattleMap();
  }
}

/**
 * View a player's character sheet
 */
async function viewPlayerCharacter(playerId) {
  try {
    // Fetch all player characters
    const characters = await multiplayerManager.getAllPlayerCharacters();

    if (!characters[playerId]) {
      alert("⚠️ Character data not found for this player.");
      return;
    }

    const playerData = characters[playerId];
    const character = playerData.character;

    // Build and show modal
    showCharacterModal(playerData.playerName, character);
  } catch (error) {
    console.error("Error viewing character:", error);
    alert("❌ Error loading character: " + error.message);
  }
}

/**
 * Show character sheet in modal
 */
function showCharacterModal(playerName, character) {
  // Create modal if it doesn't exist
  let modal = document.getElementById("characterViewModal");
  if (!modal) {
    modal = createCharacterModal();
    document.body.appendChild(modal);
  }

  // Populate modal content
  const content = document.getElementById("characterModalContent");
  content.innerHTML = generateCharacterHTML(playerName, character);

  // Show modal
  modal.style.display = "flex";
}

/**
 * Create character viewing modal
 */
function createCharacterModal() {
  const modal = document.createElement("div");
  modal.id = "characterViewModal";
  modal.style.cssText = `
        display: none;
        position: fixed;
        z-index: 10000;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.8);
        align-items: center;
        justify-content: center;
    `;

  modal.innerHTML = `
        <div style="
            background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
            border: 2px solid #d4a574;
            border-radius: 8px;
            max-width: 900px;
            max-height: 90vh;
            width: 90%;
            overflow-y: auto;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        ">
            <div style="
                position: sticky;
                top: 0;
                background: #1a1a1a;
                border-bottom: 2px solid #d4a574;
                padding: 15px 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                z-index: 1;
            ">
                <h2 style="margin: 0; color: #d4a574;">Character Sheet (Read-Only)</h2>
                <button onclick="closeCharacterModal()" style="
                    background: #d4a574;
                    color: #1a1a1a;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-weight: bold;
                ">Close ✕</button>
            </div>
            <div id="characterModalContent" style="padding: 20px;">
                <!-- Character data will be inserted here -->
            </div>
        </div>
    `;

  return modal;
}

/**
 * Close character modal
 */
function closeCharacterModal() {
  const modal = document.getElementById("characterViewModal");
  if (modal) {
    modal.style.display = "none";
  }
}

/**
 * Generate character HTML for modal
 */
function generateCharacterHTML(playerName, char) {
  const pools = char.pools || { might: {}, speed: {}, intellect: {} };
  const skills = char.skills || {};
  const equipment = char.equipment || {};
  const cyphers = char.cyphers || [];

  return `
        <div style="color: #e0e0e0;">
            <div style="background: rgba(212, 165, 116, 0.1); border-left: 4px solid #d4a574; padding: 15px; margin-bottom: 20px;">
                <div style="font-size: 0.9em; color: #d4a574; margin-bottom: 5px;">Player: ${playerName}</div>
                <div style="font-size: 1.4em; font-weight: bold; margin-bottom: 10px;">${
                  char.name || "Unnamed Character"
                }</div>
                <div style="font-size: 1.1em; color: #aaa;">
                    ${char.adjective || ""} ${char.noun || ""} who ${
                      char.verb || ""
                    }
                </div>
                <div style="margin-top: 10px; font-size: 0.9em; color: #888;">
                    <strong>Archetype:</strong> ${char.archetype || "None"} | 
                    <strong>Tier:</strong> ${char.tier || 1} | 
                    <strong>Effort:</strong> ${char.effort || 1} | 
                    <strong>XP:</strong> ${char.xp || 0}
                </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px;">
                ${generatePoolHTML("Might", pools.might || {})}
                ${generatePoolHTML("Speed", pools.speed || {})}
                ${generatePoolHTML("Intellect", pools.intellect || {})}
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                <div>
                    <h3 style="color: #d4a574; border-bottom: 1px solid #555; padding-bottom: 5px;">Skills</h3>
                    ${generateSkillsHTML(skills)}
                </div>
                <div>
                    <h3 style="color: #d4a574; border-bottom: 1px solid #555; padding-bottom: 5px;">Equipment</h3>
                    ${generateEquipmentHTML(equipment)}
                </div>
            </div>

            ${
              cyphers.length > 0
                ? `
                <div style="margin-bottom: 20px;">
                    <h3 style="color: #d4a574; border-bottom: 1px solid #555; padding-bottom: 5px;">Cyphers</h3>
                    ${generateCyphersHTML(cyphers)}
                </div>
            `
                : ""
            }

            ${
              char.abilities && char.abilities.length > 0
                ? `
                <div style="margin-bottom: 20px;">
                    <h3 style="color: #d4a574; border-bottom: 1px solid #555; padding-bottom: 5px;">Abilities</h3>
                    ${generateAbilitiesHTML(char.abilities)}
                </div>
            `
                : ""
            }

            ${
              char.notes
                ? `
                <div>
                    <h3 style="color: #d4a574; border-bottom: 1px solid #555; padding-bottom: 5px;">Notes</h3>
                    <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 4px; white-space: pre-wrap;">${char.notes}</div>
                </div>
            `
                : ""
            }
        </div>
    `;
}

/**
 * Generate pool HTML
 */
function generatePoolHTML(name, pool) {
  const current = pool.current || 0;
  const max = pool.max || 0;
  const edge = pool.edge || 0;

  return `
        <div style="background: rgba(0,0,0,0.3); border: 1px solid #555; border-radius: 4px; padding: 15px; text-align: center;">
            <div style="font-weight: bold; color: #d4a574; margin-bottom: 10px;">${name}</div>
            <div style="font-size: 1.8em; margin-bottom: 5px;">${current} / ${max}</div>
            <div style="font-size: 0.9em; color: #888;">Edge: ${edge}</div>
        </div>
    `;
}

/**
 * Generate skills HTML
 */
function generateSkillsHTML(skills) {
  const skillEntries = Object.entries(skills).filter(([_, level]) => level > 0);

  if (skillEntries.length === 0) {
    return '<div style="color: #666; font-style: italic;">No trained skills</div>';
  }

  return skillEntries
    .map(([skill, level]) => {
      const levelText =
        level === 1
          ? "Trained"
          : level === 2
            ? "Specialized"
            : `Level ${level}`;
      return `
            <div style="padding: 8px; margin: 5px 0; background: rgba(0,0,0,0.2); border-radius: 4px; display: flex; justify-content: space-between;">
                <span>${skill}</span>
                <span style="color: #d4a574;">${levelText}</span>
            </div>
        `;
    })
    .join("");
}

/**
 * Generate equipment HTML
 */
function generateEquipmentHTML(equipment) {
  const items = [];

  if (equipment.weapons) items.push(...equipment.weapons);
  if (equipment.armor) items.push(...equipment.armor);
  if (equipment.gear) items.push(...equipment.gear);

  if (items.length === 0) {
    return '<div style="color: #666; font-style: italic;">No equipment</div>';
  }

  return items
    .map(
      (item) => `
        <div style="padding: 8px; margin: 5px 0; background: rgba(0,0,0,0.2); border-radius: 4px;">
            ${typeof item === "string" ? item : item.name || "Unknown Item"}
        </div>
    `,
    )
    .join("");
}

/**
 * Generate cyphers HTML
 */
function generateCyphersHTML(cyphers) {
  return cyphers
    .map(
      (cypher) => `
        <div style="padding: 10px; margin: 5px 0; background: rgba(0,0,0,0.2); border: 1px solid #444; border-radius: 4px;">
            <div style="font-weight: bold; color: #d4a574;">${
              cypher.name || "Unknown Cypher"
            }</div>
            ${
              cypher.level
                ? `<div style="font-size: 0.85em; color: #888; margin-top: 3px;">Level: ${cypher.level}</div>`
                : ""
            }
            ${
              cypher.effect
                ? `<div style="margin-top: 5px; font-size: 0.9em;">${cypher.effect}</div>`
                : ""
            }
        </div>
    `,
    )
    .join("");
}

/**
 * Generate abilities HTML
 */
function generateAbilitiesHTML(abilities) {
  return abilities
    .map(
      (ability) => `
        <div style="padding: 10px; margin: 5px 0; background: rgba(0,0,0,0.2); border: 1px solid #444; border-radius: 4px;">
            <div style="font-weight: bold; color: #d4a574;">${
              ability.name || "Unknown Ability"
            }</div>
            ${
              ability.cost
                ? `<div style="font-size: 0.85em; color: #888; margin-top: 3px;">Cost: ${ability.cost}</div>`
                : ""
            }
            ${
              ability.description
                ? `<div style="margin-top: 5px; font-size: 0.9em;">${ability.description}</div>`
                : ""
            }
        </div>
    `,
    )
    .join("");
}

/**
 * Handle page unload - clean up multiplayer
 */
window.addEventListener("beforeunload", () => {
  if (isMultiplayerActive && multiplayerManager) {
    multiplayerManager.leaveRoom();
  }
});

/**
 * Display dice roll notification in floating feed
 */
function displayDiceRollNotification(rollData) {
  const feed = document.getElementById("diceRollFeed");
  if (!feed) return;

  // Show feed if hidden
  if (feed.style.display === "none") {
    feed.style.display = "block";
  }

  // Create notification element
  const notification = document.createElement("div");
  notification.className = "dice-roll-notification";

  // Determine roll type display
  let rollTypeIcon = "🎲";
  let rollTypeText =
    rollData.type.charAt(0).toUpperCase() + rollData.type.slice(1);

  if (rollData.type === "action") {
    rollTypeIcon = "🎯";
  } else if (rollData.type === "attack") {
    rollTypeIcon = "⚔️";
  } else if (rollData.type === "defend") {
    rollTypeIcon = "🛡️";
  } else if (rollData.type === "d20") {
    rollTypeText = "Quick d20";
  } else if (rollData.type === "d6") {
    rollTypeText = "Quick d6";
  }

  // Determine success/fail styling
  let resultColor = "#888";
  let resultText = "";
  let bgColor = "rgba(26, 26, 26, 0.95)";
  let borderColor = "#444";

  if (rollData.success !== null) {
    if (rollData.success) {
      resultColor = "#4caf50";
      resultText = "✓ Success";
      bgColor = "rgba(76, 175, 80, 0.15)";
      borderColor = "#4caf50";
    } else {
      resultColor = "#f44336";
      resultText = "✗ Failed";
      bgColor = "rgba(244, 67, 54, 0.15)";
      borderColor = "#f44336";
    }
  }

  // Build notification HTML
  notification.style.cssText = `
        background: ${bgColor};
        border: 2px solid ${borderColor};
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 10px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
        animation: slideInLeft 0.3s ease-out;
    `;

  // Build the main roll display
  let rollDisplay = "";
  if (rollData.targetNumber) {
    // For rolls with target numbers (action/attack/defend)
    rollDisplay = `
      <div style="display: flex; align-items: center; justify-content: center; margin-top: 8px; flex-direction: column; gap: 10px;">
        <div style="display: flex; align-items: center; gap: 15px;">
          <div style="text-align: center;">
            <div style="color: #888; font-size: 0.75em; text-transform: uppercase;">Roll</div>
            <div style="font-size: 2em; font-weight: bold; color: #fff;">
              ${rollData.roll}
            </div>
          </div>
          <div style="font-size: 1.5em; color: #666;">vs</div>
          <div style="text-align: center;">
            <div style="color: #888; font-size: 0.75em; text-transform: uppercase;">Target</div>
            <div style="font-size: 2em; font-weight: bold; color: #ff9800;">
              ${rollData.targetNumber}
            </div>
          </div>
        </div>
        ${resultText ? `<div style="color: ${resultColor}; font-weight: bold; font-size: 1.1em; padding: 8px 12px; background: rgba(0,0,0,0.3); border-radius: 4px;">${resultText}</div>` : ""}
      </div>
    `;
  } else {
    // For simple rolls (d20/d6 quick rolls)
    rollDisplay = `
      <div style="display: flex; align-items: center; justify-content: center; margin-top: 8px;">
        <div style="font-size: 2em; font-weight: bold; color: #fff; text-align: center;">
          ${rollData.roll}
        </div>
      </div>
    `;
  }

  notification.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
            <div style="text-align: center; flex: 1;">
                <div style="font-weight: bold; color: #ff9800; font-size: 0.95em;">
                    ${rollTypeIcon} ${rollData.playerName}
                </div>
                <div style="color: #888; font-size: 0.8em; margin-top: 2px;">
                    ${rollData.characterName}
                </div>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" style="background: transparent; border: none; color: #666; font-size: 1.2em; cursor: pointer; padding: 0; line-height: 1;">&times;</button>
        </div>
        <div style="color: #e0e0e0; font-size: 0.85em; font-weight: 500; margin-bottom: 5px; text-align: center;">
          ${rollTypeText}
        </div>
        ${rollDisplay}
    `;

  // Add to feed (prepend so newest is on top)
  feed.insertBefore(notification, feed.firstChild);

  // Auto-remove after 15 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.style.animation = "fadeOut 0.3s ease-out";
      setTimeout(() => notification.remove(), 300);
    }
  }, 15000);

  // Limit to 10 notifications
  while (feed.children.length > 10) {
    feed.lastChild.remove();
  }
}

// Add animation styles for notifications
if (!document.getElementById("diceRollAnimations")) {
  const style = document.createElement("style");
  style.id = "diceRollAnimations";
  style.textContent = `
        @keyframes slideInLeft {
            from {
                transform: translateX(-100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes fadeOut {
            from {
                opacity: 1;
            }
            to {
                opacity: 0;
            }
        }
        
        .dice-roll-notification:hover {
            transform: scale(1.02);
            transition: transform 0.2s ease;
        }
    `;
  document.head.appendChild(style);
}

// ==================== AVATAR UNLOCK SYSTEM ==================== //

// Store the player ID for the unlock confirmation
let pendingAvatarUnlockPlayerId = null;
let pendingAvatarUnlockPlayerName = null;

/**
 * Show the Avatar unlock confirmation modal
 */
function showAvatarUnlockModal(playerId, playerName) {
  pendingAvatarUnlockPlayerId = playerId;
  pendingAvatarUnlockPlayerName = playerName;

  const modal = document.getElementById("avatarUnlockModal");
  const playerNameDisplay = document.getElementById("avatarUnlockPlayerName");

  if (modal && playerNameDisplay) {
    playerNameDisplay.textContent = `Unlock Avatar Tab for ${playerName}?`;
    modal.style.display = "flex";
  }
}

/**
 * Close the Avatar unlock modal
 */
function closeAvatarUnlockModal() {
  const modal = document.getElementById("avatarUnlockModal");
  if (modal) {
    modal.style.display = "none";
  }
  pendingAvatarUnlockPlayerId = null;
  pendingAvatarUnlockPlayerName = null;
}

/**
 * Confirm and execute the Avatar unlock
 */
function confirmAvatarUnlock() {
  if (!pendingAvatarUnlockPlayerId || !multiplayerManager.roomCode) {
    alert("Error: Unable to unlock Avatar. Please try again.");
    closeAvatarUnlockModal();
    return;
  }

  const playerRef = firebase
    .database()
    .ref(
      `rooms/${multiplayerManager.roomCode}/players/${pendingAvatarUnlockPlayerId}/character/avatar`,
    );

  // Set the GM manual unlock flag
  playerRef
    .update({
      gmUnlocked: true,
      hasUnlockedTab: true,
    })
    .then(() => {
      alert(
        `Avatar tab has been unlocked for ${pendingAvatarUnlockPlayerName}. They can now access the Avatar tab without a password.`,
      );
      closeAvatarUnlockModal();

      // Send a notification to all (player will filter on their end)
      multiplayerManager.sendChatMessage(
        "all",
        `[AVATAR_UNLOCK:${pendingAvatarUnlockPlayerId}] The Avatar tab has been unlocked. You stand at the precipice of transformation. Beware. Once you cross this threshold, there is no turning back.`,
      );
    })
    .catch((error) => {
      console.error("Error unlocking Avatar:", error);
      alert("Failed to unlock Avatar tab. Please try again.");
      closeAvatarUnlockModal();
    });
}

/**
 * Set up listeners for player character changes (damage/stress)
 * Updates GM's party members and combat tracker in real-time
 */
function setupPlayerCharacterListeners(roomCode) {
  if (!roomCode || typeof firebase === "undefined") return;

  console.log("🎧 Setting up player character listeners for GM");

  // Helper function to update GM's view of a player's character
  function updatePlayerCharacter(playerId, characterName, damageTrack, stress) {
    if (typeof partyMembers === "undefined") return;

    const member = partyMembers.find((m) => m.name === characterName);
    if (!member) return;

    let updated = false;

    // Update damage track
    if (damageTrack !== undefined && member.damage !== damageTrack) {
      member.damage = damageTrack;
      console.log(`  ✓ Updated ${characterName}'s damage to: ${damageTrack}`);
      updated = true;
    }

    // Update stress
    if (stress !== undefined && member.stress !== stress) {
      member.stress = stress;
      console.log(`  ✓ Updated ${characterName}'s stress to: ${stress}`);
      updated = true;
    }

    if (updated) {
      // Save to localStorage
      if (typeof savePartyData === "function") {
        savePartyData();
      }

      // Update combat tracker if PC is in combat
      if (typeof combatants !== "undefined") {
        const combatant = combatants.find(
          (c) => c.type === "PC" && c.name === characterName,
        );
        if (combatant) {
          // Always update, don't check if values are truthy
          if (damageTrack !== undefined) {
            combatant.damage = member.damage;
            console.log(
              `  ✓ Updated combatant ${characterName}'s damage to: ${member.damage}`,
            );
          }
          if (stress !== undefined) {
            combatant.stress = member.stress;
            console.log(
              `  ✓ Updated combatant ${characterName}'s stress to: ${member.stress}`,
            );
          }

          // Re-render combat tracker
          if (typeof renderCombatTracker === "function") {
            renderCombatTracker();
          }

          // Save battle map state to persist combatant data
          if (typeof saveBattleMapState === "function") {
            saveBattleMapState();
          }

          // Re-render battle map to show updated damage/stress
          if (typeof renderBattleMap === "function") {
            renderBattleMap();
          }
        }
      }

      // Update battle map party list
      if (typeof renderPartyList === "function") {
        renderPartyList();
      }
    }
  }

  // Listen to each player individually for character property changes
  firebase
    .database()
    .ref(`rooms/${roomCode}/players`)
    .once("value", (snapshot) => {
      snapshot.forEach((playerSnapshot) => {
        const playerId = playerSnapshot.key;
        const playerData = playerSnapshot.val();

        if (!playerData) return;

        const characterName = playerData.character?.name || playerData.name;

        // Listen for damage track changes
        let isFirstDamageUpdate = true;
        firebase
          .database()
          .ref(`rooms/${roomCode}/players/${playerId}/character/damageTrack`)
          .on("value", (damageSnapshot) => {
            const newDamage = damageSnapshot.val();

            // Skip the initial fire when listener is first attached
            if (isFirstDamageUpdate) {
              isFirstDamageUpdate = false;
              console.log(
                `🔧 Initial damage state for ${characterName}: ${newDamage}`,
              );
              return;
            }

            // Update on all subsequent changes (including null/undefined)
            console.log(
              `📊 ${characterName} damage track changed to: ${newDamage}`,
            );
            updatePlayerCharacter(
              playerId,
              characterName,
              newDamage,
              undefined,
            );
          });

        // Listen for stress changes
        let isFirstStressUpdate = true;
        firebase
          .database()
          .ref(`rooms/${roomCode}/players/${playerId}/character/stress`)
          .on("value", (stressSnapshot) => {
            const newStress = stressSnapshot.val();

            // Skip the initial fire when listener is first attached
            if (isFirstStressUpdate) {
              isFirstStressUpdate = false;
              console.log(
                `🔧 Initial stress for ${characterName}: ${newStress}`,
              );
              return;
            }

            // Update on all subsequent changes
            console.log(`📊 ${characterName} stress changed to: ${newStress}`);
            updatePlayerCharacter(
              playerId,
              characterName,
              undefined,
              newStress,
            );
          });
      });
    });

  console.log("✅ Player character listeners active");
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  initializeMultiplayer();
});
