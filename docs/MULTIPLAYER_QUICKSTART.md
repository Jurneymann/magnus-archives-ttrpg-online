# 🌐 Multiplayer Quick Start

Get your online Magnus Archives RPG session running in 5 minutes!

## 🎯 For Game Masters

### Step 1: Set Up Firebase (One-Time, 5 minutes)

1. Go to https://console.firebase.google.com/
2. Create a project (disable Analytics)
3. Create Realtime Database (Test mode)
4. Get your config from Project Settings → Your apps → Web
5. Paste config into `functions/firebase-config.js`

**Detailed instructions:** See [MULTIPLAYER_SETUP.md](MULTIPLAYER_SETUP.md)

### Step 2: Start Your Session

1. Open `welcome.html`
2. Click **"Start a Game (GM)"**
3. Click the **🌐 Room button** (top toolbar)
4. Click **"Start Multiplayer Session"**
5. Get your **6-character room code** (e.g., `ABCD12`)

### Step 3: Share the Code

Share your room code with players via:
- Discord/Slack
- Text message
- Voice call

### Step 4: Manage Your Session

- See connected players in the multiplayer panel
- Assign stress/damage with one click
- Broadcast messages to all players
- End session when done

---

## 🎮 For Players

### Join a Game

1. Get the **room code** from your GM
2. Open `welcome.html`
3. Click **"Join a Game (Player)"**
4. Enter the room code and your name
5. Click **"Join Game"**

### Before the Session

1. Open `welcome.html`
2. Click **"Create Character"**
3. Build your character
4. Click **"💾 Save Character"**
5. When GM starts, join with the room code!

---

## ✅ Checklist

### First-Time Setup (GM Only)
- [ ] Firebase project created
- [ ] Realtime Database enabled
- [ ] Config pasted in `firebase-config.js`
- [ ] Tested creating a room

### Every Session (GM)
- [ ] Open `welcome.html` → Start a Game
- [ ] Start Multiplayer Session
- [ ] Share room code with players

### Every Session (Player)
- [ ] Get room code from GM
- [ ] Open `welcome.html` → Join a Game
- [ ] Enter code and name

---

## 🆘 Common Issues

### "Firebase not configured"
→ Complete Step 1 of GM setup (edit `firebase-config.js`)

### "Room not found"
→ Check room code with GM; code is case-insensitive

### Can't see players
→ Refresh Firebase database rules (see setup guide)

---

## 📚 Full Documentation

- **Setup Guide:** [MULTIPLAYER_SETUP.md](MULTIPLAYER_SETUP.md)
- **Features Guide:** [MULTIPLAYER_FEATURES.md](MULTIPLAYER_FEATURES.md)

---

## 🎉 You're Ready!

Open `welcome.html` and start your first online session!

**Questions?** Check the full documentation or browser console (F12) for errors.
