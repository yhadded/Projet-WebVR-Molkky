import * as THREE from 'three';
import { CONFIG } from './config.js';

const STEPS = 40;      // points de la courbe
const DT = 0.03;       // s entre deux points (≈ 1,2 s de vol)
const _vel = new THREE.Vector3();
const _p = new THREE.Vector3();

// Mode Facile : affiche la trajectoire prévue du Mölkky tant qu'on le tient.
// Calcul balistique simple : p(t) = p0 + v·t + ½·g·t²
export class AimAssist {
  constructor(scene, grab, molkky) {
    this.grab = grab;
    this.molkky = molkky;
    this.enabled = false;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(STEPS * 3), 3));
    this.line = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.8 })
    );
    this.line.frustumCulled = false;
    this.line.visible = false;
    scene.add(this.line);

    // Petit cercle à l'endroit d'atterrissage prévu
    this.marker = new THREE.Mesh(
      new THREE.RingGeometry(0.08, 0.11, 32),
      new THREE.MeshBasicMaterial({ color: 0xfacc15 })
    );
    this.marker.rotation.x = -Math.PI / 2;
    this.marker.visible = false;
    scene.add(this.marker);
  }

  // À chaque frame, APRÈS grab.lateUpdate (le mesh est alors dans la main)
  update() {
    const show = this.enabled && this.grab.heldBy !== null;
    this.line.visible = this.marker.visible = show;
    if (!show) return;

    // Vitesse actuelle de la main = vitesse qu'aurait le bâton si on lâchait maintenant
    this.grab.tracker.getLinear(_vel).multiplyScalar(CONFIG.throw.powerMultiplier);
    const start = this.molkky.mesh.position;
    const g = CONFIG.gravity;
    const pos = this.line.geometry.attributes.position;

    let last = 0;
    for (let i = 0; i < STEPS; i++) {
      const t = i * DT;
      _p.copy(start).addScaledVector(_vel, t);
      _p.y += 0.5 * g * t * t;
      if (_p.y < 0) _p.y = 0; // la courbe s'arrête au sol
      pos.setXYZ(i, _p.x, _p.y, _p.z);
      if (_p.y > 0) last = i;
    }
    pos.needsUpdate = true;
    this.line.geometry.setDrawRange(0, last + 2);
    this.marker.position.set(pos.getX(last + 1), 0.01, pos.getZ(last + 1));
  }
}