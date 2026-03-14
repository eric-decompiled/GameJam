import { Tool } from './Tool';
import { EditorState } from '../EditorState';
import { Grid } from '../Grid';

export class MonsterTool implements Tool {
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
        const index = this.state.addMonster({ x: snapped.x, y: snapped.y });
        this.state.selectMonster(index);
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
        const size = 40 * zoom;

        // Draw monster preview (red rectangle with eyes)
        ctx.fillStyle = 'rgba(200, 50, 50, 0.5)';
        ctx.fillRect(screenX - size / 2, screenY - size, size, size);

        // Eyes
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        const eyeSize = 8 * zoom;
        ctx.fillRect(screenX - size / 4 - eyeSize / 2, screenY - size * 0.7, eyeSize, eyeSize);
        ctx.fillRect(screenX + size / 4 - eyeSize / 2, screenY - size * 0.7, eyeSize, eyeSize);

        ctx.strokeStyle = '#ff8a8a';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(screenX - size / 2, screenY - size, size, size);
        ctx.setLineDash([]);
    }

    getCursor(): string {
        return 'crosshair';
    }
}
