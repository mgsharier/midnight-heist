import { TileMap } from "../maps/TileMap.js";
import { MazeGenerator } from "./MazeGenerator.js";

/**
 * Keeps level flow and level-specific configuration in one place.
 */
export class LevelManager {
  constructor({
    maxLevels = 3,
    tileSize = 2,
    baseWidth = 30,
    baseDepth = 30,
    widthStep = 4,
    depthStep = 4,
    baseGuardCount = 2,
    guardCountStep = 1,
    baseGuardSensitivity = 0.5,
    guardSensitivityStep = 0.1,
    baseGuardReactionTime = 1.2,
    guardReactionStep = -0.1,
    artifactPlacement = "farFromPlayer",
    exitPlacement = "farFromArtifact",
    guardSpawnMinDistance = 3,
    baseGuardDetectionRange = 4,
    guardDetectionRangeStep = 0.75,
    baseGuardReactionSpeed = 1.0,
    guardReactionSpeedStep = 0.12,
    baseGuardPatrolSpeed = 2.2,
    guardPatrolSpeedStep = 0.18,
    baseIntelSecurity = 1,
    intelSecurityStep = 1,
    baseEscapeTimePressure = 0,
    escapeTimePressureStep = 0.15,
    guardControllerType = "placeholder",
    pathfindingType = "JPS",
    guardAvoidanceWeight = 0.4,
    guardCombatEnabled = false,
  } = {}) {
    this.maxLevels = maxLevels;
    this.currentLevel = 1;
    this.mazeGenerator = new MazeGenerator();

    this.tileSize = tileSize;
    this.artifactPlacement = artifactPlacement;
    this.exitPlacement = exitPlacement;
    this.guardSpawnMinDistance = guardSpawnMinDistance;
    this.guardControllerType = guardControllerType;
    this.pathfindingType = pathfindingType;
    this.guardAvoidanceWeight = guardAvoidanceWeight;
    this.guardCombatEnabled = guardCombatEnabled;

    // Centralized progression table: easy to tune and document.
    this.progression = {
      mazeWidth: { base: baseWidth, step: widthStep, min: 8 },
      mazeHeight: { base: baseDepth, step: depthStep, min: 8 },
      guardCount: { base: baseGuardCount, step: guardCountStep, min: 0, round: true },
      guardSensitivity: { base: baseGuardSensitivity, step: guardSensitivityStep, min: 0.1 },
      guardReactionTime: { base: baseGuardReactionTime, step: guardReactionStep, min: 0.25 },
      guardDetectionRange: { base: baseGuardDetectionRange, step: guardDetectionRangeStep, min: 1 },
      guardReactionSpeed: { base: baseGuardReactionSpeed, step: guardReactionSpeedStep, min: 0.1 },
      guardPatrolSpeed: { base: baseGuardPatrolSpeed, step: guardPatrolSpeedStep, min: 0.1 },
      intelSecurityLevel: { base: baseIntelSecurity, step: intelSecurityStep, min: 1, round: true },
      escapeTimePressure: { base: baseEscapeTimePressure, step: escapeTimePressureStep, min: 0, max: 1 },
    };
  }

  start() {
    this.currentLevel = 1;
    return this.createLevel(this.currentLevel);
  }

  restart() {
    return this.createLevel(this.currentLevel);
  }

  next() {
    if (this.currentLevel < this.maxLevels) {
      this.currentLevel += 1;
    } else {
      this.currentLevel = 1;
    }

    return this.createLevel(this.currentLevel);
  }

  /**
   * Main level setup pipeline entry point.
   * Order:
   * 1) build level config
   * 2) generate maze map
   * 3) choose valid spawn tiles
   * 4) convert spawn tiles to world positions
   */
  createLevel(levelNumber = this.currentLevel) {
    const config = this.buildLevelConfig(levelNumber);
    const map = this.createMazeMap(config);
    const spawnTiles = this.buildSpawnTiles(map, config);
    const spawns = this.toWorldSpawns(map, spawnTiles, config);

    return {
      level: levelNumber,
      config,
      map,
      spawns,
    };
  }

  buildLevelConfig(levelNumber) {
    const mazeWidth = this.getProgressionValue("mazeWidth", levelNumber);
    const mazeHeight = this.getProgressionValue("mazeHeight", levelNumber);
    const guardCount = this.getProgressionValue("guardCount", levelNumber);
    const guardSensitivity = this.getProgressionValue("guardSensitivity", levelNumber);
    const guardReactionTime = this.getProgressionValue("guardReactionTime", levelNumber);
    const guardDetectionRange = this.getProgressionValue("guardDetectionRange", levelNumber);
    const guardReactionSpeed = this.getProgressionValue("guardReactionSpeed", levelNumber);
    const guardPatrolSpeed = this.getProgressionValue("guardPatrolSpeed", levelNumber);
    const intelSecurityLevel = this.getProgressionValue("intelSecurityLevel", levelNumber);
    const escapeTimePressure = this.getProgressionValue("escapeTimePressure", levelNumber);

    return {
      levelNumber,
      mazeWidth,
      mazeHeight,
      tileSize: this.tileSize,
      guardCount,
      guardSensitivity,
      guardReactionTime,
      guardDetectionRange,
      guardReactionSpeed,
      guardPatrolSpeed,
      intelSecurityLevel,
      escapeTimePressure,
      artifactPlacement: this.artifactPlacement,
      exitPlacement: this.exitPlacement,
      guardSpawnMinDistance: this.guardSpawnMinDistance,
      guardControllerType: this.guardControllerType,
      pathfindingType: this.pathfindingType,
      guardAvoidanceWeight: this.guardAvoidanceWeight,
      guardCombatEnabled: this.guardCombatEnabled,
      difficultyLabel: this.getDifficultyLabel(levelNumber),
    };
  }

  createMazeMap(config) {
    return new TileMap(
      config.tileSize,
      { width: config.mazeWidth, depth: config.mazeHeight },
      { mode: "maze", mazeGenerator: this.mazeGenerator }
    );
  }

  buildSpawnTiles(map, config) {
    const used = [];
    const playerTile = this.pickTile(map, used);
    if (!playerTile) {
      throw new Error("No walkable tile available for player spawn.");
    }
    used.push(playerTile);

    const artifactTile = this.pickSpecialTile(
      map,
      playerTile,
      used,
      config.artifactPlacement
    );
    used.push(artifactTile);

    const exitTile = this.pickSpecialTile(
      map,
      artifactTile,
      used,
      config.exitPlacement
    );
    used.push(exitTile);

    const guardTiles = this.pickGuardTiles(
      map,
      config.guardCount,
      used,
      config.guardSpawnMinDistance
    );

    return {
      player: playerTile,
      artifact: artifactTile,
      exit: exitTile,
      guards: guardTiles,
    };
  }

  toWorldSpawns(map, spawnTiles, config) {
    const toPos = (tile) => map.gridToWorld(tile);

    return {
      player: { tile: spawnTiles.player, position: toPos(spawnTiles.player) },
      artifact: { tile: spawnTiles.artifact, position: toPos(spawnTiles.artifact) },
      exit: { tile: spawnTiles.exit, position: toPos(spawnTiles.exit) },
      guards: spawnTiles.guards.map((tile) => ({
        tile,
        position: toPos(tile),
        sensitivity: config.guardSensitivity,
        reactionTime: config.guardReactionTime,
        detectionRange: config.guardDetectionRange,
        reactionSpeed: config.guardReactionSpeed,
        patrolSpeed: config.guardPatrolSpeed,
      })),
    };
  }

  getProgressionValue(key, levelNumber) {
    const rule = this.progression[key];
    if (!rule) {
      throw new Error(`Unknown progression key: ${key}`);
    }

    const levelIndex = Math.max(0, levelNumber - 1);
    let value = rule.base + levelIndex * rule.step;
    if (rule.min !== undefined) value = Math.max(rule.min, value);
    if (rule.max !== undefined) value = Math.min(rule.max, value);
    if (rule.round) value = Math.round(value);
    return value;
  }

  getDifficultyLabel(levelNumber) {
    if (levelNumber <= 1) return "Training Heist";
    if (levelNumber <= 2) return "Secured Site";
    if (levelNumber <= 4) return "High Security";
    return "Black Site";
  }

  pickSpecialTile(map, anchorTile, usedTiles, mode) {
    if (mode === "farFromPlayer" || mode === "farFromArtifact") {
      return this.pickFarthestTile(map, anchorTile, usedTiles) ?? this.pickTile(map, usedTiles);
    }

    return this.pickTile(map, usedTiles);
  }

  pickGuardTiles(map, count, usedTiles, minDistance) {
    const selected = [];

    for (let i = 0; i < count; i++) {
      const tile = this.pickTile(
        map,
        [...usedTiles, ...selected],
        (candidate) => this.isFarEnough(candidate, [...usedTiles, ...selected], minDistance)
      ) ?? this.pickTile(map, [...usedTiles, ...selected]);

      if (!tile) {
        break;
      }

      selected.push(tile);
    }

    return selected;
  }

  pickFarthestTile(map, anchorTile, excludedTiles = []) {
    const walkables = map.walkableTiles ?? [];
    let best = null;
    let bestDistance = -1;

    for (const tile of walkables) {
      if (this.containsTile(excludedTiles, tile)) {
        continue;
      }

      const distance = this.gridDistance(anchorTile, tile);
      if (distance > bestDistance) {
        best = tile;
        bestDistance = distance;
      }
    }

    return best;
  }

  pickTile(map, excludedTiles = [], predicate = null) {
    const candidates = [...(map.walkableTiles ?? [])];
    this.shuffle(candidates);

    for (const tile of candidates) {
      if (this.containsTile(excludedTiles, tile)) {
        continue;
      }
      if (predicate && !predicate(tile)) {
        continue;
      }
      return tile;
    }

    return null;
  }

  containsTile(tiles, target) {
    return tiles.some((t) => t.row === target.row && t.col === target.col);
  }

  isFarEnough(tile, others, minDistance) {
    return others.every((other) => this.gridDistance(tile, other) >= minDistance);
  }

  gridDistance(a, b) {
    return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
  }

  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = array[i];
      array[i] = array[j];
      array[j] = tmp;
    }
  }

  // Backwards-compatible alias.
  createLevelData() {
    return this.createLevel(this.currentLevel);
  }

  // Backwards-compatible alias.
  createLevelFor(levelNumber) {
    this.currentLevel = levelNumber;
    return {
      ...this.createLevel(levelNumber),
    };
  }
}