/**
 * Shared guard runtime context shape.
 * Keep this centralized so controller/pathfinding/combat modules
 * can depend on one stable contract.
 */
export function createGuardRuntimeContext(world) {
  return {
    world,
    map: world.map,
    player: world.player,
    guards: world.guards,
    levelConfig: world.levelData?.config ?? null,
    hasArtifact: world.hasArtifact,
    isExitActive: world.exit?.isActive ?? false,
  };
}
