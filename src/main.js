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
import { HUD } from './ui/HUD.js';
import { Feedback } from './ui/Feedback.js';
import { CONFIG } from './game/config.js';

async function init() {
  const physics = await Physics.create();
  const sm = new SceneManager();
  const terrain = new Terrain(sm.scene, physics);
  const pins = new Pins(physics, sm.scene);
  const molkky = new Molkky(physics, sm.scene);
  const controllers = new XRControllers(sm.renderer, sm.player);
  const grab = new GrabSystem(controllers, molkky);
  const fallDetector = new FallDetector(pins, molkky);
  const locomotion = new Locomotion(sm.player, sm.camera, controllers);

  const game = new GameState();
  const hud = new HUD(sm.scene);
  const feedback = new Feedback(sm.scene);

  const d = CONFIG.throwDistance.normal;
  terrain.setThrowDistance(d);
  locomotion.setThrowDistance(d);
  sm.setPlayerPosition(0, d + 0.5);

  const resetMolkky = () => molkky.setPose(terrain.molkkySpawn, LYING);
  resetMolkky();
    // --- Partie ---
  const newGame = () => {
    pins.resetAll();
    resetMolkky();
    game.reset();
  };

  // 1. Lâcher → on attend le résultat (un seul lancer à la fois)
  grab.onThrow(({ speed }) => {
    if (!game.startThrow()) return;
    console.log(`Lancer ! ${speed.toFixed(1)} m/s`);
    fallDetector.start();
  });

  // 2. Tout est immobile → on compte les points
  fallDetector.onResult(({ fallen, timedOut }) => {
    if (timedOut) console.warn('Résultat forcé (timeout)');
    game.resolveThrow(fallen);
  });

  // 3. Score mis à jour → affichage (console pour l'instant, panneau VR à l'étape 8)
    game.onChange(({ event, points, fallen, state }) => {
    hud.render(state, event === 'start' ? null : { points, fallen });

    // Message au-dessus des quilles : [titre, sous-titre, couleur, durée]
    const msg = {
      start: ['Nouvelle partie', 'Atteins 50 points exactement', '#ffffff', 2.5],
      points: [`+${points}`, fallen.length === 1 ? `Quille ${fallen[0]}` : `${fallen.length} quilles`, '#22c55e', 2],
      miss: ['Raté !', `Échec ${state.misses} / 3`, '#f97316', 2],
      bust: ['Plus de 50 !', 'Retour à 25 points', '#facc15', 2.5],
      win: ['GAGNÉ !', `50 points en ${state.throws} lancers — B pour rejouer`, '#22c55e', Infinity],
      lose: ['PERDU', '3 échecs d\'affilée — B pour rejouer', '#ef4444', Infinity],
    }[event];
    feedback.show(...msg);
    console.log(`${msg[0]} — score : ${state.score}`);
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
  controllers.onButtonDown((hand, i) => {
    if (i === 4 && !grab.heldBy) resetMolkky(); // A ou X → Mölkky sur la table
    if (i === 5) newGame();                     // B ou Y → nouvelle partie               // B ou Y → quilles en place
  });

  // --- DEBUG clavier (PC) ---
  addEventListener('keydown', (e) => {
    if (e.key === 'r') pins.resetAll();
    if (e.key === 'm') resetMolkky();
    if (e.key === 'b') throwTestBall(physics, sm.scene, d);
    if (e.key === 't') grab.debugThrow(d);
    if (e.key === 'n') newGame();
  });

  // --- Boucle : l'ORDRE compte ---
  sm.onUpdate(() => controllers.update()); // 1. lire les boutons
  sm.onUpdate((dt) => locomotion.update(dt));     // 1b. se déplacer (joysticks)
  sm.onUpdate(() => grab.update());               // 2. cible du bâton tenu
  sm.onUpdate(() => molkky.updateDamping());      // 3. freinage au sol
  sm.onUpdate((dt) => physics.update(dt));        // 4. simuler
  sm.onUpdate(() => grab.lateUpdate());           // 5. caler le visuel sur la main
  sm.onUpdate((dt) => feedback.update(dt));       // fondu des messages
  sm.onUpdate((dt) => fallDetector.update(dt));   // 6. attendre l'immobilité    // 4. caler le visuel sur la main
    sm.renderer.xr.addEventListener('sessionstart', () => {
    const session = sm.renderer.xr.getSession();
    console.log('SESSION VR démarrée, état :', session.visibilityState);
    session.addEventListener('visibilitychange', () =>
      console.log('ÉTAT VR :', session.visibilityState)
    );
  });
  sm.start();
}

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