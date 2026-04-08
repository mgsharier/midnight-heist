import * as THREE from 'three';
import { Tile } from '../maps/Tile.js';

// Tile map renderer
export class TileMapRenderer {

  // Constructor takes in a tile map
  constructor(tileMap) {
    this.map = tileMap;
    this.isMazeMap = this.map.generationMode === "maze";

    let geometry = new THREE.BoxGeometry();
    let material = new THREE.MeshStandardMaterial();

    // Creates an instanced mesh for floor tiles
    this.mesh = new THREE.InstancedMesh(
      geometry,
      material,
      this.map.rows * this.map.cols
    );

    // Count wall segments.
    // In maze mode we only render one copy of each shared wall
    // (north/west per tile + outer south/east border) for readability.
    this.wallCount = 0;
    for (let r = 0; r < this.map.rows; r++) {
      for (let c = 0; c < this.map.cols; c++) {
        this.wallCount += this.getRenderableWalls(this.map.grid[r][c]).length;
      }
    }

    this.wallGeometry = new THREE.BoxGeometry();
    this.wallMaterial = new THREE.MeshStandardMaterial({ color: '#2f2f2f' });
    this.wallMesh = new THREE.InstancedMesh(
      this.wallGeometry,
      this.wallMaterial,
      this.wallCount
    );

    this.wallIndex = 0;

    for (let r = 0; r < this.map.rows; r++) {
      for (let c = 0; c < this.map.cols; c++) {
        let tile = this.map.grid[r][c];
        this.createTile(tile);
        this.createWalls(tile);
      }
    }

    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
    }
    this.wallMesh.instanceMatrix.needsUpdate = true;
  }

  // Create the tile by setting the instanced mesh
  // at the tile index to the tile transformation
  // and the desired tile colour
  createTile(tile) {
    let index = tile.row * this.map.cols + tile.col;
    this.mesh.setMatrixAt(index, this.getTileTransformation(tile));
    this.mesh.setColorAt(index, this.getTileColor(tile));
  }

  createWalls(tile) {
    const pos = this.map.localize(tile);
    const size = this.map.tileSize;
    const wallHeight = 3;
    const thickness = 0.15;

    let matrix = new THREE.Matrix4();

    for (const wall of this.getRenderableWalls(tile)) {
      // North / South walls run along X axis
      if (wall === "north") {
        matrix.makeScale(size, wallHeight, thickness);
        matrix.setPosition(pos.x, wallHeight / 2, pos.z - size / 2);
        this.wallMesh.setMatrixAt(this.wallIndex++, matrix);
      } else if (wall === "south") {
        matrix.makeScale(size, wallHeight, thickness);
        matrix.setPosition(pos.x, wallHeight / 2, pos.z + size / 2);
        this.wallMesh.setMatrixAt(this.wallIndex++, matrix);
      }
      // East / West walls run along Z axis
      else if (wall === "west") {
        matrix.makeScale(thickness, wallHeight, size);
        matrix.setPosition(pos.x - size / 2, wallHeight / 2, pos.z);
        this.wallMesh.setMatrixAt(this.wallIndex++, matrix);
      } else if (wall === "east") {
        matrix.makeScale(thickness, wallHeight, size);
        matrix.setPosition(pos.x + size / 2, wallHeight / 2, pos.z);
        this.wallMesh.setMatrixAt(this.wallIndex++, matrix);
      }
    }
  }

  // Returns which walls to draw for this tile.
  // Maze mode avoids rendering duplicate shared walls.
  getRenderableWalls(tile) {
    if (!this.isMazeMap) {
      const walls = [];
      if (tile.walls.north) walls.push("north");
      if (tile.walls.south) walls.push("south");
      if (tile.walls.west) walls.push("west");
      if (tile.walls.east) walls.push("east");
      return walls;
    }

    const walls = [];

    // Always render north/west when present.
    if (tile.walls.north) walls.push("north");
    if (tile.walls.west) walls.push("west");

    // Render outer border walls once.
    if (tile.row === this.map.rows - 1 && tile.walls.south) walls.push("south");
    if (tile.col === this.map.cols - 1 && tile.walls.east) walls.push("east");

    return walls;
  }

  // Get a tile colour
  getTileColor(tile) {
    if (this.isMazeMap && tile.isWalkable()) {
      // Simple contrast pattern makes paths easier to read while testing.
      const even = (tile.row + tile.col) % 2 === 0;
      return new THREE.Color(even ? "#dcdcdc" : "#cfcfcf");
    }

    switch (tile.type) {
      case Tile.Type.EasyTerrain: return new THREE.Color('#d8d8d8');
      case Tile.Type.MediumTerrain: return new THREE.Color('#90ec6b');
      case Tile.Type.DifficultTerrain: return new THREE.Color('#75ccff');
      case Tile.Type.Obstacle: return new THREE.Color('#3d3d3d');
      default: return new THREE.Color('black');
    }
  }

  // Get the tile transformation matrix
  getTileTransformation(tile) {
    const isWalkable = tile.isWalkable();
    let height = tile.type === Tile.Type.Obstacle ? 2 : 0.2;

    // In maze mode, keep walkable floor very flat and obstacles visibly raised.
    if (this.isMazeMap) {
      height = isWalkable ? 0.12 : 1.2;
    }

    let pos = this.map.localize(tile);
    pos.y = height / 2;

    let matrix = new THREE.Matrix4();
    matrix.makeScale(this.map.tileSize, height, this.map.tileSize);
    matrix.setPosition(pos);
    return matrix;
  }

  // Set the tile colour
  setTileColor(tile, color) {
    let index = tile.row * this.map.cols + tile.col;
    this.mesh.setColorAt(index, color);
    if (this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
    }
  }

  // Render to our scene
  render(scene) {
    scene.add(this.mesh);
    scene.add(this.wallMesh);
  }
}