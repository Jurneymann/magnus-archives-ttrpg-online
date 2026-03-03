# 🌐 Multiplayer Setup Guide

Welcome to the Magnus Archives RPG Multiplayer System! This guide will help you set up Firebase and enable online multiplayer sessions.

## 📋 Overview

The multiplayer system allows:
- **Game Masters** to host online sessions with a shareable room code
- **Players** to join sessions remotely and sync their character sheets
- **Real-time** stress/damage assignment, combat tracking, and GM messages
- **Zero cost** with Firebase's generous free tier

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or use an existing project
3. Enter a project name (e.g., "Magnus Archives RPG")
4. Disable Google Analytics (optional, not needed)
5. Click **"Create project"**

### Step 2: Set Up Realtime Database

1. In your Firebase project, click **"Build"** in the left sidebar
2. Click **"Realtime Database"**
3. Click **"Create Database"**
4. Choose a location (closest to you/players)
5. Start in **"Test mode"** for now (we'll secure it later)
6. Click **"Enable"**

### Step 3: Get Your Configuration

1. Click the **⚙️ Settings icon** → **"Project settings"**
2. Scroll down to **"Your apps"**
3. Click the **Web icon** (`</>`)
4. Register your app (name: "Magnus Archives GM Tool")
5. **Copy the configuration object** (looks like this):

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.firebaseio.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:xxxxxxxxxxxxx"
};
```

### Step 4: Configure Your App

1. Open `functions/firebase-config.js` in your code editor
2. **Replace** the placeholder values with your actual Firebase config:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_ACTUAL_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

3. Save the file

### Step 5: Set Database Security Rules

1. In Firebase Console, go to **"Realtime Database"** → **"Rules"** tab
2. Replace the rules with these (more secure):

```json
{
  "rules": {
    "rooms": {
      "$roomCode": {
        ".read": true,
        ".write": true,
        ".indexOn": ["code", "status"]
      }
    }
  }
}
```

3. Click **"Publish"**

> **Note:** These rules allow anyone with a room code to read/write. For production use, consider implementing Firebase Authentication.

---

## 🎮 How to Use Multiplayer

### For Game Masters:

1. Open `welcome.html` in your browser
2. Click **"Start a Game (GM)"**
3. The GM dashboard opens (your familiar interface)
4. Click the **🌐 Room button** in the top toolbar
5. Click **"Start Multiplayer Session"**
6. You'll get a **6-character room code** (e.g., `ABCD12`)
7. **Share this code** with your players (text, Discord, etc.)
8. Players appear in the "Connected Players" list as they join
9. Assign stress/damage directly to players with the buttons
10. Combat updates sync automatically to all players

### For Players:

1. Open `welcome.html` in your browser
2. Click **"Join a Game (Player)"**
3. Enter the **room code** from your GM
4. Enter your **name**
5. Click **"Join Game"**
6. Your character sheet loads and syncs with the GM
7. Receive real-time updates from the GM during the session

### Character Creation:

1. Open `welcome.html`
2. Click **"Create Character"**
3. Build your character using the character sheet tools
4. Click **"💾 Save Character"** when done
5. Your character is saved locally and ready to use in games

---

## 🔧 Advanced Configuration

### Custom Database Rules (More Secure)

For better security, you can restrict database access:

```json
{
  "rules": {
    "rooms": {
      "$roomCode": {
        ".read": "data.child('status').val() === 'active'",
        ".write": "!data.exists() || data.child('status').val() === 'active'",
        "players": {
          "$playerId": {
            ".write": true
          }
        }
      }
    }
  }
}
```

### Firebase Authentication (Optional)

For production use, consider adding Firebase Authentication:

1. Enable Email/Password or Google Sign-in in Firebase Console
2. Modify `firebase-config.js` to include auth
3. Add login screens to `welcome.html`

---

## 📊 Firebase Free Tier Limits

Firebase is **free for small-to-medium usage**:

- ✅ **50,000 simultaneous connections**
- ✅ **1 GB stored data**
- ✅ **10 GB/month downloaded**
- ✅ **100 simultaneous connections** typical small game

This is **more than enough** for most RPG groups!

---

## 🐛 Troubleshooting

### "Firebase not configured" error

**Solution:** Make sure you've replaced the placeholder values in `functions/firebase-config.js` with your actual Firebase project configuration.

### Room code not working

**Possible causes:**
1. GM hasn't started the multiplayer session
2. Room code was typed incorrectly
3. Session was closed by GM

### Players not appearing in GM's list

**Solution:** 
1. Check browser console for errors (F12)
2. Verify Firebase database rules are published
3. Ensure both GM and players are using the same room code

### Data not syncing

**Solution:**
1. Check internet connection
2. Verify Firebase database is in "active" mode (not locked)
3. Check browser console for permission errors

---

## 🔒 Security Considerations

### For Testing/Personal Use:
The provided rules work fine for closed groups where you trust all participants.

### For Public/Production Use:
Consider:
- Implementing Firebase Authentication
- Adding room passwords
- Rate limiting on database writes
- Expiring old rooms automatically
- Using Firebase Functions for server-side validation

---

## 💡 Tips & Best Practices

1. **Share room codes securely** - Use private Discord/text channels
2. **Close sessions when done** - Prevents unauthorized access
3. **Test with one player first** - Verify everything works before the full session
4. **Keep Firebase Console open** - Monitor real-time connections during games
5. **Backup character data** - Players should save characters locally too

---

## 📚 Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs/database)
- [Firebase Pricing](https://firebase.google.com/pricing)
- [Realtime Database Best Practices](https://firebase.google.com/docs/database/usage/best-practices)

---

## 🆘 Need Help?

If you encounter issues:
1. Check browser console (F12) for error messages
2. Verify Firebase configuration in `firebase-config.js`
3. Check Firebase Console → Database for data structure
4. Ensure database rules are published

---

## 🎉 You're Ready!

Open `welcome.html` and start your first multiplayer session!

**Happy gaming, and may your investigations be fruitful! 🕸️**
