import * as THREE from 'three';

/**
 * Group steering behaviours for inter-entity movement.
 * We mainly use separate() for guard collision avoidance.
 */
export class GroupSteeringBehaviours {

  // Keep entities from crowding each other
  static separate(entity, others, radius) {
    let count = 0;
    let steer = new THREE.Vector3();

    for (let other of others) {
      if (!other || other === entity) continue;

      let offset = entity.position.clone().sub(other.position);
      offset.y = 0;

      let distance = offset.length();

      if (distance > 0 && distance < radius) {
        // Closer neighbours push harder
        offset.normalize();
        offset.divideScalar(distance);

        steer.add(offset);
        count++;
      }
    }

    if (count > 0) {
      steer.divideScalar(count);

      if (steer.lengthSq() > 0) {
        steer.setLength(entity.topSpeed);
        steer.sub(entity.velocity);
      }
    }

    return steer;
  }
}