import { State } from '../../decisions/state-machines/State.js';
import { SteeringBehaviours } from '../../steering/SteeringBehaviours.js';
import { GuardSteeringHelpers } from '../GuardSteeringHelpers.js';

/**
 * Patrol: JPS to distant walkable tiles until player enters detection radius.
 */
export class GuardPatrolState extends State {
  enter(entity, data) {
    entity.topSpeed = entity.patrolSpeed ?? 3;
    entity.repathTimer = 0;
  }

  update(entity, data, dt) {
    const map = data.map;
    const player = data.player;
    if (!map) {
      return;
    }

    // Patrol -> Chase
    if (GuardSteeringHelpers.playerInRange(entity, player, map)) {
      data.returnPatrolTile =
        entity.currentTargetTile || map.worldToGrid(entity.position);
      entity._gameplayFsm.change(new GuardChaseState());
      return;
    }

    entity.repathTimer -= dt;
    if (GuardSteeringHelpers.shouldRequestPatrolPath(entity, map)) {
      GuardSteeringHelpers.assignPatrolPath(entity, map);
    }

    entity.applyForce(GuardSteeringHelpers.getPathFollowForce(entity, map));
  }

  exit() {}
}

/**
 * Chase: JPS toward player while in detection radius (replans on interval).
 */
export class GuardChaseState extends State {
  enter(entity, data) {
    const base = entity.patrolSpeed ?? 3;
    const boost = Math.min(Math.max(entity.reactionSpeed ?? 1, 0.5), 2);
    entity.topSpeed = Math.min(base * boost, 6);
    entity.repathTimer = 0;
  }

  update(entity, data, dt) {
    const map = data.map;
    const player = data.player;
    if (!map || !player) {
      entity._gameplayFsm.change(new GuardReturnPatrolState());
      return;
    }

    // Chase -> Return
    if (!GuardSteeringHelpers.playerInRange(entity, player, map)) {
      entity._gameplayFsm.change(new GuardReturnPatrolState());
      return;
    }

    entity.repathTimer -= dt;
    if (entity.repathTimer <= 0) {
      const goal = map.worldToGrid(player.position);
      GuardSteeringHelpers.assignPathToTile(
        entity,
        map,
        goal,
        Math.max(0.25, 0.5 / Math.max(0.5, entity.reactionSpeed ?? 1))
      );
    }

    let force = GuardSteeringHelpers.getPathFollowForce(entity, map);
    if (force.lengthSq() < 1e-8) {
      force = SteeringBehaviours.seek(entity, player);
    }
    entity.applyForce(force);
  }

  exit() {}
}

/**
 * ReturnToPatrol: JPS back toward saved patrol goal, then resume patrol.
 */
export class GuardReturnPatrolState extends State {
  enter(entity, data) {
    entity.topSpeed = entity.patrolSpeed ?? 3;
    const map = data.map;
    const tile = data.returnPatrolTile;

    if (map && tile) {
      GuardSteeringHelpers.assignPathToTile(entity, map, tile, 0.55);
    } else {
      entity.clearPath();
    }
  }

  update(entity, data, dt) {
    const map = data.map;
    if (!map) {
      entity._gameplayFsm.change(new GuardPatrolState());
      return;
    }

    const tile = data.returnPatrolTile;

    // Return -> Patrol (arrived or no valid path)
    if (!tile) {
      entity._gameplayFsm.change(new GuardPatrolState());
      return;
    }

    if (
      !entity.currentPath ||
      entity.currentPath.length === 0
    ) {
      entity._gameplayFsm.change(new GuardPatrolState());
      return;
    }

    if (GuardSteeringHelpers.isNearTileCenter(entity, map, tile, 0.45)) {
      entity._gameplayFsm.change(new GuardPatrolState());
      return;
    }

    entity.repathTimer -= dt;
    if (entity.repathTimer <= 0) {
      GuardSteeringHelpers.assignPathToTile(entity, map, tile, 0.5);
    }

    entity.applyForce(GuardSteeringHelpers.getPathFollowForce(entity, map));
  }

  exit() {}
}
