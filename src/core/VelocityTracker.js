import * as THREE from 'three';

const _qInv = new THREE.Quaternion();
const _qDelta = new THREE.Quaternion();

export class VelocityTracker {
  constructor(windowMs = 80) {
    this.windowMs = windowMs;
    this.samples = []; // { p: Vector3, q: Quaternion, t: ms }
  }

  reset() {
    this.samples.length = 0;
  }

  // Enregistre une pose et oublie celles de plus de windowMs
  push(position, quaternion, time) {
    this.samples.push({ p: position.clone(), q: quaternion.clone(), t: time });
    while (this.samples.length > 2 && time - this.samples[0].t > this.windowMs) {
      this.samples.shift();
    }
  }

  _span() {
    if (this.samples.length < 2) return null;
    const a = this.samples[0];
    const b = this.samples[this.samples.length - 1];
    const dt = (b.t - a.t) / 1000; // en secondes
    return dt > 0 ? { a, b, dt } : null;
  }

  // Vitesse linéaire (m/s) = déplacement / temps
  getLinear(out) {
    const s = this._span();
    if (!s) return out.set(0, 0, 0);
    return out.subVectors(s.b.p, s.a.p).divideScalar(s.dt);
  }

  // Vitesse angulaire (rad/s) : rotation entre la 1re et la dernière pose
  getAngular(out) {
    const s = this._span();
    if (!s) return out.set(0, 0, 0);

    // delta = q_fin × q_début⁻¹  (rotation effectuée pendant dt)
    _qInv.copy(s.a.q).invert();
    _qDelta.copy(s.b.q).multiply(_qInv);
    if (_qDelta.w < 0) { // prendre le chemin le plus court
      _qDelta.set(-_qDelta.x, -_qDelta.y, -_qDelta.z, -_qDelta.w);
    }

    // quaternion → axe + angle
    const angle = 2 * Math.acos(Math.min(1, _qDelta.w));
    const sinHalf = Math.sqrt(1 - _qDelta.w * _qDelta.w);
    if (sinHalf < 1e-4) return out.set(0, 0, 0); // quasi aucune rotation

    return out
      .set(_qDelta.x / sinHalf, _qDelta.y / sinHalf, _qDelta.z / sinHalf)
      .multiplyScalar(angle / s.dt); // axe × (angle / temps)
  }
}