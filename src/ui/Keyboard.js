import * as THREE from 'three';
import { Panel, roundRect, text } from './Panel.js';

const _origin = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _quat = new THREE.Quaternion();

const MAX_LENGTH = 16;
// Clavier AZERTY : une touche = { label, value, x, y, w } (coordonnées du canvas)
const ROWS = ['AZERTYUIOP', 'QSDFGHJKLM', 'WXCVBN'];

// Clavier virtuel en VR : on vise une touche avec le rayon de la manette, gâchette pour taper.
// Sert à écrire son pseudo sans retirer le casque.
export class Keyboard {
  constructor(controllers) {
    this.controllers = controllers;
    this.panel = new Panel(1.1, 0.66, 768);
    this.mesh = this.panel.mesh;
    this.mesh.visible = false;
    this.raycaster = new THREE.Raycaster();
    this.value = '';
    this.hovered = null;
    this.keys = this._layout();
  }

  get visible() {
    return this.mesh.visible;
  }

  // Ouvre le clavier avec un texte de départ ; onDone(texte) quand on valide
  open(value, onDone) {
    this.value = value ?? '';
    this.onDone = onDone;
    this.hovered = null;
    this.mesh.visible = true;
    this._draw();
  }

  close() {
    this.mesh.visible = false;
  }

  _layout() {
    const { width: W } = this.panel.canvas;
    const keys = [];
    const size = 66;  // côté d'une touche (px)
    const gap = 10;
    const top = 190;
    ROWS.forEach((row, r) => {
      const rowW = row.length * size + (row.length - 1) * gap;
      const x0 = (W - rowW) / 2;
      [...row].forEach((ch, i) => keys.push({ label: ch, value: ch, x: x0 + i * (size + gap), y: top + r * (size + gap), w: size, h: size }));
    });
    // Effacer, à droite de la dernière rangée
    const last = keys[keys.length - 1];
    keys.push({ label: '⌫', value: 'back', x: last.x + size + gap, y: last.y, w: size * 2 + gap, h: size });
    // Dernière ligne : espace + valider
    const y = top + 3 * (size + gap);
    keys.push({ label: 'Espace', value: ' ', x: W / 2 - 330, y, w: 420, h: size });
    keys.push({ label: 'OK', value: 'ok', x: W / 2 + 110, y, w: 220, h: size, accent: true });
    return keys;
  }

  _draw() {
    this.panel.draw((ctx, w, h) => {
      roundRect(ctx, 0, 0, w, h, 40, 'rgba(15, 23, 42, 0.95)');
      text(ctx, 'Ton pseudo', w / 2, 46, 36, '#facc15');
      // Champ de saisie
      roundRect(ctx, 90, 82, w - 180, 76, 18, '#0b1220');
      const shown = this.value || 'Vise les lettres, gâchette pour taper';
      text(ctx, shown + (this.value ? '_' : ''), w / 2, 121, this.value ? 44 : 28, this.value ? '#ffffff' : '#64748b', 'center', this.value ? 'bold' : 'normal', w - 220);
      // Touches
      for (const k of this.keys) {
        const hover = this.hovered === k;
        const fill = hover ? '#facc15' : k.accent ? '#16a34a' : '#1e293b';
        roundRect(ctx, k.x, k.y, k.w, k.h, 12, fill);
        text(ctx, k.label, k.x + k.w / 2, k.y + k.h / 2 + 2, k.label.length > 2 ? 28 : 34, hover ? '#0f172a' : '#ffffff');
      }
    });
  }

  // Touche visée par une main (ou null)
  _pick(hand) {
    if (!hand.gamepad) return null;
    hand.ray.getWorldPosition(_origin);
    hand.ray.getWorldQuaternion(_quat);
    _dir.set(0, 0, -1).applyQuaternion(_quat);
    this.raycaster.set(_origin, _dir);
    const hit = this.raycaster.intersectObject(this.mesh)[0];
    hand.rayLine.scale.z = hit ? hit.distance : 3;
    if (!hit?.uv) return null;
    const { width: W, height: H } = this.panel.canvas;
    const x = hit.uv.x * W;
    const y = (1 - hit.uv.y) * H;
    return this.keys.find((k) => x >= k.x && x <= k.x + k.w && y >= k.y && y <= k.y + k.h) ?? null;
  }

  // À chaque frame : survol des touches
  update() {
    if (!this.visible) return;
    let hovered = null;
    for (const hand of this.controllers.hands) hovered = this._pick(hand) ?? hovered;
    if (hovered !== this.hovered) {
      this.hovered = hovered;
      this._draw();
    }
  }

  // Gâchette : tape la touche visée
  trigger(hand) {
    const key = this._pick(hand);
    if (!key) return;
    this.controllers.vibrate(hand, 0.3, 25);
    this.press(key.value);
  }

  press(value) {
    if (value === 'ok') {
      this.close();
      this.onDone?.(this.value.trim());
      return;
    }
    if (value === 'back') this.value = this.value.slice(0, -1);
    else if (this.value.length < MAX_LENGTH) {
      // Majuscule au début de chaque mot, minuscules ensuite : « Yassine », « Jean Paul »
      const startOfWord = this.value === '' || this.value.endsWith(' ');
      if (value === ' ' && startOfWord) return; // pas d'espaces en double
      this.value += startOfWord ? value : value.toLowerCase();
    }
    this._draw();
  }
}
