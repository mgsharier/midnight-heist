import { Tile } from "./Tile.js";
import { LevelMap } from "./LevelMap.js";
import * as THREE from "three";


// TileMap class will hold information about our Tile grid
export class TileMap extends LevelMap {

  // TileMap constructor
  constructor(
    tileSize = 1,
    levelMapConfig = {},
    generationConfig = {}
  ) {
    super(levelMapConfig);

    this.tileSize = tileSize;
    this.cols = Math.floor(this.width / this.tileSize);
    this.rows = Math.floor(this.depth / this.tileSize);

    this.generationMode = generationConfig.mode ?? "random";
    this.mazeGenerator = generationConfig.mazeGenerator ?? null;

    this.grid = [];
    this.generateGrid(this.generationMode);
    this.refreshWalkableTiles();
  }

  refreshWalkableTiles() {
    this.walkableTiles = this.grid.flat().filter((tile) => tile.isWalkable());
  }

  // Generate the tile grid using a selected strategy.
  generateGrid(mode = "random") {
    this.grid = [];

    if (mode === "maze" && this.mazeGenerator) {
      this.generateMazeGrid();
      this.refreshWalkableTiles();
      return;
    }

    this.generateRandomGrid();
    this.refreshWalkableTiles();
  }

  generateRandomGrid() {
    for (let r = 0; r < this.rows; r++) {
      let row = [];

      for (let c = 0; c < this.cols; c++) {
        let random = Math.random();
        let type =
          random < 0.1 ? Tile.Type.Obstacle :
          random < 0.2 ? Tile.Type.DifficultTerrain :
          random < 0.3 ? Tile.Type.MediumTerrain :
          Tile.Type.EasyTerrain;

        row.push(new Tile(r, c, type));
      }

      this.grid.push(row);
    }
  }

  generateMazeGrid() {
    for (let r = 0; r < this.rows; r++) {
      let row = [];

      for (let c = 0; c < this.cols; c++) {
        row.push(new Tile(r, c, Tile.Type.EasyTerrain));
      }

      this.grid.push(row);
    }

    // Ensure walkable cache exists before DFS picks a random start tile.
    this.refreshWalkableTiles();
    this.mazeGenerator.generate(this);
  }

  // Get neighbours through open walls only
  getNeighbours(tile) {
    let neighbours = [];
    let r = tile.row;
    let c = tile.col;

    // North
    if (this.isWalkable(r - 1, c) && !tile.walls.north) {
      neighbours.push(this.grid[r - 1][c]);
    }

    // South
    if (this.isWalkable(r + 1, c) && !tile.walls.south) {
      neighbours.push(this.grid[r + 1][c]);
    }

    // East
    if (this.isWalkable(r, c + 1) && !tile.walls.east) {
      neighbours.push(this.grid[r][c + 1]);
    }

    // West
    if (this.isWalkable(r, c - 1) && !tile.walls.west) {
      neighbours.push(this.grid[r][c - 1]);
    }

    return neighbours;
  }

  /**
   * One orthogonal step from tile, respecting maze walls (same graph as getNeighbours).
   * Used by JPS and other planners that need direction-aware expansion.
   */
  getStepNeighbour(tile, dr, dc) {
    if (dr === 0 && dc === 0) return null;

    const r = tile.row + dr;
    const c = tile.col + dc;

    if (!this.isWalkable(r, c)) {
      return null;
    }

    if (dr === -1 && tile.walls.north) return null;
    if (dr === 1 && tile.walls.south) return null;
    if (dc === 1 && tile.walls.east) return null;
    if (dc === -1 && tile.walls.west) return null;

    return this.grid[r][c];
  }

  // Get adjacent tiles ignoring walls
  // Used by the DFS maze generator while carving
  getAdjacentTiles(tile) {
    let neighbours = [];
    let directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

    for (let d of directions) {
      let r = tile.row + d[0];
      let c = tile.col + d[1];

      if (this.isInGrid(r, c) && this.grid[r][c].isWalkable()) {
        neighbours.push(this.grid[r][c]);
      }
    }

    return neighbours;
  }

  // Test if in the grid
  isInGrid(row, col) {
    return (
      row >= 0 && row < this.rows &&
      col >= 0 && col < this.cols
    );
  }

  // Quantize
  // Converts from Vector3 position to a tile
  quantize(position) {
    let row = THREE.MathUtils.clamp(
      Math.floor((position.z - this.minZ) / this.tileSize),
      0,
      this.rows - 1
    );

    let col = THREE.MathUtils.clamp(
      Math.floor((position.x - this.minX) / this.tileSize),
      0,
      this.cols - 1
    );

    return this.grid[row][col];
  }

  // Alias for quantize to keep world/grid query naming explicit.
  worldToGrid(position) {
    return this.quantize(position);
  }

  // Localize
  // Converts from a tile to a Vector3 position
  localize(tile) {
    return new THREE.Vector3(
      tile.col * this.tileSize + this.minX + this.tileSize / 2,
      0,
      tile.row * this.tileSize + this.minZ + this.tileSize / 2
    );
  }

  // Alias for localize to keep world/grid query naming explicit.
  gridToWorld(tile) {
    return this.localize(tile);
  }

  // Get random walkable tile
  getRandomWalkableTile() {
    if (!this.walkableTiles || this.walkableTiles.length === 0) {
      this.refreshWalkableTiles();
    }

    if (!this.walkableTiles || this.walkableTiles.length === 0) {
      return null;
    }

    let index = Math.floor(Math.random() * this.walkableTiles.length);
    return this.walkableTiles[index];
  }

  // Tests if node at row, col is walkable
  isWalkable(row, col) {
    if (!this.isInGrid(row, col)) return false;
    return this.grid[row][col].isWalkable();
  }

  // Convenience query for systems that already have row/col integers.
  isWalkableTile(row, col) {
    return this.isWalkable(row, col);
  }

  // Returns a position pushed away from blocked edges
  // Works with wall-based maze data
  handleCollisions(entity) {
    let pos = entity.position.clone();
    let radius = Math.max(entity.scale.x, entity.scale.z) / 2;

    let tile = this.quantize(pos);
    let center = this.localize(tile);
    let half = this.tileSize / 2;

    // North wall
    if (tile.walls.north) {
      let northZ = center.z - half;
      if (pos.z - radius < northZ) {
        pos.z = northZ + radius;
      }
    }

    // South wall
    if (tile.walls.south) {
      let southZ = center.z + half;
      if (pos.z + radius > southZ) {
        pos.z = southZ - radius;
      }
    }

    // West wall
    if (tile.walls.west) {
      let westX = center.x - half;
      if (pos.x - radius < westX) {
        pos.x = westX + radius;
      }
    }

    // East wall
    if (tile.walls.east) {
      let eastX = center.x + half;
      if (pos.x + radius > eastX) {
        pos.x = eastX - radius;
      }
    }

    return pos;
  }
}