import { Pin } from './pin.js';
import { CONFIG } from './config.js';

export class Pins {
  constructor(physics, scene) {
    this.list = [];

    const { radius, gap } = CONFIG.pin;
    const spacing = radius * 2 + gap;              // écart entre 2 quilles d'une rangée
    const rowSpacing = spacing * Math.sqrt(3) / 2; // écart entre rangées (quinconce)
    const rows = CONFIG.formation;
    const mid = (rows.length - 1) / 2;

    rows.forEach((row, r) => {
      // r = 0 → rangée avant → z positif (côté joueur)
      const z = (mid - r) * rowSpacing;
      row.forEach((number, i) => {
        // centrage de la rangée sur x = 0 ; le joueur regarde vers -Z donc sa droite est +X
        const x = (i - (row.length - 1) / 2) * spacing;
        this.list.push(new Pin(physics, scene, number, { x, z }));
      });
    });

    // Tri par numéro → get(n) est direct
    this.list.sort((a, b) => a.number - b.number);
  }

  get(number) {
    return this.list[number - 1];
  }
    // Quilles actuellement debout
  standing() {
    return this.list.filter((pin) => pin.isStanding());
  }
  resetAll() {
    this.list.forEach((pin) => pin.resetToInitial());
  }
}