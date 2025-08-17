export let movement = { x: 0, z: 0 };
export let movementPrev = { x: 0, z: 0 };
export let movementRotY = { curr: 0, prev: 0 };

export function setupKeyboardInput() {
    window.addEventListener('keydown', (event: KeyboardEvent) => {
        const key = event.key.toLowerCase();
        if (key === 'w' || key === 'arrowup') movement.z = 1;
        else if (key === 's' || key === 'arrowdown') movement.z = -1;
        if (key === 'a' || key === 'arrowleft') movementRotY.curr = 1;
        else if (key === 'd' || key === 'arrowright') movementRotY.curr = -1;
    });

    window.addEventListener('keyup', (event: KeyboardEvent) => {
        switch (event.key) {
            case 'w': case 'arrowup': case 's': case 'arrowdown':
                movement.z = 0; break;
            case 'a': case 'arrowleft': case 'd': case 'arrowright':
                movementRotY.curr = 0; break;
        }
    });
}

export function setupVirtualJoystick() {
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
    joystickContainer.style.display = 'none';
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

        const maxDist = 40;
        const dist = Math.min(Math.sqrt(dx * dx + dy * dy), maxDist);
        const angle = Math.atan2(dy, dx);

        const thumbX = 40 + Math.cos(angle) * dist;
        const thumbY = 40 + Math.sin(angle) * dist;
        joystickThumb.style.left = `${thumbX}px`;
        joystickThumb.style.top = `${thumbY}px`;

        const normX = Math.cos(angle) * (dist / maxDist);
        const normY = Math.sin(angle) * (dist / maxDist);

        movement.z = Math.abs(normY) > 0.2 ? (normY > 0 ? -1 : 1) : 0;
        movementRotY.curr = Math.abs(normX) > 0.2 ? (normX > 0 ? -1 : 1) : 0;

        e.preventDefault();
    }, { passive: false });

    joystickContainer.addEventListener('touchend', () => {
        joystickActive = false;
        joystickThumb.style.left = '40px';
        joystickThumb.style.top = '40px';
        movement.z = 0;
        movementRotY.curr = 0;
    });
}