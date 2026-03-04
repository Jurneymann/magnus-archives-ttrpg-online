# 💬 Chat System - Implementation Guide

## Overview

The chat system enables real-time communication between the GM and players during multiplayer sessions. Messages are synced via Firebase Realtime Database and support both broadcast (to all players) and individual messaging.

---

## Features

### GM Chat Features

- **Send to All Players**: Broadcast messages to everyone in the session
- **Individual Messaging**: Send private messages to specific players
- **Real-time Updates**: See all incoming player messages instantly
- **Player List Dropdown**: Automatically populated with connected players
- **Player Colour Coding**: Each player is assigned a unique colour from a 10-colour palette; all messages from that player render in their colour across the whole session
- **Typing Indicators**: A live "X is typing" banner appears when one or more players are composing a message
- **Read Receipts**: GM sent messages show ✓ Delivered or ✓✓ Read status
- **Swear Word Highlighting**: Profanity is highlighted with an animated red-orange gradient
- **Floating Chat Panel**: Chat opens as a standalone floating panel via the 💬 Chat button in the toolbar; independent of the multiplayer setup modal
- **Message Deduplication**: Duplicate Firebase events are suppressed using `data-message-id` attributes
- **Auto-scroll**: Newest messages automatically scroll into view

### Player Chat Features

- **Direct GM Messaging**: All player messages go directly to the GM
- **Message Notifications**: Visual badge on chat tab when new messages arrive
- **Real-time Updates**: Receive GM messages instantly
- **Color Coding**: Sent messages (green) vs received messages (blue)
- **Enter Key Support**: Press Enter to send messages quickly
- **Auto-clear Badge**: Notification badge clears when chat tab is opened

---

## Architecture

### Firebase Structure

```
rooms/
  {roomCode}/
    sharedData/
      chat/
        {messageId}/
          from: "player123" or "GM"
          fromName: "Player Name" or "GM"
          to: "GM" or "player123" or "all"
          toName: "GM" or "Player Name" or "All Players"
          message: "Message text"
          timestamp: 1234567890
          fromGM: true/false
          read: true/false
      typing/
        {playerId}: true/false
```

### Backend Methods (multiplayer.js)

#### `sendChatMessage(to, message)`

Sends a chat message to specified recipient.

- **Parameters:**
  - `to` (string): Recipient ID ("GM", "all", or player ID)
  - `message` (string): Message content
- **Returns:** Promise<void>
- **Writes to:** `/rooms/{roomCode}/sharedData/chat/{messageId}`

#### `onChatMessage(callback)`

Listens for incoming chat messages filtered by recipient.

- **Parameters:**
  - `callback` (function): Called with message object when new message arrives
- **Filters:**
  - GM: Sees all messages
  - Players: See only messages where `to === playerID` or `to === 'all'`

#### `markChatAsRead(messageId)`

Marks a message as read; updates the `read` flag in Firebase, triggering a read receipt update on the GM side.

- **Parameters:**
  - `messageId` (string): Firebase message key

#### `setTypingStatus(isTyping)`

Broadcasts the current user's typing status to Firebase.

- **Parameters:**
  - `isTyping` (boolean): `true` when composing, `false` when done
- **Writes to:** `/rooms/{roomCode}/sharedData/typing/{userId}`
- **Auto-cleared** after 2 seconds of inactivity via `handleGMChatTyping()`

#### `onTypingStatus(callback)`

Listens for typing status changes from any participant.

- **Parameters:**
  - `callback` (function): Called with an array of names currently typing
- **Note:** Filters out the current user's own typing status

---

## GM Implementation

### UI Components (index.html)

The chat system lives in a dedicated **floating panel** (`id="chatPanel"`), separate from the multiplayer setup modal. It is toggled open/closed via the 💬 Chat toolbar button (`id="chatButton"`):

```html
<!-- Chat Panel (floating, shown/hidden via toggleChatPanel()) -->
<div id="chatPanel" style="display: none;">

  <!-- Typing Indicator -->
  <div id="gmTypingIndicator" style="display: none;">
    <span></span>
  </div>

  <!-- Message Display Container -->
  <div id="chatMessagesContainer"
    style="height: 300px; overflow-y: auto; margin-bottom: 15px;">
    <!-- messages rendered here -->
  </div>

  <!-- Recipient Dropdown -->
  <select id="chatRecipient">
    <option value="all">All Players</option>
  </select>

  <!-- Message Input -->
  <input
    type="text"
    id="chatMessageInput"
    placeholder="Type your message..."
    oninput="handleGMChatTyping()"
    onkeypress="if(event.key==='Enter') sendChatMessage()"
  />

  <!-- Send Button -->
  <button onclick="sendChatMessage()">Send</button>
</div>

<!-- Chat toolbar button (shown after room creation) -->
<button id="chatButton" onclick="toggleChatPanel()" style="display: none;">
  💬 Chat
  <span id="chatNotificationBadge" style="display: none;">!</span>
</button>
```

### JavaScript Functions (gm-multiplayer.js)

#### `updateChatRecipients(players)`

Populates the recipient dropdown with connected players.

```javascript
function updateChatRecipients(players) {
  const select = document.getElementById("chatRecipient");
  if (!select) return;

  const allOption = '<option value="all">All Players</option>';
  const playerList = players || [];

  const playerOptions = playerList
    .map((p) => `<option value="${p.id}">${p.name}</option>`)
    .join("");

  select.innerHTML = allOption + playerOptions;
}
```

#### `sendChatMessage()`

Sends message from GM to selected recipient. The display is handled automatically via the Firebase `onChatMessage` listener — there is no local display call needed.

```javascript
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

  multiplayerManager.sendChatMessage(recipient, message);
  input.value = "";
}
```

#### `handleGMChatTyping()`

Fires on every keystroke in the GM chat input. Sets typing status to `true` and auto-clears it after 2 seconds of inactivity.

```javascript
let gmTypingTimeout;
function handleGMChatTyping() {
  if (!multiplayerManager) return;
  multiplayerManager.setTypingStatus(true);
  clearTimeout(gmTypingTimeout);
  gmTypingTimeout = setTimeout(() => {
    multiplayerManager.setTypingStatus(false);
  }, 2000);
}
```

#### `toggleChatPanel()`

Shows/hides the floating chat panel and clears the notification badge on open.

```javascript
function toggleChatPanel() {
  const panel = document.getElementById("chatPanel");
  const badge = document.getElementById("chatNotificationBadge");
  if (!panel) return;
  if (panel.style.display === "none" || panel.style.display === "") {
    panel.style.display = "flex";
    if (badge) badge.style.display = "none";
  } else {
    panel.style.display = "none";
  }
}
```

#### `displayChatMessage(msg)`

Renders a chat message in the GM's chat panel (`chatMessagesContainer`). Features player-specific colours, read receipts, and swear word highlighting.

Key behaviours:

- **Deduplication**: Checks `data-message-id` on existing elements to skip duplicates
- **Player colour**: Looks up `getPlayerColor(msg.from)` for received messages
- **Read receipts**: Sent (GM) messages include a `✓ Delivered` / `✓✓ Read` status footer
- **Swear highlighting**: Message text is passed through `highlightSwearWords()` before rendering
- **Notification badge**: Shows `chatNotificationBadge` if the chat panel is closed when a player message arrives

```javascript
function displayChatMessage(msg) {
  const container = document.getElementById("chatMessagesContainer");
  if (!container) return;

  // Deduplication
  if (msg.id && container.querySelector(`[data-message-id="${msg.id}"]`)) return;

  const isSent = msg.from === "gm" || msg.fromName === "GM";
  const messageColor = isSent ? "#4caf50" : getPlayerColor(msg.from);

  const msgDiv = document.createElement("div");
  msgDiv.setAttribute("data-message-id", msg.id || Date.now());
  msgDiv.style.cssText = `
    margin-bottom: 10px; padding: 10px; border-radius: 6px;
    background: ${isSent ? "rgba(76,175,80,0.1)" : messageColor + "1a"};
    border-left: 3px solid ${messageColor};
  `;

  const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const recipientText = msg.to === "all" ? "to All Players" : msg.toName ? `to ${msg.toName}` : "";

  msgDiv.innerHTML = `
    <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
      <div style="font-weight:bold; color:${messageColor}; font-size:0.9em;">
        ${isSent ? "👑 " : ""}${msg.fromName} ${recipientText}
      </div>
      <div style="font-size:0.75em; color:#888;">${time}</div>
    </div>
    <div style="color:#e0e0e0; font-size:0.9em; line-height:1.4;">
      ${highlightSwearWords(msg.message)}
    </div>
    ${isSent ? `<div style="text-align:right; margin-top:4px;">
      ${msg.read ? "✓✓ Read" : "✓ Delivered"}
    </div>` : ""}
  `;

  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
}
```

### Integration

In `createMultiplayerRoom()`:

```javascript
// Chat
multiplayerManager.onChatMessage((message) => {
  displayChatMessage(message);
});

// Typing indicator
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
```

Recipients are refreshed when players connect/disconnect:

```javascript
// In updateConnectedPlayersList()
assignPlayerColor(player.id); // Ensure colour assigned before rendering
updateChatRecipients(playerArray);
```

---

## Player Colour System

Each player is assigned a unique colour on first connection:

```javascript
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
```

`assignPlayerColor(playerId)` maps each player ID to the next available colour. `getPlayerColor(playerId)` retrieves it (defaults to blue if not yet assigned). Colours cycle if there are more than 10 players.

---

## Typing Indicators

Both GM and players can broadcast typing status.

- When the GM types in `chatMessageInput`, `handleGMChatTyping()` fires `setTypingStatus(true)` and schedules `setTypingStatus(false)` after 2 seconds
- Player view: typing status fires on `oninput` of `playerChatInput`
- The GM sees the `gmTypingIndicator` banner update in real time via `onTypingStatus()`
- Players do **not** currently display a typing indicator for the GM

---

## Swear Word Highlighting

Both GM and player implementations include a `highlightSwearWords(text)` function. It:

1. Escapes the raw text to prevent XSS
2. Builds a whole-word regex from a list of ~100 profanity terms (common English, British/Australian slang, body parts, insults, and mild variants)
3. Replaces each match with a `<span>` styled with an animated red-orange gradient and `swearPulse` CSS animation

This runs on **all** rendered messages — both sent and received — in both GM and player views.

---

## Player Implementation

### UI Components (player-view.html)

#### Tab Button

```html
<button class="tab-button" data-tab="chat" id="chatTab">💬 Chat</button>
```

#### Chat Content Section

```html
<div class="tab-content" id="chat" style="display: none;">
  <div class="section">
    <h2 style="color: #ff9800;">💬 Chat with GM</h2>

    <!-- Message Display -->
    <div id="playerChatContainer" style="height: 400px; overflow-y: auto;">
      No messages yet. The GM will message you here during the session.
    </div>

    <!-- Message Input -->
    <input
      type="text"
      id="playerChatInput"
      placeholder="Type your message to the GM..."
      onkeypress="if(event.key==='Enter') sendPlayerChatMessage()"
    />
    <button onclick="sendPlayerChatMessage()">Send</button>

    <div style="font-size: 0.85em; color: #888;">
      💡 Press Enter to send. All messages go to the GM.
    </div>
  </div>
</div>
```

### JavaScript Functions (player-multiplayer.js)

#### `sendPlayerChatMessage()`

Sends message from player to GM. Display is handled automatically by the Firebase `onChatMessage` listener.

```javascript
function sendPlayerChatMessage() {
  const input = document.getElementById("playerChatInput");
  const message = input.value.trim();

  if (!message) return;

  if (!isConnectedToRoom) {
    showPlayerNotification("⚠️ Not connected to a game session", "error");
    return;
  }

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
```

> **Note:** The `onChatMessage` listener in the player also filters `[AVATAR_UNLOCK:]`-prefixed messages — these are system messages used to unlock the Avatar tab and are only shown to the intended player after the prefix is stripped.

#### `displayPlayerChatMessage(msg, sentByUs)`

Renders a chat message in the player's chat container. Also uses `highlightSwearWords()` on the message text.

The `isSentByUs` check compares `msg.from` against `multiplayerManager.playerId` and `multiplayerManager.playerName`, which handles cases where the Firebase echo arrives before the local display.

```javascript
function displayPlayerChatMessage(msg, sentByUs = false) {
  const container = document.getElementById("playerChatContainer");
  if (!container) return;

  const isSentByUs =
    sentByUs ||
    msg.from === multiplayerManager.playerId ||
    msg.from === multiplayerManager.playerName ||
    (msg.fromName === multiplayerManager.playerName && !msg.fromGM);

  let backgroundColor, borderColor, senderLabel;
  if (isSentByUs) {
    backgroundColor = "rgba(76, 175, 80, 0.2)";
    borderColor = "#4caf50";
    senderLabel = `You → ${msg.toName || "GM"}`;
  } else {
    backgroundColor = "rgba(33, 150, 243, 0.2)";
    borderColor = "#2196f3";
    senderLabel = "GM";
  }

  const messageDiv = document.createElement("div");
  // ... styling and innerHTML using highlightSwearWords(msg.message) ...

  container.appendChild(messageDiv);
  container.scrollTop = container.scrollHeight;

  // Mark as read after 1 second
  if (!isSentByUs && msg.id) {
    setTimeout(() => { multiplayerManager?.markChatAsRead(msg.id); }, 1000);
  }
}
```

#### `updateChatBadge(show)`

Shows/hides notification badge on chat tab.

```javascript
function updateChatBadge(show) {
  const chatTab = document.querySelector('[data-tab="chat"]');
  if (!chatTab) return;

  let badge = chatTab.querySelector(".chat-badge");

  if (show && !badge) {
    badge = document.createElement("span");
    badge.className = "chat-badge";
    badge.style.cssText = `
      position: absolute;
      top: 5px;
      right: 5px;
      background: #f44336;
      color: white;
      border-radius: 50%;
      width: 18px;
      height: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.7em;
      font-weight: bold;
      animation: pulse 1.5s infinite;
    `;
    badge.textContent = "!";
    chatTab.style.position = "relative";
    chatTab.appendChild(badge);
  } else if (!show && badge) {
    badge.remove();
  }
}
```

### Integration

#### Chat Listener Setup

In `setupMultiplayerListeners()`:

```javascript
multiplayerManager.onChatMessage((message) => {
  displayPlayerChatMessage(message, false); // false = received from GM

  // Show badge if chat tab not visible
  const chatTab = document.querySelector('[data-tab="chat"]');
  const chatContent = document.getElementById("chat");
  if (chatTab && chatContent && chatContent.style.display === "none") {
    updateChatBadge(true);
  }
});
```

#### Badge Clearing

In `tab-system.js`:

```javascript
// Clear chat badge when switching to chat tab
if (targetTab === "chat" && typeof updateChatBadge === "function") {
  updateChatBadge(false);
}
```

---

## Testing Guide

### Setup

1. Open `index.html` (GM view)
2. Click "🌐 Multiplayer" button
3. Click "Start New Game"
4. Note the 6-character room code
5. Open `welcome.html` in new tab/window
6. Enter room code and player name
7. Click "Join Game"

### Test Cases

#### Test 1: GM → All Players Broadcast

1. In GM view, ensure "📢 All Players" is selected in dropdown
2. Type "Hello everyone!" and press Enter
3. **Expected:** Message appears in GM chat (green border)
4. Switch to player view
5. Click "💬 Chat" tab
6. **Expected:** Message appears (blue border, from "GM")

#### Test 2: GM → Individual Player

1. In GM view, select a specific player from dropdown
2. Type "Private message" and click Send
3. **Expected:** Message shows "GM → PlayerName" in GM chat
4. Switch to player view (Chat tab)
5. **Expected:** Player receives message (blue border)

#### Test 3: Player → GM

1. In player view, open Chat tab
2. Type "I have a question" in input field
3. Press Enter
4. **Expected:** Message appears in player chat (green border, "You → GM")
5. Switch to GM view
6. **Expected:** Message appears in GM chat (blue border, "PlayerName → GM")

#### Test 4: Notification Badge

1. In player view, switch to a different tab (Character, Skills, etc.)
2. From GM view, send a message to that player
3. **Expected:** Red "!" badge appears on player's Chat tab button
4. Click Chat tab in player view
5. **Expected:** Badge disappears

#### Test 5: Multiple Players

1. Join with 2+ players
2. From GM view, send different messages:
   - "Test 1" to All Players
   - "Test 2" to Player 1 only
   - "Test 3" to Player 2 only
3. **Expected:**
   - Player 1 sees: "Test 1" and "Test 2"
   - Player 2 sees: "Test 1" and "Test 3"
   - GM sees all messages in sent section

#### Test 6: Message Persistence

1. Send several messages between GM and player
2. Refresh player page (stay in same session)
3. **Expected:** All previous messages still visible
4. Send new message
5. **Expected:** New message added to history

#### Test 7: Auto-scroll

1. Send 20+ messages to fill chat container
2. **Expected:** Container auto-scrolls to show newest message at bottom
3. Scroll up manually to read older messages
4. Send a new message
5. **Expected:** Container scrolls back to bottom

---

## Color Scheme

### GM View

- **Sent Messages:** Green background (`rgba(76, 175, 80, 0.2)`), green border (`#4caf50`)
- **Received Messages:** Blue background (`rgba(33, 150, 243, 0.2)`), blue border (`#2196f3`)
- **UI Accent:** Orange (`#ff9800`)

### Player View

- **Sent Messages:** Green background/border (same as GM)
- **Received Messages:** Blue background/border (same as GM)
- **UI Accent:** Orange (`#ff9800`)
- **Notification Badge:** Red (`#f44336`)

---

## Security Considerations

### XSS Prevention

All message content is escaped before rendering:

```javascript
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
```

### Firebase Rules

Messages are readable by GM and intended recipients only:

```json
"chat": {
  ".read": "auth != null && (
    data.child('to').val() === auth.uid ||
    data.child('from').val() === auth.uid ||
    root.child('rooms').child($roomCode).child('gmId').val() === auth.uid
  )",
  ".write": "auth != null"
}
```

---

## Future Enhancements

### Planned Features

- [ ] Message editing/deletion (within 5 minutes)
- [ ] Message reactions (emoji)
- [ ] Rich text formatting (bold, italic, code blocks)
- [ ] Image/file sharing
- [ ] Chat history export
- [ ] Message search/filter
- [x] Typing indicators *(implemented v2.0)*
- [x] Read receipts *(implemented v2.0)*
- [ ] @mentions with notifications
- [ ] Message threading/replies

### Performance Optimization

- [ ] Limit chat history to last 100 messages (paginate older)
- [ ] Compress old messages to save Firebase storage
- [ ] Implement message batching for high-traffic rooms

---

## Troubleshooting

### Messages not appearing

1. **Check Firebase connection:** Open browser console, look for Firebase errors
2. **Verify room code:** Ensure GM and player are in same room
3. **Check listener setup:** Console should show "Chat listener setup" message
4. **Inspect Firebase data:** Use Firebase Console to verify messages are being written

### Badge not showing/clearing

1. **Check function availability:** `updateChatBadge` must be defined in `player-multiplayer.js`
2. **Verify tab system:** `tab-system.js` must call `updateChatBadge(false)` on tab switch
3. **Inspect DOM:** Use browser DevTools to check if badge element exists

### Dropdown not populating

1. **Check player list:** Verify `updateConnectedPlayersList()` is being called
2. **Check function call:** `updateChatRecipients()` should be called with player array
3. **Inspect dropdown:** Use DevTools to see if option elements are being added

### Auto-scroll not working

1. **Check container reference:** `getElementById('gmChatContainer')` or `playerChatContainer` must return valid element
2. **Verify scroll command:** `container.scrollTop = container.scrollHeight` should be last line in `displayChatMessage()`
3. **Check overflow:** Container must have `overflow-y: auto` style

---

## Version History

### v2.0.0 (Current)

- Player colour coding (10-colour palette, per-session assignment)
- Typing indicators (live "X is typing" banner for GM)
- Read receipts on GM sent messages (✓ Delivered / ✓✓ Read)
- Swear word highlighting (animated gradient, ~100 terms)
- Dedicated floating chat panel (independent of multiplayer modal)
- Message deduplication via `data-message-id`
- GM typing status auto-cleared after 2s inactivity
- Avatar unlock message filtering in player view

### v1.0.0

- Initial chat system implementation
- GM broadcast and individual messaging
- Player-to-GM messaging
- Real-time Firebase sync
- Notification badges
- Colour-coded messages (green sent / blue received)
- Auto-scroll
- Enter key support

---

## Related Documentation

- [Multiplayer Setup Guide](MULTIPLAYER_SETUP.md)
- [Firebase Rules Documentation](databases/firebase-rules.json)
- [Multiplayer Manager API](functions/multiplayer.js)
- [Phase 4 Implementation Summary](IMPLEMENTATION_SUMMARY.md)
