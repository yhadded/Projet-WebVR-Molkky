import * as THREE from 'three';
import * as Synth from './SoundSynth.js';

const POOL_SIZE = 8;        // sons 3D simultanés max (impacts)
const IMPACT_COOLDOWN = 60; // ms : un même objet ne "toque" pas plus souvent

// Sons 3D (PositionalAudio) : on les entend depuis l'endroit où ils se produisent,
// plus forts quand on est proche, à gauche/droite selon leur position.
export class AudioManager {
  constructor(camera, scene) {
    this.listener = new THREE.AudioListener(); // les "oreilles" du joueur
    camera.add(this.listener);
    const ctx = this.listener.context;

    // Sons pré-calculés une seule fois
    this.buffers = {
      wood: Synth.woodKnock(ctx),
      whoosh: Synth.whoosh(ctx),
      points: Synth.points(ctx),
      miss: Synth.miss(ctx),
      bust: Synth.bust(ctx),
      win: Synth.win(ctx),
      lose: Synth.lose(ctx),
      click: Synth.click(ctx),
    };

    // Pool de sources 3D réutilisées (créer un objet par son ferait saccader)
    this.pool = Array.from({ length: POOL_SIZE }, () => {
      const holder = new THREE.Object3D();
      const sound = new THREE.PositionalAudio(this.listener);
      sound.setRefDistance(1.5);   // volume plein jusqu'à 1,5 m
      sound.setRolloffFactor(1.2); // puis diminue avec la distance
      holder.add(sound);
      scene.add(holder);
      return { holder, sound };
    });
    this.next = 0;
    this.lastImpact = new Map();

    // Sons 2D (pas de position) pour l'interface
    this.ui = new THREE.Audio(this.listener);
  }

  // Les navigateurs bloquent le son tant que l'utilisateur n'a pas interagi
  unlock() {
    if (this.listener.context.state !== 'running') this.listener.context.resume();
  }

  // Joue un son à une position du monde
  play3D(name, position, volume = 1, rate = 1) {
    const slot = this.pool[this.next];
    this.next = (this.next + 1) % POOL_SIZE;
    if (slot.sound.isPlaying) slot.sound.stop();
    slot.holder.position.set(position.x, position.y, position.z);
    slot.sound.setBuffer(this.buffers[name]);
    slot.sound.setVolume(volume);
    slot.sound.setPlaybackRate(rate);
    slot.sound.play();
  }

  // Son d'interface (même volume partout)
  play2D(name, volume = 0.7) {
    if (this.ui.isPlaying) this.ui.stop();
    this.ui.setBuffer(this.buffers[name]);
    this.ui.setVolume(volume);
    this.ui.play();
  }

  // Choc physique : volume selon la force, hauteur légèrement aléatoire (sinon répétitif)
  impact(id, position, force) {
    const now = performance.now();
    if (now - (this.lastImpact.get(id) ?? 0) < IMPACT_COOLDOWN) return;
    this.lastImpact.set(id, now);
    const volume = Math.min(1, force / 40);
    this.play3D('wood', position, volume, 0.85 + Math.random() * 0.3);
  }
}