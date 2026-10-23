import * as THREE from 'three';
import { CONFIG } from './config.js';
import { RULES } from './Scoring.js';

const SIZE = 0.075;   // taille d'une étiquette (m)
const LIFT = 0.06;    // hauteur au-dessus du sommet de la quille (m)
const STAIR = 1.4;    // les rangées du fond sont plus haut → les numéros ne se cachent pas

// Numéros flottants au-dessus des quilles, toujours tournés vers le joueur.
// Lisibles depuis la ligne de lancer, même quand les quilles sont éparpillées.
// La quille qui fait gagner (ex. la 1 à 49 points) est mise en évidence en or.
export class PinLabels {
  constructor(scene, pins) {
    this.pins = pins;
    this.target = null;
    this.frontZ = Math.max(...pins.list.map((p) => p.initialPosition.z));
    this.labels = pins.list.map((pin) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 128;
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true }));
      sprite.scale.set(SIZE, SIZE, 1);
      sprite.renderOrder = 10; // par-dessus les quilles
      scene.add(sprite);
      const label = { pin, sprite, canvas, texture, isTarget: null };
      this._draw(label, false);
      return label;
    });
  }

  _draw(label, isTarget) {
    if (label.isTarget === isTarget) return;
    label.isTarget = isTarget;
    const ctx = label.canvas.getContext('2d');
    ctx.clearRect(0, 0, 128, 128);
    ctx.beginPath();
    ctx.arc(64, 64, 58, 0, Math.PI * 2);
    ctx.fillStyle = isTarget ? '#facc15' : 'rgba(15, 23, 42, 0.85)';
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = isTarget ? '#ffffff' : '#e8c99a';
    ctx.stroke();
    ctx.fillStyle = isTarget ? '#0f172a' : '#ffffff';
    ctx.font = 'bold 72px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(label.pin.number), 64, 68);
    label.texture.needsUpdate = true;
    const s = isTarget ? SIZE * 1.4 : SIZE;
    label.sprite.scale.set(s, s, 1);
  }

  // À chaque frame. score = score actuel (null : pas de partie) ; visible = afficher ou non
  update(score, visible = true) {
    const left = score == null ? null : RULES.target - score;
    const target = left >= 1 && left <= 12 ? left : null; // une seule quille suffit pour finir pile
    const top = CONFIG.pin.height / 2 + LIFT;
    for (const label of this.labels) {
      label.sprite.visible = visible;
      if (!visible) continue;
      const p = label.pin.mesh.position;
      const back = THREE.MathUtils.clamp(this.frontZ - p.z, 0, 0.3); // plus la quille est au fond, plus c'est haut
      label.sprite.position.set(p.x, p.y + top + back * STAIR, p.z);
      this._draw(label, label.pin.number === target);
    }
  }
}
