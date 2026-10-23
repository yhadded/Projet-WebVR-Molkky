import * as THREE from 'three';
import { Panel, roundRect, text, formatTime } from './Panel.js';
import { DIFFICULTIES } from '../game/difficulty.js';

const _origin = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _quat = new THREE.Quaternion();

// Menu de départ : un titre + un bouton par difficulté.
// En VR : on vise un bouton avec le rayon de la manette, gâchette pour valider.
export class Menu {
  constructor(scene, controllers) {
    this.controllers = controllers;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.listeners = [];
    this.hovered = null;
    this.raycaster = new THREE.Raycaster();

    // --- Titre ---
    this.title = new Panel(1.2, 0.36);
    this.title.mesh.position.set(0, 0.62, 0);
    this.group.add(this.title.mesh);

    // --- Boutons ---
    this.buttons = Object.entries(DIFFICULTIES).map(([id, diff], i) => {
      const panel = new Panel(1.0, 0.22);
      panel.mesh.position.set(0, 0.22 - i * 0.27, 0);
      panel.mesh.userData.buttonId = id;
      this.group.add(panel.mesh);
      return { id, diff, panel };
    });

    // --- Panneaux latéraux, tournés vers le joueur ---
    // gauche : règles et commandes · droite : records et dernières parties
    this.help = new Panel(0.85, 1.15, 768);
    this.help.mesh.position.set(-1.0, 0.02, 0.3);
    this.help.mesh.rotation.y = 0.55;
    this.stats = new Panel(0.85, 1.15, 768);
    this.stats.mesh.position.set(1.0, 0.02, 0.3);
    this.stats.mesh.rotation.y = -0.55;
    this.group.add(this.help.mesh, this.stats.mesh);
    this._drawHelp();

    this.best = {};  // records par difficulté (moins de lancers pour gagner)
    this.bestPlayer = {}; // pseudo du détenteur de chaque record
    this.player = '';     // pseudo du joueur actuel
    this.games = []; // dernières parties (Storage.getGames)
    this.leaderboard = {}; // classement par difficulté (Storage.getLeaderboard)
    this._redraw();
  }

  // fn(difficultyId) quand un niveau est choisi
  onSelect(fn) {
    this.listeners.push(fn);
  }

  get visible() {
    return this.group.visible;
  }

  // Affiche le menu face au joueur, devant la ligne de lancer
  show(throwLineZ) {
    this.group.position.set(0, 1.0, throwLineZ - 1.0);
    this.group.visible = true;
    this.setRaysVisible(true);
    this._redraw();
  }

  hide() {
    this.group.visible = false;
    this.setRaysVisible(false);
  }

  setRaysVisible(on) {
    this.controllers.hands.forEach((h) => (h.rayLine.visible = on));
  }

  select(id) {
    if (!this.visible) return;
    this.listeners.forEach((fn) => fn(id));
  }

  // Gâchette pressée par une main : valide le bouton visé
  trigger(hand) {
    const id = this._pick(hand);
    if (id) {
      this.controllers.vibrate(hand, 0.4, 40);
      this.select(id);
    }
  }

  // Bouton touché par le rayon d'une manette (ou null)
  _pick(hand) {
    if (!hand.gamepad) return null;
    hand.ray.getWorldPosition(_origin);
    hand.ray.getWorldQuaternion(_quat);
    _dir.set(0, 0, -1).applyQuaternion(_quat); // le rayon part vers l'avant de la manette
    this.raycaster.set(_origin, _dir);
    const hit = this.raycaster.intersectObjects(this.buttons.map((b) => b.panel.mesh))[0];
    hand.rayLine.scale.z = hit ? hit.distance : 3; // le rayon s'arrête sur le bouton
    return hit ? hit.object.userData.buttonId : null;
  }

  // À chaque frame : survol des boutons
  update() {
    if (!this.visible) return;
    let hovered = null;
    for (const hand of this.controllers.hands) hovered = this._pick(hand) ?? hovered;
    if (hovered !== this.hovered) {
      this.hovered = hovered;
      this._redraw();
    }
  }

  // Règles + commandes (ne change jamais → dessiné une seule fois)
  _drawHelp() {
    this.help.draw((ctx, w, h) => {
      roundRect(ctx, 0, 0, w, h, 40, 'rgba(15, 23, 42, 0.9)');
      text(ctx, 'COMMENT JOUER', w / 2, 70, 52, '#facc15');
      const section = (title, lines, y) => {
        text(ctx, title, 50, y, 36, '#ffffff', 'left');
        lines.forEach((l, i) => text(ctx, `•  ${l}`, 60, y + 55 + i * 46, 29, '#cbd5e1', 'left', 'normal', w - 100));
        return y + 55 + lines.length * 46 + 30;
      };
      let y = section('Règles', [
        '1 quille tombée = son numéro',
        'Plusieurs quilles = leur nombre',
        'Atteindre 50 points pile',
        'Plus de 50 → retour à 25',
        '3 lancers ratés d\'affilée = perdu',
      ], 160);
      section('Commandes', [
        'Grip : prendre le bâton',
        'Balancer par en dessous, lâcher',
        'Joystick gauche : se déplacer',
        'A : bâton sur la table · rejouer',
        'B : revenir au menu',
      ], y);
    });
  }

  // Records + 5 dernières parties
  _drawStats() {
    this.stats.draw((ctx, w, h) => {
      roundRect(ctx, 0, 0, w, h, 40, 'rgba(15, 23, 42, 0.9)');
      text(ctx, 'PARTIES', w / 2, 70, 52, '#facc15');
      text(ctx, `Joueur : ${this.player || 'Joueur'}`, w / 2, 122, 30, '#cbd5e1', 'center', 'normal', w - 100);

      // Classement du niveau visé avec la manette (Normal par défaut)
      const id = this.hovered ?? 'normal';
      const diff = DIFFICULTIES[id];
      text(ctx, 'Classement', 50, 175, 36, '#ffffff', 'left');
      text(ctx, diff.label, w - 50, 175, 32, diff.color, 'right');
      const rows = this.leaderboard[id] ?? [];
      if (!rows.length) text(ctx, 'Personne n\'a encore gagné', 60, 235, 29, '#64748b', 'left', 'normal');
      const medals = ['#facc15', '#cbd5e1', '#d97706'];
      rows.forEach((r, i) => {
        const y = 235 + i * 46;
        text(ctx, `${i + 1}.`, 60, y, 30, medals[i] ?? '#94a3b8', 'left');
        text(ctx, r.player, 110, y, 30, i === 0 ? '#facc15' : '#e2e8f0', 'left', i === 0 ? 'bold' : 'normal', w - 380);
        text(ctx, `${r.throws} lancers${r.time != null ? ' · ' + formatTime(r.time) : ''}`, w - 50, y, 27, '#94a3b8', 'right', 'normal');
      });
      text(ctx, 'Vise un niveau pour voir son classement', w / 2, 480, 24, '#64748b', 'center', 'normal', w - 80);

      text(ctx, 'Dernières parties', 50, 560, 36, '#ffffff', 'left');
      const games = this.games.slice(0, 3);
      if (!games.length) text(ctx, 'Aucune partie pour l\'instant', 60, 620, 29, '#64748b', 'left', 'normal');
      games.forEach((g, i) => {
        const y = 620 + i * 76;
        const won = g.result === 'won';
        const d = new Date(g.date);
        const day = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
        text(ctx, `${g.player || 'Joueur'} · ${day} · ${DIFFICULTIES[g.difficulty]?.label ?? '?'}`, 60, y, 29, '#cbd5e1', 'left', 'normal', w - 260);
        text(ctx, won ? 'Gagné' : 'Perdu', w - 50, y, 29, won ? '#22c55e' : '#ef4444', 'right');
        text(ctx, `${g.score} pts · ${g.throws} lancers${g.time != null ? ' · ' + formatTime(g.time) : ''}`, 60, y + 34, 25, '#94a3b8', 'left', 'normal');
      });
    });
  }

  _redraw() {
    this._drawStats();
    this.title.draw((ctx, w, h) => {
      roundRect(ctx, 0, 0, w, h, 40, 'rgba(15, 23, 42, 0.9)');
      text(ctx, 'MÖLKKY VR', w / 2, h * 0.4, 96, '#facc15');
      text(ctx, 'Vise un niveau, gâchette pour jouer', w / 2, h * 0.78, 38, '#cbd5e1', 'center', 'normal');
    });
    this.buttons.forEach(({ id, diff, panel }, i) => {
      const hover = this.hovered === id;
      panel.draw((ctx, w, h) => {
        roundRect(ctx, 0, 0, w, h, 30, hover ? diff.color : 'rgba(30, 41, 59, 0.92)');
        ctx.lineWidth = 6;
        ctx.strokeStyle = diff.color;
        ctx.stroke();
        text(ctx, `${i + 1}. ${diff.label}`, w * 0.05, h * 0.36, 52, '#ffffff', 'left');
        text(ctx, diff.description, w * 0.05, h * 0.74, 30, hover ? '#f8fafc' : '#94a3b8', 'left', 'normal');
                if (this.best[id] != null) text(ctx, `★ ${this.best[id]} lancers`, w * 0.95, h * 0.36, 34, '#facc15', 'right');
      });
    });
  }
}