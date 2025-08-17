# Multiplayer Web Game Test Project

A lightweight multiplayer 3D game demo using [Colyseus](https://colyseus.io/) for networking and [Three.js](https://threejs.org/) for rendering.

Nothing much here. Just playing around with 'vibe coding'

https://github.com/user-attachments/assets/5816828f-64cb-4402-8739-e4f933e61376

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/)
- [npm](https://www.npmjs.com/)

### Setup

#### 1. Install dependencies

```sh
cd client
npm install
cd ../server
npm install
```

#### 2. Build the client

```sh
cd client
npm run build
```

#### 3. Run the server

```sh
cd ../server
npm start
```

#### 4. Serve the client

You can use any static server. For example:

```sh
cd client
npx serve dist
```

Or configure your own static server.

#### 5. Open in browser

Navigate to `http://localhost:5174` (or your chosen port).

## Controls

- **W / S / Up / Down:** Move forward/backward
- **A / D / Left / Right:** Rotate left/right
- **Mobile:** Use the on-screen virtual joystick

## Customization

- Character models are assigned automatically by the server from `character-a.glb` to `character-r.glb`.
- You can add your own `.glb` models in `client/public/assets/characters/`.

## Credits

Character models from kenney.nl
