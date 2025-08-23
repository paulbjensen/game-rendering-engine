import type Camera from "../Camera";
import type GameMap from "../GameMap";

class Cursor {

    x: number;
    y: number;
    target?: HTMLCanvasElement | null;
    gameMap?: GameMap | null;
    camera? : Camera | null;

    constructor ({target}: {target?: HTMLCanvasElement | null}) {
        this.x = 0;
        this.y = 0;
        if (target) this.target = target;
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onClick = this.onClick.bind(this);
        this.calculatePositionOnMap = this.calculatePositionOnMap.bind(this);
    }

    hasChanged(previous: number[] | null | undefined, next: number[] | null | undefined) {
        if (!previous) return true;
        if (!next) return true;
        if (previous[0] !== next[0]) return true;
        if (previous[1] !== next[1]) return true;
        return false;
    }

    onMouseMove(event: MouseEvent) {
        if (!this.target) return;
        const rect = this.target.getBoundingClientRect();
        this.x = event.clientX - rect.left;
        this.y = event.clientY - rect.top;
        const currentSelectedTile = this.gameMap?.selectedTile;
        this.calculatePositionOnMap();
        // Redraw if changed
        if (this.hasChanged(currentSelectedTile, this.gameMap?.selectedTile)) {
            this.gameMap?.draw();
        }
    }

    onClick(event: MouseEvent) {
        if (!this.target) return;
        const rect = this.target.getBoundingClientRect();
        this.x = event.clientX - rect.left;
        this.y = event.clientY - rect.top;
        this.calculatePositionOnMap();
        this.gameMap?.draw();
    }

    calculatePositionOnMap() {
        if (!this.camera || !this.gameMap || !this.target) return null;

        const { zoomLevel, panX, panY } = this.camera;
        const rows = this.gameMap.rows;
        const cols = this.gameMap.columns;

        const TW = this.gameMap.imageAssetSet.baseTileWidth  * zoomLevel;
        const TH = this.gameMap.imageAssetSet.baseTileHeight * zoomLevel;
        const HW = TW / 2;
        const HH = TH / 2;

        // Total rhombus size for centering
        const MAP_W = (rows + cols) * HW;
        const MAP_H = (rows + cols) * HH;

        // Mouse in map space: subtract camera pan
        const mx = this.x - panX;
        const my = this.y - panY;

        // Top vertex of tile (0,0); adjust if your map isn’t centered
        const ORIGIN_X = this.target.width  / 2;
        const ORIGIN_Y = (this.target.height - MAP_H) / 2;

        const dx = mx - ORIGIN_X;
        const dy = my - ORIGIN_Y;

        // Skewed coordinates
        const u = (dx / HW + dy / HH) / 2;
        const v = (dy / HH - dx / HW) / 2;

        // Candidate cell from floors
        let col = Math.floor(u);
        let row = Math.floor(v);

        // Fractional offset from the center of the candidate cell
        const fu = u - (col + 0.5);
        const fv = v - (row + 0.5);

        if (Math.abs(fu) + Math.abs(fv) > 0.5) {
            if (fu > 0 && fv > 0) { col += 1; row += 1; }
            else if (fu > 0 && fv <= 0) { col += 1; }
            else if (fu <= 0 && fv > 0) { row += 1; }
            // else top-left: stay in same (row,col)
        }

        if (row < 0 || col < 0 || row >= rows || col >= cols) return null;
        this.gameMap.selectedTile = [row, col];
        return { row, col };
    }

    attach({target, camera, gameMap}: {target: HTMLCanvasElement, camera: Camera, gameMap: GameMap}) {
        this.target = target;
        this.camera = camera;
        this.gameMap = gameMap;
        this.target.addEventListener("mousemove", this.onMouseMove);
        this.target.addEventListener("click", this.onClick);
    }

    detach() {
        this.target?.removeEventListener("mousemove", this.onMouseMove);
        this.target?.removeEventListener("click", this.onClick);
    }

}

export default Cursor;