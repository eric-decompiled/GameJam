import { Tool } from './Tool';
import { EditorState } from '../EditorState';
import { Grid } from '../Grid';

export class LadderTool implements Tool {
    private state: EditorState;
    private grid: Grid;

    private isDrawing: boolean = false;
    private startX: number = 0;
    private startY: number = 0;
    private currentY: number = 0;

    constructor(state: EditorState, grid: Grid) {
        this.state = state;
        this.grid = grid;
    }

    onMouseDown(worldX: number, worldY: number, _e: MouseEvent): void {
        this.isDrawing = true;
        const snapped = this.grid.snapPoint(worldX, worldY);
        this.startX = snapped.x;
        this.startY = snapped.y;
        this.currentY = snapped.y;
    }

    onMouseMove(worldX: number, worldY: number, _e: MouseEvent): void {
        if (!this.isDrawing) return;
        const snapped = this.grid.snapPoint(worldX, worldY);
        this.currentY = snapped.y;
    }

    onMouseUp(_worldX: number, _worldY: number, _e: MouseEvent): void {
        if (!this.isDrawing) return;

        const y = Math.min(this.startY, this.currentY);
        const height = Math.abs(this.currentY - this.startY);

        if (height >= this.grid.getGridSize()) {
            const index = this.state.addLadder({
                x: this.startX,
                y: y,
                height: height
            });
            this.state.selectLadder(index);
        }

        this.isDrawing = false;
    }

    render(ctx: CanvasRenderingContext2D, viewX: number, viewY: number, zoom: number): void {
        if (!this.isDrawing) return;

        const ladderWidth = 32;
        const y = Math.min(this.startY, this.currentY);
        const height = Math.abs(this.currentY - this.startY);

        const screenX = (this.startX - viewX) * zoom;
        const screenY = (y - viewY) * zoom;
        const screenW = ladderWidth * zoom;
        const screenH = height * zoom;

        ctx.fillStyle = 'rgba(139, 90, 43, 0.5)';
        ctx.fillRect(screenX, screenY, screenW, screenH);

        ctx.strokeStyle = '#8b5a2b';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(screenX, screenY, screenW, screenH);
        ctx.setLineDash([]);

        // Draw rungs preview
        const rungSpacing = 32 * zoom;
        ctx.strokeStyle = '#a06030';
        ctx.lineWidth = 3;
        for (let ry = screenY + rungSpacing; ry < screenY + screenH; ry += rungSpacing) {
            ctx.beginPath();
            ctx.moveTo(screenX, ry);
            ctx.lineTo(screenX + screenW, ry);
            ctx.stroke();
        }
    }

    getCursor(): string {
        return 'crosshair';
    }
}
