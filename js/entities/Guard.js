import { DynamicEntity } from "./DynamicEntity.js";
import { NullGuardController } from "../ai/guards/NullGuardController.js";

/**
 * Foundation guard class.
 * Advanced AI hooks can be added later (JPS/HPA* planning, state logic, etc.).
 */
export class Guard extends DynamicEntity {
  constructor(config = {}) {
    const {
      controller = null,
      pathfinder = null,
      combatProfile = null,
      sensitivity = 0.5,
      reactionTime = 1.0,
      detectionRange = 4,
      reactionSpeed = 1.0,
      patrolSpeed = 2.2,
      ...entityConfig
    } = config;

    super({
      color: "#f9a825",
      topSpeed: 3,
      friction: 0.9,
      maxForce: 15,
      ...entityConfig,
    });

    // Placeholder tuning hooks for future AI integration.
    this.sensitivity = sensitivity;
    this.reactionTime = reactionTime;
    this.detectionRange = detectionRange;
    this.reactionSpeed = reactionSpeed;
    this.patrolSpeed = patrolSpeed;

    // Integration points for teammate systems.
    this.controller = controller ?? new NullGuardController();
    this.pathfinder = pathfinder;
    this.combatProfile = combatProfile;

    this.currentPath = [];
    this.currentPathIndex = 0;
    this.currentTargetTile = null;

    /** Seconds remaining while guard is stunned (no AI, no movement). */
    this.stunTimer = 0;
    this.defaultGuardColor = entityConfig.color ?? '#f9a825';

    this.controller.onAttach(this);
  }

  /** Stunned guards are temporarily disabled for combat / readability. */
  isStunned() {
    return this.stunTimer > 0;
  }

  applyStun(durationSec) {
    this.stunTimer = Math.max(this.stunTimer, durationSec);
    this.clearPath();
    this.velocity.set(0, 0, 0);
    this.acceleration.set(0, 0, 0);
    this.setColor('#78909c');
  }

  updateBehaviour(dt, world, runtimeContext = null) {
    if (this.stunTimer > 0) {
      this.stunTimer -= dt;
      this.velocity.set(0, 0, 0);
      this.acceleration.set(0, 0, 0);

      if (this.stunTimer <= 0) {
        this.stunTimer = 0;
        this.setColor(this.defaultGuardColor);
      }
      return;
    }

    const context = runtimeContext ?? this.buildRuntimeContext(world);
    this.controller.update(dt, this, context);
  }

  // Fallback for legacy calls that do not pass a context object.
  buildRuntimeContext(world) {
    return {
      world,
      map: world?.map ?? null,
      player: world?.player ?? null,
      guards: world?.guards ?? [],
      levelConfig: world?.levelData?.config ?? null,
    };
  }

  setController(controller) {
    this.controller = controller ?? new NullGuardController();
    this.controller.onAttach(this);
  }

  setPathfinder(pathfinder) {
    this.pathfinder = pathfinder;
  }

  requestPath(startTile, endTile, map) {
    if (!this.pathfinder || !this.pathfinder.findPath) {
      this.currentPath = [];
      this.currentPathIndex = 0;
      this.currentTargetTile = null;
      return [];
    }

    this.currentPath = this.pathfinder.findPath(startTile, endTile, map) ?? [];
    this.currentPathIndex = this.currentPath.length > 1 ? 1 : 0;
    this.currentTargetTile = endTile ?? null;

    return this.currentPath;
  }

  /** Plans from the tile under the guard's position to a goal tile (JPS / other Pathfinder). */
  requestPathToGoal(goalTile, map) {
    if (!map || !goalTile) {
      this.currentPath = [];
      this.currentPathIndex = 0;
      this.currentTargetTile = null;
      return [];
    }

    const startTile = map.worldToGrid(this.position);
    return this.requestPath(startTile, goalTile, map);
  }

  clearPath() {
    this.currentPath = [];
    this.currentPathIndex = 0;
    this.currentTargetTile = null;
  }

  canAttack(target, attackRange = 1.0) {
    if (!target) return false;
    const dx = this.position.x - target.position.x;
    const dz = this.position.z - target.position.z;
    return dx * dx + dz * dz <= attackRange * attackRange;
  }

  tryAttack(target, runtimeContext = null) {
    if (!this.combatProfile || !this.combatProfile.tryAttack) {
      return false;
    }

    return this.combatProfile.tryAttack(this, target, runtimeContext);
  }
}