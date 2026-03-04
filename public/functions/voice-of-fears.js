/**
 * Voice of the Fears
 * ─────────────────────────────────────────────────────────────────────────────
 * GM tool: compose and send styled subliminal fear messages to players.
 * Player side: receive messages over Firebase and display a full-screen overlay.
 *
 * Shared between gm-dashboard.html (send) and player-view.html (display).
 * Entity config is the single source of truth for all theming.
 */

// ==================== ENTITY CONFIG ==================== //

const fearEntities = {
  eye: {
    name: "The Eye",
    label: "👁 Eye",
    color: "#FF8F00",
    glow: "#FFCC02",
    bg: "radial-gradient(ellipse at center, #1a0a00 0%, #000000 100%)",
    overlayClass: "fear-overlay-eye",
    textClass: "fear-text-eye",
  },
  web: {
    name: "The Web",
    label: "🕸 Web",
    color: "#9C27B0",
    glow: "#CE93D8",
    bg: "radial-gradient(ellipse at center, #0d001a 0%, #000000 100%)",
    overlayClass: "fear-overlay-web",
    textClass: "fear-text-web",
  },
  spiral: {
    name: "The Spiral",
    label: "🌀 Spiral",
    color: "#E91E63",
    glow: "#F48FB1",
    bg: "radial-gradient(ellipse at center, #1a0010 0%, #000000 100%)",
    overlayClass: "fear-overlay-spiral",
    textClass: "fear-text-spiral",
  },
  dark: {
    name: "The Dark",
    label: "🌑 Dark",
    color: "#607D8B",
    glow: "#90A4AE",
    bg: "#000000",
    overlayClass: "fear-overlay-dark",
    textClass: "fear-text-dark",
  },
  buried: {
    name: "The Buried",
    label: "⬛ Buried",
    color: "#A1887F",
    glow: "#D7CCC8",
    bg: "linear-gradient(to bottom, #1a0f00 0%, #0d0500 100%)",
    overlayClass: "fear-overlay-buried",
    textClass: "fear-text-buried",
  },
  desolation: {
    name: "The Desolation",
    label: "🔥 Desolation",
    color: "#FF5722",
    glow: "#FFCCBC",
    bg: "radial-gradient(ellipse at center, #1a0800 0%, #000000 100%)",
    overlayClass: "fear-overlay-desolation",
    textClass: "fear-text-desolation",
  },
  corruption: {
    name: "The Corruption",
    label: "🦠 Corruption",
    color: "#8BC34A",
    glow: "#DCEDC8",
    bg: "radial-gradient(ellipse at center, #001a00 0%, #000000 100%)",
    overlayClass: "fear-overlay-corruption",
    textClass: "fear-text-corruption",
  },
  lonely: {
    name: "The Lonely",
    label: "💙 Lonely",
    color: "#546E7A",
    glow: "#84C3D8",
    bg: "linear-gradient(to bottom, #010a0f 0%, #050505 100%)",
    overlayClass: "fear-overlay-lonely",
    textClass: "fear-text-lonely",
  },
  slaughter: {
    name: "The Slaughter",
    label: "🩸 Slaughter",
    color: "#F44336",
    glow: "#FF8A80",
    bg: "radial-gradient(ellipse at center, #1a0000 0%, #050000 100%)",
    overlayClass: "fear-overlay-slaughter",
    textClass: "fear-text-slaughter",
  },
  hunt: {
    name: "The Hunt",
    label: "🗡 Hunt",
    color: "#4CAF50",
    glow: "#A5D6A7",
    bg: "linear-gradient(to right, #001500 0%, #000000 100%)",
    overlayClass: "fear-overlay-hunt",
    textClass: "fear-text-hunt",
  },
  flesh: {
    name: "The Flesh",
    label: "🩻 Flesh",
    color: "#F06292",
    glow: "#F8BBD9",
    bg: "radial-gradient(ellipse at center, #1a000d 0%, #000000 100%)",
    overlayClass: "fear-overlay-flesh",
    textClass: "fear-text-flesh",
  },
  stranger: {
    name: "The Stranger",
    label: "👤 Stranger",
    color: "#B0BEC5",
    glow: "#ECEFF1",
    bg: "linear-gradient(to bottom, #0a0a0a 0%, #050508 100%)",
    overlayClass: "fear-overlay-stranger",
    textClass: "fear-text-stranger",
  },
  vast: {
    name: "The Vast",
    label: "🌌 Vast",
    color: "#5C6BC0",
    glow: "#C5CAE9",
    bg: "radial-gradient(ellipse at center, #000010 0%, #000000 100%)",
    overlayClass: "fear-overlay-vast",
    textClass: "fear-text-vast",
  },
  end: {
    name: "The End",
    label: "☠ End",
    color: "#9E9E9E",
    glow: "#EEEEEE",
    bg: "linear-gradient(to bottom, #050505 0%, #000000 100%)",
    overlayClass: "fear-overlay-end",
    textClass: "fear-text-end",
  },
};

// ==================== GM SIDE ==================== //

let fearSelectedEntity = "eye";
let fearDuration = 3000;

function selectFearEntity(entityKey) {
  fearSelectedEntity = entityKey;

  // Update button active states
  document.querySelectorAll(".fear-entity-btn").forEach((btn) => {
    const e = fearEntities[btn.dataset.entity];
    if (!e) return;
    if (btn.dataset.entity === entityKey) {
      btn.style.cssText = `
        background: ${e.color}22;
        border: 1px solid ${e.color};
        color: ${e.color};
        box-shadow: 0 0 8px ${e.color}88;
        border-radius: 4px;
        padding: 5px 4px;
        cursor: pointer;
        font-size: 0.7em;
        white-space: nowrap;
      `;
    } else {
      btn.style.cssText = `
        background: rgba(0,0,0,0.3);
        border: 1px solid ${e.color}55;
        color: ${e.color}aa;
        box-shadow: none;
        border-radius: 4px;
        padding: 5px 4px;
        cursor: pointer;
        font-size: 0.7em;
        white-space: nowrap;
      `;
    }
  });

  // Tint the textarea border
  const ta = document.getElementById("fearMessageInput");
  if (ta) {
    const e = fearEntities[entityKey];
    ta.style.borderColor = e.color + "99";
    ta.style.boxShadow = `0 0 6px ${e.color}44`;
  }
}

function setFearDuration(ms) {
  fearDuration = ms;
  document.querySelectorAll(".fear-dur-btn").forEach((btn) => {
    const isActive = parseInt(btn.dataset.ms) === ms;
    btn.style.background = isActive
      ? "rgba(120,80,180,0.35)"
      : "rgba(0,0,0,0.3)";
    btn.style.borderColor = isActive ? "#9C27B0" : "#555";
    btn.style.color = isActive ? "#CE93D8" : "#888";
    btn.style.fontWeight = isActive ? "bold" : "normal";
  });
}

function updateFearTargetDropdown(players) {
  const sel = document.getElementById("fearTarget");
  if (!sel) return;
  const individual = players
    .map((p) => `<option value="${p.id}">${p.name}</option>`)
    .join("");
  sel.innerHTML =
    individual +
    `<option value="all" style="color:#ffb74d;">— All Players —</option>`;
}

async function sendFearMessage() {
  const ta = document.getElementById("fearMessageInput");
  const message = (ta ? ta.value : "").trim();

  if (!message) {
    alert("Please enter a message.");
    return;
  }
  if (!fearSelectedEntity) {
    alert("Please select an Entity.");
    return;
  }
  if (
    typeof multiplayerManager === "undefined" ||
    !multiplayerManager.roomCode
  ) {
    alert("No active multiplayer session.");
    return;
  }

  const targetEl = document.getElementById("fearTarget");
  const targetId = targetEl ? targetEl.value : "all";
  const targetName =
    targetEl
      ? targetEl.options[targetEl.selectedIndex]?.text || "All Players"
      : "All Players";

  const entity = fearEntities[fearSelectedEntity];
  const payload = {
    targetPlayerId: targetId,
    entity: fearSelectedEntity,
    message,
    duration: fearDuration,
    timestamp: Date.now(),
    delivered: false,
  };

  try {
    await multiplayerManager.db
      .ref(
        `rooms/${multiplayerManager.roomCode}/sharedData/fearMessages`,
      )
      .push(payload);

    // Log to GM chat with a fear flag so it renders distinctly
    if (typeof displayChatMessage === "function") {
      displayChatMessage({
        from: "gm",
        fromName: "GM",
        to: targetId,
        toName: targetName,
        message: `\u{1F441} [Voice of the Fears\u00A0\u2014\u00A0${entity.name}]: \u201C${message}\u201D`,
        timestamp: Date.now(),
        fromGM: true,
        isFearMessage: true,
      });
    }

    // Clear input
    if (ta) ta.value = "";

    // Brief flash on the Send button to confirm
    const sendBtn = document.getElementById("fearSendBtn");
    if (sendBtn) {
      sendBtn.textContent = "✓ Sent";
      sendBtn.style.background = entity.color + "55";
      setTimeout(() => {
        sendBtn.textContent = "👁 Send Fear";
        sendBtn.style.background = "";
      }, 1200);
    }
  } catch (err) {
    console.error("Error sending fear message:", err);
    alert("Failed to send: " + err.message);
  }
}

// ==================== PLAYER SIDE ==================== //

let fearStylesInjected = false;

function injectFearStyles() {
  if (fearStylesInjected) return;
  fearStylesInjected = true;

  const style = document.createElement("style");
  style.id = "fearOverlayStyles";
  style.textContent = `
/* ===== FEAR OVERLAY BASE ===== */
#fearOverlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.5s ease;
}
#fearOverlay.fear-visible { opacity: 1; }
.fear-text-wrapper {
  position: relative;
  max-width: 68vw;
  text-align: center;
  padding: 2.5em 3em;
}

/* ===== THE EYE ===== */
.fear-overlay-eye {
  background: radial-gradient(ellipse at center, #1a0a00 0%, #000000 100%);
  box-shadow: inset 0 0 120px 40px #000000cc;
}
@keyframes fearEyeReveal {
  from { opacity: 0; filter: blur(6px); letter-spacing: 0.5em; }
  to   { opacity: 1; filter: blur(0);   letter-spacing: 0.25em; }
}
.fear-text-eye {
  color: #FF8F00;
  font-variant: small-caps;
  letter-spacing: 0.25em;
  font-size: clamp(1.3rem, 3vw, 2.4rem);
  line-height: 1.7;
  text-shadow: 0 0 20px #FF8F0099, 0 0 50px #FF8F0044;
  animation: fearEyeReveal 1.2s ease forwards;
}

/* ===== THE WEB ===== */
.fear-overlay-web {
  background: radial-gradient(ellipse at center, #0d001a 0%, #000000 100%);
}
@keyframes fearWebDrift {
  from { opacity: 0; transform: translateY(-12px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0)    scale(1); }
}
.fear-text-web {
  color: #CE93D8;
  font-size: clamp(1.1rem, 2.5vw, 2rem);
  line-height: 1.9;
  text-shadow: 0 0 15px #9C27B099;
  letter-spacing: 0.12em;
  animation: fearWebDrift 1s ease forwards;
}

/* ===== THE SPIRAL ===== */
.fear-overlay-spiral {
  background: radial-gradient(ellipse at center, #1a0010 0%, #000000 100%);
  animation: fearSpiralRotate 5s ease-in-out infinite alternate;
}
@keyframes fearSpiralRotate {
  from { filter: hue-rotate(0deg); }
  to   { filter: hue-rotate(15deg); }
}
@keyframes fearSpiralText {
  0%   { opacity: 0; transform: rotate(-3deg) scale(0.96); }
  60%  { transform: rotate(1.5deg) scale(1.02); }
  100% { opacity: 1; transform: rotate(0deg)  scale(1); }
}
.fear-text-spiral {
  color: #F48FB1;
  font-style: italic;
  font-size: clamp(1.2rem, 3vw, 2.3rem);
  line-height: 1.7;
  text-shadow: 0 0 20px #E91E6399, 0 0 40px #E91E6344;
  animation: fearSpiralText 1s ease forwards;
}

/* ===== THE DARK ===== */
.fear-overlay-dark { background: #000000; }
@keyframes fearDarkReveal {
  0%   { opacity: 0; }
  30%  { opacity: 0.18; }
  70%  { opacity: 0.14; }
  100% { opacity: 0.16; }
}
.fear-text-dark {
  color: #90A4AE;
  font-size: clamp(1rem, 2.5vw, 1.9rem);
  line-height: 1.9;
  letter-spacing: 0.22em;
  text-shadow: none;
  opacity: 0;
  animation: fearDarkReveal 2.5s ease forwards;
}

/* ===== THE BURIED ===== */
@keyframes fearBuriedSlide {
  from { clip-path: inset(0 0 100% 0); }
  to   { clip-path: inset(0 0 0%    0); }
}
@keyframes fearBuriedText {
  from { opacity: 0; transform: translateY(-16px); }
  to   { opacity: 1; transform: translateY(0); }
}
.fear-overlay-buried {
  background: linear-gradient(to bottom, #1a0f00 0%, #0d0500 100%);
  animation: fearBuriedSlide 0.55s cubic-bezier(0.25,0.46,0.45,0.94) forwards;
}
.fear-text-buried {
  color: #D7CCC8;
  font-size: clamp(1.1rem, 2.5vw, 2rem);
  line-height: 1.7;
  letter-spacing: 0.06em;
  text-shadow: 0 2px 10px #00000099;
  opacity: 0;
  animation: fearBuriedText 0.7s 0.4s ease forwards;
}

/* ===== THE DESOLATION ===== */
.fear-overlay-desolation {
  background: radial-gradient(ellipse at center, #1a0800 0%, #000000 100%);
}
@keyframes fearDesolationScorch {
  0%   { opacity: 0; text-shadow: 0 0 0 transparent; }
  25%  { opacity: 0.6; text-shadow: 0 0 25px #FF5722cc, 0 0 50px #FF572266; }
  100% { opacity: 1; text-shadow: 0 0 35px #FF5722bb, 0 0 70px #FF572255; }
}
.fear-text-desolation {
  color: #FFCCBC;
  font-size: clamp(1.2rem, 3vw, 2.3rem);
  line-height: 1.7;
  animation: fearDesolationScorch 1.3s ease forwards;
}

/* ===== THE CORRUPTION ===== */
.fear-overlay-corruption {
  background: radial-gradient(ellipse at center, #001a00 0%, #000000 100%);
}
@keyframes fearCorruptionOoze {
  0%   { opacity: 0; filter: blur(4px) saturate(2.5); transform: scaleY(0.95); }
  100% { opacity: 1; filter: blur(0)   saturate(1);   transform: scaleY(1); }
}
.fear-text-corruption {
  color: #DCEDC8;
  font-size: clamp(1.1rem, 2.5vw, 2rem);
  line-height: 1.9;
  text-shadow: 0 0 20px #8BC34A88;
  letter-spacing: 0.07em;
  animation: fearCorruptionOoze 1.6s ease forwards;
}

/* ===== THE LONELY ===== */
.fear-overlay-lonely {
  background: linear-gradient(to bottom, #010a0f 0%, #050505 100%);
}
@keyframes fearLonelyFade {
  from { opacity: 0; transform: scale(0.97); }
  to   { opacity: 1; transform: scale(1); }
}
.fear-text-lonely {
  color: #84C3D8;
  font-size: clamp(1.2rem, 2.8vw, 2.1rem);
  line-height: 2.1;
  letter-spacing: 0.18em;
  text-shadow: 0 0 40px #546E7A55;
  animation: fearLonelyFade 2.2s ease forwards;
}

/* ===== THE SLAUGHTER ===== */
.fear-overlay-slaughter {
  background: radial-gradient(ellipse at center, #1a0000 0%, #050000 100%);
}
@keyframes fearSlaughterSnap {
  0%   { opacity: 0; transform: scale(1.05); filter: blur(1px); }
  6%   { opacity: 1; transform: scale(1);    filter: blur(0); }
  100% { opacity: 1; transform: scale(1); }
}
.fear-text-slaughter {
  color: #FF8A80;
  font-weight: 900;
  font-size: clamp(1.4rem, 3.8vw, 2.8rem);
  line-height: 1.4;
  letter-spacing: 0.1em;
  text-shadow: 0 0 20px #F44336cc, 0 0 50px #F4433655;
  animation: fearSlaughterSnap 0.12s ease forwards;
}

/* ===== THE HUNT ===== */
.fear-overlay-hunt {
  background: linear-gradient(to right, #001500 0%, #000000 100%);
}
@keyframes fearHuntStalk {
  from { opacity: 0; transform: translateX(-28px); }
  to   { opacity: 1; transform: translateX(0); }
}
.fear-text-hunt {
  color: #A5D6A7;
  font-size: clamp(1.1rem, 2.5vw, 2rem);
  line-height: 1.7;
  letter-spacing: 0.14em;
  text-shadow: 0 0 16px #4CAF5088;
  animation: fearHuntStalk 0.7s ease forwards;
}
/* Letterbox bars for The Hunt */
.fear-hunt-bar {
  position: fixed;
  left: 0; right: 0;
  height: 90px;
  background: #000000;
  z-index: 100000;
  pointer-events: none;
}

/* ===== THE FLESH ===== */
.fear-overlay-flesh {
  background: radial-gradient(ellipse at center, #1a000d 0%, #000000 100%);
}
@keyframes fearFleshPulse {
  0%   { opacity: 0; transform: scale(0.95); }
  18%  { opacity: 1; transform: scale(1.02); }
  36%  { transform: scale(0.99); }
  54%  { transform: scale(1.01); }
  72%  { transform: scale(0.995); }
  100% { transform: scale(1); opacity: 1; }
}
.fear-text-flesh {
  color: #F8BBD9;
  font-size: clamp(1.2rem, 3vw, 2.3rem);
  line-height: 1.7;
  text-shadow: 0 0 22px #F0629288;
  animation: fearFleshPulse 1.4s ease forwards;
}

/* ===== THE STRANGER ===== */
.fear-overlay-stranger {
  background: linear-gradient(to bottom, #0a0a0a 0%, #050508 100%);
}
@keyframes fearStrangerWrong {
  from { opacity: 0; letter-spacing: 0.35em; word-spacing: 0.5em; }
  to   { opacity: 1; letter-spacing: 0.06em; word-spacing: normal; }
}
.fear-text-stranger {
  color: #ECEFF1;
  font-size: clamp(1.1rem, 2.5vw, 2rem);
  line-height: 1.8;
  font-weight: 300;
  font-family: "Courier New", monospace;
  text-shadow: 0 0 12px #B0BEC544;
  animation: fearStrangerWrong 1.3s ease forwards;
}

/* ===== THE VAST ===== */
.fear-overlay-vast {
  background: radial-gradient(ellipse at center, #000010 0%, #000000 100%);
}
@keyframes fearVastExpand {
  from { opacity: 0; transform: scale(0.2); letter-spacing: -0.1em; }
  to   { opacity: 1; transform: scale(1);   letter-spacing: 0.22em; }
}
.fear-text-vast {
  color: #C5CAE9;
  font-size: clamp(1.2rem, 3vw, 2.5rem);
  line-height: 1.7;
  letter-spacing: 0.22em;
  text-shadow: 0 0 50px #5C6BC099, 0 0 90px #5C6BC033;
  animation: fearVastExpand 1.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
}

/* ===== THE END ===== */
.fear-overlay-end {
  background: linear-gradient(to bottom, #050505 0%, #000000 100%);
}
@keyframes fearEndSettle {
  from { opacity: 0.9; transform: scale(1.008); }
  to   { opacity: 1;   transform: scale(1); }
}
.fear-text-end {
  color: #BDBDBD;
  font-size: clamp(1.1rem, 2.5vw, 2rem);
  line-height: 2;
  letter-spacing: 0.28em;
  font-weight: 300;
  text-shadow: none;
  animation: fearEndSettle 2.5s ease forwards;
}

/* ===== FADE OUT ===== */
@keyframes fearOverlayFadeOut {
  from { opacity: 1; }
  to   { opacity: 0; }
}
#fearOverlay.fear-fading {
  animation: fearOverlayFadeOut 0.7s ease forwards !important;
  transition: none !important;
}

/* ===== REDUCED MOTION FALLBACK ===== */
@media (prefers-reduced-motion: reduce) {
  #fearOverlay * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
  `;
  document.head.appendChild(style);
}

function showFearMessage(data) {
  injectFearStyles();

  const entity = fearEntities[data.entity];
  if (!entity) return;

  // Remove any existing overlay
  const existing = document.getElementById("fearOverlay");
  if (existing) existing.remove();
  document
    .querySelectorAll(".fear-hunt-bar")
    .forEach((el) => el.remove());

  const overlay = document.createElement("div");
  overlay.id = "fearOverlay";
  overlay.className = entity.overlayClass;
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 99999;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.5s ease;
    background: ${entity.bg};
  `;

  // Escape user content before inserting
  const div = document.createElement("div");
  div.textContent = data.message;
  const safeMessage = div.innerHTML;

  overlay.innerHTML = `
    <div class="fear-text-wrapper">
      <div class="${entity.textClass}">${safeMessage}</div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Letterbox bars for The Hunt
  if (data.entity === "hunt") {
    ["top: 0", "bottom: 0"].forEach((pos) => {
      const bar = document.createElement("div");
      bar.className = "fear-hunt-bar";
      bar.style.cssText = pos + "; left: 0; right: 0; height: 90px; background: #000; position: fixed; z-index: 100000; pointer-events: none;";
      document.body.appendChild(bar);
    });
  }

  // Fade in (double rAF ensures transition fires)
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      overlay.style.opacity = "1";
    });
  });

  // Fade out after duration, then remove
  const displayMs = data.duration || 3000;
  const fadeMs = 700;
  setTimeout(() => {
    overlay.classList.add("fear-fading");
    document
      .querySelectorAll(".fear-hunt-bar")
      .forEach((el) => {
        el.style.transition = "opacity 0.7s ease";
        el.style.opacity = "0";
      });
    setTimeout(() => {
      if (overlay.parentNode) overlay.remove();
      document.querySelectorAll(".fear-hunt-bar").forEach((el) => el.remove());
    }, fadeMs + 50);
  }, displayMs);
}
