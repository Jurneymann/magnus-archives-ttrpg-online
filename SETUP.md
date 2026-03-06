# Setting Up Your Own Instance

This guide walks a new host through cloning this repository and deploying their own live copy on Firebase — for free.

> **Estimated time:** 15–20 minutes  
> **Cost:** Free (Firebase Spark plan is sufficient for typical group sizes)

---

## Prerequisites

Install these before you begin:

| Tool | Version | Link |
|---|---|---|
| Node.js | 18 or later | https://nodejs.org |
| Firebase CLI | latest | `npm install -g firebase-tools` |
| A Google account | — | https://accounts.google.com |

Verify the CLI is installed:

```powershell
firebase --version
```

---

## Step 1 — Create a Firebase Project

1. Go to **https://console.firebase.google.com**
2. Click **Add project**
3. Enter a project name (e.g. `magnus-archives-mygroup`)
4. Disable Google Analytics if not needed → **Create project**

### Enable Realtime Database

1. In the Firebase Console sidebar: **Build → Realtime Database**
2. Click **Create Database**
3. Choose a region close to your players
4. Select **Start in test mode** (you'll lock it down in Step 4)
5. Click **Enable**

---

## Step 2 — Clone & Configure

### Clone the repository

```powershell
git clone https://github.com/Jurneymann/magnus-archives-online-private.git
cd "magnus-archives-online-private"
```

### Add your Firebase config

1. In the Firebase Console: **Project Settings** (⚙️ gear icon) → **General**
2. Scroll to **Your apps** → click **</>** (Web app)
3. Register the app (any nickname) — you **don't** need Firebase Hosting selected here
4. Copy the `firebaseConfig` object shown

Open `public/functions/firebase-config.js` and replace the placeholder values:

```javascript
// public/functions/firebase-config.js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);
```

> ⚠️ **Do not commit `firebase-config.js` to a public repository.** The `.gitignore` already excludes it.

---

## Step 3 — Connect the Firebase CLI

```powershell
firebase login
firebase use --add
```

When prompted, select your project from the list.

Verify you're connected:

```powershell
firebase projects:list
```

Your project should appear with a ✓ symbol.

---

## Step 4 — Set Database Security Rules

Firebase Realtime Database starts in **test mode** (publicly readable). Before sharing the URL with players, apply the production rules.

1. In the Firebase Console: **Realtime Database → Rules**
2. Copy the content of `databases/firebase-rules.json` from this repo
3. Paste it into the rules editor and click **Publish**

The rules restrict:
- Room data to participants who know the room code
- Write access to authenticated/known sessions

---

## Step 5 — Deploy

```powershell
firebase deploy --only hosting
```

The CLI will print a **Hosting URL** like:

```
https://YOUR_PROJECT_ID.web.app
```

That's your live site. Share this URL with your players — no downloads needed on their end.

To redeploy after making changes to files in `public/`:

```powershell
firebase deploy --only hosting
```

---

## Step 6 — First Launch

1. Open your Hosting URL in a browser
2. Click **Start a Game (GM)**
3. Click **🌐 Multiplayer** in the toolbar
4. Click **Start New Game** — a 6-character room code will appear
5. Share the URL and room code with players
6. Players visit the same URL, click **Join a Game**, and enter the room code

---

## Repository Structure (Quick Reference)

```
/
├── public/                  ← Everything Firebase Hosting serves
│   ├── index.html           ← Main GM application
│   ├── gm-dashboard.html    ← Standalone GM dashboard
│   ├── player-view.html     ← Player / character sheet view
│   ├── welcome.html         ← Entry point (Start/Join/Character)
│   ├── assets/              ← Images and icons
│   ├── dice-main/           ← 3D dice roller library
│   ├── functions/           ← All JavaScript modules
│   │   ├── firebase-config.js   ← YOUR config goes here
│   │   ├── multiplayer.js       ← Core Firebase sync logic
│   │   ├── gm-multiplayer.js    ← GM-side multiplayer features
│   │   ├── player-multiplayer.js← Player-side multiplayer features
│   │   ├── voice-of-fears.js    ← Voice of the Fears overlay system
│   │   ├── battle-map.js        ← Battle map system
│   │   └── character-sheet/     ← Character sheet JS modules
│   ├── styles/              ← CSS stylesheets
│   ├── tables/              ← Reference data (skills, abilities, etc.)
│   └── reference/           ← In-app reference content
├── databases/               ← JSON templates & Firebase rules
│   ├── firebase-rules.json  ← Apply these in Firebase Console
│   ├── artefacts-template.json
│   ├── bestiary-template.json
│   ├── leitners-template.json
│   ├── locations-template.json
│   └── battle-map-template.json
├── dataconnect/             ← Firebase DataConnect config (advanced)
├── docs/                    ← Full documentation
│   ├── CHANGELOG.md
│   ├── DEPLOYMENT_GUIDE.md  ← Detailed deployment walkthrough
│   ├── MULTIPLAYER_SETUP.md ← Multiplayer configuration guide
│   ├── MULTIPLAYER_QUICKSTART.md
│   ├── CHAT_SYSTEM_README.md
│   ├── BATTLE_MAP_README.md
│   └── ...other feature docs
├── character-sheet-source/  ← Standalone offline character sheet (separate project)
├── firebase.json            ← Firebase project config
├── .firebaserc              ← Links CLI to your Firebase project
├── SETUP.md                 ← This file
└── README.md                ← Feature overview

```

> **Editing tip:** All site files live exclusively in `public/`. Edit there, then redeploy. There are no duplicate source directories to keep in sync.

---

## Updating Your Instance

When new changes are pushed to this repository:

```powershell
git pull
# Review public/functions/firebase-config.js — your config is gitignored, so it won't change
firebase deploy --only hosting
```

---

## Troubleshooting

### "Permission denied" on database

Your database rules are blocking the request. Check that `firebase-rules.json` has been applied in the Firebase Console and that the database URL in `firebase-config.js` is correct.

### Players can't connect to room

1. Confirm the `databaseURL` in `firebase-config.js` matches your project (includes `-default-rtdb`)
2. Open browser DevTools → Console — look for Firebase errors
3. Ensure all players are using the same Hosting URL (not a local file path)

### Blank page on load

Open browser DevTools → Console. A `firebase-config.js` 404 or a missing `firebaseConfig` variable means the config file hasn't been set up. Re-check Step 2.

### Changes not appearing after deploy

Clear your browser cache or open in a private/incognito window. Firebase Hosting serves with aggressive caching.

---

## Related Documentation

| Doc | Purpose |
|---|---|
| [docs/MULTIPLAYER_SETUP.md](docs/MULTIPLAYER_SETUP.md) | Full multiplayer configuration guide |
| [docs/MULTIPLAYER_QUICKSTART.md](docs/MULTIPLAYER_QUICKSTART.md) | 5-minute quickstart |
| [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) | Detailed step-by-step deployment walkthrough |
| [docs/CHAT_SYSTEM_README.md](docs/CHAT_SYSTEM_README.md) | Chat system and Voice of the Fears |
| [docs/BATTLE_MAP_README.md](docs/BATTLE_MAP_README.md) | Battle map system |
| [databases/firebase-rules.json](databases/firebase-rules.json) | Firebase security rules |
