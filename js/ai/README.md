# AI Modules Note

This folder currently contains two categories:

- reusable AI building blocks from Assignment 4 (pathfinding, steering base classes)
- Assignment-4-specific decision demos (guard FSM/BT examples)

For the current Midnight Heist foundation:

- runtime uses the new `LevelManager`, wall-based `MazeGenerator`, and entity placeholders
- maze generation now follows the in-class DFS backtracking wall-carving style
- `TileMap` stores walkable tiles plus wall data on each tile
- `TileMapRenderer` renders both floor tiles and carved maze walls
- advanced guard logic is intentionally kept as extension hooks
- JPS/HPA* can be integrated later without changing the world/level setup

## Ahmed integration points

- `js/ai/guards/GuardController.js`:
  - abstract controller contract for FSM/BT updates
- `js/ai/guards/NullGuardController.js`:
  - current default no-op implementation
- `js/ai/guards/createGuardRuntimeContext.js`:
  - shared runtime context shape passed to guard controllers
- `js/ai/pathfinding/JPSPathfinder.js`:
  - TODO placeholder for course-required JPS implementation
- `js/entities/Guard.js`:
  - guard extension hooks for controller, pathfinder, and combat profile
- `js/World.js`:
  - factory hooks: `createGuardController`, `createGuardPathfinder`, `createGuardCombatProfile`

## Responsibility boundary

- Foundation owner:
  - world/level flow, maze generation, entity lifecycle, spawn/config plumbing
- Ahmed:
  - guard decision system (FSM/BT), JPS planner, collision avoidance steering integration, and combat rules