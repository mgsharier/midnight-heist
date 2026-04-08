/**
 * Simple collision helpers used by game flow checks.
 */
export class Collision {
  static circlesOverlapXZ(a, b, padding = 0) {
    const ar = a.radius ?? Math.max(a.scale.x, a.scale.z) / 2;
    const br = b.radius ?? Math.max(b.scale.x, b.scale.z) / 2;

    const dx = a.position.x - b.position.x;
    const dz = a.position.z - b.position.z;
    const distanceSq = dx * dx + dz * dz;
    const minDistance = ar + br + padding;

    return distanceSq <= minDistance * minDistance;
  }
}
