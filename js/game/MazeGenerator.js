/**
 * DFS maze generator for tile maps.
 * Uses the in-class wall carving style.
 *
 * Developer note
 * This adapts the class version slightly to fit the current project structure.
 * Instead of returning a separate type grid, it carves walls directly on TileMap tiles.
 */
export class MazeGenerator {
  generate(map) {
    MazeGenerator.generate(map);
  }

  static generate(map) {
    MazeGenerator.resetWalls(map);

    const visited = new Set();
    const start = map.getRandomWalkableTile();

    if (!start) {
      return;
    }

    MazeGenerator.carve(start, visited, map);
  }

  static resetWalls(map) {
    for (let r = 0; r < map.rows; r++) {
      for (let c = 0; c < map.cols; c++) {
        const tile = map.grid[r][c];

        tile.walls = {
          north: true,
          south: true,
          east: true,
          west: true,
        };
      }
    }
  }

  static carve(tile, visited, map) {
    const id = tile.row * map.cols + tile.col;
    visited.add(id);

    const adjacentTiles = map.getAdjacentTiles(tile);
    MazeGenerator.shuffle(adjacentTiles);

    for (const neighbour of adjacentTiles) {
      const neighbourId = neighbour.row * map.cols + neighbour.col;

      if (!visited.has(neighbourId)) {
        const dr = neighbour.row - tile.row;
        const dc = neighbour.col - tile.col;

        // South
        if (dr === 1) {
          tile.walls.south = false;
          neighbour.walls.north = false;
        }
        // North
        else if (dr === -1) {
          tile.walls.north = false;
          neighbour.walls.south = false;
        }
        // East
        else if (dc === 1) {
          tile.walls.east = false;
          neighbour.walls.west = false;
        }
        // West
        else if (dc === -1) {
          tile.walls.west = false;
          neighbour.walls.east = false;
        }

        MazeGenerator.carve(neighbour, visited, map);
      }
    }
  }

  static shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = array[j];
      array[j] = array[i];
      array[i] = temp;
    }
  }
}