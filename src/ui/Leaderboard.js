import { Panel, roundRect, text, formatTime } from './Panel.js';

const MEDALS = ['#facc15', '#cbd5e1', '#d97706']; // or, argent, bronze

// Classement du niveau en cours : affiché pendant la partie, à droite du terrain
// (à la place de l'écran de fin, qui le remplace quand la partie se termine).
export class Leaderboard {
  constructor(scene) {
    this.panel = new Panel(0.9, 0.8, 640);
    this.panel.mesh.position.set(1.1, 1.4, 1.2);
    this.panel.mesh.rotation.y = -Math.PI / 7;
    this.panel.mesh.visible = false;
    scene.add(this.panel.mesh);
  }

  setThrowDistance(d) {
    this.panel.mesh.position.z = d - 2.3; // suit la zone de lancer, comme le tableau de score
  }

  // board = { label, color, rows: [{ player, throws, time }], player }
  show({ label, color, rows, player }) {
    this.panel.draw((ctx, w, h) => {
      roundRect(ctx, 0, 0, w, h, 36, 'rgba(15, 23, 42, 0.9)');
      text(ctx, 'CLASSEMENT', w / 2, 56, 46, '#facc15');
      text(ctx, `Niveau ${label}`, w / 2, 104, 30, color, 'center', 'normal');
      if (!rows.length) {
        text(ctx, 'Personne n\'a encore gagné :', w / 2, h * 0.5, 28, '#94a3b8', 'center', 'normal');
        text(ctx, 'sois le premier !', w / 2, h * 0.5 + 40, 28, '#94a3b8', 'center', 'normal');
        return;
      }
      rows.forEach((r, i) => {
        const y = 170 + i * 66;
        const me = r.player === player;
        if (me) roundRect(ctx, 24, y - 28, w - 48, 56, 14, 'rgba(250, 204, 21, 0.15)'); // ta ligne
        text(ctx, `${i + 1}`, 60, y, 32, MEDALS[i] ?? '#94a3b8', 'center');
        text(ctx, r.player, 100, y, 30, me ? '#facc15' : '#e2e8f0', 'left', i === 0 ? 'bold' : 'normal', w - 330);
        text(ctx, `${r.throws} lancers · ${r.time != null ? formatTime(r.time) : '--:--'}`, w - 40, y, 26, '#94a3b8', 'right', 'normal');
      });
    });
    this.panel.mesh.visible = true;
  }

  hide() {
    this.panel.mesh.visible = false;
  }
}
