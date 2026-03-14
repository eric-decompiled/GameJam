import { Tool } from './Tool';
import { EditorState } from '../EditorState';
import { Grid } from '../Grid';

export class MovingPlatformTool implements Tool {
    private state: EditorState;
    private grid: Grid;

    private isDrawing: boolean = false;
    private startX: number = 0;
    private startY: number = 0;
    private currentX: number = 0;
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
        this.currentX = snapped.x;
        this.currentY = snapped.y;
    }

    onMouseMove(worldX: number, worldY: number, _e: MouseEvent): void {
        if (!this.isDrawing) return;

        const snapped = this.grid.snapPoint(worldX, worldY);
        this.currentX = snapped.x;
        this.currentY = snapped.y;
    }

    onMouseUp(_worldX: number, _worldY: number, _e: MouseEvent): void {
        if (!this.isDrawing) return;

        const rect = this.getRect();
        if (rect.width >= this.grid.getGridSize() && rect.height >= this.grid.getGridSize()) {
            // Create moving platform with start position same as drawn position
            // End position 200px to the right by default
            const index = this.state.addMovingPlatform({
                width: rect.width,
                height: rect.height,
                speed: 60,
                path: [
                    { x: rect.x, y: rect.y },
                    { x: rect.x + 200, y: rect.y }
                ]
            });
            this.state.selectMovingPlatform(index);
        }

        this.isDrawing = false;
    }

    private getRect(): { x: number; y: number; width: number; height: number } {
        const x = Math.min(this.startX, this.currentX);
        const y = Math.min(this.startY, this.currentY);
        const width = Math.abs(this.currentX - this.startX);
        const height = Math.abs(this.currentY - this.startY);
        return {
            x,
            y,
            width: Math.max(width, this.grid.getGridSize()),
            height: Math.max(height, this.grid.getGridSize())
        };
    }

    render(ctx: CanvasRenderingContext2D, viewX: number, viewY: number, zoom: number): void {
        if (!this.isDrawing) return;

        const rect = this.getRect();
        const screenX = (rect.x - viewX) * zoom;
        const screenY = (rect.y - viewY) * zoom;
        const screenW = rect.width * zoom;
        const screenH = rect.height * zoom;

        ctx.fillStyle = 'rgba(122, 107, 84, 0.5)';
        ctx.fillRect(screenX, screenY, screenW, screenH);

        ctx.strokeStyle = '#aa9b7e';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(screenX, screenY, screenW, screenH);
        ctx.setLineDash([]);
    }

    getCursor(): string {
        return 'crosshair';
    }
}
