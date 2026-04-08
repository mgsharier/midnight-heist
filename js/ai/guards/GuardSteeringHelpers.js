import * as THREE from 'three';
import { SteeringBehaviours } from '../steering/SteeringBehaviours.js';
import { GroupSteeringBehaviours } from '../steering/GroupSteeringBehaviours.js';

/**
 * Shared path-following, patrol targeting, and inter-guard avoidance
 * for guard controllers and FSM states (modular, no duplication).
 */
export class GuardSteeringHelpers {
  static shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = array[i];
      array[i] = array[j];
      array[j] = tmp;
    }
  }

  static pickPatrolTarget(map, startTile) {
    const candidates = [...(map.walkableTiles ?? [])];
    GuardSteeringHelpers.shuffle(candidates);

    const minDistance = Math.max(3, Math.floor((map.rows + map.cols) / 8));

    for (const tile of candidates) {
      if (tile.row === startTile.row && tile.col === startTile.col) {
        continue;
      }

      const distance =
        Math.abs(tile.row - startTile.row) + Math.abs(tile.col - startTile.col);

      if (distance >= minDistance) {
        return tile;
      }
    }

    for (const tile of candidates) {
      if (tile.row !== startTile.row || tile.col !== startTile.col) {
        return tile;
      }
    }

    return null;
  }

  /** World-space detection radius (guard.detectionRange scales per level, treated as tile units). */
  static getDetectionWorldRadius(guard, map) {
    const tiles = guard.detectionRange ?? 4;
    const tileSize = map?.tileSize ?? 1;
    return Math.max(tileSize * 0.5, tiles * tileSize);
  }

  static playerInRange(guard, player, map) {
    if (!player || !map) return false;

    const dx = guard.position.x - player.position.x;
    const dz = guard.position.z - player.position.z;
    const distSq = dx * dx + dz * dz;
    const r = GuardSteeringHelpers.getDetectionWorldRadius(guard, map);

    return distSq <= r * r;
  }

  static getPathFollowForce(guard, map) {
    if (!guard.currentPath || guard.currentPath.length === 0) {
      return new THREE.Vector3();
    }

    let index = guard.currentPathIndex ?? 0;
    index = Math.min(index, guard.currentPath.length - 1);

    let targetTile = guard.currentPath[index];
    let targetPos = map.gridToWorld(targetTile);

    const threshold = Math.max(0.15, map.tileSize * 0.2);

    while (
      guard.position.distanceTo(targetPos) < threshold &&
      index < guard.currentPath.length - 1
    ) {
      index++;
      targetTile = guard.currentPath[index];
      targetPos = map.gridToWorld(targetTile);
    }

    guard.currentPathIndex = index;

    if (index === guard.currentPath.length - 1) {
      return SteeringBehaviours.arrive(
        guard,
        targetPos,
        map.tileSize * 0.75,
        map.tileSize * 0.15
      );
    }

    return SteeringBehaviours.seek(guard, targetPos);
  }

  static getAvoidanceForce(guard, runtimeContext) {
    const guards = runtimeContext?.guards ?? [];
    const map = runtimeContext?.map;
    const levelConfig = runtimeContext?.levelConfig ?? {};

    if (!map || guards.length <= 1) {
      return new THREE.Vector3();
    }

    const radius = map.tileSize * 1.1;
    const weight = levelConfig.guardAvoidanceWeight ?? 0.4;

    const force = GroupSteeringBehaviours.separate(guard, guards, radius);
    force.multiplyScalar(weight);

    return force;
  }

  /**
   * Request JPS path to targetTile; sets repathTimer.
   */
  static assignPathToTile(guard, map, targetTile, repathInterval = 0.4) {
    if (!targetTile) {
      guard.currentPath = [];
      guard.currentPathIndex = 0;
      guard.currentTargetTile = null;
      guard.repathTimer = 0.3;
      return;
    }

    const startTile = map.worldToGrid(guard.position);
    guard.requestPath(startTile, targetTile, map);
    guard.currentTargetTile = targetTile;
    guard.repathTimer = repathInterval;
  }

  static shouldRequestPatrolPath(guard, map) {
    if (!guard.currentPath || guard.currentPath.length === 0) {
      return true;
    }

    if (guard.repathTimer <= 0) {
      return true;
    }

    const currentTile = map.worldToGrid(guard.position);
    const targetTile = guard.currentTargetTile;

    if (!targetTile) {
      return true;
    }

    if (currentTile.row === targetTile.row && currentTile.col === targetTile.col) {
      return true;
    }

    if (guard.currentPathIndex >= guard.currentPath.length) {
      return true;
    }

    return false;
  }

  static assignPatrolPath(guard, map) {
    const startTile = map.worldToGrid(guard.position);
    const targetTile = GuardSteeringHelpers.pickPatrolTarget(map, startTile);

    if (!targetTile) {
      guard.currentPath = [];
      guard.currentPathIndex = 0;
      guard.currentTargetTile = null;
      guard.repathTimer = 0.5;
      return;
    }

    guard.requestPath(startTile, targetTile, map);
    guard.currentPathIndex = guard.currentPath.length > 1 ? 1 : 0;
    guard.currentTargetTile = targetTile;
    guard.repathTimer = Math.max(0.5, guard.reactionTime ?? 1.0);
  }

  /** Near center of tile (for return / state transitions). */
  static isNearTileCenter(guard, map, tile, stopFactor = 0.35) {
    if (!tile || !map) return false;

    const center = map.gridToWorld(tile);
    const dx = guard.position.x - center.x;
    const dz = guard.position.z - center.z;
    const limit = map.tileSize * stopFactor;

    return dx * dx + dz * dz <= limit * limit;
  }
}
