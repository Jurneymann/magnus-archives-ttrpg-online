# The Magnus Archives Online

## Online Multiplayer RPG Portal

A comprehensive web-based toolset for running **online and local** tabletop RPG campaigns set in The Magnus Archives universe. The Magnus Archives Online brings your investigations into the digital realm with real-time multiplayer sessions, allowing Game Masters and players to connect from anywhere in the world—completely free!

### Core Features

- 🌐 **Online Multiplayer**: Host sessions with room codes (like Jackbox!)
- 🎲 **Complete GM Tools**: Everything you need to manage campaigns
- 📝 **Character Sheets**: Players create and sync characters in real-time
- ⚔️ **Battle Maps**: Visual combat with terrain tools
- 💾 **Cloud & Local**: Works online or offline
- 💰 **Zero Cost**: Free with Firebase's generous tier

**Created by**: [Jurneymann](https://github.com/Jurneymann)

This project is free for use, but if you would like to contribute to my development costs, you can support me at [buymeacoffee/jurneymann](buymeacoffee.com/jurneymann)

![Magnus Archives GM Tool](public/assets/MagnusHeader.png)

## About The Magnus Archives

**[The Magnus Archives](https://rustyquill.com/the-magnus-archives/)** is a horror fiction podcast created by Jonathan Sims and produced by **[Rusty Quill](https://rustyquill.com)**. If you haven't listened to the podcast yet, we highly encourage you to experience this incredible story of supernatural horror and mystery!

This online portal is designed to support the **[The Magnus Archives Roleplaying Game](https://www.montecookgames.com/store/product/the-magnus-archives-roleplaying-game/)**, published by **[Monte Cook Games](https://www.montecookgames.com)**. **Please note: You will need to purchase the official rulebook to play the game.** This tool provides campaign management and multiplayer session utilities but does not contain the rules or copyrighted content from the sourcebooks.

**This is an unofficial fan-made tool and is not affiliated with, endorsed by, or sponsored by Rusty Quill or Monte Cook Games.**

## Features

### 🌐 Online Multiplayer

- **Room-Based Sessions**: Create 6-character room codes for players to join
- **Real-Time Sync**: Character sheets, stress, and damage sync instantly
- **No Cost**: Uses Firebase's free tier (generous limits for RPG groups)
- **No Downloads**: Browser-based, works on any device
- **GM Controls**:
  - View all connected players in real-time
  - Assign stress/damage with one click
  - Broadcast messages to all players
  - Manage combat encounters online
- **Player Features**:
  - Join sessions with simple room codes
  - Character sheets sync automatically
  - Receive GM updates instantly
  - Create and save characters locally

**Getting Started**: See [SETUP.md](SETUP.md) for the full setup guide and [MULTIPLAYER_QUICKSTART.md](docs/MULTIPLAYER_QUICKSTART.md) for a 5-minute walkthrough

### 📊 Campaign Management

- **Dashboard**: Quick overview of party stats
- **Campaign Save/Load**: Export and import complete campaign data as JSON files
- **Autosave**: Automatic campaign backup every 10 minutes to localStorage
- **Campaign Reset**: Clean slate for starting new campaigns

### 👥 Party & NPCs

- **Party Manager**: Track player characters with full stats, damage state, stress, abilities, and skills
- **Character Import**: Import character sheets from JSON files
- **NPC Database**: Create and manage custom NPCs with affiliations, relationships, and detailed descriptions
- **Reference Popups**: Quick reference tools for difficulty, stress, damage and special rolls

### ⚔️ Combat System

- **Combat Tracker**: Full-featured initiative tracker with three phases (Setup, Initiative, Active)
- **Battle Map**: Visual grid-based position tracking with terrain tools
  - Configurable map size (5-50 metres)
  - Combatant tokens with color coding (PCs, NPCs, Enemies)
  - Drag-and-drop movement for easy positioning
  - Terrain tools (walls, furniture, landscape, water, difficult terrain)
  - Save/load map presets
  - Zoom controls (50%-200%)
- **Quick Add**: Rapidly add combatants with name, health, and armor
- **Random Initiative**: Roll initiative for all NPCs with one click
- **Health/Stress Tracking**: Real-time tracking of combatant status with visual indicators
- **Defeat Detection**: Automatic detection of defeated combatants

### 🗺️ World Building

- **Entity Associations**: Link locations to specific Magnus Archives entities
- **Location Import/Export**: Share locations via JSON templates

### 📚 Reference Libraries

- **Bestiary**: Create and manage custom enemies with stats, abilities, and entity associations
- **Locations**: Create detailed locations with descriptions, NPCs, enemies, artefacts, and Leitner books
- **Artefacts**: Custom cursed objects with stress effects and fear properties
- **Leitner Books**: Dangerous tomes with entity connections and supernatural effects
- **Difficulty Table**: Quick reference for task difficulties (0-10)

### 🎲 GM Tools

- **Plot Thread Tracker**: Manage ongoing storylines with clues, NPCs, related entities, and connected content
- **Session Notes**: Rich text editor for recording session events and notes
- **Session History**: Archive past sessions with automatic dating and session numbers

## Getting Started

### Hosting Your Own Instance

**See [SETUP.md](SETUP.md) for a full step-by-step guide.** The short version:

1. Clone this repository
2. Create a free Firebase project at https://console.firebase.google.com/
3. Add your Firebase config to `public/functions/firebase-config.js`
4. Run `firebase deploy --only hosting`
5. Share the live URL with your players

> **No Firebase?** Open `public/index.html` directly in a browser for a fully offline GM dashboard.

### Joining an Existing Session

1. Visit the GM's hosted URL
2. Click **Join a Game (Player)**
3. Enter the 6-character room code the GM shares with you
4. Enter your character name and connect

### First Steps (GM)

1. **Name Your Campaign**: Enter a campaign name at the top of the dashboard
2. **Add Players**: Navigate to the "Party" tab and add your player characters
3. **Create Content**: Build your custom bestiary, NPCs, locations, and artefacts
4. **Import Data**: Use the JSON import features to load pre-made content
5. **Save Regularly**: Download campaign exports as backups (autosave runs every 10 minutes)

## Data Management

### Import/Export

Each content type supports JSON import/export:

- **Campaign Data**: Full campaign export/import from the Save/Load panel
- **Bestiary**: Import/export custom enemies
- **Locations**: Share location databases
- **Artefacts**: Transfer cursed objects between campaigns
- **Leitner Books**: Import/export dangerous tomes

### Templates

Download blank JSON templates from each creation section to see the required data structure.

### Storage

- **localStorage**: All data is stored in your browser's localStorage
- **Autosave**: Automatic backup every 10 minutes
- **Manual Save**: Download full campaign JSON files anytime
- **No Server**: All data stays in your browser - nothing is sent to external servers

### Data Privacy

This application:

- ✅ Stores all data locally in your browser
- ✅ Works completely offline (after first load)

- ❌ Does not send campaign data to any server
- ❌ Does not track personal information

## File Structure

```
magnus-archives-ttrpg-online/
├── public/                     # All hosted web files (Firebase Hosting root)
│   ├── welcome.html            # Entry point — Start/Join Session or Character Sheet
│   ├── index.html              # GM dashboard
│   ├── gm-dashboard.html       # Standalone GM dashboard
│   ├── player-view.html        # Player view and character sheet
│   ├── assets/                 # Images and icons
│   │   ├── favicon.png
│   │   ├── MagnusHeader.png
│   │   ├── magnusbackground.jpg
│   │   └── Tarot/              # Entity tarot card images
│   ├── dice-main/              # 3D dice roller library
│   ├── functions/              # JavaScript modules
│   │   ├── firebase-config.example.js  # Template — copy to firebase-config.js
│   │   ├── firebase-config.js          # YOUR config (gitignored, create from example)
│   │   ├── multiplayer.js              # Core Firebase session logic
│   │   ├── gm-multiplayer.js           # GM-side multiplayer features
│   │   ├── player-multiplayer.js       # Player-side multiplayer features
│   │   ├── voice-of-fears.js           # Voice of the Fears overlay system
│   │   ├── battle-map.js               # Battle map system
│   │   ├── combat.js                   # Combat tracker
│   │   ├── dashboard.js                # Dashboard and stats
│   │   ├── party.js                    # Party member management
│   │   ├── npcs.js                     # NPC management
│   │   ├── bestiary.js                 # Enemy/creature management
│   │   ├── locations.js                # Location management
│   │   ├── artefacts.js                # Artefact management
│   │   ├── leitners.js                 # Leitner book management
│   │   ├── save-load.js                # Campaign save/load/autosave
│   │   ├── tools.js                    # GM tools and generators
│   │   ├── reference.js                # Reference library
│   │   ├── tab-system.js               # Tab navigation
│   │   ├── toolbar.js                  # Quick reference toolbar
│   │   ├── time-tracker.js             # In-game time tracking
│   │   ├── global.js                   # Global exports
│   │   └── character-sheet/            # Character sheet JS modules
│   │       ├── character.js
│   │       ├── character-sync.js       # Multiplayer sync
│   │       ├── abilities-management.js
│   │       ├── skills.js
│   │       ├── equipment.js
│   │       ├── stress+damage.js
│   │       ├── cypher-system.js
│   │       ├── advancement.js
│   │       ├── arcs.js
│   │       ├── avatar.js
│   │       ├── calculators.js
│   │       ├── connections.js
│   │       ├── recovery.js
│   │       ├── save-load.js
│   │       ├── ui-helpers.js
│   │       └── global.js
│   ├── styles/                 # CSS stylesheets
│   │   ├── base.css
│   │   ├── character-sheet.css
│   │   ├── gm-tools.css
│   │   ├── multiplayer.css
│   │   ├── save-load.css
│   │   ├── tabs.css
│   │   ├── toolbar.css
│   │   └── styles.css
│   └── tables/                 # Static reference data
│       ├── abilities.js
│           ├── characterArcs.js
│       ├── cyphers.js
│       ├── difficulties.js
│       ├── equipment-list.js
│       ├── fociAbilities.js
│       ├── skillsList.js
│       └── startingBonuses.js
├── databases/                  # Firebase setup files
│   ├── firebase-rules.json     # Realtime Database security rules — apply in Firebase Console
│   ├── artefacts-template.json
│   ├── bestiary-template.json
│   ├── leitners-template.json
│   ├── locations-template.json
│   └── battle-map-template.json
├── docs/                       # Full documentation
│   ├── CHANGELOG.md
│   ├── MULTIPLAYER_QUICKSTART.md
│   ├── MULTIPLAYER_SETUP.md
│   ├── MULTIPLAYER_FEATURES.md
│   ├── DEPLOYMENT_GUIDE.md
│   ├── DEPLOYMENT_CHECKLIST.md
│   ├── CHAT_SYSTEM_README.md
│   ├── BATTLE_MAP_README.md
│   ├── BATTLE_MAP_QUICK_START.md
│   ├── BESTIARY_README.md
│   ├── NPCS_README.md
│   ├── ARTEFACTS_README.md
│   ├── LEITNERS_README.md
│   └── LOCATIONS_README.md
├── .firebaserc                 # Firebase project alias — update with your project ID
├── firebase.json               # Firebase Hosting config
├── LICENSE
├── README.md
└── SETUP.md                    # Step-by-step setup guide for new instances
```

### Documentation Files (`docs/`)

- **CHANGELOG.md**: Full version history
- **MULTIPLAYER_QUICKSTART.md**: 5-minute guide to starting online sessions
- **MULTIPLAYER_SETUP.md**: Complete Firebase setup instructions
- **MULTIPLAYER_FEATURES.md**: Detailed multiplayer features guide
- **MULTIPLAYER_SYSTEM_VERIFICATION.md**: System verification checklist
- **DEPLOYMENT_GUIDE.md**: Firebase hosting deployment walkthrough
- **DEPLOYMENT_CHECKLIST.md**: Step-by-step deployment checklist
- **CHAT_SYSTEM_README.md**: Chat system architecture and API reference
- **BESTIARY_README.md**: Complete guide to creating and importing custom enemies
- **NPCS_README.md**: Guide to NPC creation, abilities, and combat integration
- **ARTEFACTS_README.md**: Documentation for cursed objects with stress mechanics
- **LEITNERS_README.md**: Guide to creating dangerous supernatural books
- **LOCATIONS_README.md**: Location creation with NPCs, enemies, and items
- **BATTLE_MAP_README.md**: Battle map system documentation
- **BATTLE_MAP_QUICK_START.md**: Quick start guide for battle maps
- **BATTLE_MAP_IMPLEMENTATION.md**: Technical implementation details
- **IMPLEMENTATION_SUMMARY.md**: Multiplayer system implementation overview

## Browser Compatibility

- ✅ **Chrome/Edge** (v90+): Fully supported
- ✅ **Firefox** (v88+): Fully supported
- ✅ **Safari** (v14+): Supported with minor quirks
- ⚠️ **Mobile Browsers**: Functional but optimized for desktop use

## Tips & Best Practices

### Performance

- Keep your bestiary under 100 creatures for optimal performance
- Regularly export campaign data as backups
- Clear old session notes periodically

### Organization

- Use entity tags consistently across NPCs, locations, and enemies
- Name conventions: Use clear, searchable names
- Plot threads: Link all relevant NPCs, artefacts, and locations

### Campaign Management

1. **Session Start**: Review plot threads and relevant NPCs
2. **During Play**: Track rolls in the dashboard, take quick notes
3. **Session End**: Save detailed session notes, update plot threads
4. **Between Sessions**: Export campaign backup, plan encounters

## Copyright & Content

### Application

This application is provided as-is for personal use.

### The Magnus Archives IP

The Magnus Archives is created by Rusty Quill. This tool is an unofficial fan-made resource and is not affiliated with or endorsed by Rusty Quill or any official Magnus Archives products.

### Pre-loaded Content

This version of the tool **does not include** pre-loaded creatures, artefacts, or Leitner books from any published game manuals to respect copyright. Users must:

- Create their own custom content
- Import content they legally own
- Use the provided template systems

## Support & Issues

### Troubleshooting

**Lost data after browser update?**

- Check if autosave data exists (Load Autosave button)
- Restore from your last campaign export file

**Autosave not working?**

- Check browser console for errors (F12)
- Verify localStorage is not full (5-10MB limit)
- Try a different browser

**Import failing?**

- Verify JSON format matches template structure
- Check for syntax errors in JSON file
- Ensure all required fields are present

### Known Limitations

- localStorage has a ~5-10MB limit per domain
- Very large campaigns may need periodic cleanup
- Multiplayer requires Firebase setup (but remains free for most use cases)
- No built-in voice/video chat (use Discord, Zoom, etc. alongside)
- No built-in backup to cloud services (use manual exports)

## Changelog

### Version 1.0 — Initial Public Release (March 2026)

**Multiplayer & Session Management**

- ✅ Online multiplayer with Firebase Realtime Database (free tier)
- ✅ Room-based sessions with 6-character shareable codes
- ✅ Welcome screen — Start/Join Session or open standalone Character Sheet
- ✅ Real-time character sheet synchronisation for all connected players
- ✅ GM notification badge, typing indicators, and read receipts in chat
- ✅ Voice of the Fears — GM broadcast overlay for immersive fear messages

**GM Tools**

- ✅ Campaign dashboard with party overview and quick stats
- ✅ Party manager: full character stats, damage state, stress, abilities, skills
- ✅ NPC database with affiliations, relationships, and descriptions
- ✅ Combat tracker with Setup, Initiative, and Active phases
- ✅ Battle map: configurable grid, terrain tools, drag-and-drop tokens, save/load presets
- ✅ Quick Reference toolbar: Task Difficulty, Stress, Special Rolls, Damage Track
- ✅ In-game time tracker
- ✅ Plot thread tracker with clues, NPCs, entities, and connected content
- ✅ Session notes with rich text editor and automatic session history

**Content Libraries**

- ✅ Bestiary: custom enemies with stats, abilities, and entity associations
- ✅ Locations: detailed locations with NPCs, enemies, artefacts, and Leitner books
- ✅ Artefacts: cursed objects with stress effects and fear properties
- ✅ Leitner Books: dangerous tomes with entity connections and supernatural effects
- ✅ JSON import/export for all content types with blank template downloads

**Save & Data**

- ✅ Campaign save/load with full JSON export
- ✅ Autosave every 10 minutes to localStorage
- ✅ Works fully offline (no Firebase required for GM-only local use)

## Acknowledgments

### Original Works

**[The Magnus Archives Podcast](https://rustyquill.com/the-magnus-archives/)**  
Created by Jonathan Sims and produced by Rusty Quill Ltd.  
© Rusty Quill Ltd. All rights reserved.  
Website: https://rustyquill.com

**[The Magnus Archives Roleplaying Game](https://www.montecookgames.com/store/product/the-magnus-archives-roleplaying-game/)**  
Published by Monte Cook Games  
Based on the Cypher System  
© Monte Cook Games, LLC. All rights reserved.  
Website: https://www.montecookgames.com

### Community

Thanks to all Magnus Archives TTRPG fans and players who contribute to keeping this amazing universe alive through gameplay!

### Tool Development

This tool was created by **[Jurneymann](https://github.com/Jurneymann)** to support Game Masters running campaigns in The Magnus Archives universe.

**Listen to the podcast**: https://rustyquill.com/the-magnus-archives/  
**Purchase the rulebook**: https://www.montecookgames.com/store/product/the-magnus-archives-roleplaying-game/

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

**Important**: This is an unofficial fan-made tool. The Magnus Archives and related intellectual property are owned by their respective copyright holders. This tool contains no copyrighted content from the official sourcebooks or podcast. Users are responsible for ensuring their use complies with all applicable copyright laws.

---

**Version**: 1.0  
**Last Updated**: March 2026  
**Repository**: https://github.com/Jurneymann/magnus-archives-ttrpg-online

For questions, suggestions, or contributions, please use the repository's issue tracker or discussions section.
