# Treasure Heist

A 3D co-op platformer game built with TypeScript and Three.js.

This was made for the [Thunder Bay Game Jam 1.0](https://luma.com/r4ynqvuk)

## Play Online

**https://gamejam.decompiled.dev/**

## Local Development

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- npm (comes with Node.js)

## Multiplayer

Multiplayer is available over LAN only. Both players must be on the same network.

1. **Host**: Run `npm run dev` and click "Host Game"
2. **Client**: Open the game on another device on the same network and click "Join Game"
3. Enter the 6-character room code shown on the host's screen

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The Network: line reveals what IP the game is available at.
```bash
[1]   ➜  Local:   http://localhost:5173/
[1]   ➜  Network: http://192.168.250.44:5173
```

This starts both the game server and the WebSocket relay server for multiplayer.

In this example the game will available at: http://192.168.250.44:5173/
