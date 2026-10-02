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