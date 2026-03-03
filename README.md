# The Magnus Archives Online

## Online Multiplayer RPG Portal

A comprehensive web-based toolset for running **online and local** tabletop RPG campaigns set in The Magnus Archives universe. The Firebase Institute brings your investigations into the digital realm with real-time multiplayer sessions, allowing Game Masters and players to connect from anywhere in the world—completely free!

### Core Features
- 🌐 **Online Multiplayer**: Host sessions with room codes (like Jackbox!)
- 🎲 **Complete GM Tools**: Everything you need to manage campaigns
- 📝 **Character Sheets**: Players create and sync characters in real-time
- ⚔️ **Battle Maps**: Visual combat with terrain tools
- 💾 **Cloud & Local**: Works online or offline
- 💰 **Zero Cost**: Free with Firebase's generous tier

**Created by**: [Jurneymann](https://github.com/Jurneymann)

This project is free for use, but if you would like to contribute to my development costs, you can support me at [buymeacoffee/jurneymann](buymeacoffee.com/jurneymann)

![Magnus Archives GM Tool](assets/MagnusHeader.png)

## About The Magnus Archives

**[The Magnus Archives](https://rustyquill.com/the-magnus-archives/)** is a horror fiction podcast created by Jonathan Sims and produced by **[Rusty Quill](https://rustyquill.com)**. If you haven't listened to the podcast yet, we highly encourage you to experience this incredible story of supernatural horror and mystery!

This GM Tool is designed to support the **[The Magnus Archives Roleplaying Game](https://www.montecookgames.com/store/product/the-magnus-archives-roleplaying-game/)**, published by **[Monte Cook Games](https://www.montecookgames.com)**. **Please note: You will need to purchase the official rulebook to play the game.** This tool provides campaign management utilities but does not contain the rules or copyrighted content from the sourcebooks.

**This is an unofficial fan-made tool and is not affiliated with, endorsed by, or sponsored by Rusty Quill or Monte Cook Games.**

## Features

### 🌐 Online Multiplayer (NEW!)

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

**Getting Started**: See [MULTIPLAYER_QUICKSTART.md](MULTIPLAYER_QUICKSTART.md) for 5-minute setup guide

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
- **Battle Map**: Visual grid-based position tracking with terrain tools (NEW!)
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

### Installation

1. **Clone or download** this repository
2. **Open `welcome.html`** in a modern web browser (Chrome, Firefox, Edge recommended)
3. **Choose your mode**:
   - **Start a Game (GM)**: Full GM dashboard with all tools
   - **Join a Game (Player)**: Connect to an online session
   - **Create Character**: Build and save characters

For local/offline use, open `index.html` directly for the GM dashboard.

### Multiplayer Setup (Optional, 5 minutes)

To enable online multiplayer sessions:

1. Create a free Firebase account at https://console.firebase.google.com/
2. Create a new project and enable Realtime Database
3. Copy your Firebase config to `functions/firebase-config.js`
4. See [MULTIPLAYER_SETUP.md](MULTIPLAYER_SETUP.md) for detailed instructions

**No Firebase setup?** The tool still works perfectly offline!

### First Steps

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
- ✅ Includes Google Analytics for usage statistics only
- ❌ Does not send campaign data to any server
- ❌ Does not track personal information

## File Structure

```
Magnus Archives GM Tool/
├── welcome.html                # Entry point - GM/Player/Character selection
├── index.html                  # Main GM application file
├── player-view.html            # Player/Character sheet view
├── gm-dashboard.html           # Standalone GM dashboard
├── LICENSE                     # MIT License with disclaimers
├── README.md                   # This file - main documentation
├── assets/                     # Images and icons
│   ├── favicon.png
│   ├── MagnusHeader.png
│   └── magnusbackground.jpg
├── databases/                  # JSON templates and examples
│   ├── artefacts-template.json
│   ├── bestiary-template.json
│   ├── leitners-template.json
│   ├── locations-template.json
│   └── battle-map-template.json
├── docs/                       # Documentation
│   ├── CHANGELOG.md
│   ├── ARTEFACTS_README.md
│   ├── BATTLE_MAP_IMPLEMENTATION.md
│   ├── BATTLE_MAP_QUICK_START.md
│   ├── BATTLE_MAP_README.md
│   ├── BESTIARY_README.md
│   ├── CHAT_SYSTEM_README.md
│   ├── DEPLOYMENT_CHECKLIST.md
│   ├── DEPLOYMENT_GUIDE.md
│   ├── IMPLEMENTATION_SUMMARY.md
│   ├── LEITNERS_README.md
│   ├── LOCATIONS_README.md
│   ├── MULTIPLAYER_FEATURES.md
│   ├── MULTIPLAYER_QUICKSTART.md
│   ├── MULTIPLAYER_SETUP.md
│   ├── MULTIPLAYER_SYSTEM_VERIFICATION.md
│   └── NPCS_README.md
├── functions/                  # Core JavaScript modules
│   ├── artefacts.js            # Artefact management
│   ├── battle-map.js           # Battle map system
│   ├── bestiary.js             # Enemy/creature management
│   ├── combat.js               # Combat tracker system
│   ├── dashboard.js            # Dashboard and stats
│   ├── firebase-config.js      # Firebase configuration (not committed)
│   ├── gm-multiplayer.js       # GM multiplayer features
│   ├── gm-player-details.js    # GM player detail panel
│   ├── global.js               # Global function exports
│   ├── leitners.js             # Leitner book management
│   ├── locations.js            # Location management
│   ├── main.js                 # Application initialization
│   ├── multiplayer.js          # Core multiplayer logic
│   ├── npcs.js                 # NPC management
│   ├── party.js                # Party member management
│   ├── player-multiplayer.js   # Player multiplayer features
│   ├── reference.js            # Reference library
│   ├── save-load.js            # Campaign save/load/autosave
│   ├── tab-system.js           # Tab navigation
│   ├── time-tracker.js         # In-game time tracking
│   ├── toolbar.js              # Quick reference toolbar
│   ├── tools.js                # GM tools and generators
│   └── character-sheet/        # Character sheet JS modules
│       ├── abilities-management.js
│       ├── advancement.js
│       ├── arcs.js
│       ├── avatar.js
│       ├── calculators.js
│       ├── character.js
│       ├── character-sync.js
│       ├── connections.js
│       ├── cypher-system.js
│       ├── equipment.js
│       ├── global.js
│       ├── main.js
│       ├── recovery.js
│       ├── save-load.js
│       ├── skills.js
│       ├── stress+damage.js
│       └── ui-helpers.js
├── styles/                     # CSS styling
│   ├── base.css                # Base layout and typography
│   ├── character-sheet.css     # Character sheet styling
│   ├── gm-tools.css            # GM tools styling
│   ├── multiplayer.css         # Multiplayer UI styling
│   ├── save-load.css           # Save/load panel styling
│   ├── tabs.css                # Tab system styling
│   └── toolbar.css             # Toolbar styling
├── tables/                     # Reference data
│   ├── abilities.js
│   ├── avatarPowers.js
│   ├── characterArcs.js
│   ├── cyphers.js
│   ├── difficulties.js
│   ├── equipment-list.js
│   ├── fociAbilities.js
│   ├── skillsList.js
│   └── startingBonuses.js
└── reference/                  # Save location for character sheet JSON files
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

This GM Tool application is provided as-is for personal use.

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

### Version 2.3 - UI Polish & Code Audit (March 2026)

- ✨ **NEW**: Smart ability view auto-switching (Type & Focus tables)
- ✨ **NEW**: Smart equipment/weapon view auto-switching
- ✨ **NEW**: Manual view override flags (player choices no longer auto-overridden)
- ✨ **NEW**: Battle map layer switching UI
- 🐛 **FIX**: Details containers collapsing on battle map button clicks
- 🐛 **FIX**: Equipment "Show All" state not persisting after add/remove
- 🔧 **MAINTENANCE**: Duplicate function definitions removed from 4 files
- 🔧 **MAINTENANCE**: All JS file copies synchronised across directories
- 📂 **MAINTENANCE**: Documentation moved to `docs/` subdirectory

### Version 2.2 - Quick Reference Toolbar (February 2026)

- ✨ **NEW**: Consolidated 4-button toolbar
- ✨ **NEW**: Tabbed Quick Reference modal (Task Difficulty, Stress, Special Rolls, Damage Track)
- 💬 **IMPROVED**: Chat panel centering and notification badge

### Version 2.1 - Chat Enhancements (February 2026)

- ✨ **NEW**: GM notification badge with pulse animation
- ✨ **NEW**: Typing indicators (real-time, auto-clears after 3 seconds)
- ✨ **NEW**: Read receipts (✓ Delivered / ✓✓ Read)
- ✨ **NEW**: Automatic message history cleanup (100 message limit)

### Version 2.0 - Multiplayer Update (January 2026)

- ✨ **NEW**: Online multiplayer system with Firebase integration
- ✨ **NEW**: Welcome screen for GM/Player/Character selection
- ✨ **NEW**: Real-time character sheet synchronization
- ✨ **NEW**: Battle Map system with terrain, fog of war, dynamic lighting
- ✨ **NEW**: Horror Mode full theme system
- ✨ **NEW**: In-game time tracker
- ✨ **NEW**: Room-based sessions with shareable codes

### Version 1.0 - Initial Release

- ✅ Core GM tools: Dashboard, Party, NPCs, Combat, Bestiary, Locations, Artefacts, Leitner Books
- ✅ JSON import/export for all content types
- ✅ Autosave and manual campaign save/load

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

This GM Tool was created by **[Jurneymann](https://github.com/Jurneymann)** to support Game Masters running campaigns in The Magnus Archives universe.

**Listen to the podcast**: https://rustyquill.com/the-magnus-archives/  
**Purchase the rulebook**: https://www.montecookgames.com/store/product/the-magnus-archives-roleplaying-game/

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

**Important**: This is an unofficial fan-made tool. The Magnus Archives and related intellectual property are owned by their respective copyright holders. This tool contains no copyrighted content from the official sourcebooks or podcast. Users are responsible for ensuring their use complies with all applicable copyright laws.

---

**Version**: 2.3  
**Last Updated**: March 2026  
**Repository**: https://github.com/Jurneymann/magnus-archives-online-private (private)

For questions, suggestions, or contributions, please use the repository's issue tracker or discussions section.
