import * as THREE from 'three';

// Panneau 2D affiché dans la scène 3D : on dessine sur un canvas, qui sert de texture à un plan.
// widthM/heightM = taille réelle en mètres ; la résolution du canvas suit la même proportion.
export class Panel {
  constructor(widthM, heightM, pxPerMeter = 512) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = Math.round(widthM * pxPerMeter);
    this.canvas.height = Math.round(heightM * pxPerMeter);
    this.ctx = this.canvas.getContext('2d');

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;

    // MeshBasicMaterial : pas affecté par la lumière → toujours lisible
    this.material = new THREE.MeshBasicMaterial({ map: this.texture, transparent: true });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(widthM, heightM), this.material);
  }

  // draw(ctx, w, h) : on efface puis on redessine tout le panneau
  draw(fn) {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    fn(ctx, canvas.width, canvas.height);
    this.texture.needsUpdate = true; // renvoie le canvas à la carte graphique
  }
}

// Petits utilitaires de dessin partagés par les panneaux
export function roundRect(ctx, x, y, w, h, r, fill) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

// maxWidth (optionnel) : le texte est resserré s'il est trop long
export function text(ctx, str, x, y, size, color = '#fff', align = 'center', weight = 'bold', maxWidth) {
  ctx.font = `${weight} ${size}px sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y, maxWidth);
}