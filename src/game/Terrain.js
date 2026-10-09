import * as THREE from 'three';
import { CONFIG } from './config.js';

export class Terrain {
  constructor(scene, physics) {
    const { RAPIER, world } = physics;

    // --- Herbe (visuel) ---
    const grass = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ color: 0x4a8f3c })
    );
    grass.rotation.x = -Math.PI / 2;
    grass.receiveShadow = true;
    scene.add(grass);

    // --- Sol (physique) : une boîte épaisse dont le dessus est à y = 0 ---
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(20, 0.1, 20)
        .setTranslation(0, -0.1, 0)
        .setFriction(0.8)     // l'herbe freine
        .setRestitution(0.2)  // rebond faible
    );

    // --- Piste de jeu (sable) ---
    // Légèrement surélevée pour éviter le scintillement avec l'herbe (z-fighting)
    const pitch = new THREE.Mesh(
      new THREE.PlaneGeometry(4, 9),
      new THREE.MeshStandardMaterial({ color: 0xc9b38a })
    );
    pitch.rotation.x = -Math.PI / 2;
    pitch.position.set(0, 0.002, 2.5);
    pitch.receiveShadow = true;
    scene.add(pitch);

    // --- Repère de la zone des quilles (cercle au centre) ---
    const pinZone = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.6, 48),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 })
    );
    pinZone.rotation.x = -Math.PI / 2;
    pinZone.position.y = 0.004;
    scene.add(pinZone);

    // --- Ligne de lancer ---
    this.throwLine = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.01, 0.05),
      new THREE.MeshStandardMaterial({ color: 0xffffff })
    );
    this.throwLine.position.y = 0.005;
    scene.add(this.throwLine);

    // --- Zone de lancer (rectangle derrière la ligne) ---
    this.throwZone = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 1),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15 })
    );
    this.throwZone.rotation.x = -Math.PI / 2;
    this.throwZone.position.y = 0.004;
    scene.add(this.throwZone);

        // --- Table support du Mölkky ---
    const { height, size } = CONFIG.table;
    this.table = new THREE.Mesh(
      new THREE.BoxGeometry(size, height,size),
      new THREE.MeshStandardMaterial({ color: 0x6b4423 })
    );
    this.table.castShadow = true;
    this.table.receiveShadow = true;
    scene.add(this.table);
    this.tableCollider = world.createCollider(
      RAPIER.ColliderDesc.cuboid(size/2, height / 2, size/2)
    );
  }

  // Appelé selon la difficulté
    setThrowDistance(d) {
    this.throwLine.position.z = d;
    this.throwZone.position.z = d + 0.5;

    // La table suit la zone de lancer, à droite du joueur
    const { x, zOffset, height } = CONFIG.table;
    const tablePos = { x, y: height / 2, z: d + zOffset };
    this.table.position.set(tablePos.x, tablePos.y, tablePos.z);
    this.tableCollider.setTranslation(tablePos);

    // Point où poser le Mölkky (sur la table)
    this.molkkySpawn = { x, y: height + CONFIG.molkky.radius + 0.01, z: d + 0.5 };
  }
}