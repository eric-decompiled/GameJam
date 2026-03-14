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
- Run `npm run dev` to test changes locally
- Level data is in `public/levels/` for production builds
