import * as THREE from 'three';
import { SceneManager } from './core/SceneManager.js';
import { Physics } from './core/Physics.js';
import { Terrain } from './game/Terrain.js';
import { Pins } from './game/pins.js';
import { CONFIG } from './game/config.js';

async function init() {
  const physics = await Physics.create();
  const sm = new SceneManager();
  const terrain = new Terrain(sm.scene, physics);
  const pins = new Pins(physics, sm.scene);

  const d = CONFIG.throwDistance.normal;
  terrain.setThrowDistance(d);
  sm.setPlayerPosition(0, d + 0.5);

  // --- DEBUG (à supprimer plus tard) ---
  addEventListener('keydown', (e) => {
    if (e.key === 'r') pins.resetAll();
    if (e.key === 'b') throwTestBall(physics, sm.scene, d);
  });

  sm.onUpdate((dt) => physics.update(dt));
  sm.start();
}

// Balle de test : part de la ligne de lancer vers les quilles
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
      .setLinvel(0, 2, -5) // vers l'avant (-Z), légèrement vers le haut
  );
  world.createCollider(RAPIER.ColliderDesc.ball(r).setDensity(650), body);
  physics.link(mesh, body);
}

init();