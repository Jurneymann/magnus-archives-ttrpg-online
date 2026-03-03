// Quick Reference Toolbar - Consolidated Version

function initializeToolbar() {
  createToolbar();
  createQuickReferenceModal();
}

function createToolbar() {
  const toolbar = document.createElement("div");
  toolbar.className = "quick-ref-toolbar";
  toolbar.innerHTML = `
    <button class="toolbar-button" onclick="toggleQuickReferenceModal(event)">📚 Quick Reference</button>
    <button class="toolbar-button" onclick="toggleMultiplayerPanel()">🌐 Multiplayer</button>
    <button class="toolbar-button" id="chatButton" onclick="toggleChatPanel()" style="display: none;">
      <span style="position: relative; display: inline-block; width: 100%; text-align: center;">
        💬 Chat
        <span 
          id="chatNotificationBadge" 
          style="
            display: none; 
            position: absolute;
            top: -8px;
            right: -5px;
            background: #e74c3c; 
            color: white; 
            padding: 2px 6px; 
            border-radius: 50%; 
            font-size: 11px; 
            font-weight: bold;
            animation: pulse 1.5s infinite;
          "
        >!</span>
      </span>
    </button>
    <button class="toolbar-button" id="horrorModeToggle" onclick="toggleHorrorMode()">☠ Horror Mode</button>
  `;
  document.body.appendChild(toolbar);
}

function createQuickReferenceModal() {
  const modal = document.createElement("div");
  modal.id = "quickReferenceModal";
  modal.className = "ref-panel";

  const primaryColor = window.getThemeColor
    ? window.getThemeColor("primary")
    : "#4caf50";

  modal.innerHTML = `
    <div class="quick-ref-tabs">
      <button class="quick-ref-tab active" onclick="switchRefTab('difficulty')">Task Difficulty</button>
      <button class="quick-ref-tab" onclick="switchRefTab('stress')">Stress</button>
      <button class="quick-ref-tab" onclick="switchRefTab('special')">Special Rolls</button>
      <button class="quick-ref-tab" onclick="switchRefTab('damage')">Damage Track</button>
    </div>
    <div class="quick-ref-body">
      <div id="tab-difficulty" class="quick-ref-tab-content active">
        <h3>Task Difficulty Reference</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr>
              <th style="padding: 12px; text-align: center;">Difficulty</th>
              <th style="padding: 12px; text-align: center;">Target #</th>
              <th style="padding: 12px; text-align: left;">Description</th>
              <th style="padding: 12px; text-align: left;">Guidance</th>
            </tr>
          </thead>
          <tbody>
            ${
              typeof DIFFICULTY !== "undefined"
                ? DIFFICULTY.map(
                    (d) => `
              <tr>
                <td style="padding: 12px; text-align: center;"><strong>${d.difficulty}</strong></td>
                <td style="padding: 12px; text-align: center;"><strong style="color: ${primaryColor};">${d.target}</strong></td>
                <td style="padding: 12px;">${d.description}</td>
                <td style="padding: 12px;">${d.guidance}</td>
              </tr>
            `,
                  ).join("")
                : '<tr><td colspan="4">Difficulty data not loaded</td></tr>'
            }
          </tbody>
        </table>
      </div>
      
      <div id="tab-stress" class="quick-ref-tab-content">
        <h3>Stress System</h3>
        <div class="stress-info-box">
          <h4>What is Stress?</h4>
          <p>Stress represents mental and emotional strain from frightening, disturbing, or supernatural encounters, as well as minor injuries.<br>The GM can assign stress points based on the situation, with more or less Stress points depending on the severity.</p>
        </div>
        
        <div class="stress-info-box">
          <h4>Gaining Stress</h4>
          <p><strong>1 Point of Stress:</strong><ul><li>Witnessing a supernatural event or creature from a distance.</li><li>Minor damage like a small cut or hard punch.</li></ul></p>
          <p><strong>2 Points of Stress:</strong><ul><li>Experiencing something "impossible" or deeply unsettling.</li><li>A serious injury like falling down the stairs or a hard punch to the face.</li></ul></p>
          <p><strong>3 Points of Stress:</strong><ul><li>Experiencing something that challengers your sense of reality.</li><li>Being grazed by a bullet.</li></ul></p>
        </div>
        
        <div class="stress-info-box">
          <h4>Stress Levels & Effects</h4>
          <p><ul>
          <li>Each <strong>3 points</strong> of accumulated stress is a Stress Level</li>
          <li>Each Stress Level hinders all actions by <strong>1 step</strong> until the Stress is reduced</li>
          <li>After <strong>4 accumulated Stress Levels</strong>, each Stress Level thereafter is also a serious injury and takes the player character 1 step down the Damage Track</li>
          </ul></p>
        </div>
        
        <div class="stress-info-box">
          <h4>Stress from Supernatural Sources</h4><ul><li>
          <p>Players must keep track of Stress incurred from Supernatural sources. This can be the shock of seeing something supernatural or experiencing otherworldly phenomena, damage from supernatural creatures, or other related events, or prolonged exposure to an artefact or Leitner.</p></li>
          <li><p>Once gained, Stress from Supernatural Sources <strong class="warning-text">cannot be removed.</strong></p></li>
          <li><p>A player who has gained 10 Stress from Supernatural Sources has been touched by the Entities, and may take a supernatural aspect to themselves.</p></li></ul>
        </div>
        
        <div class="stress-info-box">
          <h4>Avoiding or Resisting Stress</h4>
          <p>In certain situations, the GM may allow a player to make a Stress Resistance roll to avoid gaining Stress.</p>
          <p>This is typically an Intellect-based roll at the difficulty level of the creature or effect, or as set by the GM.</p>
          <p>Stress can only be avoided in situations where an injury can be avoided, such as slipping on muddy ground or witnessing a supernatural event. This is at the discretion of the GM.</p>
          <p>If a player fails a Defence check in combat, they typically cannot avoid the Stress.</p>
        </div>

        <div class="stress-info-box">
          <h4>Recovering Stress</h4>
          <p><strong>Rest & Safety:</strong> 3 points per hour in a safe environment</p>
          <p><strong>Healing action:</strong> Another player can make a healing check once per hour. The task difficulty is equal to the amount of Stress they want to reduce.</p>
          <p><strong>Eating or drinking:</strong> 3 points. Requires at least one action.</p>
          <p><strong>Mindful activities:</strong> Such as interacting with friends or a pet or meditating reduce +1 Stress per hour.</p>
          <p><strong>Recovery Rolls:</strong> A Recovery Roll automatically reduces Stress by 1 point per hour.</p>
        </div>
      </div>
      
      <div id="tab-special" class="quick-ref-tab-content">
        <h3>Special Rolls</h3>
        <div class="special-roll-box">
          <h4>Natural 1 (Automatic Failure)</h4>
          <p>Rolling a 1 on a d20 is <strong class="danger-text">always a failure</strong>, regardless of modifiers.</p>
          <p>GM may apply additional complications or consequences.</p>
        </div>
        
        <div class="special-roll-box">
          <h4>Natural 17+ (Minor Effect)</h4>
          <p>Rolling 17-19 on a d20 grants a <strong class="warning-text">minor effect</strong>:</p>
          <p><strong>Combat:</strong> Additional damage (+1 for 17, +2 for 18, +3 for 19) OR additional effect (knock back, daze, etc.)</p>
          <p><strong>Non-Combat:</strong> Additional benefit, clue, or advantage</p>
        </div>
        
        <div class="special-roll-box">
          <h4>Natural 20 (Major Effect)</h4>
          <p>Rolling a 20 on a d20 grants a <strong style="color: ${primaryColor};">major effect</strong>:</p>
          <p><strong>Combat:</strong> +4 damage OR major effect (stun, disarm, etc.)</p>
          <p><strong>Non-Combat:</strong> Exceptional success with major bonus</p>
        </div>
        
        <div class="special-roll-box">
          <h4>Group Rolls</h4>
          <p>When the party acts together, one player rolls for the group.</p>
          <p><strong>Assets:</strong> An assisting player can ease or hinder a task based on the relevant skill.</p>
          <p><strong>Abilities:</strong> Some abilities can affect other player's rolls.</p>
        </div>
        
        <div class="special-roll-box">
          <h4>Retrying Failed Tasks</h4>
          <p>Cannot retry the same approach to a failed task.</p>
          <p><strong>Reroll:</strong> Costs 1XP to reroll a failed task</p>
          <p><strong>New Approach:</strong> Try different method, use different skill, or wait for circumstances to change</p>
          <p><strong>GM Intrusion:</strong> May allow retry with complications</p>
        </div>
      </div>
      
      <div id="tab-damage" class="quick-ref-tab-content">
        <h3>Damage Track</h3>
        <div class="damage-info-box">
          <h4>Hale</h4>
          <p><strong>Condition:</strong> Healthy and uninjured</p>
          <p><strong>Effect:</strong> <span class="warning-text">No penalties.</span></p>
        </div>
        
        <div class="damage-info-box">
          <h4>Hurt</h4>
          <p><strong>Condition:</strong> Minor injuries. Only available to certain tough characters.</p>
          <p><strong>Effect:</strong> <span class="warning-text">No penalties.</span></p>
        </div>

        <div class="damage-info-box">
          <h4 class="warning-text">Impaired</h4>
          <p><strong>Condition:</strong> Wounded or injured.</p>
          <p><strong>Effect:</strong> <span class="warning-text">Effort costs 1 extra point per level applied. </span></p>
          <p><strong>Combat:</strong> No minor or major effects or bonus damage on combat rolls.</p>
        </div>
        
        <div class="damage-info-box">
          <h4 class="danger-text">Debilitated</h4>
          <p><strong>Condition:</strong> Critically injured</p>
          <p><strong>Effect:</strong> <span class="danger-text">Cannot take actions except to move</span></p>
        </div>
        
        <div class="damage-info-box" style="border-color: #f44336;">
          <h4 class="danger-text">Dead</h4>
          <p><strong>Condition:</strong> <span class="danger-text">Character death</span></p>
        </div>
        
        <div class="damage-info-box">
          <h4>Recovery</h4>
          <p><strong>Healing action:</strong> To move each step up the damage track, one hour action with a difficulty of 6.</p>
          <p><strong>Medical attention:</strong> Professional medical care and lots of rest can restore the character to <strong>Hale</strong>.</p>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

function toggleQuickReferenceModal(event) {
  const modal = document.getElementById("quickReferenceModal");
  const button = event.target;

  if (modal.classList.contains("active")) {
    modal.classList.remove("active");
    button.classList.remove("active");
  } else {
    // Close all other panels and deactivate buttons
    document
      .querySelectorAll(".ref-panel")
      .forEach((p) => p.classList.remove("active"));
    document
      .querySelectorAll(".toolbar-button")
      .forEach((b) => b.classList.remove("active"));

    modal.classList.add("active");
    button.classList.add("active");
  }
}

function switchRefTab(tabName) {
  // Deactivate all tabs and content
  document
    .querySelectorAll(".quick-ref-tab")
    .forEach((tab) => tab.classList.remove("active"));
  document
    .querySelectorAll(".quick-ref-tab-content")
    .forEach((content) => content.classList.remove("active"));

  // Activate selected tab and content
  event.target.classList.add("active");
  document.getElementById(`tab-${tabName}`).classList.add("active");
}

// Close panels when clicking outside
document.addEventListener("click", function (event) {
  if (
    !event.target.closest(".quick-ref-toolbar") &&
    !event.target.closest(".ref-panel")
  ) {
    const allPanels = document.querySelectorAll(".ref-panel");
    const allButtons = document.querySelectorAll(".toolbar-button");

    allPanels.forEach((p) => p.classList.remove("active"));
    allButtons.forEach((b) => b.classList.remove("active"));
  }
});

// Chat Panel Toggle
function toggleChatPanel() {
  const panel = document.getElementById("chatPanel");
  if (panel) {
    if (panel.style.display === "none" || !panel.style.display) {
      panel.style.display = "flex";
    } else {
      panel.style.display = "none";
    }
  }
}

// Initialize toolbar when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  initializeToolbar();
});
