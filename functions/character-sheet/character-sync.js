/**
 * Character Sheet Firebase Sync Layer
 * Bridges the standalone character sheet with Firebase multiplayer
 */

class CharacterSync {
  constructor() {
    this.autoSaveInterval = null;
    this.autoSaveDelay = 30000; // 30 seconds
    this.lastSaveTime = null;
    this.pendingChanges = false;
    this.syncEnabled = false;
  }

  /**
   * Initialize character sync for multiplayer session
   */
  initialize(multiplayerManager) {
    this.multiplayerManager = multiplayerManager;
    this.syncEnabled = true;

    // Start auto-save
    this.startAutoSave();

    // Listen for remote updates (if GM modifies character)
    this.listenForRemoteUpdates();

    console.log("✅ Character sync initialized");
  }

  /**
   * Disable sync (for local-only mode)
   */
  disable() {
    this.syncEnabled = false;
    this.stopAutoSave();
    console.log("Character sync disabled");
  }

  /**
   * Start auto-save timer
   */
  startAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }

    // Sync every 30 seconds regardless of pendingChanges flag
    // This ensures all player changes are transmitted to GM
    this.autoSaveInterval = setInterval(() => {
      this.syncCharacterToFirebase();
    }, this.autoSaveDelay);

    console.log("Auto-save started (syncing every 30 seconds)");
  }

  /**
   * Stop auto-save timer
   */
  stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  /**
   * Mark that character has changed
   */
  markChanged() {
    this.pendingChanges = true;
  }

  /**
   * Sync current character state to Firebase
   */
  async syncCharacterToFirebase(force = false) {
    if (!this.syncEnabled && !force) {
      console.log("Sync disabled, skipping");
      return;
    }

    if (!this.multiplayerManager || !this.multiplayerManager.roomCode) {
      console.warn("No multiplayer session active");
      return;
    }

    try {
      const characterData = this.getCharacterData();

      await this.multiplayerManager.updatePlayerCharacter(characterData);

      this.pendingChanges = false;
      this.lastSaveTime = Date.now();

      this.showSyncStatus("Synced", "success");
      console.log("✅ Character synced to Firebase");
    } catch (error) {
      console.error("❌ Error syncing character:", error);
      this.showSyncStatus("Sync failed", "error");
    }
  }

  /**
   * Get current character data from global character object
   */
  getCharacterData() {
    // Character object is defined in character.js from character sheet
    if (typeof character === "undefined") {
      console.error("Character object not found");
      return null;
    }

    const data = {
      name: character.name || "",
      descriptor: character.descriptor || "",
      type: character.type || "",
      focus1: character.focus1 || "",
      focus2: character.focus2 || "",
      tier: character.tier || 1,
      xp: character.xp || 0,
      effort: character.effort || 1,
      cypherSlots: character.cypherSlots || 0,

      // Send pools in the format GM view expects
      mightPool: {
        current: character.currentPools?.Might || 0,
        max: character.stats?.Might || 0,
      },
      speedPool: {
        current: character.currentPools?.Speed || 0,
        max: character.stats?.Speed || 0,
      },
      intellectPool: {
        current: character.currentPools?.Intellect || 0,
        max: character.stats?.Intellect || 0,
      },

      // Send edge as flat values
      mightEdge: character.edge?.Might || 0,
      speedEdge: character.edge?.Speed || 0,
      intellectEdge: character.edge?.Intellect || 0,

      // Also send in original format for compatibility
      stats: {
        Might: character.stats?.Might || 0,
        Speed: character.stats?.Speed || 0,
        Intellect: character.stats?.Intellect || 0,
      },

      currentPools: {
        Might: character.currentPools?.Might || 0,
        Speed: character.currentPools?.Speed || 0,
        Intellect: character.currentPools?.Intellect || 0,
      },

      edge: {
        Might: character.edge?.Might || 0,
        Speed: character.edge?.Speed || 0,
        Intellect: character.edge?.Intellect || 0,
      },

      damageTrack:
        character.damageState ||
        character.damageTrack ||
        character.damage ||
        "Hale",
      damage:
        character.damageState ||
        character.damageTrack ||
        character.damage ||
        "Hale",
      stress: character.stress || 0,
      supernaturalStress:
        character.superStress || character.supernaturalStress || 0,
      superStress: character.superStress || character.supernaturalStress || 0,

      recovery: {
        rec1: character.recovery?.rec1 || false,
        rec2: character.recovery?.rec2 || false,
        rec3: character.recovery?.rec3 || false,
        rec4: character.recovery?.rec4 || false,
      },

      background: character.background || "",
      connections: character.connections || "",

      equipment: {
        basic: character.equipment?.basic || "",
        org: character.equipment?.org || "",
        additional: character.equipment?.additional || "",
      },

      skills: typeof skillsData !== "undefined" ? skillsData : [],
      abilities:
        typeof selectedAbilities !== "undefined" ? selectedAbilities : [],

      advancement: {
        advancementsPurchasedThisTier:
          character.advancementsPurchasedThisTier || 0,
        characterArc: character.characterArc || null,
      },

      avatar: {
        isAvatar: character.avatar?.isAvatar || false,
        hasUnlockedTab: character.avatar?.hasUnlockedTab || false,
        entity: character.avatar?.entity || null,
        entityName: character.avatar?.entityName || "",
        tetheredPower: character.avatar?.tetheredPower || null,
        tetheredPowerName: character.avatar?.tetheredPowerName || "",
        powerChanges: character.avatar?.powerChanges || 0,
        committed: character.avatar?.committed || false,
        usedPowers: character.avatar?.usedPowers || [],
        gmUnlocked: character.avatar?.gmUnlocked || false,
      },

      // Cyphers - stored in global assignedCyphers variable, not character object
      assignedCyphers:
        typeof assignedCyphers !== "undefined" ? assignedCyphers : [],

      // Additional fields for GM quick reference
      characterArc: character.characterArc || {},
      skillsData: typeof skillsData !== "undefined" ? skillsData : [],
      descriptorSkills: character.descriptorSkills || [],
      descriptorCharacteristics: character.descriptorCharacteristics || [],
      selectedTypeAbilities: character.selectedTypeAbilities || [],
      selectedFocusAbilities: character.selectedFocusAbilities || [],
      weapons: character.weapons || [],
      items: character.items || [],
      identityConfirmed: character.identityConfirmed || false,
      connectionsData:
        typeof connectionsData !== "undefined" ? connectionsData : [],

      lastUpdated: Date.now(),
    };

    // Debug log to see what's actually being sent
    console.log("🔍 Syncing character data:", {
      name: data.name,
      skills: data.skillsData?.length || 0,
      weapons: data.weapons?.length || 0,
      items: data.items?.length || 0,
      cyphers: data.assignedCyphers?.length || 0,
      typeAbilities: data.selectedTypeAbilities?.length || 0,
      focusAbilities: data.selectedFocusAbilities?.length || 0,
      characteristics: data.descriptorCharacteristics?.length || 0,
      characterArc: data.characterArc?.activeArcs?.length || 0,
    });

    return data;
  }

  /**
   * Load character data from Firebase
   */
  loadCharacterData(characterData) {
    if (!characterData) return;

    // Populate global character object
    if (typeof character !== "undefined") {
      character.name = characterData.name || "";
      character.descriptor = characterData.descriptor || "";
      character.type = characterData.type || "";
      character.focus1 = characterData.focus1 || "";
      character.focus2 = characterData.focus2 || "";
      character.tier = characterData.tier || 1;
      character.xp = characterData.xp || 0;
      character.effort = characterData.effort || 1;
      character.cypherSlots = characterData.cypherSlots || 0;

      character.stats = characterData.stats || {
        Might: 0,
        Speed: 0,
        Intellect: 0,
      };
      character.currentPools = characterData.currentPools || {
        Might: 0,
        Speed: 0,
        Intellect: 0,
      };
      character.edge = characterData.edge || {
        Might: 0,
        Speed: 0,
        Intellect: 0,
      };

      character.damageTrack =
        characterData.damageTrack || characterData.damage || "Hale";
      character.damage =
        characterData.damageTrack || characterData.damage || "Hale";
      character.damageState = (
        characterData.damageTrack ||
        characterData.damage ||
        "hale"
      ).toLowerCase();
      character.stress = characterData.stress || 0;
      character.superStress =
        characterData.supernaturalStress || characterData.superStress || 0;
      character.supernaturalStress =
        characterData.supernaturalStress || characterData.superStress || 0;

      character.recovery = characterData.recovery || {};
      character.background = characterData.background || "";
      character.connections = characterData.connections || "";
      character.equipment = characterData.equipment || {};

      character.advancementsPurchasedThisTier =
        characterData.advancement?.advancementsPurchasedThisTier || 0;
      character.characterArc = characterData.advancement?.characterArc || null;

      // Initialize avatar object with all fields
      if (!character.avatar) {
        character.avatar = {};
      }
      character.avatar = {
        isAvatar: characterData.avatar?.isAvatar || false,
        hasUnlockedTab: characterData.avatar?.hasUnlockedTab || false,
        entity: characterData.avatar?.entity || null,
        entityName: characterData.avatar?.entityName || "",
        tetheredPower: characterData.avatar?.tetheredPower || null,
        tetheredPowerName: characterData.avatar?.tetheredPowerName || "",
        powerChanges: characterData.avatar?.powerChanges || 0,
        committed: characterData.avatar?.committed || false,
        usedPowers: characterData.avatar?.usedPowers || [],
        gmUnlocked: characterData.avatar?.gmUnlocked || false,
      };
      character.assignedCyphers = characterData.assignedCyphers || [];

      // Load additional fields for GM quick reference
      character.characterArc = characterData.characterArc || {};
      character.descriptorSkills = characterData.descriptorSkills || [];
      character.descriptorCharacteristics =
        characterData.descriptorCharacteristics || [];
      character.selectedTypeAbilities =
        characterData.selectedTypeAbilities || [];
      character.selectedFocusAbilities =
        characterData.selectedFocusAbilities || [];
      character.weapons = characterData.weapons || [];
      character.items = characterData.items || [];
      character.identityConfirmed = characterData.identityConfirmed || false;

      // Populate skills if function exists
      if (typeof skillsData !== "undefined" && characterData.skillsData) {
        skillsData = characterData.skillsData;
      }

      // Populate connections if function exists
      if (
        typeof connectionsData !== "undefined" &&
        characterData.connectionsData
      ) {
        connectionsData = characterData.connectionsData;
      }

      // Populate abilities if function exists
      if (typeof selectedAbilities !== "undefined" && characterData.abilities) {
        selectedAbilities = characterData.abilities;
      }
    }

    // Update UI
    if (typeof updateCharacterSheetUI === "function") {
      updateCharacterSheetUI();
    }

    console.log("✅ Character data loaded from Firebase");
  }

  /**
   * Listen for remote character updates (GM pushing changes)
   */
  listenForRemoteUpdates() {
    if (!this.multiplayerManager || !this.multiplayerManager.roomCode) return;

    // Listen for direct character field updates from GM
    const characterRef = this.multiplayerManager.db.ref(
      `rooms/${this.multiplayerManager.roomCode}/players/${this.multiplayerManager.playerId}/character`,
    );

    characterRef.on("value", (snapshot) => {
      const updatedCharacter = snapshot.val();
      if (updatedCharacter && !this.pendingChanges) {
        // Only update if there are no pending local changes
        this.updateLocalCharacterFromFirebase(updatedCharacter);
      }
    });

    // Listen for stress assignments
    this.multiplayerManager.onStressAssigned((stressData) => {
      this.handleStressAssignment(stressData);
    });

    // Listen for damage assignments
    this.multiplayerManager.onDamageAssigned((damageData) => {
      this.handleDamageAssignment(damageData);
    });

    // Listen for XP assignments
    this.multiplayerManager.onXPAssigned((xpData) => {
      this.handleXPAssignment(xpData);
    });
  }

  /**
   * Update local character from Firebase data
   */
  updateLocalCharacterFromFirebase(firebaseData) {
    if (typeof character === "undefined") return;

    // Update specific fields that GM can modify
    if (firebaseData.xp !== undefined && character.xp !== firebaseData.xp) {
      character.xp = firebaseData.xp;
      if (typeof updateXPDisplay === "function") updateXPDisplay();
    }

    if (
      firebaseData.stress !== undefined &&
      character.stress !== firebaseData.stress
    ) {
      character.stress = firebaseData.stress;
      if (typeof updateStressDisplay === "function") updateStressDisplay();
    }

    if (
      firebaseData.supernaturalStress !== undefined &&
      character.superStress !== firebaseData.supernaturalStress
    ) {
      character.superStress = firebaseData.supernaturalStress;
      character.supernaturalStress = firebaseData.supernaturalStress;
      if (typeof updateStressDisplay === "function") updateStressDisplay();
    }

    if (
      firebaseData.damageTrack !== undefined &&
      character.damageTrack !== firebaseData.damageTrack
    ) {
      character.damageTrack = firebaseData.damageTrack;
      character.damage = firebaseData.damageTrack;
      character.damageState = firebaseData.damageTrack.toLowerCase(); // Also update damageState
      if (typeof updateDamageDisplay === "function") updateDamageDisplay();
    }

    if (
      firebaseData.tier !== undefined &&
      character.tier !== firebaseData.tier
    ) {
      character.tier = firebaseData.tier;
      if (typeof updateTierDisplay === "function") updateTierDisplay();
    }

    if (
      firebaseData.effort !== undefined &&
      character.effort !== firebaseData.effort
    ) {
      character.effort = firebaseData.effort;
      if (typeof updateEffortDisplay === "function") updateEffortDisplay();
    }

    // Update stat pools
    if (firebaseData.mightPool !== undefined) {
      if (firebaseData.mightPool.current !== undefined) {
        character.currentPools.Might = firebaseData.mightPool.current;
      }
      if (firebaseData.mightPool.max !== undefined) {
        character.stats.Might = firebaseData.mightPool.max;
      }
      if (firebaseData.mightPool.edge !== undefined) {
        character.edge.Might = firebaseData.mightPool.edge;
      }
      if (typeof updatePoolsDisplay === "function") updatePoolsDisplay();
    }

    if (firebaseData.speedPool !== undefined) {
      if (firebaseData.speedPool.current !== undefined) {
        character.currentPools.Speed = firebaseData.speedPool.current;
      }
      if (firebaseData.speedPool.max !== undefined) {
        character.stats.Speed = firebaseData.speedPool.max;
      }
      if (firebaseData.speedPool.edge !== undefined) {
        character.edge.Speed = firebaseData.speedPool.edge;
      }
      if (typeof updatePoolsDisplay === "function") updatePoolsDisplay();
    }

    if (firebaseData.intellectPool !== undefined) {
      if (firebaseData.intellectPool.current !== undefined) {
        character.currentPools.Intellect = firebaseData.intellectPool.current;
      }
      if (firebaseData.intellectPool.max !== undefined) {
        character.stats.Intellect = firebaseData.intellectPool.max;
      }
      if (firebaseData.intellectPool.edge !== undefined) {
        character.edge.Intellect = firebaseData.intellectPool.edge;
      }
      if (typeof updatePoolsDisplay === "function") updatePoolsDisplay();
    }

    console.log("📥 Updated local character from GM changes");
  }

  /**
   * Handle stress assignment from GM
   */
  handleStressAssignment(stressData) {
    if (typeof character === "undefined") return;

    const amount = stressData.amount || 0;
    const reason = stressData.reason || "";
    const source = stressData.source || "normal";

    // Apply stress to character
    if (source === "supernatural" && typeof addSuperStress === "function") {
      addSuperStress(amount);
    } else if (typeof addStress === "function") {
      addStress(amount);
    } else {
      character.stress = (character.stress || 0) + amount;
    }

    // Update UI
    if (typeof updateStressDisplay === "function") {
      updateStressDisplay();
    }

    // Show notification
    this.showNotification(
      `GM assigned ${amount} ${source} stress${reason ? ": " + reason : ""}`,
      "warning",
    );

    // Sync back to Firebase
    this.markChanged();
    this.syncCharacterToFirebase();
  }

  /**
   * Handle damage assignment from GM
   */
  handleDamageAssignment(damageData) {
    if (typeof character === "undefined") return;

    const amount = damageData.amount || 0;
    const type = damageData.type || "stat";
    const stat = damageData.stat || "Might";

    if (type === "state") {
      // Direct damage state change
      character.damageTrack = damageData.state || "Hale";
      character.damage = damageData.state || "Hale";
      character.damageState = (damageData.state || "Hale").toLowerCase();
    } else {
      // Stat pool damage
      if (
        character.currentPools &&
        character.currentPools[stat] !== undefined
      ) {
        character.currentPools[stat] = Math.max(
          0,
          character.currentPools[stat] - amount,
        );
      }
    }

    // Update UI
    if (typeof updateDamageUI === "function") {
      updateDamageUI();
    }
    if (typeof updateStat === "function") {
      updateStat(stat);
    }

    // Show notification
    this.showNotification(`GM assigned ${amount} damage to ${stat}`, "error");

    // Sync back to Firebase
    this.markChanged();
    this.syncCharacterToFirebase();
  }

  /**
   * Handle XP assignment from GM
   */
  handleXPAssignment(xpData) {
    if (typeof character === "undefined") return;

    const amount = xpData.amount || 0;
    const reason = xpData.reason || "";

    character.xp = (character.xp || 0) + amount;

    // Update UI
    if (typeof updateAdvancementDisplay === "function") {
      updateAdvancementDisplay();
    }

    // Show notification
    this.showNotification(
      `GM awarded ${amount} XP${reason ? ": " + reason : ""}`,
      "success",
    );

    // Sync back to Firebase
    this.markChanged();
    this.syncCharacterToFirebase();
  }

  /**
   * Show sync status indicator
   */
  showSyncStatus(message, type = "info") {
    const indicator = document.getElementById("syncIndicator");
    if (!indicator) return;

    indicator.textContent = message;
    indicator.className = `sync-indicator sync-${type}`;
    indicator.style.display = "block";

    setTimeout(() => {
      indicator.style.display = "none";
    }, 3000);
  }

  /**
   * Show notification to player
   */
  showNotification(message, type = "info") {
    // Create notification element if it doesn't exist
    let container = document.getElementById("notificationContainer");
    if (!container) {
      container = document.createElement("div");
      container.id = "notificationContainer";
      container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 400px;
            `;
      document.body.appendChild(container);
    }

    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
            background: ${
              type === "success"
                ? "#2e7d32"
                : type === "error"
                  ? "#c62828"
                  : type === "warning"
                    ? "#f57c00"
                    : "#1976d2"
            };
            color: white;
            padding: 15px 20px;
            border-radius: 4px;
            margin-bottom: 10px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease-out;
        `;
    notification.textContent = message;

    container.appendChild(notification);

    // Remove after 5 seconds
    setTimeout(() => {
      notification.style.animation = "slideOut 0.3s ease-out";
      setTimeout(() => {
        container.removeChild(notification);
      }, 300);
    }, 5000);
  }
}

// Create global instance
const characterSync = new CharacterSync();

// Export for use in other modules
window.characterSync = characterSync;

console.log("✅ Character sync module loaded");
