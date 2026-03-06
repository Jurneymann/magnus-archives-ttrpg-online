# Firebase Deployment Guide

## Magnus Archives Online

This guide will walk you through deploying Magnus Archives Online to Firebase Hosting with Realtime Database.

---

## Prerequisites

- [ ] Google account (for Firebase)
- [ ] Node.js installed (for Firebase CLI)
- [ ] Internet connection
- [ ] All local files backed up

---

## Part 1: Firebase Project Setup

### Step 1: Create Firebase Project

1. [ ] Go to https://console.firebase.google.com/
2. [ ] Click "Add project" or "Create a project"
3. [ ] Enter project name: `Magnus Archives Institute` (or your choice)
4. [ ] Click "Continue"
5. [ ] Disable Google Analytics (optional - not needed for this project)
6. [ ] Click "Create project"
7. [ ] Wait for project creation (30-60 seconds)
8. [ ] Click "Continue" when ready

**✓ Checkpoint:** You should see your Firebase project dashboard

---

### Step 2: Enable Realtime Database

1. [ ] In the left sidebar, click "Build" → "Realtime Database"
2. [ ] Click "Create Database" button
3. [ ] Choose your database location:
   - [ ] `us-central1` (USA)
   - [ ] `europe-west1` (Europe)
   - [ ] Choose closest to your players for best performance
4. [ ] Click "Next"
5. [ ] Select "Start in test mode" (we'll secure it later)
6. [ ] Click "Enable"
7. [ ] Wait for database creation (15-30 seconds)

**✓ Checkpoint:** You should see an empty database with URL like `https://your-project-default-rtdb.firebaseio.com`

---

### Step 3: Get Firebase Configuration

1. [ ] Click the gear icon ⚙️ next to "Project Overview" (top left)
2. [ ] Select "Project settings"
3. [ ] Scroll down to "Your apps" section
4. [ ] Click the web icon `</>` (Add app)
5. [ ] Enter app nickname: `Magnus Archives Web App`
6. [ ] Check ✓ "Also set up Firebase Hosting"
7. [ ] Click "Register app"
8. [ ] **IMPORTANT:** Copy the entire `firebaseConfig` object to a temporary file

**Example configuration:**

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC1234567890abcdefghijk",
  authDomain: "magnus-archives-12345.firebaseapp.com",
  databaseURL: "https://magnus-archives-12345-default-rtdb.firebaseio.com",
  projectId: "magnus-archives-12345",
  storageBucket: "magnus-archives-12345.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456",
};
```

9. [ ] Click "Continue to console"

**✓ Checkpoint:** You have your Firebase config saved somewhere safe

---

## Part 2: Configure Local Files

### Step 4: Update firebase-config.js

1. [ ] Open `functions/firebase-config.js` in VS Code
2. [ ] Find the `firebaseConfig` object
3. [ ] Replace the placeholder values with YOUR actual values from Step 3
4. [ ] Verify `databaseURL` is correct (should match your Realtime Database URL)
5. [ ] Save the file
6. [ ] **DO NOT COMMIT THIS FILE TO PUBLIC GITHUB** (contains your API keys)

**Before:**

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  // ... placeholder values
};
```

**After:**

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC1234567890abcdefghijk", // Your actual key
  authDomain: "magnus-archives-12345.firebaseapp.com",
  // ... your actual values
};
```

**✓ Checkpoint:** `firebase-config.js` has your real Firebase configuration

---

## Part 3: Install Firebase CLI

### Step 5: Install Firebase Tools

Open PowerShell in your project folder:

```powershell
cd "magnus-archives-ttrpg-online"
```

1. [ ] Check if Node.js is installed:

```powershell
node --version
```

- If you see a version number (e.g., v18.12.0), you're good ✓
- If not, download from https://nodejs.org/ and install

2. [ ] Install Firebase CLI globally:

```powershell
npm install -g firebase-tools
```

- Wait for installation to complete (1-2 minutes)

3. [ ] Verify installation:

```powershell
firebase --version
```

- Should show version number (e.g., 13.0.0)

**✓ Checkpoint:** Firebase CLI is installed and working

---

### Step 6: Login to Firebase

1. [ ] Run login command:

```powershell
firebase login
```

2. [ ] Choose "Y" when asked "Allow Firebase to collect CLI usage information?"
3. [ ] Browser will open automatically
4. [ ] Select your Google account
5. [ ] Click "Allow" to grant Firebase CLI access
6. [ ] Return to PowerShell - you should see "✔ Success! Logged in as your-email@gmail.com"

**Troubleshooting:**

- If browser doesn't open, try: `firebase login --interactive`
- If still issues, try: `firebase login --no-localhost`

**✓ Checkpoint:** You're logged into Firebase CLI

---

## Part 4: Initialize Firebase Hosting

### Step 7: Initialize Firebase Project

1. [ ] Make sure you're in the project directory:

```powershell
cd "magnus-archives-ttrpg-online"
```

2. [ ] Run initialization:

```powershell
firebase init
```

3. [ ] Answer the prompts:

**Prompt:** "Are you ready to proceed?"

- [ ] Answer: `Y` (Yes)

**Prompt:** "Which Firebase features do you want to set up?"

- [ ] Use arrow keys to navigate to "Hosting: Configure files for Firebase Hosting"
- [ ] Press SPACE to select (you'll see a green circle with checkmark)
- [ ] Press ENTER to continue

**Prompt:** "Please select an option:"

- [ ] Select: "Use an existing project"
- [ ] Press ENTER

**Prompt:** "Select a default Firebase project:"

- [ ] Use arrow keys to find your project (from Step 1)
- [ ] Press ENTER

**Prompt:** "What do you want to use as your public directory?"

- [ ] Type: `public`
- [ ] Press ENTER

**Prompt:** "Configure as a single-page app?"

- [ ] Answer: `N` (No)

**Prompt:** "Set up automatic builds and deploys with GitHub?"

- [ ] Answer: `N` (No)

4. [ ] You should see: "✔ Firebase initialization complete!"

**✓ Checkpoint:** Firebase is initialized, you should see new files:

- `firebase.json`
- `.firebaserc`
- `public/` directory (with sample index.html)

---

### Step 8: Verify Files Are Ready

This repository uses `public/` as the Firebase Hosting root. All site files are already there — no copying required.

1. [ ] Confirm `public/` contains your project files:

```powershell
Get-ChildItem "public\" | Select-Object Name
```

**You should see:**

- index.html
- player-view.html
- welcome.html
- gm-dashboard.html
- assets/
- functions/
- styles/
- tables/
- dice-main/
- reference/

2. [ ] Confirm `public/functions/firebase-config.js` contains your Firebase project config (see [SETUP.md](../SETUP.md) Step 2 if not yet done)

**✓ Checkpoint:** All files are in the `public/` directory and firebase-config.js is configured

---

## Part 5: Deploy to Firebase

### Step 9: Deploy Your Site

1. [ ] Make sure you're in the project root directory
2. [ ] Run deployment command:

```powershell
firebase deploy
```

3. [ ] Watch the deployment progress:
   - You'll see files being uploaded
   - Takes 30-90 seconds depending on internet speed

4. [ ] When complete, you'll see:

```
✔ Deploy complete!

Project Console: https://console.firebase.google.com/project/your-project/overview
Hosting URL: https://your-project.web.app
```

5. [ ] **SAVE THESE URLS!** Copy them to a safe place

**✓ Checkpoint:** Your site is deployed and live!

---

## Part 6: Configure Security Rules

### Step 10: Set Database Security Rules

**IMPORTANT:** The database is currently in test mode (anyone can read/write). Let's secure it.

1. [ ] Go to Firebase Console: https://console.firebase.google.com/
2. [ ] Select your project
3. [ ] Go to "Realtime Database" in left sidebar
4. [ ] Click the "Rules" tab
5. [ ] Replace all existing rules with these:

```json
{
  "rules": {
    "rooms": {
      "$roomCode": {
        ".read": "data.child('players').hasChild(auth.uid) || data.child('gmId').val() == auth.uid || auth == null",
        ".write": "auth == null",
        "players": {
          "$playerId": {
            ".read": true,
            ".write": true,
            "character": {
              ".validate": "newData.hasChildren(['name', 'type', 'descriptor'])"
            }
          }
        },
        "sharedData": {
          ".read": true,
          ".write": true,
          "battleMap": {
            ".write": "root.child('rooms').child($roomCode).child('gmId').val() == auth.uid || auth == null"
          },
          "chat": {
            "$messageId": {
              ".read": "data.child('to').val() == auth.uid || data.child('from').val() == auth.uid || root.child('rooms').child($roomCode).child('gmId').val() == auth.uid || data.child('to').val() == 'all'",
              ".validate": "newData.hasChildren(['from', 'to', 'message', 'timestamp'])"
            }
          }
        }
      }
    }
  }
}
```

6. [ ] Click "Publish"
7. [ ] Confirm by clicking "Publish" again in the dialog

**✓ Checkpoint:** Database rules are configured

---

## Part 7: Test Your Deployment

### Step 11: Test GM View

1. [ ] Open your Hosting URL in a web browser: `https://your-project.web.app/index.html`
2. [ ] Verify the page loads correctly
3. [ ] Click "🌐 Multiplayer" button (top of page)
4. [ ] Click "🚀 Start Multiplayer Session"
5. [ ] Note the 6-character room code (e.g., "ABC123")
6. [ ] Verify you see:
   - [ ] Room code displayed
   - [ ] "Connected Players (0)" section
   - [ ] Chat system (orange section)
   - [ ] Battle Map Sharing toggle

**✓ Checkpoint:** GM multiplayer session is working

---

### Step 12: Test Player View

1. [ ] Open a new browser tab or window
2. [ ] Go to: `https://your-project.web.app/welcome.html`
3. [ ] Enter the room code from Step 11
4. [ ] Enter a player name (e.g., "Test Player")
5. [ ] Click "Join Game"
6. [ ] Verify you see:
   - [ ] Character sheet loads
   - [ ] "Connected to multiplayer session" notification appears
   - [ ] "💬 Chat with GM" button below tabs

**✓ Checkpoint:** Player can join room successfully

---

### Step 13: Test Real-Time Sync

**Test Character Sync:**

1. [ ] In player view, edit character name
2. [ ] In GM view, click "Players" tab → click "View Character"
3. [ ] Verify the name updated in GM view

**Test GM Push Controls:**

1. [ ] In GM view, connected players list, click "Assign Stress" for the player
2. [ ] Enter "2" and click "Assign"
3. [ ] In player view, verify stress increased by 2

**Test Chat System:**

1. [ ] In player view, click "💬 Chat with GM" button
2. [ ] Type a message and press Enter
3. [ ] In GM view, verify message appears in multiplayer panel chat
4. [ ] In GM view, type a reply and send
5. [ ] In player view, verify GM's message appears

**Test Battle Map Sharing:**

1. [ ] In GM view, go to Battle Map tab
2. [ ] Add some terrain or tokens
3. [ ] In multiplayer panel, check "Show battle map to players"
4. [ ] In player view, click "🗺️ Battle" tab
5. [ ] Verify you see the battle map

**Test Dice Roll Notifications:**

1. [ ] In player view, go to Calculators tab
2. [ ] Click "Roll Virtual d20" or roll any calculator
3. [ ] In GM view, verify notification appears in bottom-left corner

**✓ Checkpoint:** All multiplayer features working!

---

## Part 8: Database Verification

### Step 14: View Database Structure

1. [ ] In Firebase Console, go to Realtime Database → Data tab
2. [ ] Expand the tree to see:

```
rooms/
  └─ ABC123/  (your room code)
      ├─ gmId: "..."
      ├─ gmName: "Game Master"
      ├─ createdAt: 1234567890
      ├─ players/
      │   └─ player_123/
      │       ├─ connected: true
      │       ├─ name: "Test Player"
      │       └─ character: {...}
      └─ sharedData/
          ├─ battleMap: {...}
          ├─ chat: {...}
          └─ diceRolls: {...}
```

3. [ ] Verify data structure matches expectations

**✓ Checkpoint:** Database structure is correct

---

## Part 9: Cleanup & Monitoring

### Step 15: Post-Deployment Tasks

**Database Monitoring:**

1. [ ] In Firebase Console → Realtime Database → Usage tab
2. [ ] Monitor:
   - [ ] Connections (max 100 on free tier)
   - [ ] Storage (max 1 GB on free tier)
   - [ ] Download bandwidth (max 10 GB/month on free tier)

**Set up Email Alerts (Optional):**

1. [ ] Firebase Console → Project Settings → Integrations
2. [ ] Set up email notifications for quota usage

**Bookmark Important URLs:**

- [ ] Firebase Console: https://console.firebase.google.com/project/your-project
- [ ] Hosting URL: https://your-project.web.app
- [ ] Database URL: https://your-project-default-rtdb.firebaseio.com

**Share with Players:**

- [ ] Welcome page URL: `https://your-project.web.app/welcome.html`
- [ ] Instructions: "Enter the room code I give you at the start of each session"

**✓ Checkpoint:** Deployment complete and monitored!

---

## Troubleshooting Guide

### Issue: Firebase not initialized error

**Symptoms:**

- Browser console shows "Firebase not initialized"
- Multiplayer button does nothing

**Fix:**

1. Check `public/functions/firebase-config.js` has correct config
2. Verify `databaseURL` matches your database URL in Firebase Console
3. Clear browser cache and refresh
4. Redeploy: `firebase deploy`

---

### Issue: Permission denied when creating room

**Symptoms:**

- "Permission denied" error in console
- Room creation fails

**Fix:**

1. Go to Firebase Console → Realtime Database → Rules
2. Verify rules are set (Step 10)
3. For testing, temporarily use test mode rules:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

4. **Remember to re-secure later!**

---

### Issue: Player can't join room

**Symptoms:**

- "Room not found" error
- Join button doesn't work

**Fix:**

1. Verify room code is correct (case-sensitive)
2. Check room still exists in Firebase Console → Database
3. Rooms may expire after 24 hours of inactivity (check code)
4. Try creating a new room

---

### Issue: Character data not syncing

**Symptoms:**

- Changes in player view don't appear in GM view
- Data seems stuck

**Fix:**

1. Check Firebase Console → Database → Data tab
2. Look for the player's character data under `rooms/{roomCode}/players/{playerId}/character`
3. Verify player is still connected (check `connected: true`)
4. Refresh both browser windows
5. Check browser console for errors

---

### Issue: Chat messages not appearing

**Symptoms:**

- Sent messages don't show up
- Only seeing "No messages yet"

**Fix:**

1. Verify both users are in the same room
2. Check Firebase Console → Database for chat messages under `rooms/{roomCode}/sharedData/chat`
3. Check database rules allow chat writes
4. Clear browser cache and refresh

---

### Issue: Dice roll notifications not showing

**Symptoms:**

- Player rolls dice but GM doesn't see notification
- No feed appears

**Fix:**

1. Verify multiplayer session is active (room created)
2. Check player is connected (in connected players list)
3. Check browser console for errors
4. Verify `functions/calculators.js` has the broadcast code
5. Redeploy if recently updated

---

### Issue: 404 errors on deployed site

**Symptoms:**

- Some pages show "404 Not Found"
- Files missing

**Fix:**

1. Verify files are in `public/` directory
2. Check file names are correct (case-sensitive)
3. Redeploy: `firebase deploy`
4. Clear browser cache

---

## Future Updates

### How to Update Your Deployed Site

1. [ ] Make changes to files in `public/` directory
2. [ ] Test locally if possible (use VS Code Live Server)
3. [ ] Deploy updates:

```powershell
firebase deploy
```

4. [ ] Verify changes at your Hosting URL
5. [ ] If only updating database rules:

```powershell
firebase deploy --only database
```

6. [ ] If only updating hosting:

```powershell
firebase deploy --only hosting
```

### How to Roll Back to Previous Version

1. [ ] Go to Firebase Console → Hosting
2. [ ] Click on the version you want to restore
3. [ ] Click "..." menu → "Rollback to this version"

---

## Quick Reference

### Firebase CLI Commands

```powershell
# Login to Firebase
firebase login

# Initialize project (only needed once)
firebase init

# Deploy everything
firebase deploy

# Deploy only hosting
firebase deploy --only hosting

# Deploy only database rules
firebase deploy --only database

# View deployment history
firebase hosting:list

# Rollback to previous deployment
firebase hosting:rollback

# Open Firebase Console for this project
firebase open

# Check Firebase CLI version
firebase --version

# Logout
firebase logout
```

---

## Security Best Practices

### For Testing (Current Setup)

- ✓ Database rules allow anonymous access
- ✓ Good for development and testing
- ⚠️ Not suitable for public production

### For Production (Future Enhancement)

Consider adding:

- [ ] Firebase Authentication (email/password or Google login)
- [ ] Stricter database rules requiring authentication
- [ ] Room expiration after 24 hours
- [ ] Rate limiting for API calls
- [ ] HTTPS-only enforcement

---

## Cost Monitoring

### Free Tier Limits (Spark Plan)

- **Realtime Database:**
  - 1 GB storage
  - 10 GB/month download
  - 100 simultaneous connections

- **Hosting:**
  - 10 GB storage
  - 360 MB/day transfer (10 GB/month)

### Estimated Usage for Your App

- **Small group (5 players):** Well within free tier
- **Medium group (20 players):** Still within free tier
- **Large convention game (50+ players):** May need Blaze plan (pay-as-you-go)

### How to Monitor Usage

1. Firebase Console → Usage and billing
2. Set up budget alerts at 50%, 75%, 90%

---

## Support Resources

- **Firebase Documentation:** https://firebase.google.com/docs
- **Firebase Console:** https://console.firebase.google.com/
- **Firebase CLI Reference:** https://firebase.google.com/docs/cli
- **Firebase Status:** https://status.firebase.google.com/

---

## Deployment Checklist Summary

**Setup Phase:**

- [ ] Firebase project created
- [ ] Realtime Database enabled
- [ ] Firebase config obtained and added to `firebase-config.js`
- [ ] Firebase CLI installed
- [ ] Logged into Firebase
- [ ] Project initialized with `firebase init`
- [ ] Files copied to `public/` directory

**Deployment Phase:**

- [ ] Site deployed with `firebase deploy`
- [ ] Database security rules configured
- [ ] Hosting URL saved

**Testing Phase:**

- [ ] GM view loads and works
- [ ] Player can join room
- [ ] Character sync works
- [ ] GM push controls work
- [ ] Chat system works
- [ ] Battle map sharing works
- [ ] Dice roll notifications work

**Post-Deployment:**

- [ ] Database structure verified
- [ ] Usage monitoring set up
- [ ] URLs bookmarked and shared
- [ ] Backup of `firebase-config.js` saved securely

---

## Congratulations! 🎉

Your Magnus Archives GM Tool is now deployed and ready for multiplayer sessions!

**Your URLs:**

- GM Tool: `https://your-project.web.app/index.html`
- Player Join: `https://your-project.web.app/welcome.html`

**To start a session:**

1. GM opens the tool and clicks "🌐 Multiplayer" → "🚀 Start Multiplayer Session"
2. GM shares the room code with players
3. Players go to the welcome page and enter the room code
4. Everyone can now collaborate in real-time!

Enjoy your game! 🎲
