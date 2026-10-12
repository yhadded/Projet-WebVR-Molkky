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
    // Règle du Mölkky : chaque quille tombée est relevée là où elle est tombée.
  // Si l'endroit est déjà occupé, on la décale juste assez pour ne pas chevaucher.
  standUpFallen() {
    const { radius, gap } = CONFIG.pin;
    const minDist = radius * 2 + gap;

    // Emplacements déjà pris : les quilles restées debout
    const occupied = this.standing().map((pin) => {
      const p = pin.body.translation();
      return { x: p.x, z: p.z };
    });

    const fallen = this.list.filter((pin) => !pin.isStanding());
    for (const pin of fallen) {
      const p = pin.body.translation();
      const spot = freeSpot(p.x, p.z, occupied, minDist);
      pin.standUpAt(spot.x, spot.z);
      occupied.push(spot);
    }
    return fallen.map((pin) => pin.number);
  }

  resetAll() {
    this.list.forEach((pin) => pin.resetToInitial());
  }
}


// Cherche l'emplacement libre le plus proche de (x, z) :
// on repousse le point hors de chaque quille trop proche, et on recommence jusqu'à ce que ça tienne.
function freeSpot(x, z, occupied, minDist) {
  for (let iter = 0; iter < 20; iter++) {
    let moved = false;
    for (const o of occupied) {
      const dx = x - o.x;
      const dz = z - o.z;
      const d = Math.hypot(dx, dz);
      if (d < minDist) {
        const nx = d > 1e-6 ? dx / d : 1; // direction pour s'écarter
        const nz = d > 1e-6 ? dz / d : 0;
        x = o.x + nx * minDist;
        z = o.z + nz * minDist;
        moved = true;
      }
    }
    if (!moved) break;
  }
  return { x, z };
}