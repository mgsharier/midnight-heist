/**
 * Simple melee-style attack: Space queues a hit check against nearby guards.
 * Keeps combat logic out of World.
 */
export class PlayerCombat {
  /** Proximity hit radius in world units (XZ). */
  static ATTACK_RADIUS = 2.2;

  /** How long a guard stays disabled after a hit (seconds). */
  static STUN_DURATION = 2.5;

  /**
   * If the player pressed Space this frame, stun guards within ATTACK_RADIUS.
   * @param {import('../World.js').World} world
   */
  static process(world) {
    if (!world?.player || !world.inputHandler?.consumeAttackPressed()) {
      return;
    }

    const player = world.player;
    const r = PlayerCombat.ATTACK_RADIUS;
    const rSq = r * r;

    for (const guard of world.guards) {
      if (!guard || guard.stunTimer > 0) {
        continue;
      }

      const dx = player.position.x - guard.position.x;
      const dz = player.position.z - guard.position.z;

      if (dx * dx + dz * dz <= rSq) {
        guard.applyStun(PlayerCombat.STUN_DURATION);
      }
    }
  }
}
