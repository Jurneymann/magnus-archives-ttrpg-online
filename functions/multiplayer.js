/**
 * Multiplayer Room Management System
 * Handles room creation, player connections, and real-time synchronization
 */

class MultiplayerManager {
  constructor() {
    this.db = firebase.database();
    this.roomCode = null;
    this.isGM = false;
    this.playerId = null;
    this.playerName = null;
    this.listeners = {};
  }

  /**
   * Generate a random 6-character room code
   */
  generateRoomCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Excluding confusing chars
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Create a new game room (GM only)
   */
  async createRoom(gmName = "Game Master") {
    try {
      // Generate unique room code
      let roomCode = this.generateRoomCode();
      let exists = true;

      // Ensure unique code
      while (exists) {
        const snapshot = await this.db.ref("rooms/" + roomCode).once("value");
        if (!snapshot.exists()) {
          exists = false;
        } else {
          roomCode = this.generateRoomCode();
        }
      }

      this.roomCode = roomCode;
      this.isGM = true;
      this.playerId = "gm_" + Date.now();

      // Create room structure
      const roomData = {
        code: roomCode,
        gmId: this.playerId,
        gmName: gmName,
        status: "active",
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        players: {},
        combat: {
          active: false,
          round: 0,
          currentTurn: null,
          combatants: {},
        },
        sharedData: {
          stressAssignments: {},
          damageAssignments: {},
        },
      };

      await this.db.ref("rooms/" + roomCode).set(roomData);

      // Set up presence detection
      this.setupPresence();

      console.log("✅ Room created:", roomCode);
      return roomCode;
    } catch (error) {
      console.error("❌ Error creating room:", error);
      throw error;
    }
  }

  /**
   * Join an existing room (Player)
   */
  async joinRoom(roomCode, playerName, characterData = null) {
    try {
      this.roomCode = roomCode.toUpperCase();
      this.playerName = playerName;
      this.playerId = "player_" + Date.now();
      this.isGM = false;

      // Check if room exists
      const roomRef = this.db.ref("rooms/" + this.roomCode);
      const snapshot = await roomRef.once("value");

      if (!snapshot.exists()) {
        throw new Error("Room not found");
      }

      const roomData = snapshot.val();
      if (roomData.status === "closed") {
        throw new Error("Room is closed");
      }

      // Add player to room
      const playerData = {
        id: this.playerId,
        name: playerName,
        joinedAt: firebase.database.ServerValue.TIMESTAMP,
        connected: true,
        character: characterData || null,
      };

      await this.db
        .ref("rooms/" + this.roomCode + "/players/" + this.playerId)
        .set(playerData);

      // Set up presence detection
      this.setupPresence();

      console.log("✅ Joined room:", this.roomCode);
      return true;
    } catch (error) {
      console.error("❌ Error joining room:", error);
      throw error;
    }
  }

  /**
   * Set up presence detection (disconnect handling)
   */
  setupPresence() {
    if (!this.roomCode || !this.playerId) return;

    const presenceRef = this.db.ref(
      "rooms/" + this.roomCode + "/players/" + this.playerId + "/connected",
    );
    const connectedRef = this.db.ref(".info/connected");

    connectedRef.on("value", (snapshot) => {
      if (snapshot.val() === true) {
        // When connected, set presence to true
        presenceRef.set(true);

        // When disconnected, set to false
        presenceRef.onDisconnect().set(false);
      }
    });
  }

  /**
   * Listen for players joining/leaving (GM)
   */
  onPlayersChange(callback) {
    if (!this.roomCode) return;

    const playersRef = this.db.ref("rooms/" + this.roomCode + "/players");

    playersRef.on("value", (snapshot) => {
      const players = snapshot.val() || {};
      callback(players);
    });

    this.listeners.players = playersRef;
  }

  /**
   * Update player's character data
   */
  async updatePlayerCharacter(characterData) {
    if (!this.roomCode || !this.playerId) return;

    try {
      await this.db
        .ref(
          "rooms/" + this.roomCode + "/players/" + this.playerId + "/character",
        )
        .set(characterData);
      console.log("✅ Character data synced");
    } catch (error) {
      console.error("❌ Error updating character:", error);
    }
  }

  /**
   * Assign stress to a player (GM only)
   */
  async assignStress(playerId, amount, reason = "") {
    if (!this.isGM) return;

    try {
      const stressData = {
        amount: amount,
        reason: reason,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
      };

      await this.db
        .ref(
          "rooms/" +
            this.roomCode +
            "/sharedData/stressAssignments/" +
            playerId,
        )
        .push(stressData);
      console.log("✅ Stress assigned to player");
    } catch (error) {
      console.error("❌ Error assigning stress:", error);
    }
  }

  /**
   * Assign damage to a player (GM only)
   */
  async assignDamage(playerId, amount, type = "physical", reason = "") {
    if (!this.isGM) return;

    try {
      const damageData = {
        amount: amount,
        type: type,
        reason: reason,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
      };

      await this.db
        .ref(
          "rooms/" +
            this.roomCode +
            "/sharedData/damageAssignments/" +
            playerId,
        )
        .push(damageData);
      console.log("✅ Damage assigned to player");
    } catch (error) {
      console.error("❌ Error assigning damage:", error);
    }
  }

  /**
   * Listen for stress assignments (Player)
   */
  onStressAssigned(callback) {
    if (!this.roomCode || !this.playerId) return;

    const stressRef = this.db.ref(
      "rooms/" +
        this.roomCode +
        "/sharedData/stressAssignments/" +
        this.playerId,
    );

    stressRef.on("child_added", (snapshot) => {
      const stressData = snapshot.val();
      callback(stressData);

      // Remove after processing
      snapshot.ref.remove();
    });

    this.listeners.stress = stressRef;
  }

  /**
   * Listen for damage assignments (Player)
   */
  onDamageAssigned(callback) {
    if (!this.roomCode || !this.playerId) return;

    const damageRef = this.db.ref(
      "rooms/" +
        this.roomCode +
        "/sharedData/damageAssignments/" +
        this.playerId,
    );

    damageRef.on("child_added", (snapshot) => {
      const damageData = snapshot.val();
      callback(damageData);

      // Remove after processing
      snapshot.ref.remove();
    });

    this.listeners.damage = damageRef;
  }

  /**
   * Start combat (GM only)
   */
  async startCombat(combatants) {
    if (!this.isGM) return;

    try {
      const combatData = {
        active: true,
        round: 1,
        currentTurn: 0,
        combatants: combatants,
        startedAt: firebase.database.ServerValue.TIMESTAMP,
      };

      await this.db.ref("rooms/" + this.roomCode + "/combat").set(combatData);
      console.log("✅ Combat started");
    } catch (error) {
      console.error("❌ Error starting combat:", error);
    }
  }

  /**
   * Update combat state (GM only)
   */
  async updateCombat(combatData) {
    if (!this.isGM) return;

    try {
      await this.db
        .ref("rooms/" + this.roomCode + "/combat")
        .update(combatData);
    } catch (error) {
      console.error("❌ Error updating combat:", error);
    }
  }

  /**
   * Listen for combat changes
   */
  onCombatChange(callback) {
    if (!this.roomCode) return;

    const combatRef = this.db.ref("rooms/" + this.roomCode + "/combat");

    combatRef.on("value", (snapshot) => {
      const combat = snapshot.val();
      callback(combat);
    });

    this.listeners.combat = combatRef;
  }

  /**
   * End combat (GM only)
   */
  async endCombat() {
    if (!this.isGM) return;

    try {
      await this.db.ref("rooms/" + this.roomCode + "/combat").update({
        active: false,
        endedAt: firebase.database.ServerValue.TIMESTAMP,
      });
      console.log("✅ Combat ended");
    } catch (error) {
      console.error("❌ Error ending combat:", error);
    }
  }

  /**
   * Close room (GM only)
   */
  async closeRoom() {
    if (!this.isGM) return;

    try {
      await this.db.ref("rooms/" + this.roomCode).update({
        status: "closed",
        closedAt: firebase.database.ServerValue.TIMESTAMP,
      });

      // Clean up listeners
      this.removeAllListeners();

      console.log("✅ Room closed");
    } catch (error) {
      console.error("❌ Error closing room:", error);
    }
  }

  /**
   * Leave room
   */
  async leaveRoom() {
    try {
      if (this.roomCode && this.playerId) {
        // Mark as disconnected
        await this.db
          .ref(
            "rooms/" +
              this.roomCode +
              "/players/" +
              this.playerId +
              "/connected",
          )
          .set(false);
      }

      // Clean up listeners
      this.removeAllListeners();

      console.log("✅ Left room");
    } catch (error) {
      console.error("❌ Error leaving room:", error);
    }
  }

  /**
   * Remove all listeners
   */
  removeAllListeners() {
    Object.values(this.listeners).forEach((ref) => {
      if (ref && ref.off) {
        ref.off();
      }
    });
    this.listeners = {};
  }

  /**
   * Send a message to all players (GM only)
   */
  async broadcastMessage(message, type = "info") {
    if (!this.isGM) return;

    try {
      const messageData = {
        type: type,
        content: message,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        from: "GM",
      };

      await this.db
        .ref("rooms/" + this.roomCode + "/messages")
        .push(messageData);
    } catch (error) {
      console.error("❌ Error broadcasting message:", error);
    }
  }

  /**
   * Listen for messages
   */
  onMessageReceived(callback) {
    if (!this.roomCode) return;

    const messagesRef = this.db.ref("rooms/" + this.roomCode + "/messages");

    messagesRef.on("child_added", (snapshot) => {
      const message = snapshot.val();
      callback(message);
    });

    this.listeners.messages = messagesRef;
  }

  /**
   * Assign XP to a player (GM only)
   */
  async assignXP(playerId, amount, reason = "") {
    if (!this.isGM) return;

    try {
      const xpData = {
        amount: amount,
        reason: reason,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
      };

      await this.db
        .ref("rooms/" + this.roomCode + "/sharedData/xpAssignments/" + playerId)
        .push(xpData);
      console.log("✅ XP assigned to player");
    } catch (error) {
      console.error("❌ Error assigning XP:", error);
    }
  }

  /**
   * Listen for XP assignments (Player)
   */
  onXPAssigned(callback) {
    if (!this.roomCode || !this.playerId) return;

    const xpRef = this.db.ref(
      "rooms/" + this.roomCode + "/sharedData/xpAssignments/" + this.playerId,
    );

    xpRef.on("child_added", (snapshot) => {
      const xpData = snapshot.val();
      callback(xpData);

      // Remove after processing
      snapshot.ref.remove();
    });

    this.listeners.xp = xpRef;
  }

  /**
   * Send chat message (GM can send to all or individual, players send to GM)
   */
  async sendChatMessage(to, message, toName = null) {
    if (!this.roomCode) return;

    try {
      // Get recipient name if sending to specific player
      let recipientName = toName;
      if (!recipientName && to !== "all" && to !== "gm") {
        // Look up player name from connected players
        const playersSnapshot = await this.db
          .ref(`rooms/${this.roomCode}/players`)
          .once("value");
        const players = playersSnapshot.val() || {};
        const player = Object.values(players).find((p) => p.id === to);
        recipientName = player?.name || "Player";
      } else if (to === "all") {
        recipientName = "All Players";
      } else if (to === "gm") {
        recipientName = "GM";
      }

      const chatData = {
        from: this.isGM ? "gm" : this.playerId,
        fromName: this.isGM ? "GM" : this.playerName,
        to: to, // 'all', 'gm', or specific playerId
        toName: recipientName,
        message: message,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        fromGM: this.isGM,
        read: false,
      };

      await this.db
        .ref("rooms/" + this.roomCode + "/sharedData/chat")
        .push(chatData);
      console.log("✅ Chat message sent");

      // Clean up old messages (keep last 100 messages or messages from last 7 days)
      this.cleanupOldMessages();
    } catch (error) {
      console.error("❌ Error sending chat:", error);
    }
  }

  /**
   * Clean up old chat messages to prevent database bloat
   */
  async cleanupOldMessages() {
    if (!this.roomCode) return;

    try {
      const chatRef = this.db.ref(`rooms/${this.roomCode}/sharedData/chat`);
      const snapshot = await chatRef.orderByChild("timestamp").once("value");
      const messages = [];

      snapshot.forEach((childSnapshot) => {
        messages.push({
          key: childSnapshot.key,
          timestamp: childSnapshot.val().timestamp,
        });
      });

      // Keep last 100 messages
      if (messages.length > 100) {
        const messagesToDelete = messages.slice(0, messages.length - 100);
        for (const msg of messagesToDelete) {
          await chatRef.child(msg.key).remove();
        }
      }

      // Also remove messages older than 7 days
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      messages.forEach(async (msg) => {
        if (msg.timestamp < sevenDaysAgo) {
          await chatRef.child(msg.key).remove();
        }
      });
    } catch (error) {
      console.error("Error cleaning up old messages:", error);
    }
  }

  /**
   * Listen for chat messages
   */
  onChatMessage(callback) {
    if (!this.roomCode) return;

    const chatRef = this.db.ref("rooms/" + this.roomCode + "/sharedData/chat");

    chatRef.on("child_added", (snapshot) => {
      const chatData = snapshot.val();
      const messageId = snapshot.key;

      // Filter messages for this player/GM
      if (this.isGM) {
        // GM sees all messages
        callback({ ...chatData, id: messageId });
      } else {
        // Players see messages to 'all', to them specifically, or from them
        if (
          chatData.to === "all" ||
          chatData.to === this.playerId ||
          chatData.from === this.playerId
        ) {
          callback({ ...chatData, id: messageId });
        }
      }
    });

    this.listeners.chat = chatRef;
  }

  /**
   * Mark chat message as read
   */
  async markChatAsRead(messageId) {
    if (!this.roomCode) return;

    try {
      await this.db
        .ref(
          "rooms/" + this.roomCode + "/sharedData/chat/" + messageId + "/read",
        )
        .set(true);
    } catch (error) {
      console.error("❌ Error marking chat as read:", error);
    }
  }

  /**
   * Broadcast that user is typing
   */
  async setTypingStatus(isTyping) {
    if (!this.roomCode) return;

    try {
      const typingRef = this.db.ref(
        `rooms/${this.roomCode}/sharedData/typing/${this.isGM ? "gm" : this.playerId}`,
      );

      if (isTyping) {
        await typingRef.set({
          name: this.isGM ? "GM" : this.playerName,
          timestamp: firebase.database.ServerValue.TIMESTAMP,
        });

        // Auto-clear after 3 seconds
        setTimeout(() => {
          typingRef.remove();
        }, 3000);
      } else {
        await typingRef.remove();
      }
    } catch (error) {
      console.error("Error setting typing status:", error);
    }
  }

  /**
   * Listen for typing indicators
   */
  onTypingStatus(callback) {
    if (!this.roomCode) return;

    const typingRef = this.db.ref(`rooms/${this.roomCode}/sharedData/typing`);

    typingRef.on("value", (snapshot) => {
      const typingUsers = [];
      snapshot.forEach((childSnapshot) => {
        const data = childSnapshot.val();
        const userId = childSnapshot.key;

        // Filter out own typing status and expired statuses
        if (userId !== (this.isGM ? "gm" : this.playerId)) {
          const age = Date.now() - (data.timestamp || 0);
          if (age < 4000) {
            // 4 seconds grace period
            typingUsers.push(data.name);
          } else {
            // Clean up expired typing status
            childSnapshot.ref.remove();
          }
        }
      });

      callback(typingUsers);
    });
  }

  /**
   * Broadcast dice roll (Players)
   */
  async broadcastDiceRoll(rollData) {
    if (!this.roomCode) return;

    try {
      const diceRollData = {
        playerId: this.playerId,
        playerName: this.playerName,
        characterName: rollData.characterName || "",
        type: rollData.type, // 'action', 'attack', 'defend', 'd20', 'd6'
        roll: rollData.roll,
        targetNumber: rollData.targetNumber || null,
        success: rollData.success || null,
        details: rollData.details || {},
        timestamp: firebase.database.ServerValue.TIMESTAMP,
      };

      await this.db
        .ref("rooms/" + this.roomCode + "/sharedData/diceRolls")
        .push(diceRollData);
      console.log("✅ Dice roll broadcasted");
    } catch (error) {
      console.error("❌ Error broadcasting dice roll:", error);
    }
  }

  /**
   * Listen for dice roll broadcasts
   */
  onDiceRollBroadcast(callback) {
    if (!this.roomCode) return;

    const diceRollRef = this.db.ref(
      "rooms/" + this.roomCode + "/sharedData/diceRolls",
    );

    // Only listen to recent rolls (last 5 minutes)
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

    diceRollRef
      .orderByChild("timestamp")
      .startAt(fiveMinutesAgo)
      .on("child_added", (snapshot) => {
        const rollData = snapshot.val();

        // Don't show own rolls to self (already visible)
        if (rollData.playerId !== this.playerId) {
          callback(rollData);
        }
      });

    this.listeners.diceRolls = diceRollRef;
  }

  /**
   * Set battle map visibility (GM only)
   */
  async setBattleMapVisibility(visible) {
    if (!this.isGM) return;

    try {
      await this.db
        .ref("rooms/" + this.roomCode + "/battleMap/visible")
        .set(visible);
      console.log(`✅ Battle map visibility: ${visible}`);
    } catch (error) {
      console.error("❌ Error setting battle map visibility:", error);
    }
  }

  /**
   * Update battle map data (GM only)
   */
  async updateBattleMap(mapData) {
    if (!this.isGM) return;

    console.log("📤 GM sending battle map update");
    console.log("🎭 customTokens in mapData:", mapData.customTokens);
    console.log(
      "🎭 customTokens keys:",
      mapData.customTokens ? Object.keys(mapData.customTokens) : "undefined",
    );

    try {
      await this.db.ref("rooms/" + this.roomCode + "/battleMap").update({
        config: mapData.config || {},
        combatants: mapData.combatants || {},
        terrain: mapData.terrain || [],
        edgeWalls: mapData.edgeWalls || [],
        customTokens: mapData.customTokens || {},
        aoeTemplates: mapData.aoeTemplates || [],
        lights: mapData.lights || [],
        fogOfWar: mapData.fogOfWar || { enabled: false },
        backgroundImage: mapData.backgroundImage || null,
        showLineOfSight:
          mapData.showLineOfSight !== undefined
            ? mapData.showLineOfSight
            : true,
        showNames: mapData.showNames !== undefined ? mapData.showNames : false,
        lastUpdated: firebase.database.ServerValue.TIMESTAMP,
      });
      console.log("✅ Battle map updated with all features");
    } catch (error) {
      console.error("❌ Error updating battle map:", error);
    }
  }

  /**
   * Listen for battle map changes
   */
  onBattleMapChange(callback) {
    if (!this.roomCode) return;

    const battleMapRef = this.db.ref("rooms/" + this.roomCode + "/battleMap");

    battleMapRef.on("value", (snapshot) => {
      const mapData = snapshot.val();
      callback(mapData);
    });

    this.listeners.battleMap = battleMapRef;
  }

  /**
   * Get all player characters (GM only)
   */
  async getAllPlayerCharacters() {
    if (!this.isGM || !this.roomCode) return {};

    try {
      const snapshot = await this.db
        .ref("rooms/" + this.roomCode + "/players")
        .once("value");
      const players = snapshot.val() || {};

      const characters = {};
      Object.keys(players).forEach((playerId) => {
        if (players[playerId].character) {
          characters[playerId] = {
            playerName: players[playerId].name,
            character: players[playerId].character,
          };
        }
      });

      return characters;
    } catch (error) {
      console.error("❌ Error getting player characters:", error);
      return {};
    }
  }
}

// Create global instance
const multiplayerManager = new MultiplayerManager();
