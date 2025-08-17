import { scene, camera, renderer, setupLighting, setupGround, resizeRenderer } from './scene';
import { joinRoom, mySessionId, room } from './network';
import { updatePlayerMeshes, animatePlayers } from './player';
import { setupKeyboardInput, setupVirtualJoystick, movement, movementPrev, movementRotY, movementRotYPrev } from './input';

setupLighting();
setupGround();
window.addEventListener('resize', resizeRenderer);
resizeRenderer();
setupKeyboardInput();
setupVirtualJoystick();

joinRoom((state: any) => {
    updatePlayerMeshes(state.players, mySessionId);
});

function updatePlayerPosition() {
    if (!room || !mySessionId) return;
    // @ts-ignore
    const player = room.state.players.get(mySessionId);
    if (!player) return;

    if (movement.z === movementPrev.z && movement.z === 0 && movementRotY.curr === movementRotY.prev && movementRotY.curr === 0) {
        return;
    }

    room.send("move", {
        x: movement.x,
        z: movement.z,
        rotY: movementRotY.curr
    });

    movementPrev.x = movement.x;
    movementPrev.z = movement.z;
    movementRotY.prev = movementRotY.curr;
}

setInterval(() => { updatePlayerPosition(); }, 100);

function animate() {
    requestAnimationFrame(animate);
    animatePlayers(mySessionId);
    renderer.render(scene, camera);
}
animate();