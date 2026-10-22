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
    // File d'événements : Rapier y dépose les chocs détectés pendant chaque pas
    this.eventQueue = new RAPIER.EventQueue(true);
    this.contactListeners = [];
  }

    // fn({ id, position, force }) à chaque choc assez fort (sons d'impact)
  onContact(fn) {
    this.contactListeners.push(fn);
  }

  // Lit les chocs du dernier pas et prévient les abonnés
  _drainContacts() {
    this.eventQueue.drainContactForceEvents((event) => {
      const c1 = this.world.getCollider(event.collider1());
      const c2 = this.world.getCollider(event.collider2());
      if (!c1 || !c2) return;
      const a = c1.translation();
      const b = c2.translation();
      // position approximative du choc : milieu des deux objets
      const position = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 };
      const info = { id: event.collider1(), position, force: event.totalForceMagnitude() };
      this.contactListeners.forEach((fn) => fn(info));
    });
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
      this.world.step(this.eventQueue);
      this._drainContacts();
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