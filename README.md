# Midnight Heist (COMP4303 Final Project)

Midnight Heist is a 3D stealth-themed maze game built with JavaScript and Three.js.  
Each level generates a new maze, places the player/guards/objectives, and challenges the player to steal the artifact and escape through the exit.

## Run the project

### Prerequisites
- Node.js 18+ (or any recent Node version)

### Setup
```bash
npm install
```

### Start a local server
Because this project uses ES modules in the browser, run it from a local web server (not `file://`).

Option A (Python):
```bash
python3 -m http.server 8080
```

Option B (Node):
```bash
npx serve .
```

Then open:
- [http://localhost:8080](http://localhost:8080) (Python)
- or the URL printed by `serve`

## Controls

- `W` / `A` / `S` / `D`: Move player
- Goal: Collect the artifact, then reach the exit

## Implemented course-topic foundations

### 1) DFS Backtracking Maze Generation (implemented)
- Maze generation uses wall-carving DFS backtracking.
- Walls are stored per tile (`north/south/east/west`) and carved by DFS traversal.
- Maze is regenerated when a level restarts or advances.

### 2) Tile/Grid representation + query utilities (implemented)
- `TileMap` stores a grid of walkable tiles with wall data.
- Query methods are available for gameplay and pathfinding integration:
  - world/grid conversion (`worldToGrid`, `gridToWorld`)
  - walkability checks (`isWalkable`, `isWalkableTile`)
  - neighbour queries (`getAdjacentTiles`, `getNeighbours`)

### 3) Core gameplay loop (implemented)
- Player uses WASD movement with collision against maze walls.
- Artifact and exit are placed on valid walkable tiles.
- Exit starts locked and becomes active only after artifact collection.
- Level restart trigger: player collides with a guard.
- Next level trigger: player reaches active exit after collecting artifact.

### 4) Level progression framework (implemented)
- Difficulty/progression values are centralized in `LevelManager` (no scattered magic numbers).
- Scales include:
  - maze width/height
  - guard count
  - guard detection/reaction placeholders
  - additional heist-themed pressure/security placeholders

### 5) Advanced AI integration scaffolding (prepared, not fully implemented)
- Extension points are ready for teammate implementation:
  - Guard state/controller hooks
  - JPS pathfinding placeholder
  - combat and guard-behaviour integration points
- Advanced guard systems are intentionally still under development.

## How to view/test each implemented topic

- **Maze generation (DFS):**
  - Start the game, then complete/restart levels.
  - Observe that each level rebuilds a new maze layout with carved walls.

- **Wall-based collision + movement:**
  - Use WASD and attempt to move into walls.
  - Player is blocked by maze walls and can move through carved passages only.

- **Artifact/exit loop:**
  - Find and touch the artifact (purple object).
  - Exit unlocks/activates.
  - Touch the exit (green object) to load the next level.

- **Guard caught restart:**
  - Touch a guard to trigger level restart and full level rebuild.

- **Progression scaling:**
  - Advance levels and observe increased maze/guard difficulty settings from centralized `LevelManager` config.

## In-class source adaptation note

This project adapts in-class COMP4303 algorithm/code patterns where applicable, especially DFS backtracking maze generation.  
One structural adaptation is that wall-carving is applied directly to `TileMap` tile objects instead of producing a separate maze type grid, so gameplay systems and rendering can consume one shared map representation.

## External libraries and sources

- [Three.js](https://threejs.org/) for 3D rendering
- No external procedural-generation/pathfinding algorithm libraries are used for course-topic implementations.

