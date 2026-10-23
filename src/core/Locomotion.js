import * as THREE from 'three';
import { CONFIG } from '../game/config.js';

const UP = new THREE.Vector3(0, 1, 0);
const _head = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _move = new THREE.Vector3();

// Joystick gauche : déplacement (on se tourne physiquement, pas de rotation au joystick).
// Le joueur (sa TÊTE) reste toujours dans la zone de lancer : interdit de dépasser la ligne.
export class Locomotion {
  constructor(player, camera, controllers) {
    this.player = player;
    this.camera = camera;
    this.controllers = controllers;
    this.lineZ = 0;
  }

  // Position de la ligne de lancer (dépend de la difficulté)
  setThrowDistance(d) {
    this.lineZ = d;
  }

  // Joystick d'une main : axes 2 (gauche/droite) et 3 (avant/arrière) en xr-standard
  _stick(handedness) {
    const hand = this.controllers.hands.find((h) => h.handedness === handedness && h.gamepad);
    const axes = hand?.gamepad.axes;
    if (!axes || axes.length < 4) return { x: 0, y: 0 };
    return { x: axes[2], y: axes[3] };
  }

  update(dt) {
    const { speed, deadzone } = CONFIG.locomotion;

    // --- Déplacement (joystick gauche), dans la direction du regard ---
    const left = this._stick('left');
    if (Math.hypot(left.x, left.y) > deadzone) {
      this.camera.getWorldDirection(_forward);
      _forward.y = 0;
      _forward.normalize();
      _right.crossVectors(_forward, UP); // droite = avant × haut
      _move
        .copy(_forward).multiplyScalar(-left.y) // joystick vers l'avant = y négatif
        .addScaledVector(_right, left.x)
        .multiplyScalar(speed * dt);
      this.player.position.add(_move);
    }

    this._clampToThrowZone();
  }

  // Si la tête sort de la zone, on recale le joueur à l'intérieur.
  // Marche aussi quand le joueur avance physiquement dans sa pièce.
  _clampToThrowZone() {
    const { halfWidth, depth, lineMargin } = CONFIG.locomotion;
    this.camera.getWorldPosition(_head);
    const x = THREE.MathUtils.clamp(_head.x, -halfWidth, halfWidth);
    const z = THREE.MathUtils.clamp(_head.z, this.lineZ + lineMargin, this.lineZ + depth);
    this.player.position.x += x - _head.x;
    this.player.position.z += z - _head.z;
  }
}