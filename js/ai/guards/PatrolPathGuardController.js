import { GuardController } from './GuardController.js';
import { GuardSteeringHelpers } from './GuardSteeringHelpers.js';

/**
 * Patrol-only controller (JPS + avoidance). Prefer GuardGameplayController for full gameplay.
 */
export class PatrolPathGuardController extends GuardController {
  onAttach(guard) {
    guard.currentPath = [];
    guard.currentPathIndex = 0;
    guard.currentTargetTile = null;
    guard.repathTimer = 0;
  }

  update(dt, guard, runtimeContext) {
    const map = runtimeContext?.map;
    if (!map) {
      return;
    }

    guard.topSpeed = guard.patrolSpeed ?? guard.topSpeed;

    guard.repathTimer -= dt;

    if (GuardSteeringHelpers.shouldRequestPatrolPath(guard, map)) {
      GuardSteeringHelpers.assignPatrolPath(guard, map);
    }

    guard.applyForce(GuardSteeringHelpers.getPathFollowForce(guard, map));
    guard.applyForce(GuardSteeringHelpers.getAvoidanceForce(guard, runtimeContext));
  }
}
