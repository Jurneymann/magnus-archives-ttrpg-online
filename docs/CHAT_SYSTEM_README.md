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
- **Message Display**: Color-coded messages with timestamps and sender names
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

Marks a message as read (currently placeholder for future notification system).

- **Parameters:**
  - `messageId` (string): Firebase message key

---

## GM Implementation

### UI Components (index.html)

Located in the Multiplayer Panel modal:

```html
<!-- Chat System Section -->
<div
  style="background: rgba(255, 152, 0, 0.1); border: 2px solid #ff9800; 
     border-radius: 8px; padding: 20px; margin-bottom: 20px;"
>
  <h3>💬 Chat System</h3>

  <!-- Message Display Container -->
  <div
    id="gmChatContainer"
    style="height: 250px; overflow-y: auto; 
       margin-bottom: 15px;"
  >
    No messages yet...
  </div>

  <!-- Recipient Dropdown -->
  <select id="chatRecipient" style="width: 100%; margin-bottom: 10px;">
    <option value="all">📢 All Players</option>
  </select>

  <!-- Message Input -->
  <input
    type="text"
    id="gmChatInput"
    placeholder="Type your message..."
    onkeypress="if(event.key==='Enter') sendChatMessage()"
  />

  <!-- Send Button -->
  <button onclick="sendChatMessage()">Send Message</button>
</div>
```

### JavaScript Functions (gm-multiplayer.js)

#### `updateChatRecipients(players)`

Populates the recipient dropdown with connected players.

```javascript
function updateChatRecipients(players) {
  const dropdown = document.getElementById("chatRecipient");
  if (!dropdown) return;

  // Clear existing options except "All Players"
  dropdown.innerHTML = '<option value="all">📢 All Players</option>';

  // Add individual player options
  players.forEach((player) => {
    const option = document.createElement("option");
    option.value = player.id;
    option.textContent = `👤 ${player.name}`;
    dropdown.appendChild(option);
  });
}
```

#### `sendChatMessage()`

Sends message from GM to selected recipient.

```javascript
function sendChatMessage() {
  const input = document.getElementById("gmChatInput");
  const recipientSelect = document.getElementById("chatRecipient");
  const message = input.value.trim();
  const recipient = recipientSelect.value;

  if (!message) return;

  multiplayerManager
    .sendChatMessage(recipient, message)
    .then(() => {
      displayChatMessage({
        from: "GM",
        fromName: "GM",
        to: recipient,
        toName:
          recipient === "all"
            ? "All Players"
            : recipientSelect.selectedOptions[0].text,
        message: message,
        timestamp: Date.now(),
        fromGM: true,
      });
      input.value = "";
    })
    .catch((error) => {
      console.error("Error sending message:", error);
      alert("Failed to send message");
    });
}
```

#### `displayChatMessage(msg)`

Renders a chat message in the GM's chat container.

```javascript
function displayChatMessage(msg) {
  const container = document.getElementById("gmChatContainer");
  if (!container) return;

  // Clear placeholder
  if (container.textContent.includes("No messages yet")) {
    container.innerHTML = "";
  }

  const messageDiv = document.createElement("div");
  const timestamp = new Date(msg.timestamp).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Color code: sent = green, received = blue
  const isSent = msg.from === "GM";
  const bgColor = isSent ? "rgba(76, 175, 80, 0.2)" : "rgba(33, 150, 243, 0.2)";
  const borderColor = isSent ? "#4caf50" : "#2196f3";

  messageDiv.style.cssText = `
    background: ${bgColor};
    border-left: 4px solid ${borderColor};
    padding: 12px;
    margin-bottom: 10px;
    border-radius: 4px;
  `;

  messageDiv.innerHTML = `
    <div style="display: flex; justify-content: space-between;">
      <strong style="color: ${borderColor};">${msg.fromName} → ${
    msg.toName
  }</strong>
      <span style="color: #888; font-size: 0.85em;">${timestamp}</span>
    </div>
    <div style="color: #e0e0e0; margin-top: 5px;">${escapeHtml(
      msg.message
    )}</div>
  `;

  container.appendChild(messageDiv);
  container.scrollTop = container.scrollHeight; // Auto-scroll
}
```

### Integration

Chat listener is set up when room is created:

```javascript
// In createMultiplayerRoom()
multiplayerManager.onChatMessage((message) => {
  displayChatMessage(message);
});
```

Chat recipients are updated when players connect/disconnect:

```javascript
// In updateConnectedPlayersList()
updateChatRecipients(playerArray);
```

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

Sends message from player to GM.

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
      displayPlayerChatMessage(
        {
          from: multiplayerManager.playerName || "You",
          fromName: multiplayerManager.playerName || "You",
          to: "GM",
          toName: "GM",
          message: message,
          timestamp: Date.now(),
          fromGM: false,
        },
        true
      ); // true = sent by us

      input.value = "";
      input.focus();
    })
    .catch((error) => {
      console.error("Error sending message:", error);
      showPlayerNotification("❌ Failed to send message", "error");
    });
}
```

#### `displayPlayerChatMessage(msg, sentByUs)`

Renders a chat message in the player's chat container.

```javascript
function displayPlayerChatMessage(msg, sentByUs = false) {
  const container = document.getElementById("playerChatContainer");
  if (!container) return;

  // Clear placeholder
  if (container.querySelector('div[style*="No messages"]')) {
    container.innerHTML = "";
  }

  const messageDiv = document.createElement("div");
  const timestamp = new Date(msg.timestamp).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Color code based on sender
  let backgroundColor, borderColor, senderLabel;
  if (sentByUs) {
    backgroundColor = "rgba(76, 175, 80, 0.2)"; // Green
    borderColor = "#4caf50";
    senderLabel = `You → ${msg.toName}`;
  } else {
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
    <div style="display: flex; justify-content: space-between;">
      <strong style="color: ${borderColor};">${senderLabel}</strong>
      <span style="color: #888; font-size: 0.85em;">${timestamp}</span>
    </div>
    <div style="color: #e0e0e0; line-height: 1.5;">${escapeHtml(
      msg.message
    )}</div>
  `;

  container.appendChild(messageDiv);
  container.scrollTop = container.scrollHeight;

  // Mark as read
  if (!sentByUs && msg.id) {
    setTimeout(() => {
      multiplayerManager?.markChatAsRead(msg.id);
    }, 1000);
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
- [ ] Typing indicators
- [ ] Read receipts
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

### v1.0.0 (Current)

- Initial chat system implementation
- GM broadcast and individual messaging
- Player-to-GM messaging
- Real-time Firebase sync
- Notification badges
- Color-coded messages
- Auto-scroll
- Enter key support

---

## Related Documentation

- [Multiplayer Setup Guide](MULTIPLAYER_SETUP.md)
- [Firebase Rules Documentation](databases/firebase-rules.json)
- [Multiplayer Manager API](functions/multiplayer.js)
- [Phase 4 Implementation Summary](IMPLEMENTATION_SUMMARY.md)
