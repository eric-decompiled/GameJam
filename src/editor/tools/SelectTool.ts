import { Tool } from './Tool';
import { EditorState } from '../EditorState';
import { Grid } from '../Grid';
import { EditorCanvas } from '../EditorCanvas';

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | null;

export class SelectTool implements Tool {
    private state: EditorState;
    private grid: Grid;
    private canvas: EditorCanvas;

    private isDragging: boolean = false;
    private isResizing: boolean = false;
    private isDrawing: boolean = false;
    private resizeHandle: ResizeHandle = null;

    private dragStartX: number = 0;
    private dragStartY: number = 0;
    private currentX: number = 0;
    private currentY: number = 0;
    private originalX: number = 0;
    private originalY: number = 0;
    private originalWidth: number = 0;
    private originalHeight: number = 0;

    constructor(state: EditorState, grid: Grid, canvas: EditorCanvas) {
        this.state = state;
        this.grid = grid;
        this.canvas = canvas;
    }

    onMouseDown(worldX: number, worldY: number, e: MouseEvent): void {
        const selection = this.state.getSelection();

        if (selection.type === 'platform' && selection.index !== null) {
            const handle = this.getResizeHandle(worldX, worldY);
            if (handle) {
                this.isResizing = true;
                this.resizeHandle = handle;
                const platform = this.state.getSelectedPlatform()!;
                this.originalX = platform.x;
                this.originalY = platform.y;
                this.originalWidth = platform.width;
                this.originalHeight = platform.height;
                this.dragStartX = worldX;
                this.dragStartY = worldY;
                return;
            }
        }

        const movingPlatformIndex = this.state.getMovingPlatformAt(worldX, worldY);
        if (movingPlatformIndex !== null) {
            this.state.selectMovingPlatform(movingPlatformIndex);
            return;
        }

        const platformIndex = this.state.getPlatformAt(worldX, worldY);
        if (platformIndex !== null) {
            this.state.selectPlatform(platformIndex);
            this.isDragging = true;
            const platform = this.state.getSelectedPlatform()!;
            this.dragStartX = worldX;
            this.dragStartY = worldY;
            this.originalX = platform.x;
            this.originalY = platform.y;
            return;
        }

        if (this.state.isSpawnAt(worldX, worldY)) {
            this.state.selectSpawn();
            return;
        }

        if (this.state.isVictoryAt(worldX, worldY)) {
            this.state.selectVictory();
            return;
        }

        const monsterIndex = this.state.getMonsterAt(worldX, worldY);
        if (monsterIndex !== null) {
            this.state.selectMonster(monsterIndex);
            return;
        }

        const coinIndex = this.state.getCoinAt(worldX, worldY);
        if (coinIndex !== null) {
            this.state.selectCoin(coinIndex);
            return;
        }

        // Click on empty space - start drawing a new platform
        this.state.clearSelection();
        this.isDrawing = true;
        const snapped = this.grid.snapPoint(worldX, worldY);
        this.dragStartX = snapped.x;
        this.dragStartY = snapped.y;
        this.currentX = snapped.x;
        this.currentY = snapped.y;
    }

    onMouseMove(worldX: number, worldY: number, _e: MouseEvent): void {
        if (this.isDragging) {
            const selection = this.state.getSelection();
            if (selection.type === 'platform' && selection.index !== null) {
                let dx = worldX - this.dragStartX;
                let dy = worldY - this.dragStartY;

                let newX = this.grid.snap(this.originalX + dx);
                let newY = this.grid.snap(this.originalY + dy);

                this.state.updatePlatform(selection.index, { x: newX, y: newY });
            }
        } else if (this.isResizing && this.resizeHandle) {
            this.handleResize(worldX, worldY);
        } else if (this.isDrawing) {
            const snapped = this.grid.snapPoint(worldX, worldY);
            this.currentX = snapped.x;
            this.currentY = snapped.y;
        }
    }

    onMouseUp(_worldX: number, _worldY: number, _e: MouseEvent): void {
        if (this.isDrawing) {
            const rect = this.getDrawRect();
            if (rect.width >= this.grid.getGridSize() && rect.height >= this.grid.getGridSize()) {
                const index = this.state.addPlatform({
                    x: rect.x,
                    y: rect.y,
                    width: rect.width,
                    height: rect.height
                });
                this.state.selectPlatform(index);
            }
        }

        this.isDragging = false;
        this.isResizing = false;
        this.isDrawing = false;
        this.resizeHandle = null;
    }

    private getDrawRect(): { x: number; y: number; width: number; height: number } {
        const x = Math.min(this.dragStartX, this.currentX);
        const y = Math.min(this.dragStartY, this.currentY);
        const width = Math.abs(this.currentX - this.dragStartX);
        const height = Math.abs(this.currentY - this.dragStartY);
        return {
            x,
            y,
            width: Math.max(width, this.grid.getGridSize()),
            height: Math.max(height, this.grid.getGridSize())
        };
    }

    private handleResize(worldX: number, worldY: number): void {
        const selection = this.state.getSelection();
        if (selection.type !== 'platform' || selection.index === null) return;

        let newX = this.originalX;
        let newY = this.originalY;
        let newWidth = this.originalWidth;
        let newHeight = this.originalHeight;

        const dx = worldX - this.dragStartX;
        const dy = worldY - this.dragStartY;

        const minSize = this.grid.getGridSize();

        if (this.resizeHandle?.includes('w')) {
            const proposedX = this.grid.snap(this.originalX + dx);
            const maxX = this.originalX + this.originalWidth - minSize;
            newX = Math.min(proposedX, maxX);
            newWidth = this.originalX + this.originalWidth - newX;
        }
        if (this.resizeHandle?.includes('e')) {
            newWidth = Math.max(minSize, this.grid.snap(this.originalWidth + dx));
        }
        if (this.resizeHandle?.includes('n')) {
            const proposedY = this.grid.snap(this.originalY + dy);
            const maxY = this.originalY + this.originalHeight - minSize;
            newY = Math.min(proposedY, maxY);
            newHeight = this.originalY + this.originalHeight - newY;
        }
        if (this.resizeHandle?.includes('s')) {
            newHeight = Math.max(minSize, this.grid.snap(this.originalHeight + dy));
        }

        this.state.updatePlatform(selection.index, {
            x: newX,
            y: newY,
            width: newWidth,
            height: newHeight
        });
    }

    private getResizeHandle(worldX: number, worldY: number): ResizeHandle {
        const platform = this.state.getSelectedPlatform();
        if (!platform) return null;

        const handleSize = 12 / this.canvas.getZoom();
        const x = platform.x;
        const y = platform.y;
        const w = platform.width;
        const h = platform.height;

        const handles: { handle: ResizeHandle; cx: number; cy: number }[] = [
            { handle: 'nw', cx: x, cy: y },
            { handle: 'n', cx: x + w / 2, cy: y },
            { handle: 'ne', cx: x + w, cy: y },
            { handle: 'e', cx: x + w, cy: y + h / 2 },
            { handle: 'se', cx: x + w, cy: y + h },
            { handle: 's', cx: x + w / 2, cy: y + h },
            { handle: 'sw', cx: x, cy: y + h },
            { handle: 'w', cx: x, cy: y + h / 2 },
        ];

        for (const { handle, cx, cy } of handles) {
            if (Math.abs(worldX - cx) <= handleSize && Math.abs(worldY - cy) <= handleSize) {
                return handle;
            }
        }

        return null;
    }

    render(ctx: CanvasRenderingContext2D, viewX: number, viewY: number, zoom: number): void {
        if (!this.isDrawing) return;

        const rect = this.getDrawRect();
        const screenX = (rect.x - viewX) * zoom;
        const screenY = (rect.y - viewY) * zoom;
        const screenW = rect.width * zoom;
        const screenH = rect.height * zoom;

        ctx.fillStyle = 'rgba(74, 106, 142, 0.5)';
        ctx.fillRect(screenX, screenY, screenW, screenH);

        ctx.strokeStyle = '#9abaee';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(screenX, screenY, screenW, screenH);
        ctx.setLineDash([]);
    }

    getCursor(): string {
        if (this.isResizing || this.resizeHandle) {
            switch (this.resizeHandle) {
                case 'nw':
                case 'se':
                    return 'nwse-resize';
                case 'ne':
                case 'sw':
                    return 'nesw-resize';
                case 'n':
                case 's':
                    return 'ns-resize';
                case 'e':
                case 'w':
                    return 'ew-resize';
            }
        }
        return 'default';
    }
}
