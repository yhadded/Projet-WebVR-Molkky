import * as THREE from 'three';
import { PhysicsObject } from '../core/PhysicsObject.js';
import { CONFIG } from './config.js';

// Crée une texture à partir d'un canvas 2D
function makeTexture(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  draw(ctx, width, height);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function woodBackground(ctx, w, h) {
  ctx.fillStyle = '#e8c99a';
  ctx.fillRect(0, 0, w, h);
}

function drawNumber(ctx, n, x, y, size) {
  ctx.fillStyle = '#3b2412';
  ctx.font = `bold ${size}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(n), x, y);
}

export class Pin extends PhysicsObject {
  constructor(physics, scene, number, position) {
    const { radius, height, density, friction, restitution, color } = CONFIG.pin;
    const { RAPIER } = physics;

    // --- Visuel ---
    // CylinderGeometry a 3 faces : [0] côté, [1] dessus, [2] dessous
    const sideTex = makeTexture(256, 256, (ctx, w, h) => {
      woodBackground(ctx, w, h);
      // la texture fait le tour du cylindre → numéro dessiné 2 fois (devant et derrière)
      drawNumber(ctx, number, w * 0.25, h * 0.35, 90);
      drawNumber(ctx, number, w * 0.75, h * 0.35, 90);
    });
    const topTex = makeTexture(128, 128, (ctx, w, h) => {
      woodBackground(ctx, w, h);
      drawNumber(ctx, number, w / 2, h / 2, 70);
    });

    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, height, 20),
      [
        new THREE.MeshStandardMaterial({ map: sideTex }),
        new THREE.MeshStandardMaterial({ map: topTex }),
        new THREE.MeshStandardMaterial({ color }),
      ]
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // --- Physique ---
    // Le centre du cylindre est à mi-hauteur → posé au sol à y = height/2
    const start = { x: position.x, y: height / 2, z: position.z };
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(start.x, start.y, start.z);
    const colliderDesc = RAPIER.ColliderDesc.cylinder(height / 2, radius) // (demi-hauteur, rayon), axe Y
      .setDensity(density)
      .setFriction(friction)
      .setRestitution(restitution);

    super(physics, scene, mesh, bodyDesc, colliderDesc);

    this.number = number;
    this.initialPosition = start;
  }

  // Remet la quille à sa place de départ (nouvelle partie)
  resetToInitial() {
    this.setPose(this.initialPosition);
  }
}