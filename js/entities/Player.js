import * as THREE from 'three';
import { DynamicEntity } from "./DynamicEntity.js";

export class Player extends DynamicEntity {
  constructor(config = {}) {
    super({
      color: "#1e88e5",
      scale: new THREE.Vector3(1.2, 2, 1.2),
      topSpeed: 5,
      friction: 0.92,
      maxForce: 20,
      ...config,
    });

    this.inputStrength = 20;
  }

  // Give the player a distinct robot-like silhouette.
  createDefaultMesh(color) {
    const robot = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({ color });
    const accentMaterial = new THREE.MeshStandardMaterial({ color: "#90caf9" });

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(this.scale.x * 0.75, this.scale.y * 0.55, this.scale.z * 0.45),
      material
    );
    body.position.y = this.scale.y * 0.1;
    robot.add(body);

    const head = new THREE.Mesh(
      new THREE.BoxGeometry(this.scale.x * 0.42, this.scale.y * 0.25, this.scale.z * 0.38),
      accentMaterial
    );
    head.position.y = this.scale.y * 0.5;
    robot.add(head);

    const leftEye = new THREE.Mesh(
      new THREE.SphereGeometry(this.scale.x * 0.055, 12, 12),
      new THREE.MeshStandardMaterial({ color: "#e3f2fd", emissive: "#5e92f3", emissiveIntensity: 0.35 })
    );
    leftEye.position.set(-this.scale.x * 0.1, this.scale.y * 0.52, this.scale.z * 0.2);
    robot.add(leftEye);

    const rightEye = leftEye.clone();
    rightEye.position.x = this.scale.x * 0.1;
    robot.add(rightEye);

    const shoulderWidth = this.scale.x * 0.1;
    const shoulderHeight = this.scale.y * 0.22;
    const shoulderDepth = this.scale.z * 0.1;
    const leftArm = new THREE.Mesh(
      new THREE.BoxGeometry(shoulderWidth, shoulderHeight, shoulderDepth),
      material
    );
    leftArm.position.set(-this.scale.x * 0.42, this.scale.y * 0.13, 0);
    robot.add(leftArm);

    const rightArm = leftArm.clone();
    rightArm.position.x = this.scale.x * 0.42;
    robot.add(rightArm);

    return robot;
  }
}