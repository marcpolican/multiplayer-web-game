import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { scene, camera } from './scene';

export interface Player {
    x: number;
    y: number;
    z: number;
    rotY?: number;
    model: string;
}

interface PlayerMeshData {
    mesh: THREE.Object3D;
    target: { x: number; y: number; z: number; rotY?: number; };
}
export const playerMeshData: Map<string, PlayerMeshData> = new Map();

export function updatePlayerMeshes(players: Map<string, Player>, mySessionId: string | null) {
    // Remove meshes for players that left
    for (const sessionId of playerMeshData.keys()) {
        if (!players.has(sessionId)) {
            const data = playerMeshData.get(sessionId);
            if (data) scene.remove(data.mesh);
            playerMeshData.delete(sessionId);
        }
    }

    // Add/update meshes for current players
    players.forEach((player, sessionId) => {
        let data = playerMeshData.get(sessionId);

        if (!data) {
            const loader = new GLTFLoader();
            loader.load(
                `assets/characters/${player.model}`,
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
                        mesh: object,
                        target: { x: player.x, y: player.y, z: player.z, rotY: player.rotY }
                    };
                    playerMeshData.set(sessionId, data);
                }
            );
        } else {
            data.target.x = player.x;
            data.target.y = player.y;
            data.target.z = player.z;
            data.target.rotY = player.rotY;
        }
    });
}

export function animatePlayers(mySessionId: string | null) {
    const lerpAlpha = 0.15;
    let myPlayerPos: THREE.Vector3 | null = null;
    let myPlayerRotY: number | null = null;

    playerMeshData.forEach((data, sessionId) => {
        data.mesh.position.lerp(
            new THREE.Vector3(data.target.x, data.target.y, data.target.z),
            lerpAlpha
        );
        if (data.target.rotY !== undefined) {
            data.mesh.rotation.y = THREE.MathUtils.lerp(data.mesh.rotation.y, data.target.rotY, lerpAlpha);
        }
        if (sessionId === mySessionId) {
            myPlayerPos = data.mesh.position.clone();
            myPlayerRotY = data.mesh.rotation.y;
        }
    });

    // 3rd Person Camera Follow
    if (myPlayerPos && myPlayerRotY !== null) {
        const cameraDistance = 10;
        const cameraHeight = 5;
        const offsetX = Math.sin(myPlayerRotY) * cameraDistance;
        const offsetZ = Math.cos(myPlayerRotY) * cameraDistance;
        const targetCameraPos = new THREE.Vector3(
            myPlayerPos.x - offsetX,
            myPlayerPos.y + cameraHeight,
            myPlayerPos.z - offsetZ
        );
        camera.position.lerp(targetCameraPos, 0.15);
        camera.lookAt(myPlayerPos.x, myPlayerPos.y + 1, myPlayerPos.z);
    }
}