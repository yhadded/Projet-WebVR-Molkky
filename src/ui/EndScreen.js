import { Panel, roundRect, text } from './Panel.js';

const MAX_ROWS = 12; // lignes affichées (les derniers lancers)

// Récapitulatif de fin de partie : tableau des lancers + record.
// Placé à droite du terrain, symétrique du tableau de score.
export class EndScreen {
  constructor(scene) {
    this.panel = new Panel(0.9, 1.0);
    this.panel.mesh.position.set(1.1, 1.4, 1.2);
    this.panel.mesh.rotation.y = -Math.PI / 7;
    this.panel.mesh.visible = false;
    scene.add(this.panel.mesh);
  }

  setThrowDistance(d) {
    this.panel.mesh.position.z = d - 2.3; // suit la zone de lancer, comme le HUD
  }

  // result : 'won' | 'lost' ; history : [{ fallen, points, event, score }]
  show({ result, history, throws, best, isNewRecord, difficultyLabel }) {
    this.panel.draw((ctx, w, h) => {
      roundRect(ctx, 0, 0, w, h, 40, 'rgba(15, 23, 42, 0.92)');

      // --- En-tête ---
      const won = result === 'won';
      text(ctx, won ? 'VICTOIRE' : 'DÉFAITE', w / 2, h * 0.07, 64, won ? '#22c55e' : '#ef4444');
      text(ctx, `${difficultyLabel} · ${throws} lancers`, w / 2, h * 0.14, 34, '#cbd5e1', 'center', 'normal');

      // --- Tableau des lancers ---
      const top = h * 0.21;
      const rowH = (h * 0.6) / (MAX_ROWS + 1);
      const cols = [w * 0.1, w * 0.45, w * 0.72, w * 0.9];
      ['#', 'Quilles', 'Pts', 'Total'].forEach((t, i) => text(ctx, t, cols[i], top, 30, '#64748b'));

      const rows = history.slice(-MAX_ROWS);
      const offset = history.length - rows.length; // numéro du premier lancer affiché
      rows.forEach((r, i) => {
        const y = top + rowH * (i + 1);
        if (i % 2 === 0) roundRect(ctx, w * 0.04, y - rowH / 2, w * 0.92, rowH, 8, 'rgba(51, 65, 85, 0.35)');
        const color = { miss: '#f97316', bust: '#facc15', win: '#22c55e', lose: '#ef4444' }[r.event] ?? '#e2e8f0';
        text(ctx, String(offset + i + 1), cols[0], y, 30, '#94a3b8', 'center', 'normal');
        text(ctx, r.fallen.length ? r.fallen.join(' ') : '—', cols[1], y, 30, '#e2e8f0', 'center', 'normal', w * 0.38);
        text(ctx, r.points ? `+${r.points}` : '0', cols[2], y, 30, color);
        text(ctx, r.event === 'bust' ? '25 ↺' : String(r.score), cols[3], y, 30, '#e2e8f0', 'center', 'normal');
      });

      // --- Record ---
      const recordText = isNewRecord
        ? `★ Nouveau record : ${throws} lancers !`
        : best !== null ? `Record : ${best} lancers` : 'Pas encore de record';
      text(ctx, recordText, w / 2, h * 0.88, 40, isNewRecord ? '#facc15' : '#94a3b8', 'center', 'bold', w * 0.9);
      text(ctx, 'B : retour au menu', w / 2, h * 0.95, 30, '#64748b', 'center', 'normal');
    });
    this.panel.mesh.visible = true;
  }

  hide() {
    this.panel.mesh.visible = false;
  }
}