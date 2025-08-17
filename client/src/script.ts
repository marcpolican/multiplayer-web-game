import * as THREE from 'three';
import { Client, Room } from 'colyseus.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

const serverUrl = "ws://192.168.8.147:2567"; // Adjust to your server URL

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
    target: { x: number; y: number; z: number; rotY?: number; };
}
const playerMeshData: Map<string, PlayerMeshData> = new Map();

// Ground Plane
const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.MeshPhongMaterial({ color: 0xffffff, side: THREE.DoubleSide }) // CHANGED
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0;
ground.receiveShadow = true; // Make sure this is set
scene.add(ground);

// Camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height);
camera.position.set(0, 5, 10);
camera.lookAt(0, 0, 0);
scene.add(camera);

// Renderer
const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas });

// Make canvas and renderer full screen
function resizeRenderer() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    canvas.style.width = "100vw";
    canvas.style.height = "100vh";
    canvas.style.display = "block";
    canvas.style.position = "fixed";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.zIndex = "0";
}
window.addEventListener('resize', resizeRenderer);
resizeRenderer();

// === Lighting ===
const ambientLight = new THREE.AmbientLight(0xffffff, 1);
scene.add(ambientLight);

const directionalLight = new THREE.SpotLight(0xffffff, 100);
directionalLight.position.set(5, 10, 7.5);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
scene.add(directionalLight);

// Enable shadows in renderer
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// === Colyseus Client Setup ===
const colyseusClient = new Client(serverUrl);

interface Player {
    x: number;
    y: number;
    z: number;
    rotY?: number; // Add optional rotation property
    model: string; // Character model filename
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
                    // Load GLTF model instead of FBX
                    const loader = new GLTFLoader();
                    loader.load(
                        `assets/characters/${player.model}`, // Use .glb or .gltf file
                        (gltf) => {
                            const object = gltf.scene;
                            object.traverse((child) => {
                                if ((child as THREE.Mesh).isMesh) {
                                    child.castShadow = true;
                                    child.receiveShadow = true;
                                }
                            });
                            object.position.set(player.x, player.y, player.z);
                            object.rotation.y = Math.PI;
                            scene.add(object);

                            data = {
                                mesh: object as THREE.Mesh, // Type assertion for compatibility
                                target: { x: player.x, y: player.y, z: player.z }
                            };
                            playerMeshData.set(sessionId, data);
                        },
                        undefined,
                        (error) => {
                            console.error('Error loading GLTF:', error);
                        }
                    );
                } else {
                    data.target.x = player.x;
                    data.target.y = player.y;
                    data.target.z = player.z;
                    data.target.rotY = player.rotY; // Update target rotation if present
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
    const lerpAlpha = 0.15;
    let myPlayerPos: THREE.Vector3 | null = null;
    let myPlayerRotY: number | null = null;

    playerMeshData.forEach((data, sessionId) => {
        data.mesh.position.lerp(
            new THREE.Vector3(data.target.x, data.target.y, data.target.z),
            lerpAlpha
        );

        data.mesh.rotation.y = data.target.rotY !== undefined
            ? THREE.MathUtils.lerp(data.mesh.rotation.y, data.target.rotY, lerpAlpha)
            : data.mesh.rotation.y;

        // Save my player position and rotation for camera
        if (sessionId === mySessionId) {
            myPlayerPos = data.mesh.position.clone();
            myPlayerRotY = data.mesh.rotation.y;
        }
    });

    // === 3rd Person Camera Follow ===
    if (myPlayerPos && myPlayerRotY !== null) {
        // Offset behind and above the player
        const cameraDistance = 6;
        const cameraHeight = 3;

        // Calculate offset based on player's facing direction (rotY)
        const offsetX = Math.sin(myPlayerRotY) * cameraDistance;
        const offsetZ = Math.cos(myPlayerRotY) * cameraDistance;

        // Target camera position
        const targetCameraPos = new THREE.Vector3(
            myPlayerPos.x - offsetX,
            myPlayerPos.y + cameraHeight,
            myPlayerPos.z - offsetZ
        );

        // Smoothly interpolate camera position
        camera.position.lerp(targetCameraPos, 0.15);

        // Camera looks at the player
        camera.lookAt(myPlayerPos.x, myPlayerPos.y + 1, myPlayerPos.z);
    }

    renderer.render(scene, camera);
}

animate();
setInterval(() => { updatePlayerPosition(); }, 100); // Update every 100ms  

let movement = { x: 0, z: 0 };
let movementPrev = { x: 0, z: 0 };
let movementRotY = 0;
let movementRotYPrev = 0;

// Keyboard input handling
window.addEventListener('keydown', (event: KeyboardEvent) => {

    var key = event.key.toLowerCase();
    if (key === 'w' || key === 'arrowup') {
        movement.z = 1;
    } else if (key === 's' || key === 'arrowdown') {
        movement.z = -1;
    }

    if (key === 'a' || key === 'arrowleft') {
        // Turn left (rotate Y axis)
        movementRotY = 1;
    } else if (key === 'd' || key === 'arrowright') {
        // Turn right (rotate Y axis)
        movementRotY = -1;
    }
});

window.addEventListener('keyup', (event: KeyboardEvent) => {
    switch (event.key) {
        case 'w':
        case 'arrowup':
        case 's':
        case 'arrowdown':
            movement.z = 0;
            break;

        case 'a':
        case 'arrowleft':
        case 'd':
        case 'arrowright':
            movementRotY = 0;
            break;
    }
});

// --- Virtual Joystick for Mobile ---
const joystickContainer = document.createElement('div');
joystickContainer.style.position = 'fixed';
joystickContainer.style.left = '30px';
joystickContainer.style.bottom = '30px';
joystickContainer.style.width = '120px';
joystickContainer.style.height = '120px';
joystickContainer.style.zIndex = '1000';
joystickContainer.style.touchAction = 'none';
joystickContainer.style.userSelect = 'none';
joystickContainer.style.background = 'rgba(0,0,0,0.05)';
joystickContainer.style.borderRadius = '50%';
joystickContainer.style.display = 'none'; // Only show on touch devices
document.body.appendChild(joystickContainer);

const joystickThumb = document.createElement('div');
joystickThumb.style.position = 'absolute';
joystickThumb.style.left = '40px';
joystickThumb.style.top = '40px';
joystickThumb.style.width = '40px';
joystickThumb.style.height = '40px';
joystickThumb.style.background = 'rgba(0,0,0,0.2)';
joystickThumb.style.borderRadius = '50%';
joystickThumb.style.pointerEvents = 'none';
joystickContainer.appendChild(joystickThumb);

// Show joystick only on touch devices
if ('ontouchstart' in window) {
    joystickContainer.style.display = '';
}

let joystickActive = false;
let joystickStart = { x: 0, y: 0 };

joystickContainer.addEventListener('touchstart', (e) => {
    joystickActive = true;
    const touch = e.touches[0];
    joystickStart = { x: touch.clientX, y: touch.clientY };
    joystickThumb.style.left = '40px';
    joystickThumb.style.top = '40px';
}, { passive: false });

joystickContainer.addEventListener('touchmove', (e) => {
    if (!joystickActive) return;
    const touch = e.touches[0];
    const dx = touch.clientX - joystickStart.x;
    const dy = touch.clientY - joystickStart.y;

    // Clamp thumb movement
    const maxDist = 40;
    const dist = Math.min(Math.sqrt(dx * dx + dy * dy), maxDist);
    const angle = Math.atan2(dy, dx);

    const thumbX = 40 + Math.cos(angle) * dist;
    const thumbY = 40 + Math.sin(angle) * dist;
    joystickThumb.style.left = `${thumbX}px`;
    joystickThumb.style.top = `${thumbY}px`;

    // Convert to movement (forward/backward and rotation)
    // Up/down: movement.z, left/right: rotation
    const normX = Math.cos(angle) * (dist / maxDist);
    const normY = Math.sin(angle) * (dist / maxDist);

    // Forward/backward
    movement.z = Math.abs(normY) > 0.2 ? (normY > 0 ? -1 : 1) : 0;
    // Left/right for rotation
    movementRotY = Math.abs(normX) > 0.2 ? (normX > 0 ? -1 : 1) : 0;

    e.preventDefault();
}, { passive: false });

joystickContainer.addEventListener('touchend', () => {
    joystickActive = false;
    joystickThumb.style.left = '40px';
    joystickThumb.style.top = '40px';
    movement.z = 0;
    movementRotY = 0;
});


function updatePlayerPosition() {
    if (!room || !mySessionId) return;
    // @ts-ignore
    const player = room.state.players.get(mySessionId);
    if (!player) return;

    if (movement.z === movementPrev.z && movement.z === 0 && movementRotY === movementRotYPrev && movementRotY === 0) {
        // No movement or rotation change, skip sending
        return;
    }

    room.send("move", {
        x: movement.x,
        z: movement.z,
        rotY: movementRotY
    });

    movementPrev.x = movement.x;
    movementPrev.z = movement.z;
    movementRotYPrev = movementRotY;
}
