import * as THREE from 'three';
import { BEAR_X_LIMIT, updateBear } from '../entities/bear.js';
import { getOrbitControls, initOrbitControls } from '../scene.js';
import { toggleDevTools, resetDevTools } from './dev.js';
import { bear, gameState } from './game.js';

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let keysPressed = {};
let isDragging = false;
// Use a fixed plane at the log depth so dragging continues off the log
const dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -1);
const _dragPoint = new THREE.Vector3();

/* swipe detection state */
let startX = 0, startY = 0, startTime = 0;

function onPointerDown(event) {
    if (gameState.current !== 'PLAYING' || event.target.tagName === 'BUTTON') return;
    isDragging = true;
    const e = event.changedTouches ? event.changedTouches[0] : event;
    startX = e.clientX; startY = e.clientY; startTime = Date.now();
    bear.userData.isMovingWithKeys = false;
    onPointerMove(event);
}

function onPointerMove(event) {
    if (!isDragging || gameState.current !== 'PLAYING' || !bear) return;

    updatePointer(event);
    raycaster.setFromCamera(pointer, window.camera);
    if (raycaster.ray.intersectPlane(dragPlane, _dragPoint)) {
        bear.userData.targetX = THREE.MathUtils.clamp(_dragPoint.x, -BEAR_X_LIMIT, BEAR_X_LIMIT);
        bear.userData.isMovingWithKeys = false;
    }
}

function onPointerUp(event) {
    isDragging = false;
    // Detect vertical swipe/tap to roll log forward/back
    if (gameState.current !== 'PLAYING' || !bear) return;
    const e = event.changedTouches ? event.changedTouches[0] : event;
    const dx = e.clientX - startX, dy = e.clientY - startY;
    const dt = Date.now() - startTime;
    const absX = Math.abs(dx), absY = Math.abs(dy);
    // consider as vertical gesture if vertical dominates or a quick tap
    if (absY > 18 && absY > absX) {
        const forward = dy < 0;
        // nudge more on stronger swipe
        const mag = Math.min(1, absY / 160);
        const delta = (forward ? 1 : -1) * (0.12 + 0.22 * mag);
        import('../entities/bear.js').then(m => m.nudgeBearZ?.(bear, delta));
    } else if (dt < 180 && absX < 14 && absY < 14) {
        // light tap: default small forward nudge
        import('../entities/bear.js').then(m => m.nudgeBearZ?.(bear, 0.10));
    }
}

function updatePointer(event) {
    const eventCoord = event.changedTouches ? event.changedTouches[0] : event;
    pointer.x = (eventCoord.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(eventCoord.clientY / window.innerHeight) * 2 + 1;
}

function handleKeyDown(event) {
    if (gameState.current !== 'PLAYING' || !bear) return;
    keysPressed[event.key] = true;
    if (event.key === 'a' || event.key === 'ArrowLeft' || event.key === 'd' || event.key === 'ArrowRight') {
        bear.userData.isMovingWithKeys = true;
    }
    updateBearMovement();
}

function handleKeyUp(event) {
    keysPressed[event.key] = false;
    updateBearMovement();
}

function updateBearMovement() {
    if (!bear || gameState.current !== 'PLAYING' || !bear.userData.isMovingWithKeys) return;
    let moveDirection = 0;
    if (keysPressed['a'] || keysPressed['ArrowLeft']) moveDirection = -1;
    else if (keysPressed['d'] || keysPressed['ArrowRight']) moveDirection = 1;
    updateBear(bear, moveDirection);
}

function handleGlobalKeyUp(event) {
    if (event.key === '`' || event.key === '~') {
        resetDevTools(getOrbitControls());
    }
}

function handleDevButtonClick() {
    toggleDevTools(initOrbitControls());
}

export function initControls(sceneRef, cameraRef) {
    window.scene = sceneRef; 
    window.camera = cameraRef; 

    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('keyup', handleGlobalKeyUp, true);

    const devButton = document.getElementById('dev-console-button');
    if (devButton) devButton.addEventListener('click', handleDevButtonClick);
}