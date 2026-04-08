import * as THREE from 'three';
import { Entity } from './Entity.js';

/**
 * Our DynamicEntity class will be used
 * for any entity that moves or changes
 */
export class DynamicEntity extends Entity {

  constructor({
    velocity = new THREE.Vector3(0, 0, 0),
    acceleration = new THREE.Vector3(0, 0, 0),
    topSpeed = 3,
    mass = 1,
    friction = 1.0,
    maxForce = 15,

    ...entityConfig
  } = {}) {
    super(entityConfig);

    this.velocity = velocity.clone();
    this.acceleration = acceleration.clone();
    this.topSpeed = topSpeed;
    this.mass = mass;
    this.friction = friction;
    this.maxForce = maxForce;
  }

  // Override the parent method
  // To create a cone mesh
  createDefaultMesh(color) {
    let temp = new THREE.Mesh(
      new THREE.ConeGeometry(this.scale.x / 2, this.scale.y, 30),
      new THREE.MeshStandardMaterial({ color: color })
    );

    temp.rotation.x = Math.PI / 2;

    let mesh = new THREE.Group();
    mesh.add(temp);
    return mesh;
  }

  // Set the colour of our mesh
  // assuming the primary mesh is at children[0]
  setColor(color) {
    this.mesh.children[0].material = new THREE.MeshStandardMaterial({ color: color });
  }

  // Apply a force to our dynamic entity
  applyForce(force) {
    force.clampLength(0, this.maxForce);
    let a = force.clone().divideScalar(this.mass);
    this.acceleration.add(a);
  }

  update(deltaTime, map) {
    // Update velocity by acceleration
    this.velocity.addScaledVector(this.acceleration, deltaTime);

    // Apply friction
    this.velocity.multiplyScalar(this.friction);

    // Clamp velocity by top speed
    this.velocity.clampLength(0, this.topSpeed);

    // Point in the direction of movement
    if (this.velocity.lengthSq() > 0.0001) {
      let angle = Math.atan2(this.velocity.x, this.velocity.z);
      this.mesh.rotation.y = angle;
    }

    this.applyMovement(deltaTime, map);

    // Sync mesh with entity position
    this.mesh.position.copy(this.position);

    // Lift mesh so it sits on the floor
    this.mesh.position.y += this.scale.y / 2;

    // Reset acceleration after movement step
    this.acceleration.set(0, 0, 0);
  }

  // Move with optional sub-steps so we do not tunnel through thin maze walls.
  applyMovement(deltaTime, map) {
    if (!map || !map.handleCollisions) {
      this.position.addScaledVector(this.velocity, deltaTime);
      return;
    }

    const movement = this.velocity.clone().multiplyScalar(deltaTime);
    const distance = movement.length();

    if (distance <= 0.000001) {
      return;
    }

    // Keep each movement step smaller than about a quarter tile.
    const tileSize = map.tileSize ?? 1;
    const maxStepDistance = Math.max(tileSize * 0.25, 0.05);
    const steps = Math.max(1, Math.ceil(distance / maxStepDistance));
    const stepMove = movement.multiplyScalar(1 / steps);

    for (let i = 0; i < steps; i++) {
      this.position.add(stepMove);
      this.position = map.handleCollisions(this);
    }
  }
}