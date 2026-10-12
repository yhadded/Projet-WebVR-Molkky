import { Panel, roundRect, text } from './Panel.js';

// Message temporaire au-dessus des quilles ("+5", "Raté !", "GAGNÉ !"…)
export class Feedback {
  constructor(scene) {
    this.panel = new Panel(1.4, 0.5);
    this.panel.mesh.position.set(0, 0.9, 0.2); // au-dessus des quilles
    this.panel.mesh.visible = false;
    scene.add(this.panel.mesh);
    this.timeLeft = 0;
  }

  // duration = Infinity → reste affiché (écran de fin)
  show(title, subtitle = '', color = '#ffffff', duration = 2) {
    this.panel.draw((ctx, w, h) => {
      roundRect(ctx, 0, 0, w, h, 40, 'rgba(15, 23, 42, 0.8)');
      text(ctx, title, w / 2, subtitle ? h * 0.38 : h / 2, 120, color);
      if (subtitle) text(ctx, subtitle, w / 2, h * 0.75, 52, '#cbd5e1', 'center', 'normal');
    });
    this.timeLeft = duration;
    this.panel.material.opacity = 1;
    this.panel.mesh.visible = true;
  }

  hide() {
    this.panel.mesh.visible = false;
    this.timeLeft = 0;
  }

  // À chaque frame : disparition en fondu sur la dernière demi-seconde
  update(dt) {
    if (!this.panel.mesh.visible || this.timeLeft === Infinity) return;
    this.timeLeft -= dt;
    this.panel.material.opacity = Math.min(1, this.timeLeft / 0.5);
    if (this.timeLeft <= 0) this.hide();
  }
}