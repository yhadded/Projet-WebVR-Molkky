import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';

export class SceneManager {
  constructor() {
    // --- Renderer ---
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.xr.enabled = true;
    document.body.appendChild(this.renderer.domElement);
    document.body.appendChild(VRButton.createButton(this.renderer));

    // --- Scène ---
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0x87ceeb, 15, 40); // fond qui s'estompe au loin

    // --- Joueur ---
    // "player" est un groupe qui contient la caméra.
    // En VR, le casque pilote la position LOCALE de la caméra ;
    // déplacer "player" déplace donc le joueur dans le monde.
    this.player = new THREE.Group();
    this.scene.add(this.player);

    this.camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 100);
    this.camera.position.set(0, 1.6, 0); // hauteur des yeux (PC uniquement)
    this.player.add(this.camera);

    this._addLights();

    // --- Boucle ---
    this.updatables = []; // fonctions appelées à chaque frame
    this.clock = new THREE.Clock();
    addEventListener('resize', () => this._onResize());
  }

  _addLights() {
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x445522, 1));

    const sun = new THREE.DirectionalLight(0xffffff, 1.5);
    sun.position.set(4, 8, 3);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    // zone couverte par les ombres : quilles et joueur
    const s = sun.shadow.camera;
    s.left = -6; s.right = 6; s.top = 6; s.bottom = -6;
    s.near = 0.5; s.far = 25;
    this.scene.add(sun);
  }

  setPlayerPosition(x, z) {
    this.player.position.set(x, 0, z);
    this.camera.lookAt(0, 0.3, 0); // regarde les quilles (PC uniquement)
  }

  onUpdate(fn) {
    this.updatables.push(fn);
  }

  start() {
    this.renderer.setAnimationLoop(() => {
      const dt = Math.min(this.clock.getDelta(), 0.1);
      for (const fn of this.updatables) fn(dt);
      this.renderer.render(this.scene, this.camera);
    });
  }

  _onResize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
  }
}