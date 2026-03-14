# Platformer Game

A 3D platformer game built with TypeScript and Three.js.

## Tech Stack

- **TypeScript** - Strict typing
- **Three.js** - 3D rendering with perspective camera
- **Vite** - Build tool and dev server

## Architecture

- `src/core/` - Game loop, input handling, debug overlay
- `src/entities/` - Player, Platform, base Entity class
- `src/graphics/` - Three.js renderer, camera
- `src/physics/` - Collision detection and resolution
- `src/levels/` - Level loading from JSON
- `public/levels/` - Level data files

## Key Systems

### Physics
- Physics owns gravity and grounded state
- AABB collision detection
- Coyote time and jump buffer for responsive controls

### Input
- `InputManager.clear()` must be called each frame to reset justPressed/justReleased states

### 3D Models & Animation
- Models stored in `public/models/` (GLB format)
- **Platform**: `Platform_mk1.glb` - scaled to match platform dimensions
- **Player animations**: `idle.glb`, `Walk.glb`, `run.glb`, `jump.glb`
  - Walk animation plays reversed (`timeScale = -1`)
  - Model rotated -90° Y to face +X by default
  - Model offset -30px Y to align feet with ground
  - Model scaled 2x for visibility (larger than hitbox)
- Animation thresholds:
  - Idle: speed <= 10
  - Walk: speed > 10
  - Run: speed > 70% of MAX_SPEED (210)
  - Jump: when not grounded

## Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build
```

## Deployment

Deployed to GitHub Pages via GitHub Actions. Custom domain: https://gamejam.decompiled.dev/

---

## Claude Instructions

- **NEVER commit to git** - User will handle all git operations
- **Do NOT start `npm run dev`** - User keeps it running already
- Level data is in `public/levels/` for production builds

---

## TODO: Level Linter Fixes

The level linter (`src/tools/linter/`) is implemented but physics calculations need tuning:

**Current state**: Runs via `npm run lint:levels`, reports 3/10 platforms reachable on level1

**Issues to investigate**:
1. Running jump trajectory check may be too conservative - platforms that overlap horizontally but require running to the edge before jumping aren't being detected
2. Need to handle case where player can run along platform, build momentum, then jump at edge to reach higher platforms that overlap
3. May need to add "edge jump" as distinct from standing jump - player at edge of src can reach platforms slightly beyond MAX_JUMP_HEIGHT via horizontal approach

**Files**:
- `src/tools/linter/physics.ts` - canReach(), checkRunningJump(), checkTrajectory()
- `src/tools/linter/graph.ts` - BFS reachability
- `src/tools/linter/index.ts` - CLI entry point

**Physics constants** (from constants.ts):
- JUMP_FORCE: 700 → MAX_JUMP_HEIGHT: ~136px
- GRAVITY: 1800
- MAX_SPEED: 300
- COYOTE_TIME: 100ms
