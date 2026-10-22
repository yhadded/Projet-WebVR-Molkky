import * as THREE from 'three';
import { SceneManager } from './core/SceneManager.js';
import { Physics } from './core/Physics.js';
import { XRControllers } from './core/XRControllers.js';
import { Locomotion } from './core/Locomotion.js';
import { Terrain } from './game/Terrain.js';
import { Pins } from './game/pins.js';
import { Molkky, LYING } from './game/Molkky.js';
import { GrabSystem } from './game/GrabSystem.js';
import { FallDetector } from './game/FallDetector.js';
import { GameState } from './game/GameState.js';
import { AimAssist } from './game/AimAssist.js';
import { DIFFICULTIES } from './game/difficulty.js';
import { HUD } from './ui/HUD.js';
import { Feedback } from './ui/Feedback.js';
import { Menu } from './ui/Menu.js';
import { EndScreen } from './ui/EndScreen.js';
import { Storage } from './data/Storage.js';
import { AudioManager } from './audio/AudioManager.js';

async function init() {
  // --- Création des modules ---
  const physics = await Physics.create();
  const sm = new SceneManager();
  const terrain = new Terrain(sm.scene, physics);
  const pins = new Pins(physics, sm.scene);
  const molkky = new Molkky(physics, sm.scene);
  const controllers = new XRControllers(sm.renderer, sm.player);
  const grab = new GrabSystem(controllers, molkky);
  const fallDetector = new FallDetector(pins, molkky);
  const locomotion = new Locomotion(sm.player, sm.camera, controllers);
  const aimAssist = new AimAssist(sm.scene, grab, molkky);
  const game = new GameState();
  const hud = new HUD(sm.scene);
  const feedback = new Feedback(sm.scene);
  const menu = new Menu(sm.scene, controllers);
  const endScreen = new EndScreen(sm.scene);
  const storage = new Storage();
  const audio = new AudioManager(sm.camera, sm.scene);

  let difficulty = 'normal';
  let d = DIFFICULTIES[difficulty].distance; // distance quilles → ligne

  const resetMolkky = () => molkky.setPose(terrain.molkkySpawn, LYING);

  // --- Placement du terrain selon la difficulté ---
  const applyDistance = (distance) => {
    d = distance;
    terrain.setThrowDistance(d);
    locomotion.setThrowDistance(d);
    sm.setPlayerPosition(0, d + 0.5);
    hud.panel.mesh.position.z = d - 2.3; // le tableau suit la zone de lancer
    endScreen.setThrowDistance(d);
  };

  // --- Menu ↔ partie ---
  const openMenu = () => {
    grab.enabled = false;
    feedback.hide();
    endScreen.hide();
    hud.panel.mesh.visible = false;
    menu.best = storage.getAllBest(); // records à jour sur les boutons
    applyDistance(DIFFICULTIES[difficulty].distance);
    pins.resetAll();
    resetMolkky();
    menu.show(d);
  };

  const startGame = (id) => {
    difficulty = id;
    const diff = DIFFICULTIES[id];
    menu.hide();
    endScreen.hide();
    hud.panel.mesh.visible = true;
    applyDistance(diff.distance);
    aimAssist.enabled = diff.aimAssist;
    pins.resetAll();
    resetMolkky();
    grab.enabled = true;
    game.reset();
  };

    menu.onSelect((id) => {
    audio.play2D('click');
    startGame(id);
  });

  // --- Sons ---
  // Le navigateur n'autorise le son qu'après une action de l'utilisateur
  const unlockAudio = () => audio.unlock();
  addEventListener('pointerdown', unlockAudio);
  addEventListener('keydown', unlockAudio);
  sm.renderer.xr.addEventListener('sessionstart', unlockAudio);

  // Chocs (quilles, Mölkky, sol) → "toc" de bois à l'endroit du choc
  physics.onContact(({ id, position, force }) => audio.impact(id, position, force));

  // --- Boucle de jeu ---
  // 1. Lâcher → on attend le résultat (un seul lancer à la fois)
  grab.onThrow(({ speed }) => {
    if (!game.startThrow()) return;
    audio.play3D('whoosh', molkky.body.translation(), Math.min(1, speed / 6));
    console.log(`Lancer ! ${speed.toFixed(1)} m/s`);
    fallDetector.start();
  });

  // 2. Tout est immobile → on compte les points
  fallDetector.onResult(({ fallen, timedOut }) => {
    if (timedOut) console.warn('Résultat forcé (timeout)');
    game.resolveThrow(fallen);
  });

  // 3. Score mis à jour → tableau + message
  game.onChange(({ event, points, fallen, state }) => {
    hud.render(state, event === 'start' ? null : { points, fallen });

    // [titre, sous-titre, couleur, durée]
    const label = DIFFICULTIES[difficulty].label;
    const msg = {
      start: [`Niveau ${label}`, 'Atteins 50 points exactement', '#ffffff', 2.5],
      points: [`+${points}`, fallen.length === 1 ? `Quille ${fallen[0]}` : `${fallen.length} quilles`, '#22c55e', 2],
      miss: ['Raté !', `Échec ${state.misses} / 3`, '#f97316', 2],
      bust: ['Plus de 50 !', 'Retour à 25 points', '#facc15', 2.5],
      win: ['GAGNÉ !', `50 points en ${state.throws} lancers — A : rejouer · B : menu`, '#22c55e', Infinity],
      lose: ['PERDU', '3 échecs d\'affilée — A : rejouer · B : menu', '#ef4444', Infinity],
    }[event];
    feedback.show(...msg);
    const sound = { points: 'points', miss: 'miss', bust: 'bust', win: 'win', lose: 'lose' }[event];
    if (sound) audio.play3D(sound, feedback.panel.mesh.position, 0.8); // jingle spatialisé, au-dessus des quilles
    console.log(`${msg[0]} — score : ${state.score}`);
    
    // Fin de partie → sauvegarde + récapitulatif
    if (state.status !== 'playing') {
      const { isNewRecord } = storage.saveGame({
        difficulty,
        result: state.status,
        score: state.score,
        throws: state.throws,
        time: Math.round(game.elapsed),
        history: game.history,
      });
      endScreen.show({
        result: state.status,
        history: game.history,
        score: state.score,
        throws: state.throws,
        time: game.elapsed,
        best: storage.getBest(difficulty),
        isNewRecord,
        difficultyLabel: label,
      });
    }

    // Lancer suivant : Mölkky sur la table + quilles tombées relevées sur place
    if (event !== 'start' && state.status === 'playing') {
      setTimeout(() => {
        resetMolkky();
        const raised = pins.standUpFallen();
        if (raised.length) console.log(`Quilles relevées : [${raised.join(', ')}]`);
      }, 1500);
    }
  });

  // --- Contrôles VR ---
  // 0 gâchette · 4 A/X · 5 B/Y
  controllers.onButtonDown((hand, i) => {
    if (menu.visible) {
      if (i === 0) menu.trigger(hand); // gâchette → valide le bouton visé
      return;
    }
    if (i === 4 && game.phase === 'over') return startGame(difficulty); // A/X en fin de partie → rejouer
    if (i === 4 && !grab.heldBy) resetMolkky(); // A/X → Mölkky sur la table
    if (i === 5) openMenu();                    // B/Y → retour au menu
  });

  // --- Clavier (PC) ---
  const keyToDifficulty = { 1: 'easy', 2: 'normal', 3: 'hard' };
  addEventListener('keydown', (e) => {
    if (menu.visible && keyToDifficulty[e.key]) return menu.select(keyToDifficulty[e.key]);
    if (e.key === 'Escape') openMenu();
    if (e.key === 'r') pins.resetAll();
    if (e.key === 'm') resetMolkky();
    if (e.key === 'b') throwTestBall(physics, sm.scene, d);
    if (e.key === 't' && grab.enabled) grab.debugThrow(d);
    if (e.key === 'n') startGame(difficulty);
  });

  // --- Boucle : l'ORDRE compte ---
  sm.onUpdate(() => controllers.update());        // 1. lire les boutons
  sm.onUpdate((dt) => locomotion.update(dt));     // 2. se déplacer (joysticks)
  sm.onUpdate(() => menu.update());               // 3. survol du menu
  sm.onUpdate(() => grab.update());               // 4. cible du bâton tenu
  sm.onUpdate(() => molkky.updateDamping());      // 5. freinage au sol
  sm.onUpdate((dt) => physics.update(dt));        // 6. simuler
  sm.onUpdate(() => grab.lateUpdate());           // 7. caler le visuel sur la main
  sm.onUpdate(() => aimAssist.update());          // 8. trajectoire (mode Facile)
  sm.onUpdate((dt) => feedback.update(dt));       // 9. fondu des messages
  sm.onUpdate((dt) => fallDetector.update(dt));   // 10. attendre l'immobilité
  sm.onUpdate((dt) => {                           // 11. chronomètre (arrêté pendant le menu)
    if (menu.visible) return;
    game.tick(dt);
    hud.setTime(game.elapsed);
  });

  openMenu();
  sm.start();
}

// Balle de test (touche B sur PC)
function throwTestBall(physics, scene, d) {
  const { RAPIER, world } = physics;
  const r = 0.05;
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(r, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0x8b4513 })
  );
  mesh.castShadow = true;
  scene.add(mesh);
  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation((Math.random() - 0.5) * 0.2, 1, d)
      .setLinvel(0, 2, -5)
  );
  world.createCollider(RAPIER.ColliderDesc.ball(r).setDensity(650), body);
  physics.link(mesh, body);
}

init();