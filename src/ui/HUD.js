import { Panel, roundRect, text, formatTime } from './Panel.js';
import { RULES } from '../game/Scoring.js';

// Tableau de score fixe, planté à gauche du terrain, tourné vers le joueur
export class HUD {
  constructor(scene) {
    this.panel = new Panel(1.0, 0.6);
    this.panel.mesh.position.set(-1.1, 1.5, 1.2);
    this.panel.mesh.rotation.y = Math.PI / 7; // légèrement orienté vers la zone de lancer
    scene.add(this.panel.mesh);
    this.render({ score: 0, misses: 0, throws: 0, status: 'playing' }, null);
  }

  // state : état de Scoring ; last : dernier lancer { points, fallen } ou null
  render(state, last) {
    this.state = state;
    this.last = last;
    this._draw();
  }

  // Chrono : on ne redessine que quand la seconde affichée change
  setTime(seconds) {
    const s = Math.floor(seconds);
    if (s === this.seconds) return;
    this.seconds = s;
    if (this.state) this._draw();
  }

  _draw() {
    const { state, last } = this;
    this.panel.draw((ctx, w, h) => {
      roundRect(ctx, 0, 0, w, h, 40, 'rgba(20, 28, 40, 0.88)');

      // --- Score ---
      text(ctx, 'SCORE', w * 0.27, h * 0.14, 44, '#9fb3c8');
      text(ctx, String(state.score), w * 0.27, h * 0.45, 130, '#ffffff');
      text(ctx, `/ ${RULES.target}`, w * 0.27, h * 0.66, 46, '#9fb3c8');

      // --- Barre de progression vers 50 ---
      const bx = w * 0.06, by = h * 0.80, bw = w * 0.42, bh = 26;
      roundRect(ctx, bx, by, bw, bh, 13, '#334155');
      const ratio = Math.min(state.score / RULES.target, 1);
      if (ratio > 0) roundRect(ctx, bx, by, Math.max(bw * ratio, bh), bh, 13, '#22c55e');

      // --- Échecs : 3 pastilles, rouges quand consommées ---
      text(ctx, 'ÉCHECS', w * 0.75, h * 0.16, 40, '#9fb3c8');
      for (let i = 0; i < RULES.maxMisses; i++) {
        const cx = w * 0.62 + i * w * 0.13;
        ctx.beginPath();
        ctx.arc(cx, h * 0.33, 32, 0, Math.PI * 2);
        ctx.fillStyle = i < state.misses ? '#ef4444' : '#334155';
        ctx.fill();
      }

      // --- Lancers + dernier résultat + chrono ---
      text(ctx, `Lancer n° ${state.throws + 1}`, w * 0.75, h * 0.52, 40, '#e2e8f0');
      text(ctx, `⏱ ${formatTime(this.seconds ?? 0)}`, w * 0.75, h * 0.86, 40, '#e2e8f0');
      if (last) {
        const label = last.fallen.length
          ? `Dernier : +${last.points} (${last.fallen.join(', ')})`
          : 'Dernier : raté';
        text(ctx, label, w * 0.75, h * 0.68, 34, '#9fb3c8', 'center', 'bold', w * 0.48);
      }
    });
  }
}