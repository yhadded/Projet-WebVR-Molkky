import * as THREE from 'three';
import { CONFIG } from './config.js';

// Variables réutilisées (évite de créer des objets à chaque frame → moins de saccades)
const _handPos = new THREE.Vector3();
const _handQuat = new THREE.Quaternion();
const _molkkyPos = new THREE.Vector3();
const _targetPos = new THREE.Vector3();
const _targetQuat = new THREE.Quaternion();

export class GrabSystem {
  constructor(controllers, molkky) {
    this.controllers = controllers;
    this.molkky = molkky;
    this.heldBy = null; // la main qui tient le Mölkky (ou null)

    // Pose du bâton DANS la main.
    // Dans le repère "grip", l'axe -Z suit la longueur d'un objet tenu dans le poing.
    // Notre cylindre est sur l'axe Y → on le tourne de -90° autour de X pour l'aligner.
    this.offsetPos = new THREE.Vector3(...CONFIG.grab.offset);
    this.offsetQuat = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(1, 0, 0), -Math.PI / 2
    );

    controllers.hands.forEach((hand) => {
      hand.grip.addEventListener('squeezestart', () => this.tryGrab(hand));
      hand.grip.addEventListener('squeezeend', () => this.release(hand));
    });
  }

  distanceToMolkky(hand) {
    hand.grip.getWorldPosition(_handPos);
    const p = this.molkky.body.translation();
    return _handPos.distanceTo(_molkkyPos.set(p.x, p.y, p.z));
  }

  tryGrab(hand) {
    if (this.heldBy) return;
    if (this.distanceToMolkky(hand) > CONFIG.grab.radius) return;

    this.heldBy = hand;
    this.molkky.setHeld(true);
    this.molkky.setHighlight(false);
    this.controllers.vibrate(hand, 0.6, 50); // retour haptique
  }

  release(hand) {
    if (this.heldBy !== hand) return;
    this.heldBy = null;
    this.molkky.setHeld(false);
    // Étape 4 : on transmettra ici la vitesse de la main → vrai lancer
  }

  // Pose monde visée = pose de la main × offset
  _computeTarget() {
    const grip = this.heldBy.grip;
    grip.getWorldPosition(_handPos);
    grip.getWorldQuaternion(_handQuat);
    _targetPos.copy(this.offsetPos).applyQuaternion(_handQuat).add(_handPos);
    _targetQuat.copy(_handQuat).multiply(this.offsetQuat);
  }

  // AVANT la physique : donne la cible au corps cinématique
  update() {
    if (!this.heldBy) {
      // Pas tenu → s'illumine si une main est à portée
      const near = this.controllers.hands.some(
        (h) => h.gamepad && this.distanceToMolkky(h) < CONFIG.grab.radius
      );
      this.molkky.setHighlight(near);
      return;
    }
    this._computeTarget();
    this.molkky.moveKinematic(_targetPos, _targetQuat);
  }

  // APRÈS la physique : colle le visuel exactement à la main.
  // La physique tourne à 60 Hz alors que le Quest affiche à 72 Hz ;
  // sans ça, le bâton "tremblerait" légèrement en main.
  lateUpdate() {
    if (!this.heldBy) return;
    this.molkky.mesh.position.copy(_targetPos);
    this.molkky.mesh.quaternion.copy(_targetQuat);
  }
}