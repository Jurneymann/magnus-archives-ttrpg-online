// ==================== 3D DICE ROLLER SYSTEM ==================== //

let diceBox = null;
let diceRollerInitialized = false;
let currentRollResult = null;
let currentRollCallback = null;
let manualInputShouldBeHidden = false;

// Force remove any conflicting styles on page load
document.addEventListener("DOMContentLoaded", function () {
  const manualRow = document.getElementById("manualInputRow");
  if (manualRow && !manualInputShouldBeHidden) {
    // ADD FLAG CHECK
    // Remove any inline styles that might be interfering
    manualRow.removeAttribute("style");
    // Set initial display
    manualRow.style.display = "flex";
    manualRow.style.flexDirection = "row";
    manualRow.style.alignItems = "center";
    manualRow.style.gap = "12px";
    console.log("✓ Manual input row initialized");
  }
});

// Initialize the DICE.dice_box
function initializeDiceBox() {
  if (diceRollerInitialized && diceBox) {
    console.log("✓ DiceBox already initialized");
    return true;
  }

  try {
    console.log("Initializing DICE.dice_box...");

    // Check if DICE library is loaded
    if (typeof DICE === "undefined" || typeof DICE.dice_box === "undefined") {
      console.error("✗ DICE library not found!");
      return false;
    }

    console.log("✓ DICE library found");

    // Test if WebGL is available before attempting initialization
    const testCanvas = document.createElement("canvas");
    const gl =
      testCanvas.getContext("webgl") ||
      testCanvas.getContext("experimental-webgl");

    if (!gl) {
      console.error("✗ WebGL not supported in this browser");
      console.warn("⚠ 3D dice disabled - please use manual input");
      return false;
    }

    // Check for WebGL context limit
    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    if (debugInfo) {
      console.log(
        "WebGL Vendor:",
        gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
      );
      console.log(
        "WebGL Renderer:",
        gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL),
      );
    }

    // Clean up test context
    const loseContext = gl.getExtension("WEBGL_lose_context");
    if (loseContext) {
      loseContext.loseContext();
    }

    console.log("✓ WebGL is available");

    // Get the container element
    const container = document.getElementById("dice-canvas-container");
    if (!container) {
      console.error("✗ Dice container element not found!");
      return false;
    }

    // Create new DICE.dice_box instance
    diceBox = new DICE.dice_box(container);

    diceRollerInitialized = true;
    console.log("✓ DICE.dice_box initialized successfully");
    return true;
  } catch (error) {
    console.error("✗ Failed to initialize DICE.dice_box:", error);
    console.error("Error stack:", error.stack);
    console.warn("⚠ 3D dice unavailable - please use manual dice input");
    diceRollerInitialized = false;
    return false;
  }
}

// Show the dice roller modal
function showDiceRoller(diceType = "d20", callback = null) {
  console.log(`Opening dice roller for ${diceType}`);

  const modal = document.getElementById("diceRollerModal");
  if (!modal) return;

  currentRollCallback = callback;
  currentRollResult = null;
  manualInputShouldBeHidden = false; // RESET FLAG

  // Set dice type
  const rollTypeText = document.getElementById("diceRollType");
  if (rollTypeText) rollTypeText.textContent = `Roll ${diceType}`;

  // Reset roll button
  const rollButton = document.getElementById("rollDiceButton");
  if (rollButton) {
    rollButton.style.display = "block";
    rollButton.disabled = false;
    rollButton.setAttribute("data-dice-type", diceType);
    rollButton.onclick = () => rollDice(diceType);
  }

  // Reset manual input - EXPLICITLY SHOW IT
  const manualRow = document.getElementById("manualInputRow");
  const manualInput = document.getElementById("manualDiceInput");

  if (manualRow) {
    manualRow.style.display = "flex";
    console.log("✓ Manual input row shown");
  }

  if (manualInput) {
    manualInput.value = "";
    manualInput.max = diceType === "d6" ? 6 : 20;
    manualInput.placeholder = `1-${manualInput.max}`;
  }

  // Hide other buttons
  const rerollBtn = document.getElementById("rerollDiceButton");
  const acceptBtn = document.getElementById("acceptDiceButton");
  if (rerollBtn) rerollBtn.style.display = "none";
  if (acceptBtn) acceptBtn.style.display = "none";

  // Clear result
  const result = document.getElementById("diceResult");
  if (result) {
    result.style.display = "none";
    result.textContent = "";
  }

  modal.style.display = "flex";

  // Initialize dice box if needed
  if (!diceRollerInitialized) {
    const initialized = initializeDiceBox();

    // If initialization failed, update UI to indicate manual input is required
    if (!initialized) {
      const canvasContainer = document.getElementById("dice-canvas-container");
      if (canvasContainer) {
        canvasContainer.innerHTML =
          '<div style="color: #ff9800; padding: 20px; text-align: center;">⚠ 3D dice unavailable<br><small>Please use manual input or refresh page</small></div>';
      }

      if (rollButton) {
        rollButton.textContent = "Generate Random Roll";
      }
    }
  }
}

// Update rollDice to set the flag:
function rollDice(diceType) {
  console.log(`Rolling ${diceType}...`);

  const rollButton = document.getElementById("rollDiceButton");
  const manualRow = document.getElementById("manualInputRow");

  // Log initial state
  console.log("=== ROLL DICE CALLED ===");
  console.log("Manual row element:", manualRow);
  console.log(
    "Manual row display BEFORE:",
    manualRow ? manualRow.style.display : "NULL",
  );

  if (rollButton) {
    rollButton.disabled = true;
    rollButton.textContent = "Rolling...";
  }

  // SET FLAG and FORCE HIDE
  manualInputShouldBeHidden = true; // SET FLAG
  if (manualRow) {
    manualRow.style.setProperty("display", "none", "important");
    console.log("Manual row display AFTER:", manualRow.style.display);
    console.log("✓ Manual input FORCED hidden, flag set to true");
  } else {
    console.error("✗ Manual row element is NULL!");
  }

  // If 3D dice not available, generate random result
  if (!diceBox || !diceRollerInitialized) {
    console.warn("⚠ DiceBox not initialized - generating random result");

    const maxValue = diceType === "d6" ? 6 : 20;
    const randomResult = Math.floor(Math.random() * maxValue) + 1;

    console.log(`🎲 Random ${diceType} result: ${randomResult}`);
    currentRollResult = randomResult;

    if (rollButton) {
      rollButton.textContent = "Generate Random Roll";
      rollButton.disabled = false;
      rollButton.style.display = "none";
    }

    setTimeout(() => displayRollResult(randomResult), 300);
    return;
  }

  try {
    const notation = `1${diceType}`;
    diceBox.setDice(notation);

    function after_roll(notation) {
      console.log("After roll:", JSON.stringify(notation));
      console.log("Flag manualInputShouldBeHidden:", manualInputShouldBeHidden); // ADD LOG

      if (notation?.result?.length > 0) {
        const rollValue = notation.result[0];
        currentRollResult = rollValue;

        // Reset button text before hiding it
        if (rollButton) {
          rollButton.textContent = "Roll Virtual Dice";
          rollButton.disabled = false;
        }

        setTimeout(() => displayRollResult(rollValue), 500);
      } else {
        console.error("No result in notation");
        if (rollButton) {
          rollButton.disabled = false;
          rollButton.textContent = "Roll Virtual Dice";
        }
      }
    }

    diceBox.start_throw(null, after_roll);
  } catch (error) {
    console.error("Error rolling:", error);
    if (rollButton) {
      rollButton.disabled = false;
      rollButton.textContent = "Roll Virtual Dice";
    }
  }
}

// Display the roll result
function displayRollResult(rollValue) {
  const rollButton = document.getElementById("rollDiceButton");
  const rerollButton = document.getElementById("rerollDiceButton");
  const acceptButton = document.getElementById("acceptDiceButton");
  const resultDisplay = document.getElementById("diceResult");
  const manualRow = document.getElementById("manualInputRow");

  console.log(`Displaying result: ${rollValue}`);

  // ENSURE manual input is hidden AND flag is set
  if (manualRow) {
    console.log(
      "IN displayRollResult BEFORE - manualRow.style.display:",
      manualRow.style.display,
    );
    console.log("Flag manualInputShouldBeHidden:", manualInputShouldBeHidden);

    manualRow.style.setProperty("display", "none", "important");

    console.log(
      "IN displayRollResult AFTER - manualRow.style.display:",
      manualRow.style.display,
    );
    console.log("✓ Manual input confirmed hidden in displayRollResult");

    // Add a MutationObserver to prevent it from being re-shown
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "style"
        ) {
          if (manualInputShouldBeHidden && manualRow.style.display !== "none") {
            console.warn("⚠ Manual input was re-shown! Hiding again...");
            manualRow.style.setProperty("display", "none", "important");
          }
        }
      });
    });

    observer.observe(manualRow, {
      attributes: true,
      attributeFilter: ["style"],
    });

    // Store observer so we can disconnect it later
    manualRow._styleObserver = observer;
  }

  // Hide initial roll button
  if (rollButton) {
    rollButton.style.display = "none";
  }

  // Show result
  if (resultDisplay) {
    resultDisplay.textContent = `You rolled: ${rollValue}`;
    resultDisplay.style.display = "block";

    // Add styling based on roll value
    resultDisplay.className = "dice-result";
    if (rollValue === 20) {
      resultDisplay.classList.add("critical-success");
    } else if (rollValue === 1) {
      resultDisplay.classList.add("critical-failure");
    }
  }

  // Show reroll and accept buttons
  if (rerollButton) {
    rerollButton.style.display = "inline-block";
  }

  if (acceptButton) {
    acceptButton.style.display = "inline-block";
  }
}

// Reroll the dice
function rerollDice() {
  const rollButton = document.getElementById("rollDiceButton");
  const manualRow = document.getElementById("manualInputRow");
  const diceType = rollButton?.getAttribute("data-dice-type") || "d20";

  // Disconnect observer if it exists
  if (manualRow && manualRow._styleObserver) {
    manualRow._styleObserver.disconnect();
    delete manualRow._styleObserver;
  }

  // Hide result and action buttons
  document.getElementById("diceResult").style.display = "none";
  document.getElementById("rerollDiceButton").style.display = "none";
  document.getElementById("acceptDiceButton").style.display = "none";

  // RESET FLAG and show manual input
  manualInputShouldBeHidden = false;

  // Show roll button and manual input
  if (rollButton) rollButton.style.display = "block";
  if (manualRow) {
    manualRow.style.display = "flex";
  }

  rollDice(diceType);
}

// Accept the roll result
function acceptDiceRoll() {
  console.log(`acceptDiceRoll called with result: ${currentRollResult}`);
  console.log(`Callback exists: ${!!currentRollCallback}`);

  if (currentRollResult !== null && currentRollCallback) {
    console.log(`Executing callback with result: ${currentRollResult}`);

    // Store callback and result before closing
    const rollResult = currentRollResult;
    const callback = currentRollCallback;

    // Close the dice roller FIRST
    closeDiceRoller();

    // Then execute callback after a short delay to ensure modal is closed
    setTimeout(() => {
      try {
        callback(rollResult);
        console.log("Callback executed successfully");
      } catch (error) {
        console.error("Error executing callback:", error);
      }
    }, 100);
  } else {
    console.warn("No callback or result to process");
    closeDiceRoller();
  }
}

// Close the dice roller modal
function closeDiceRoller() {
  const modal = document.getElementById("diceRollerModal");
  if (modal) {
    modal.style.display = "none";
  }

  // Clean up WebGL context to prevent memory leaks and context limit issues
  if (diceBox && diceBox.renderer) {
    try {
      // Dispose of Three.js renderer and free WebGL context
      diceBox.renderer.dispose();

      // Remove canvas from DOM
      const container = document.getElementById("dice-canvas-container");
      if (container && diceBox.renderer.domElement) {
        container.removeChild(diceBox.renderer.domElement);
      }

      console.log("✓ WebGL context cleaned up");
    } catch (error) {
      console.warn("⚠ Error cleaning up WebGL context:", error);
    }
  }

  // Reset dice box instance so it reinitializes next time
  diceBox = null;
  diceRollerInitialized = false;

  // Reset state
  currentRollResult = null;
  currentRollCallback = null;
}

// Test function
function testDiceRoller() {
  showDiceRoller("d20", (result) => {
    console.log("Test roll result:", result);
    alert(`You rolled: ${result}`);
  });
}
// Quick D6 manual submission
function submitManualD6() {
  const input = document.getElementById("manualD6Input");
  const value = parseInt(input.value);

  if (!value || value < 1 || value > 6) {
    alert("Please enter a valid d6 roll (1-6)");
    input.focus();
    return;
  }

  console.log(`Manual d6 roll: ${value}`);
  alert(`You rolled a ${value} on d6!`);

  // Clear input
  input.value = "";
}

// Quick D20 manual submission
function submitManualD20() {
  const input = document.getElementById("manualD20Input");
  const value = parseInt(input.value);

  if (!value || value < 1 || value > 20) {
    alert("Please enter a valid d20 roll (1-20)");
    input.focus();
    return;
  }

  console.log(`Manual d20 roll: ${value}`);
  alert(`You rolled a ${value} on d20!`);

  // Clear input
  input.value = "";
}

// Manual dice roll submission for 3D dice roller modal
function submitManualRoll() {
  const input = document.getElementById("manualDiceInput");
  const value = parseInt(input.value);

  // Get max from placeholder or modal
  const rollButton = document.getElementById("rollDiceButton");
  const diceType = rollButton?.getAttribute("data-dice-type") || "d20";
  const maxValue = diceType === "d6" ? 6 : 20;

  // Validate
  if (!value || value < 1 || value > maxValue) {
    alert(`Please enter a valid roll (1-${maxValue})`);
    return;
  }

  // Store result
  currentRollResult = value;

  // Clear input
  input.value = "";

  // Hide manual input row
  const manualRow = document.getElementById("manualInputRow");
  if (manualRow) manualRow.style.display = "none";

  // Hide roll button
  if (rollButton) rollButton.style.display = "none";

  // Display result
  displayRollResult(value);
}

const originalShowDiceRoller = showDiceRoller;

console.log("✓ Manual dice input functions loaded");
console.log("✓ 3D Dice Roller system loaded");
console.log("  Call testDiceRoller() to test");
