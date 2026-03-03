# Firebase Deployment Checklist

## Quick Reference for Magnus Archives Deployment

Use this checklist to track your deployment progress. Check off each item as you complete it.

---

## Pre-Deployment Setup

### Firebase Console Setup

- [ ] Created Firebase project
- [ ] Enabled Realtime Database
- [ ] Copied Firebase configuration
- [ ] Saved configuration to `firebase-config.js`

### Local Environment

- [ ] Node.js installed and verified
- [ ] Firebase CLI installed (`npm install -g firebase-tools`)
- [ ] Logged into Firebase (`firebase login`)
- [ ] Project initialized (`firebase init`)
- [ ] Selected "Hosting" feature
- [ ] Used existing project
- [ ] Set public directory to `public`

---

## File Preparation

### Copy Files to Public Directory

- [ ] `index.html` copied
- [ ] `player-view.html` copied
- [ ] `welcome.html` copied
- [ ] `assets/` directory copied
- [ ] `databases/` directory copied
- [ ] `functions/` directory copied
- [ ] `reference/` directory copied
- [ ] `styles/` directory copied
- [ ] `tables/` directory copied
- [ ] `dice-main/` directory copied
- [ ] All `.md` documentation files copied

### Verify Configuration

- [ ] `firebase-config.js` has actual Firebase config (not placeholders)
- [ ] `databaseURL` matches Firebase Console database URL
- [ ] All file paths are relative (no absolute paths)

---

## Deployment

### Initial Deploy

- [ ] Ran `firebase deploy` successfully
- [ ] Hosting URL received
- [ ] Console URL saved
- [ ] Database rules configured in Firebase Console
- [ ] Rules published

---

## Testing - GM View

### Basic Functionality

- [ ] GM page loads at hosting URL
- [ ] No JavaScript errors in console
- [ ] All tabs work (Players, Battle Map, Bestiary, etc.)
- [ ] Time tracker works
- [ ] Reference panels work

### Multiplayer Features

- [ ] "🌐 Multiplayer" button works
- [ ] Multiplayer panel opens
- [ ] "🚀 Start Multiplayer Session" creates room
- [ ] Room code displayed (6 characters)
- [ ] Chat system visible in panel
- [ ] Battle Map Sharing toggle present

---

## Testing - Player View

### Basic Functionality

- [ ] Welcome page loads
- [ ] Room code input works
- [ ] Player name input works
- [ ] "Join Game" button works
- [ ] Character sheet loads after joining
- [ ] All tabs work (Character, Stats, Skills, Equipment, etc.)
- [ ] "💬 Chat with GM" button present

### Character Sheet

- [ ] Can edit character name
- [ ] Can edit stats (Might, Speed, Intellect)
- [ ] Can edit skills
- [ ] Can add equipment
- [ ] Calculators work
- [ ] Dice roller works

---

## Testing - Real-Time Sync

### Character Sync (Player → GM)

- [ ] Edit character name in player view
- [ ] Name updates in GM "Players" tab
- [ ] Edit character stats
- [ ] Stats update in GM character viewer
- [ ] Changes happen within 1-2 seconds

### GM Push Controls (GM → Player)

- [ ] Assign Stress from GM
- [ ] Player receives stress notification
- [ ] Stress value updates in player character sheet
- [ ] Assign Damage from GM
- [ ] Player receives damage notification
- [ ] Damage track updates in player view
- [ ] Assign XP from GM
- [ ] Player receives XP notification
- [ ] XP value increases in player view

---

## Testing - Chat System

### GM → Player Chat

- [ ] GM can select "All Players" in dropdown
- [ ] GM can send message to all
- [ ] Player receives message in chat panel
- [ ] GM can select individual player
- [ ] GM can send private message
- [ ] Only selected player receives private message

### Player → GM Chat

- [ ] Player opens chat panel
- [ ] Player types message
- [ ] Player presses Enter to send
- [ ] GM receives message in multiplayer panel
- [ ] Message shows player name and character name

### Chat Features

- [ ] Messages show timestamps
- [ ] Sent messages appear green
- [ ] Received messages appear blue
- [ ] Chat scrolls to newest message
- [ ] Notification badge appears when new message received
- [ ] Badge clears when chat opened

---

## Testing - Battle Map Sharing

### GM Battle Map Setup

- [ ] GM can create/edit battle map
- [ ] Can add terrain
- [ ] Can add tokens/combatants
- [ ] Changes save automatically

### Battle Map Sharing

- [ ] GM enables "Show battle map to players" toggle
- [ ] Status updates to "visible to players"
- [ ] Player's "🗺️ Battle" tab becomes visible
- [ ] Player can view battle map
- [ ] Map updates in real-time when GM makes changes
- [ ] GM disables toggle
- [ ] Player's battle tab hides

---

## Testing - Dice Roll Notifications

### Player Dice Rolls

- [ ] Player rolls d20 (quick roll)
- [ ] GM sees notification in bottom-left corner
- [ ] Player rolls d6 (quick roll)
- [ ] GM sees notification
- [ ] Player uses Action Calculator
- [ ] Rolls d20 for skill check
- [ ] GM sees notification with roll type and result
- [ ] Player uses Attack Calculator
- [ ] Rolls attack
- [ ] GM sees attack notification
- [ ] Player uses Defense Calculator
- [ ] Rolls defense
- [ ] GM sees defense notification

### Notification Features

- [ ] Notifications show player name
- [ ] Notifications show character name
- [ ] Notifications show roll type with icon
- [ ] Notifications show roll result
- [ ] Notifications show target number (when applicable)
- [ ] Success/failure indicated with color
- [ ] Notifications auto-hide after 15 seconds
- [ ] Can manually close notifications
- [ ] Maximum 10 notifications at once

---

## Testing - Multiple Players

### Multi-Player Session

- [ ] GM creates room
- [ ] Player 1 joins
- [ ] Player 1 appears in connected players list
- [ ] Player 2 joins in separate browser/device
- [ ] Player 2 appears in connected players list
- [ ] Player count updates correctly
- [ ] GM can view both players' characters
- [ ] GM can send message to "All Players"
- [ ] Both players receive broadcast message
- [ ] GM sends private message to Player 1
- [ ] Only Player 1 receives it
- [ ] Player 1 sends chat message to GM
- [ ] GM receives message from Player 1
- [ ] Player 2 sends chat message to GM
- [ ] GM receives message from Player 2
- [ ] Player 1 rolls dice
- [ ] GM sees Player 1's roll notification
- [ ] Player 2 rolls dice
- [ ] GM sees Player 2's roll notification

---

## Testing - Edge Cases

### Disconnection Handling

- [ ] Player closes browser
- [ ] Player shown as disconnected in GM view (after ~30 seconds)
- [ ] Player reopens and rejoins with same character
- [ ] Character data preserved

### Room Management

- [ ] GM can end session
- [ ] Players notified when session ends
- [ ] New room can be created immediately after ending
- [ ] Old room code becomes invalid

### Browser Compatibility

- [ ] Works in Chrome
- [ ] Works in Firefox
- [ ] Works in Edge
- [ ] Works in Safari (if applicable)
- [ ] Works on mobile browsers (basic functionality)

---

## Database Verification

### Firebase Console Checks

- [ ] Rooms appear in database
- [ ] Room structure is correct (gmId, players, sharedData)
- [ ] Player data updates in real-time
- [ ] Chat messages stored correctly
- [ ] Dice rolls stored temporarily
- [ ] Battle map data syncs

### Security Rules

- [ ] Rules published successfully
- [ ] No permission denied errors during testing
- [ ] Data accessible only to room participants

---

## Performance & Monitoring

### Performance

- [ ] Page loads in < 3 seconds
- [ ] Real-time updates happen in < 2 seconds
- [ ] No lag when editing character sheet
- [ ] Dice roller animations smooth
- [ ] Battle map panning/zooming responsive

### Firebase Usage

- [ ] Check Realtime Database usage
- [ ] Storage: **\_**MB / 1024 MB (free tier)
- [ ] Bandwidth: **\_**MB / 10240 MB per month (free tier)
- [ ] Connections: **\_** / 100 simultaneous (free tier)

---

## Documentation

### URLs Saved

- [ ] Firebase Console URL
- [ ] Hosting URL (for GM)
- [ ] Welcome page URL (for players)
- [ ] Database URL

### Credentials Backed Up

- [ ] Firebase config saved securely
- [ ] Project ID noted
- [ ] API keys documented (but kept secure)

### Instructions Shared

- [ ] Players know the welcome page URL
- [ ] Players know how to join (room code)
- [ ] GM knows how to start session
- [ ] GM knows how to share room code

---

## Post-Deployment

### Monitoring Setup

- [ ] Usage alerts configured (optional)
- [ ] Email notifications enabled (optional)
- [ ] Bookmarks created for quick access

### Backup Plan

- [ ] Local copy of all files maintained
- [ ] Firebase config backed up securely
- [ ] Database rules saved locally
- [ ] Know how to roll back deployment if needed

---

## Common Issues Checklist

If something doesn't work, check these:

### "Firebase not initialized" error

- [ ] Verified `firebase-config.js` has real config (not placeholders)
- [ ] Checked browser console for specific errors
- [ ] Cleared browser cache and refreshed
- [ ] Redeployed site

### "Permission denied" errors

- [ ] Database rules configured correctly
- [ ] Rules published in Firebase Console
- [ ] No typos in rules JSON

### Players can't join room

- [ ] Room code is correct (case-sensitive)
- [ ] Room exists in Firebase database
- [ ] GM session is still active
- [ ] No firewall blocking Firebase

### Character data not syncing

- [ ] Both users in same room
- [ ] Player is connected (check GM's connected players list)
- [ ] No browser console errors
- [ ] Firebase database rules allow writes

### Chat not working

- [ ] Multiplayer session active
- [ ] Users in same room
- [ ] Chat messages visible in Firebase Console database
- [ ] No JavaScript errors

### Dice notifications not showing

- [ ] GM multiplayer session active
- [ ] Player connected and in room
- [ ] Player rolling dice in calculators
- [ ] No JavaScript errors in console

---

## Final Verification

### All Systems Go

- [ ] GM tool fully functional
- [ ] Player view fully functional
- [ ] Real-time sync working
- [ ] Chat system working
- [ ] Battle map sharing working
- [ ] Dice roll notifications working
- [ ] Multiple players tested
- [ ] Database secure
- [ ] Performance acceptable
- [ ] Documentation complete

---

## Deployment Complete! ✅

**Date Deployed:** ********\_\_\_********

**Hosting URL:** ******************\_\_\_******************

**Project ID:** ******************\_\_\_******************

**Notes:**

---

---

---

---

---

## Quick Commands Reference

```powershell
# Deploy everything
firebase deploy

# Deploy only hosting
firebase deploy --only hosting

# Deploy only database rules
firebase deploy --only database

# View deployment history
firebase hosting:list

# Open Firebase Console
firebase open

# Check Firebase status
firebase projects:list
```

---

## Session Startup Checklist

Use this before each game session:

- [ ] Open GM tool at hosting URL
- [ ] Click "🌐 Multiplayer"
- [ ] Click "🚀 Start Multiplayer Session"
- [ ] Note the room code
- [ ] Share room code with players
- [ ] Have players go to welcome page and join
- [ ] Verify all players appear in connected list
- [ ] Test chat with a quick message
- [ ] Ready to play!

---

**Tip:** Print this checklist or keep it open during deployment to track your progress!
