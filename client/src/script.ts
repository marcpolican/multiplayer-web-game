import * as THREE from 'three';
import { Client, Room } from 'colyseus.js';

// === THREE.js Scene Setup ===
const sizes = { width: 800, height: 600 };
const scene = new THREE.Scene();

const playerColor = 0x880000;
const otherColor = 0x008888;

const playerMeshes: Map<string, THREE.Mesh> = new Map();
let mySessionId: string | null = null;

// Store target positions for interpolation
interface PlayerMeshData {
    mesh: THREE.Mesh;
    target: { x: number; y: number; z: number };
}
const playerMeshData: Map<string, PlayerMeshData> = new Map();

// Ground Plane
const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.MeshBasicMaterial({ color: 0x888888, side: THREE.DoubleSide })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -1;
scene.add(ground);

// Camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height);
camera.position.set(10, 10, 10);
camera.lookAt(0, 0, 0);
scene.add(camera);

// Renderer
const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(sizes.width, sizes.height);

// === Colyseus Client Setup ===
const colyseusClient = new Client("ws://localhost:2567");

interface Player {
    x: number;
    y: number;
    z: number;
}

interface State {
    players: Map<string, Player>;
}

let room: Room | null = null;

async function joinRoom() {
    try {
        room = await colyseusClient.joinOrCreate("my_room");
        mySessionId = room.sessionId;
        console.log("Joined successfully!", room, mySessionId);

        room.onStateChange((state: any) => {
            // Remove meshes for players that left
            for (const sessionId of playerMeshData.keys()) {
                if (!state.players.has(sessionId)) {
                    const data = playerMeshData.get(sessionId);
                    if (data) scene.remove(data.mesh);
                    playerMeshData.delete(sessionId);
                }
            }

            // Add/update meshes for current players
            state.players.forEach((player: Player, sessionId: string) => {
                let data = playerMeshData.get(sessionId);

                if (!data) {
                    const mesh = new THREE.Mesh(
                        new THREE.BoxGeometry(1, 2, 1),
                        new THREE.MeshBasicMaterial({
                            color: sessionId === mySessionId ? playerColor : otherColor
                        })
                    );
                    scene.add(mesh);
                    data = {
                        mesh,
                        target: { x: player.x, y: player.y, z: player.z }
                    };
                    playerMeshData.set(sessionId, data);
                    // Set initial position
                    mesh.position.set(player.x, player.y, player.z);
                } else {
                    // Update target position for interpolation
                    data.target.x = player.x;
                    data.target.y = player.y;
                    data.target.z = player.z;
                }
            });
        });

        window.colyseusRoom = room;
    } catch (e) {
        console.error("Exception: ", e);
    }
}

joinRoom();

// Animation/render loop with interpolation
function animate() {
    requestAnimationFrame(animate);

    // Interpolate each mesh towards its target position
    const lerpAlpha = 0.15; // Adjust for smoothness (0.1-0.2 is typical)
    playerMeshData.forEach((data) => {
        data.mesh.position.lerp(
            new THREE.Vector3(data.target.x, data.target.y, data.target.z),
            lerpAlpha
        );
    });

    renderer.render(scene, camera);
}
animate();

let movement = { x: 0, z: 0 };

// Keyboard input handling
window.addEventListener('keydown', (event: KeyboardEvent) => {
    switch (event.key) {
        case 'w':
        case 'ArrowUp':
            movement.z = -1;
            break;
        case 's':
        case 'ArrowDown':
            movement.z = 1;
            break;
        case 'a':
        case 'ArrowLeft':
            movement.x = -1;
            break;
        case 'd':
        case 'ArrowRight':
            movement.x = 1;
            break;
    }

    updatePlayerPosition();
});

window.addEventListener('keyup', (event: KeyboardEvent) => {
    switch (event.key) {
        case 'w':
        case 'ArrowUp':
        case 's':
        case 'ArrowDown':
            movement.z = 0;
            break;
        case 'a':
        case 'ArrowLeft':
        case 'd':
        case 'ArrowRight':
            movement.x = 0;
            break;
    }

    updatePlayerPosition();
});

function updatePlayerPosition() {
    if (room && mySessionId) {
        // @ts-ignore
        const player = room.state.players.get(mySessionId);
        if (player) {
            room.send("move", {
                x: movement.x,
                z: movement.z
            });
        }
    }
}