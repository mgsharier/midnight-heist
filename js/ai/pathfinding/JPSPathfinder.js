import { Pathfinder } from "./Pathfinder.js";
import { MinHeap } from "./util/MinHeap.js";

/**
 * Jump Point Search (4-direction, in-class style).
 * Works on wall-carved mazes: expansion uses the same graph as TileMap.getNeighbours /
 * getStepNeighbour (open passages only, not raw isWalkable).
 *
 * API matches project Pathfinder: findPath(start, end, map) -> Tile[]
 */
export class JPSPathfinder extends Pathfinder {
  constructor() {
    super();
  }

  /** Manhattan distance in world units (matches typical A* heuristic scaling). */
  static manhattan(start, end, tileSize) {
    const dRow = Math.abs(start.row - end.row);
    const dCol = Math.abs(start.col - end.col);
    return (dRow + dCol) * tileSize;
  }

  findPath(start, goal, map) {
    if (!start || !goal || !map) {
      return [];
    }

    if (start === goal) {
      return [start];
    }

    const tileSize = map.tileSize ?? 1;
    const heuristic = (a, b) => JPSPathfinder.manhattan(a, b, tileSize);

    const open = new MinHeap();
    const gScore = new Map();
    const parents = new Map();

    gScore.set(start, 0);
    parents.set(start, null);

    open.enqueue(start, heuristic(start, goal));

    while (!open.isEmpty()) {
      const current = open.dequeue();

      if (current === goal) {
        return this.tracePath(parents, start, goal);
      }

      const successors = this.identifySuccessors(current, goal, parents, map);

      for (const neighbour of successors) {
        const stepCells =
          Math.abs(current.row - neighbour.row) + Math.abs(current.col - neighbour.col);
        const moveCost = stepCells * tileSize;
        const tentativeG = gScore.get(current) + moveCost;

        if (!gScore.has(neighbour) || tentativeG < gScore.get(neighbour)) {
          gScore.set(neighbour, tentativeG);
          parents.set(neighbour, current);
          const f = tentativeG + heuristic(neighbour, goal);
          open.enqueue(neighbour, f);
        }
      }
    }

    return [];
  }

  /**
   * JPS successor set: jump points reachable by repeated steps in each pruned direction.
   */
  identifySuccessors(node, goal, parents, map) {
    const successors = [];
    const parent = parents.get(node);
    const directions = this.pruneDirections(node, parent);

    for (const dir of directions) {
      const jp = this.jump(node, dir[0], dir[1], goal, map);
      if (jp) {
        successors.push(jp);
      }
    }

    return successors;
  }

  pruneDirections(node, parent) {
    if (!parent) {
      return [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ];
    }

    const dr = Math.sign(node.row - parent.row);
    const dc = Math.sign(node.col - parent.col);

    if (dc !== 0) {
      return [
        [0, dc],
        [-1, 0],
        [1, 0],
      ];
    }

    return [
      [dr, 0],
      [0, -1],
      [0, 1],
    ];
  }

  /**
   * Recursively step in (dr, dc) until blocked, goal, or a jump point.
   * Forced-neighbour checks use wall-aware steps (getStepNeighbour), not isWalkable alone.
   */
  jump(node, dr, dc, goal, map) {
    const next = map.getStepNeighbour(node, dr, dc);

    if (!next) {
      return null;
    }

    if (next === goal) {
      return next;
    }

    // Horizontal motion (east/west)
    if (dc !== 0) {
      const north = map.getStepNeighbour(next, -1, 0);
      const south = map.getStepNeighbour(next, 1, 0);

      // "Outside corner": can turn perpendicular but cannot continue straight from that side cell
      if (
        (north && !map.getStepNeighbour(north, 0, -dc)) ||
        (south && !map.getStepNeighbour(south, 0, -dc))
      ) {
        return next;
      }
    } else if (dr !== 0) {
      // Vertical motion (north/south)
      const west = map.getStepNeighbour(next, 0, -1);
      const east = map.getStepNeighbour(next, 0, 1);

      if (
        (west && !map.getStepNeighbour(west, -dr, 0)) ||
        (east && !map.getStepNeighbour(east, -dr, 0))
      ) {
        return next;
      }

      // Vertical corridor: allow discovering forced jumps along perpendicular corridors (in-class pattern)
      if (this.jump(next, 0, -1, goal, map) || this.jump(next, 0, 1, goal, map)) {
        return next;
      }
    }

    return this.jump(next, dr, dc, goal, map);
  }
}

/** Alias for course docs that refer to the planner as "JPS". */
export { JPSPathfinder as JPS };
