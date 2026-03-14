import { Tool } from './Tool';
import { EditorState } from '../EditorState';
import { Grid } from '../Grid';

export class CoinTool implements Tool {
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
        const index = this.state.addCoin({ x: snapped.x, y: snapped.y });
        this.state.selectCoin(index);
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
        const radius = 12 * zoom;

        // Draw coin preview (yellow circle)
        ctx.fillStyle = 'rgba(255, 215, 0, 0.5)';
        ctx.beginPath();
        ctx.arc(screenX, screenY - radius, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffec8a';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    getCursor(): string {
        return 'crosshair';
    }
}
