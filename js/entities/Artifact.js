import * as THREE from "three";
import { Entity } from "./Entity.js";

export class Artifact extends Entity {
  constructor(config = {}) {
    super({
      color: "#8e24aa",
      scale: new THREE.Vector3(0.9, 0.9, 0.9),
      ...config,
    });
    this.collected = false;
  }

  collect() {
    this.collected = true;
    this.mesh.visible = false;
  }
}
