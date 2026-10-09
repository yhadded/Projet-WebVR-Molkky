// Collider "prisme" à N faces : remplace le cylindre de Rapier.
// Un cylindre parfait couché roule à l'infini dans Rapier (aucune résistance au roulement) ;
// un prisme à 16 faces se comporte comme un cylindre mais finit par s'arrêter.
export function prismCollider(RAPIER, halfHeight, radius, sides = 16) {
  const points = [];
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2;
    const x = Math.cos(a) * radius;
    const z = Math.sin(a) * radius;
    points.push(x, -halfHeight, z, x, halfHeight, z);
  }
  return RAPIER.ColliderDesc.convexHull(new Float32Array(points));
}

export class PhysicsObject {
  constructor(physics, scene, mesh, bodyDesc, colliderDesc) {
    this.physics = physics;
    this.mesh = mesh;
    scene.add(mesh);

    this.body = physics.world.createRigidBody(bodyDesc);
    this.collider = physics.world.createCollider(colliderDesc, this.body);
    physics.link(mesh, this.body); // synchro automatique à chaque frame
  }

  // Téléporte l'objet et annule tout mouvement
  setPose(position, rotation = { x: 0, y: 0, z: 0, w: 1 }) {
    this.body.setTranslation(position, true);
    this.body.setRotation(rotation, true);
    this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
  }
}