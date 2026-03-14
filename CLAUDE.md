# Platformer Game

A 3D co-op platformer game built with TypeScript and Three.js.

## Tech Stack

- **TypeScript** - Strict typing
- **Three.js** - 3D rendering with perspective camera
- **Vite** - Build tool and dev server
- **WebSocket** - LAN multiplayer via relay server

## Architecture

- `src/core/` - Game loop, input handling, debug overlay, audio, multiplayer UI
- `src/entities/` - Player, Platform, Monster, Coin, Chest, ReturnBase
- `src/graphics/` - Three.js renderer, camera
- `src/physics/` - Collision detection and resolution
- `src/levels/` - Level loading from JSON
- `src/network/` - WebSocket networking (NetworkManager, HostSession, ClientSession, Protocol)
- `src/editor/` - Level editor (2D canvas-based)
- `public/levels/` - Level data files
- `public/models/` - GLB 3D models
- `public/audio/` - Music and sound effects

## Game Modes

### Single Player
- Character select (Carl or Lisa)
- Full gameplay with chest mechanic

### Multiplayer (2-Player Co-op)
- WebSocket-based LAN multiplayer
- Host creates room with 6-character code
- Client joins with code
- Player 1 (host) is authoritative - runs physics
- State broadcast at 20Hz, input at 60Hz

## Key Systems

### Chest Mechanic (Victory Condition)
- Chest spawns after **all coins are collected** (or immediately if no coins)
- Chest spawns at level's chest point (set in editor)
- Players must carry chest back to spawn point
- **Single player**: 1 player can carry
- **Multiplayer**: Both players must be near chest (80px) to carry
- Chest has physics (gravity, platform collision)
- If chest falls off level, respawns to nearest platform

### Escape Sequence
When chest is first picked up:
- Background turns fiery red
- Music switches to battle theme
- Monster spawns near spawn point
- Return base becomes visible (green glowing ring at spawn)

### Audio System
- `AudioManager` singleton with Web Audio API
- Mute button in bottom-left corner
- Music tracks:
  - Menu music (menu_music.wav)
  - Level music (level_music.mp3)
  - Escape/battle music (escape_music.mp3)
- Sound effects:
  - monster_roar.mp3 - When monster starts chasing
  - coin.mp3 - Coin collection
  - victory.mp3 - Victory fanfare

### Monsters
- Placed in level editor or randomly spawned (1 per level if none placed)
- **Spawn when escape sequence activates** (chest picked up)
- Patrol on their platform, **avoid spawn point area**
- Chase player when on same platform
- Kill player on contact
- Player can stomp to kill (jump on head)
- **2-Player mode**: Red weak spot appears on back when chasing - other player can attack from behind

### Coins
- Placed in level editor or randomly spawned (20% per platform if none placed)
- Spin and bob animation
- Collected on player contact
- **All coins must be collected to spawn the chest**
- HUD shows progress: "Coins: X/Y"

### Physics
- Physics owns gravity and grounded state
- AABB collision detection
- Coyote time and jump buffer for responsive controls

### Input
- `InputManager.clear()` must be called each frame to reset justPressed/justReleased states

### 3D Models & Animation
- Models stored in `public/models/` (GLB format)
- **Carl (Player 1)**: `idle.glb`, `Walk.glb`, `run.glb`, `jump.glb`
- **Lisa (Player 2)**: `p2_idle.glb`, `p2_walk.glb`, `p2_run.glb`, `p2_jump.glb` (compressed with gltf-transform)
- **Other**: `Platform_mk1.glb`, `monster.glb`, `coin.glb`, `chest.glb`
- Model rotation: -90° Y to face +X by default
- Model offset: -30px Y to align feet with ground
- To compress large models: `npx gltf-transform resize input.glb output.glb --width 1024 --height 1024`

### Loading & Caching
- Loading screen with spinner shown during startup
- Service worker (`public/sw.js`) caches assets for faster subsequent loads

### Level Editor
- Accessible at `/editor.html`
- 2D canvas with pan (scroll wheel, middle mouse, alt+click)
- Tools: Select (draws platforms), Moving Platform, Spawn, Chest, Monster, Coin
- Grid snapping (32px)
- Random Level button generates playable levels
- Clipboard-based export/import (Copy/Paste JSON)
- localStorage persistence, undo with Cmd/Ctrl+Z
- Test button opens game with current level in new tab

## Commands

```bash
npm run dev      # Start dev server + WebSocket relay (game at /, editor at /editor.html)
npm run dev:solo # Start dev server only (no multiplayer)
npm run server   # Start WebSocket relay server only
npm run build    # Production build
npm run lint:levels  # Run level linter
```

## Files of Note

### Core Game
- `src/core/Game.ts` - Main game class, mode handling, victory logic
- `src/core/AudioManager.ts` - Singleton audio with mute support
- `src/core/MultiplayerUI.ts` - Menu screens, character select, credits

### Entities
- `src/entities/Player.ts` - Player with multiplayer support (playerId, isRemote)
- `src/entities/Chest.ts` - Carryable chest with physics
- `src/entities/ReturnBase.ts` - Glowing victory zone at spawn
- `src/entities/Monster.ts` - Patrolling enemy
- `src/entities/Coin.ts` - Collectible

### Network
- `server.js` - WebSocket relay server (port 9000)
- `src/network/NetworkManager.ts` - WebSocket client wrapper
- `src/network/Protocol.ts` - Message types

## Deployment

Deployed to GitHub Pages via GitHub Actions. Custom domain: https://gamejam.decompiled.dev/

---

## Claude Instructions

- **NEVER commit to git** - User will handle all git operations
- **Do NOT start `npm run dev`** - User keeps it running already
- Level data is in `public/levels/` for production builds

---

## Credits (in-game)

- **Menu music**: Cleyton Kauffman (soundcloud.com/cleytonkauffman)
- **Adventure music**: Ievgen Poltavskyi from Pixabay
- **Battle theme**: Cynic Music (cynicmusic.com | pixelsphere.org)
