import * as THREE from 'three';
import { PhysicsObject } from '../core/PhysicsObject.js';
import { CONFIG } from './config.js';

// Rotation "couché" : cylindre (axe Y) tourné de 90° autour de Z → posé à plat
export const LYING = { x: 0, y: 0, z: Math.SQRT1_2, w: Math.SQRT1_2 };

export class Molkky extends PhysicsObject {
  constructor(physics, scene) {
    const { radius, length, density, friction, restitution, color } = CONFIG.molkky;
    const { RAPIER } = physics;

    const material = new THREE.MeshStandardMaterial({ color });
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, length, 16),
      material
    );
    mesh.castShadow = true;

    // CCD (Continuous Collision Detection) : indispensable pour un objet lancé vite,
    // sinon il peut TRAVERSER une quille entre deux pas de simulation
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic().setCcdEnabled(true);
    const colliderDesc = RAPIER.ColliderDesc.cylinder(length / 2, radius)
      .setDensity(density)
      .setFriction(friction)
      .setRestitution(restitution);

    super(physics, scene, mesh, bodyDesc, colliderDesc);
    this.material = material;
  }

  // Tenu → cinématique (piloté par la main) ; lâché → dynamique (physique)
  setHeld(held) {
    const T = this.physics.RAPIER.RigidBodyType;
    this.body.setBodyType(held ? T.KinematicPositionBased : T.Dynamic, true);
  }

  // Cible de la prochaine étape physique (mode cinématique uniquement)
  moveKinematic(pos, quat) {
    this.body.setNextKinematicTranslation(pos);
    this.body.setNextKinematicRotation(quat);
  }

  // Lueur quand la main est assez proche pour saisir
  setHighlight(on) {
    this.material.emissive.setHex(on ? 0x553300 : 0x000000);
  }
}