# 🎭 Multiplayer Features Guide

This document explains how to use the multiplayer features in the Magnus Archives RPG tool.

## 🌟 Feature Overview

### Real-Time Synchronization
- Player character sheets sync instantly with the GM
- Stress and damage assignments appear immediately
- Combat tracker updates for all participants
- GM messages broadcast to all players

### Room-Based Sessions
- Simple 6-character room codes (like `ABCD12`)
- No account creation required
- No downloads or installations needed
- Works on any device with a modern web browser

### GM Controls
- View all connected players
- See each player's character stats in real-time
- Assign stress/damage with one click
- Broadcast messages to all players
- Manage combat encounters
- End sessions when done

---

## 📖 Using Multiplayer as GM

### Starting a Session

1. **Open the Welcome Screen**
   - Navigate to `welcome.html` in your browser
   - Or set it as your landing page

2. **Launch GM Mode**
   - Click **"Start a Game (GM)"**
   - Your familiar GM dashboard loads with all tools

3. **Start Multiplayer**
   - Look for the **🌐 Room button** in the top toolbar (next to Horror Mode)
   - Click it to open the Multiplayer panel
   - Click **"🚀 Start Multiplayer Session"**
   - Enter your name as GM (optional)

4. **Share the Room Code**
   - You'll receive a unique 6-character code (e.g., `JKXP42`)
   - Share this code with your players via:
     - Discord/Slack
     - Text message
     - Email
     - Voice call
   - Players use this code to join your session

### Managing Connected Players

The multiplayer panel shows:
- **Player count** - How many players are connected
- **Player names** - Who's in the session
- **Connection status** - 🟢 online / 🔴 offline
- **Character info** - Name and archetype
- **Quick actions** - Assign stress/damage buttons

### Assigning Stress or Damage

Two ways to assign:

**Method 1: From Player List**
1. Open the Multiplayer panel (🌐 Room button)
2. Find the player in the list
3. Click **😰** for stress or **💔** for damage
4. Enter the amount
5. Optionally enter a reason
6. Confirm - the player receives it instantly!

**Method 2: From Combat Tracker** (coming soon)
- Assign directly during combat encounters

### Broadcasting Messages

1. Open the Multiplayer panel
2. Click **"📢 Broadcast Test Message"**
3. Type your message
4. All players see it as a notification

**Use cases:**
- "Take a 10-minute break"
- "Session ends in 15 minutes"
- "Roll for initiative!"
- Story narration beats

### Ending a Session

1. Click the **🌐 Room button**
2. Click **"⛔ End Session"**
3. Confirm the action
4. All players are disconnected
5. Room code becomes invalid

> **Tip:** Always end sessions when done to prevent unauthorized access!

---

## 🎮 Using Multiplayer as Player

### Joining a Game

1. **Get the Room Code**
   - Your GM will provide a 6-character code
   - Write it down or keep it accessible

2. **Open the Welcome Screen**
   - Navigate to `welcome.html`

3. **Join the Game**
   - Click **"Join a Game (Player)"**
   - Enter the **room code** (case-insensitive)
   - Enter your **name** (visible to GM)
   - Click **"Join Game"**

4. **Connected!**
   - Your character sheet loads
   - GM can now see your character
   - You'll receive real-time updates

### During the Session

**Connection Status**
- Top of screen shows: 🟢 Connected, Room code, Your name
- If disconnected, you'll see a warning

**Receiving Updates**
- **Stress assigned**: You'll see a notification with amount and reason
- **Damage assigned**: Notification shows damage type and amount
- **Combat starts**: Alert when combat begins
- **GM messages**: Appear as notifications

**Syncing Your Character**
- Character data syncs automatically when you join
- Changes you make sync in real-time
- Click **"💾 Save Character"** to ensure data is saved

**Disconnecting**
- Close the browser tab, or
- Navigate away from the page
- GM will see you as offline (🔴)

### Rejoining a Session

If you accidentally disconnect:
1. Go back to `welcome.html`
2. Click **"Join a Game"**
3. Enter the **same room code**
4. Enter your name again
5. Your character reloads from the last sync

---

## ✨ Creating Characters for Multiplayer

### Before the Session

1. **Open Welcome Screen**
   - Go to `welcome.html`

2. **Start Character Creation**
   - Click **"Create Character"**
   - Character sheet tools load

3. **Build Your Character**
   - Fill in all details:
     - Name, archetype, background
     - Stats and pools
     - Abilities and skills
     - Equipment and notes

4. **Save Your Character**
   - Click **"💾 Save Character"** (top-right)
   - Character saves to your browser
   - You can edit anytime

5. **Join a Game**
   - When your GM starts a session
   - Join with the room code
   - Your saved character loads automatically!

### During Character Creation

**Auto-Save**
- Character data saves locally in your browser
- Safe even if you close the tab
- Available next time you open the tool

**Multiple Characters**
- Currently supports one character at a time
- To create a new character:
  - Export/backup your current character
  - Clear browser data
  - Create new character

---

## 🔥 Advanced Features

### Combat Synchronization

When the GM starts combat:
- You'll see a notification
- Combat tracker appears (if implemented)
- Your turn order is visible
- Initiative and actions sync

### Character Sheets in Real-Time

Changes you make to your character:
- ✅ Stress/damage taken
- ✅ Pool spending (Might/Speed/Intellect)
- ✅ Ability usage
- ✅ Equipment changes
- ✅ Notes and conditions

All sync with the GM automatically!

### Presence Detection

The system tracks who's online:
- GM sees 🟢 for connected players
- 🔴 for disconnected players
- Auto-cleanup when players leave
- Reconnection handling

---

## 💡 Tips for Great Multiplayer Sessions

### For Game Masters

1. **Test Before Game Night**
   - Start a session 30 minutes early
   - Have one player test-join
   - Verify all features work

2. **Keep the Room Code Handy**
   - Write it down
   - Share it in your Discord/chat
   - Post it in a pinned message

3. **Monitor Connections**
   - Check the multiplayer panel periodically
   - Verify all players are connected (🟢)
   - Ask for confirmation if status is unclear

4. **Use Broadcast Messages**
   - "Roll initiative"
   - "Break time - back in 10"
   - Important story beats
   - Time warnings

5. **Close Old Sessions**
   - End sessions when done
   - Prevents confusion with old codes
   - Keeps database clean

### For Players

1. **Save Characters Before Sessions**
   - Don't create characters last-minute
   - Test saving/loading beforehand
   - Keep backup exports

2. **Keep the Room Code**
   - Save it in your notes
   - Don't close the welcome tab until joined
   - Take a screenshot

3. **Check Connection Status**
   - Look for 🟢 Connected in header
   - If red, refresh and rejoin
   - Tell GM if you disconnect

4. **Don't Refresh During Play**
   - Causes disconnection
   - Have to rejoin with room code
   - Character reloads but may lose recent changes

5. **Use a Stable Internet Connection**
   - Wired connection is best
   - Stable WiFi is fine
   - Avoid mobile data if possible

---

## 🎯 Multiplayer Session Checklist

### Pre-Game (GM)
- [ ] Firebase is configured (`firebase-config.js`)
- [ ] Tested creating a room
- [ ] Room code ready to share
- [ ] Player communication channel ready (Discord, etc.)

### Pre-Game (Players)
- [ ] Character created and saved
- [ ] Room code received from GM
- [ ] Browser is up-to-date
- [ ] Stable internet connection

### During Game (GM)
- [ ] Multiplayer panel open
- [ ] All players connected (🟢)
- [ ] Character data visible for all players
- [ ] Tested assigning stress/damage

### Post-Game (GM)
- [ ] Session ended properly
- [ ] Players disconnected
- [ ] Room closed

---

## 🛠️ Troubleshooting

### "Room not found" Error
- **Cause**: Room code is incorrect or session ended
- **Fix**: Double-check the code with GM; ask for a new code if needed

### Can't Join Session
- **Cause**: Firebase not configured or network issue
- **Fix**: Check browser console (F12); verify internet connection

### GM Can't See My Character
- **Cause**: Character not saved or sync failed
- **Fix**: 
  1. Click "💾 Save Character"
  2. Rejoin the room
  3. Check connection status

### Disconnected During Game
- **Fix**:
  1. Return to `welcome.html`
  2. Click "Join a Game"
  3. Re-enter the same room code
  4. Character reloads

### Updates Not Syncing
- **Cause**: Connection lost or Firebase issue
- **Fix**:
  1. Check 🟢/🔴 status indicator
  2. Refresh page and rejoin if red
  3. Verify Firebase database is running (GM)

---

## 📞 Getting Help

If you encounter issues:
1. Check browser console: Press `F12` → Console tab
2. Look for error messages in red
3. Verify Firebase configuration in `firebase-config.js`
4. Check `MULTIPLAYER_SETUP.md` for setup help
5. Ensure Firebase Realtime Database is enabled

---

## 🚀 Future Features (Planned)

- [ ] Voice/video chat integration
- [ ] Dice rolling with shared results
- [ ] Shared battle map
- [ ] Session recording/replay
- [ ] Character sheet templates
- [ ] Automated backup/restore
- [ ] Room passwords
- [ ] Multiple GMs
- [ ] Spectator mode

---

## 🎉 Enjoy Your Multiplayer Sessions!

The system is designed to enhance your tabletop experience, not replace face-to-face interaction. Use it to:
- Play with remote friends
- Handle logistics smoothly
- Track complex state automatically
- Focus on storytelling and roleplay

**Statement ends. Good luck with your investigations! 🕸️**
