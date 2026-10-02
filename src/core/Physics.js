import RAPIER from '@dimforge/rapier3d-compat';
import { CONFIG } from '../game/config.js';

export class Physics {
  // Rapier doit charger son WASM avant toute utilisation → constructeur async
  static async create() {
    await RAPIER.init();
    return new Physics();
  }

  constructor() {
    this.RAPIER = RAPIER; // exposé pour que les autres modules créent bodies/colliders
    this.world = new RAPIER.World({ x: 0, y: CONFIG.gravity, z: 0 });
    this.world.timestep = CONFIG.physicsStep;
    this.accumulator = 0;
    this.links = []; // paires { mesh, body } à synchroniser
  }

  // Lie un mesh Three.js à un rigid body Rapier.
  // Le mesh doit être enfant direct de la scène (coordonnées monde).
  link(mesh, body) {
    this.links.push({ mesh, body });
  }

  update(dt) {
    // Pas fixe : même simulation à 72, 90 ou 120 Hz
    this.accumulator += dt;
    while (this.accumulator >= CONFIG.physicsStep) {
      this.world.step();
      this.accumulator -= CONFIG.physicsStep;
    }

    // Physique → affichage
    for (const { mesh, body } of this.links) {
      const p = body.translation();
      const r = body.rotation();
      mesh.position.set(p.x, p.y, p.z);
      mesh.quaternion.set(r.x, r.y, r.z, r.w);
    }
  }
}