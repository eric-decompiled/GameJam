import { Tool } from './Tool';
import { EditorState } from '../EditorState';
import { Grid } from '../Grid';

export class SpawnTool implements Tool {
    private state: EditorState;
    private grid: Grid;
    private previewX: number | null = null;
    private previewY: number | null = null;

    constructor(state: EditorState, grid: Grid) {
        this.state = state;
        this.grid = grid;
    }

    onMouseDown(worldX: number, worldY: number, _e: MouseEvent): void {
        const snapped = this.grid.snapPoint(worldX, worldY);
        this.state.setSpawn(snapped.x, snapped.y);
        this.state.selectSpawn();
    }

    onMouseMove(worldX: number, worldY: number, _e: MouseEvent): void {
        const snapped = this.grid.snapPoint(worldX, worldY);
        this.previewX = snapped.x;
        this.previewY = snapped.y;
    }

    onMouseUp(_worldX: number, _worldY: number, _e: MouseEvent): void {
    }

    render(ctx: CanvasRenderingContext2D, viewX: number, viewY: number, zoom: number): void {
        if (this.previewX === null || this.previewY === null) return;

        const screenX = (this.previewX - viewX) * zoom;
        const screenY = (this.previewY - viewY) * zoom;
        const size = 32 * zoom;

        ctx.fillStyle = 'rgba(42, 158, 42, 0.5)';
        ctx.beginPath();
        ctx.moveTo(screenX, screenY);
        ctx.lineTo(screenX - size / 2, screenY - size);
        ctx.lineTo(screenX + size / 2, screenY - size);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#8aff8a';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    getCursor(): string {
        return 'crosshair';
    }
}
