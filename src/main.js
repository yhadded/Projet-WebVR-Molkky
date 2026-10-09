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

  grab.onThrow(({ speed }) => {
    console.log(`Lancer ! ${speed.toFixed(1)} m/s`);
    fallDetector.start();
  });
  fallDetector.onResult(({ fallen, timedOut }) => {
    console.log(`Quilles tombées : [${fallen.join(', ')}]${timedOut ? ' (timeout)' : ''}`);
  });

  const d = CONFIG.throwDistance.normal;
  terrain.setThrowDistance(d);
  locomotion.setThrowDistance(d);
  sm.setPlayerPosition(0, d + 0.5);

  const resetMolkky = () => molkky.setPose(terrain.molkkySpawn, LYING);
  resetMolkky();

  // --- Contrôles VR ---
  controllers.onButtonDown((hand, i) => {
    if (i === 4 && !grab.heldBy) resetMolkky(); // A ou X → Mölkky sur la table
    if (i === 5) pins.resetAll();               // B ou Y → quilles en place
  });

  // --- DEBUG clavier (PC) ---
  addEventListener('keydown', (e) => {
    if (e.key === 'r') pins.resetAll();
    if (e.key === 'm') resetMolkky();
    if (e.key === 'b') throwTestBall(physics, sm.scene, d);
    if (e.key === 't') grab.debugThrow(d);
  });

  // --- Boucle : l'ORDRE compte ---
  sm.onUpdate(() => controllers.update()); // 1. lire les boutons
  sm.onUpdate((dt) => locomotion.update(dt));     // 1b. se déplacer (joysticks)
  sm.onUpdate(() => grab.update());               // 2. cible du bâton tenu
  sm.onUpdate(() => molkky.updateDamping());      // 3. freinage au sol
  sm.onUpdate((dt) => physics.update(dt));        // 4. simuler
  sm.onUpdate(() => grab.lateUpdate());           // 5. caler le visuel sur la main
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