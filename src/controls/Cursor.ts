import type EventEmitter from "@anephenix/event-emitter";
import type Camera from "../Camera";
import type GameMap from "../GameMap";

type Tile = [row: number, col: number];

class Cursor {
  x: number;
  y: number;
  target?: HTMLCanvasElement | null;
  gameMap?: GameMap | null;
  camera?: Camera | null;
  eventEmitter: InstanceType<typeof EventEmitter>;

  // NEW: painting state
  private isPainting = false;
  private strokeTiles: Tile[] = [];
  private strokeSeen = new Set<string>(); // dedupe
  private lastTile: Tile | null = null;

  constructor({
    target,
    eventEmitter,
  }: {
    target?: HTMLCanvasElement | null;
    eventEmitter: InstanceType<typeof EventEmitter>;
  }) {
    this.x = 0;
    this.y = 0;
    if (target) this.target = target;
    this.eventEmitter = eventEmitter;

    this.onMouseMove = this.onMouseMove.bind(this);
    this.onClick = this.onClick.bind(this);

    // NEW handlers
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onMouseLeave = this.onMouseLeave.bind(this);

    this.calculatePositionOnMap = this.calculatePositionOnMap.bind(this);
  }

  hasChanged(previous: number[] | null | undefined, next: number[] | null | undefined) {
    if (!previous || !next) return true;
    return previous[0] !== next[0] || previous[1] !== next[1];
  }

  // ---------- Painting helpers ----------

  private tileKey([r, c]: Tile) {
    return `${r}:${c}`;
  }

  // Supercover Bresenham so we cover every tile touched by the line
  private rasterizeLine(a: Tile, b: Tile): Tile[] {
    let [r0, c0] = a;
    const [r1, c1] = b;

    const dr = Math.abs(r1 - r0);
    const dc = Math.abs(c1 - c0);
    const sr = r0 < r1 ? 1 : -1;
    const sc = c0 < c1 ? 1 : -1;

    let err = dr - dc;
    const out: Tile[] = [];

    while (true) {
      out.push([r0, c0]);
      if (r0 === r1 && c0 === c1) break;

      const e2 = 2 * err;
      if (e2 > -dc) {
        err -= dc;
        r0 += sr;
      }
      if (e2 < dr) {
        err += dr;
        c0 += sc;
      }
    }
    return out;
  }

  private addTilesToStroke(tiles: Tile[]) {
    for (const t of tiles) {
      const k = this.tileKey(t);
      if (!this.strokeSeen.has(k)) {
        this.strokeSeen.add(k);
        this.strokeTiles.push(t);
        // Emit incremental updates if you want live preview
        this.eventEmitter.emit("tiles:paint:delta", t);
      }
    }
  }

  private startStrokeAt(tile: Tile) {
    this.isPainting = true;
    this.strokeTiles = [];
    this.strokeSeen.clear();
    this.lastTile = tile;

    this.addTilesToStroke([tile]);
    this.eventEmitter.emit("tiles:paint:start", tile);
  }

  private extendStrokeTo(tile: Tile) {
    if (!this.isPainting || !this.lastTile) return;
    if (tile[0] === this.lastTile[0] && tile[1] === this.lastTile[1]) return;

    const segment = this.rasterizeLine(this.lastTile, tile);
    this.addTilesToStroke(segment);
    this.lastTile = tile;
  }

  private endStroke() {
    if (!this.isPainting) return;
    this.isPainting = false;
    this.eventEmitter.emit("tiles:paint:end", this.strokeTiles.slice());
    // You can also emit a single “apply” event if you prefer:
    this.eventEmitter.emit("tiles:apply", this.strokeTiles.slice());
  }

  // ---------- Mouse events ----------

  private onMouseDown(event: MouseEvent) {
    if (!this.target) return;

    // Only hijack when SHIFT is held and left button is down
    if (!(event.button === 0 && event.shiftKey)) return;

    // Prevent the Mouse class from starting a pan
    event.preventDefault();
    event.stopPropagation();

    const rect = this.target.getBoundingClientRect();
    this.x = event.clientX - rect.left;
    this.y = event.clientY - rect.top;

    const tile = this.pixelToTile(this.x, this.y);
    if (tile) {
      this.startStrokeAt(tile);
      this.gameMap?.draw(); // optional live redraw
    }
  }

  private onMouseUp(event: MouseEvent) {
    if (!this.isPainting) return;
    event.preventDefault();
    event.stopPropagation();
    this.endStroke();
    for (const t of this.strokeTiles) {
      // This is used to apply the tiles onto the map
      // I think these things are needed:
      // 1 - To be able to do this without needing to hold down the shift key
      // 2 - To be able to apply a live preview
      // 3 - To refine the line so small deviations of the cursor along the line don't end up painting irrelevant tiles
      // 4 - I'd like to think about potentially drawing in multiple layers to help avoid unnecessary repaints
      // 5 - I'd also like to potentially find a way to avoid repaint on panning/zooming - see if it is possible
      // 6 - I'd also like to explore adding items that are more than 1 grid item in width/height/length
      // 7 - I'd also like to add new/load/save options for the maps - can use localStorage for loading/saving maps
      this.eventEmitter.emit("click", t);
    }
    this.gameMap?.draw(); // final redraw
  }

  private onMouseLeave() {
    if (this.isPainting) this.endStroke();
  }

  onMouseMove(event: MouseEvent) {
    if (!this.target) return;

    const rect = this.target.getBoundingClientRect();
    this.x = event.clientX - rect.left;
    this.y = event.clientY - rect.top;

    // If painting, extend the stroke along the tiles under the cursor
    if (this.isPainting) {
      const tile = this.pixelToTile(this.x, this.y);
      if (tile) {
        this.extendStrokeTo(tile);
        this.gameMap?.draw(); // optional live preview
      }
      return; // don't update hover highlight while painting
    }

    // Normal hover highlight behaviour
    const currentSelectedTile = this.gameMap?.selectedTile;
    this.calculatePositionOnMap();
    if (this.hasChanged(currentSelectedTile, this.gameMap?.selectedTile)) {
      this.gameMap?.draw();
    }
  }

  onClick(event: MouseEvent) {
    if (!this.target) return;
    // Ignore click if it came from a paint stroke end (mouse up)
    if (this.isPainting) return;

    const rect = this.target.getBoundingClientRect();
    this.x = event.clientX - rect.left;
    this.y = event.clientY - rect.top;

    const currentSelectedTile = this.gameMap?.selectedTile;
    this.calculatePositionOnMap();
    this.eventEmitter.emit("click", this.gameMap?.selectedTile);
    if (this.hasChanged(currentSelectedTile, this.gameMap?.selectedTile)) {
      this.gameMap?.draw();
    }
  }

  // ---------- Pixel → tile ----------

  private pixelToTile(px: number, py: number): Tile | null {
    if (!this.camera || !this.gameMap || !this.target) return null;

    const { zoomLevel, panX, panY } = this.camera;
    const rows = this.gameMap.rows;
    const cols = this.gameMap.columns;

    const TW = this.gameMap.imageAssetSet.baseTileWidth * zoomLevel;
    const TH = this.gameMap.imageAssetSet.baseTileHeight * zoomLevel;
    const HW = TW / 2;
    const HH = TH / 2;

    const MAP_H = (rows + cols) * HH;

    // Map-space
    const mx = px - panX;
    const my = py - panY;

    const ORIGIN_X = this.target.width / 2;
    const ORIGIN_Y = (this.target.height - MAP_H) / 2;

    const dx = mx - ORIGIN_X;
    const dy = my - ORIGIN_Y;

    const u = (dx / HW + dy / HH) / 2;
    const v = (dy / HH - dx / HW) / 2;

    let col = Math.floor(u);
    let row = Math.floor(v);

    const fu = u - (col + 0.5);
    const fv = v - (row + 0.5);

    if (Math.abs(fu) + Math.abs(fv) > 0.5) {
      if (fu > 0 && fv > 0) { col += 1; row += 1; }
      else if (fu > 0 && fv <= 0) { col += 1; }
      else if (fu <= 0 && fv > 0) { row += 1; }
    }

    if (row < 0 || col < 0 || row >= rows || col >= cols) return null;
    return [row, col];
  }

  calculatePositionOnMap() {
    if (!this.target) return null;
    const tile = this.pixelToTile(this.x, this.y);
    if (!tile || !this.gameMap) return null;
    this.gameMap.selectedTile = tile;
    return { row: tile[0], col: tile[1] };
  }

  attach({ target, camera, gameMap }: { target: HTMLCanvasElement; camera: Camera; gameMap: GameMap }) {
    this.target = target;
    this.camera = camera;
    this.gameMap = gameMap;
    this.target.addEventListener("mousemove", this.onMouseMove);
    this.target.addEventListener("click", this.onClick);

    // NEW: painting events (captured before Mouse pan)
    this.target.addEventListener("mousedown", this.onMouseDown, true);
    this.target.addEventListener("mouseup", this.onMouseUp, true);
    this.target.addEventListener("mouseleave", this.onMouseLeave, true);
  }

  detach() {
    this.target?.removeEventListener("mousemove", this.onMouseMove);
    this.target?.removeEventListener("click", this.onClick);
    this.target?.removeEventListener("mousedown", this.onMouseDown, true);
    this.target?.removeEventListener("mouseup", this.onMouseUp, true);
    this.target?.removeEventListener("mouseleave", this.onMouseLeave, true);
  }
}

export default Cursor;