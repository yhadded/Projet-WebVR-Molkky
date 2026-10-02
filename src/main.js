import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import RAPIER from '@dimforge/rapier3d-compat';

async function init() {
  await RAPIER.init(); // charge le module WASM de Rapier

  // --- Rendu ---
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(devicePixelRatio);
  renderer.xr.enabled = true;            // active WebXR
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);

  const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 100);
  camera.position.set(0, 1.6, 0);
  camera.lookAt(0, 0.5, -2); // hors VR uniquement ; en VR, c'est le casque qui pilote la caméra

  // --- Lumières ---
  scene.add(new THREE.HemisphereLight(0xffffff, 0x445522, 1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.position.set(3, 6, 2);
  sun.castShadow = true;
  scene.add(sun);

  // --- Monde physique ---
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });

  // Sol : un mesh pour l'affichage et un collider statique pour la physique
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.MeshStandardMaterial({ color: 0x4a8f3c })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  world.createCollider(RAPIER.ColliderDesc.cuboid(10, 0.1, 10).setTranslation(0, -0.1, 0));

  // Cube de test qui tombe, pour vérifier que la physique fonctionne
  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.2, 0.2),
    new THREE.MeshStandardMaterial({ color: 0xff5533 })
  );
  cube.castShadow = true;
  scene.add(cube);
  const cubeBody = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 3, -2)
  );
  world.createCollider(RAPIER.ColliderDesc.cuboid(0.1, 0.1, 0.1).setRestitution(0.3), cubeBody);

  // --- Boucle de jeu (pas fixe) ---
  const clock = new THREE.Clock();
  const STEP = 1 / 60;
  let acc = 0;

  renderer.setAnimationLoop(() => {
    acc += Math.min(clock.getDelta(), 0.1); // plafonné pour éviter une explosion après un lag
    while (acc >= STEP) { world.step(); acc -= STEP; }

    // synchronisation physique → affichage
    const p = cubeBody.translation(), r = cubeBody.rotation();
    cube.position.set(p.x, p.y, p.z);
    cube.quaternion.set(r.x, r.y, r.z, r.w);

    renderer.render(scene, camera);
  });

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
}

init();
