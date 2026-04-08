import * as THREE from "three";
import { Entity } from "./Entity.js";

export class Exit extends Entity {
  constructor(config = {}) {
    super({
      color: "#43a047",
      scale: new THREE.Vector3(1.2, 0.4, 1.2),
      ...config,
    });

    this.isActive = false;
    this.setActive(false);
  }

  setActive(active) {
    this.isActive = active;

    const baseMesh = this.mesh;
    const material = baseMesh?.material;
    if (!material) return;

    if (active) {
      material.color.set("#43a047");
      material.emissive.set("#1b5e20");
      material.emissiveIntensity = 0.35;
    } else {
      // Locked exit is dimmer until the artifact is stolen.
      material.color.set("#607d8b");
      material.emissive.set("#102027");
      material.emissiveIntensity = 0.1;
    }
  }
}
