import * as THREE from 'three';
import * as Setup from './setup.js';
import { InputHandler } from './input/InputHandler.js';
import { TileMapRenderer } from './renderers/TileMapRenderer.js';
import { LevelManager } from './game/LevelManager.js';
import { Collision } from './game/Collision.js';
import { Player } from './entities/Player.js';
import { Guard } from './entities/Guard.js';
import { Artifact } from './entities/Artifact.js';
import { Exit } from './entities/Exit.js';
import { createGuardRuntimeContext } from './ai/guards/createGuardRuntimeContext.js';
import { JPSPathfinder } from './ai/pathfinding/JPSPathfinder.js';
import { GuardGameplayController } from './ai/guards/GuardGameplayController.js';
import { PlayerCombat } from './game/PlayerCombat.js';


/**
 * World class holds all information about our game's world
 */
export class World {

  // Creates a world instance
  constructor() {
    this.scene = Setup.createScene();
    this.camera = Setup.createCamera();
    this.renderer = Setup.createRenderer();

    this.clock = new THREE.Clock();

    this.inputHandler = new InputHandler(this.camera);

    this.entities = [];
    this.guards = [];
    this.player = null;
    this.artifact = null;
    this.exit = null;
    this.hasArtifact = false;
    this.levelManager = new LevelManager();
    this.helpersInitialized = false;
  }

  // Initialize objects in our world
  init() {
    Setup.createLight(this.scene);
    this.loadLevel(this.levelManager.start());
  }

  // Add an entity to the world.
  addEntity(entity) {
    this.scene.add(entity.mesh);
    this.entities.push(entity);
  }

  // Backwards-compatible alias.
  addEntityToWorld(entity) {
    this.addEntity(entity);
  }

  loadLevel(levelData) {
    if (this.tileMapRenderer) {
      this.scene.remove(this.tileMapRenderer.mesh);
      this.scene.remove(this.tileMapRenderer.wallMesh);
    }

    for (const entity of this.entities) {
      this.scene.remove(entity.mesh);
    }

    this.entities = [];
    this.guards = [];
    this.player = null;
    this.artifact = null;
    this.exit = null;
    this.hasArtifact = false;

    this.map = levelData.map;
    this.levelData = levelData;
    this.tileMapRenderer = new TileMapRenderer(this.map);
    this.tileMapRenderer.render(this.scene);

    if (!this.helpersInitialized) {
      Setup.showHelpers(this.scene, this.camera, this.renderer, this.map);
      this.helpersInitialized = true;
    }

    this.spawnGameplayEntities(levelData.spawns);
  }

  spawnGameplayEntities(spawns) {
    const playerPos = spawns?.player?.position ?? this.map.localize(this.map.getRandomWalkableTile());
    const artifactPos = spawns?.artifact?.position ?? this.map.localize(this.map.getRandomWalkableTile());
    const exitPos = spawns?.exit?.position ?? this.map.localize(this.map.getRandomWalkableTile());
    const guardSpawns = spawns?.guards ?? [];

    this.player = new Player({ position: playerPos });
    this.addEntity(this.player);

    this.artifact = new Artifact({ position: artifactPos });
    this.addEntity(this.artifact);

    this.exit = new Exit({ position: exitPos });
    this.exit.setActive(false);
    this.addEntity(this.exit);

    for (const guardSpawn of guardSpawns) {
      const guard = new Guard({
        position: guardSpawn.position,
        controller: this.createGuardController(),
        pathfinder: this.createGuardPathfinder(),
        combatProfile: this.createGuardCombatProfile(),
        sensitivity: guardSpawn.sensitivity,
        reactionTime: guardSpawn.reactionTime,
        detectionRange: guardSpawn.detectionRange,
        reactionSpeed: guardSpawn.reactionSpeed,
        patrolSpeed: guardSpawn.patrolSpeed,
      });
      this.guards.push(guard);
      this.addEntity(guard);
    }
  }

  restartLevel() {
    this.loadLevel(this.levelManager.restart());
  }

  nextLevel() {
    this.loadLevel(this.levelManager.next());
  }

  updateGameFlow(dt) {
    if (!this.player || !this.artifact || !this.exit) {
      return;
    }

    for (const guard of this.guards) {
      if (guard.isStunned?.()) {
        continue;
      }
      if (Collision.circlesOverlapXZ(this.player, guard, 0.1)) {
        this.restartLevel();
        return;
      }
    }

    this.handleArtifactCollection();
    this.handleExitProgression();
  }

  handleArtifactCollection() {
    if (this.hasArtifact || this.artifact.collected) {
      return;
    }

    if (Collision.circlesOverlapXZ(this.player, this.artifact, 0.15)) {
      this.hasArtifact = true;
      this.artifact.collect();
      this.exit.setActive(true);
    }
  }

  handleExitProgression() {
    if (!this.exit.isActive) {
      return;
    }

    if (Collision.circlesOverlapXZ(this.player, this.exit, 0.15)) {
      this.nextLevel();
    }
  }

  // Stable integration point for advanced guard systems.
  getGuardRuntimeContext() {
    return createGuardRuntimeContext(this);
  }

  // FSM patrol / chase / return + JPS + inter-guard avoidance (see GuardGameplayController).
  createGuardController() {
    return new GuardGameplayController();
  }

  // JPS planner used by the guard controller.
  createGuardPathfinder() {
    const pathfindingType = this.levelData?.config?.pathfindingType ?? "JPS";

    if (pathfindingType === "JPS") {
      return new JPSPathfinder();
    }

    return null;
  }

  // Combat not wired yet.
  createGuardCombatProfile() {
    return null;
  }

  // Update our world
  update() {
    let dt = this.clock.getDelta();

    if (this.player) {
      const inputForce = this.inputHandler.getForce(this.player.inputStrength);
      this.player.applyForce(inputForce);
    }

    PlayerCombat.process(this);

    // Run guard AI before physics so steering forces apply on the same frame.
    if (this.player && this.artifact && this.exit && this.guards.length > 0) {
      const guardContext = this.getGuardRuntimeContext();
      for (const guard of this.guards) {
        guard.updateBehaviour(dt, this, guardContext);
      }
    }

    for (let e of this.entities) {
      if (e.update) {
        e.update(dt, this.map);
      }
    }

    this.updateGameFlow(dt);
  }

  // Render our world
  render() {
    this.renderer.render(this.scene, this.camera);
  }

}