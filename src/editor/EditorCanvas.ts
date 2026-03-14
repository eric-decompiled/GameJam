import { EditorState } from './EditorState';
import { Grid } from './Grid';
import { Tool } from './tools/Tool';

export class EditorCanvas {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private state: EditorState;
    private grid: Grid;
    private currentTool: Tool | null = null;

    private viewX: number = 0;
    private viewY: number = 0;
    private readonly zoom: number = 0.75; // Fixed moderate zoom

    private isPanning: boolean = false;
    private lastMouseX: number = 0;
    private lastMouseY: number = 0;
    private showJumpArc: boolean = false;

    // Physics constants for jump arc
    private readonly GRAVITY = 1800;
    private readonly JUMP_FORCE = 700;
    private readonly MAX_SPEED = 300;

    constructor(canvas: HTMLCanvasElement, state: EditorState, grid: Grid) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.state = state;
        this.grid = grid;

        this.setupCanvas();
        this.setupEventListeners();

        this.state.on('change', () => this.render());
        this.state.on('selectionChange', () => this.render());

        this.centerView();
    }

    private setupCanvas(): void {
        const resize = () => {
            const container = this.canvas.parentElement!;
            this.canvas.width = container.clientWidth;
            this.canvas.height = container.clientHeight;
            this.render();
        };
        resize();
        window.addEventListener('resize', resize);
    }

    private setupEventListeners(): void {
        this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.canvas.addEventListener('wheel', this.onWheel.bind(this));
        this.canvas.addEventListener('contextmenu', e => e.preventDefault());
    }

    setTool(tool: Tool | null): void {
        this.currentTool = tool;
        this.updateCursor();
    }

    private updateCursor(): void {
        this.canvas.style.cursor = this.currentTool?.getCursor() || 'default';
    }

    screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
        const rect = this.canvas.getBoundingClientRect();
        const x = (screenX - rect.left) / this.zoom + this.viewX;
        const y = (screenY - rect.top) / this.zoom + this.viewY;
        return { x, y };
    }

    worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
        return {
            x: (worldX - this.viewX) * this.zoom,
            y: (worldY - this.viewY) * this.zoom
        };
    }

    private onMouseDown(e: MouseEvent): void {
        if (e.button === 1 || (e.button === 0 && e.altKey)) {
            this.isPanning = true;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
            this.canvas.style.cursor = 'grabbing';
            return;
        }

        if (e.button === 0 && this.currentTool) {
            const world = this.screenToWorld(e.clientX, e.clientY);
            this.currentTool.onMouseDown(world.x, world.y, e);
            this.render();
        }
    }

    private onMouseMove(e: MouseEvent): void {
        if (this.isPanning) {
            const dx = e.clientX - this.lastMouseX;
            const dy = e.clientY - this.lastMouseY;
            this.viewX -= dx / this.zoom;
            this.viewY -= dy / this.zoom;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
            this.render();
            return;
        }

        if (this.currentTool) {
            const world = this.screenToWorld(e.clientX, e.clientY);
            this.currentTool.onMouseMove(world.x, world.y, e);
            this.render();
        }
    }

    private onMouseUp(e: MouseEvent): void {
        if (this.isPanning) {
            this.isPanning = false;
            this.updateCursor();
            return;
        }

        if (this.currentTool) {
            const world = this.screenToWorld(e.clientX, e.clientY);
            this.currentTool.onMouseUp(world.x, world.y, e);
            this.render();
        }
    }

    private onWheel(e: WheelEvent): void {
        e.preventDefault();

        // Scroll wheel pans the view
        const panSpeed = 1 / this.zoom;
        if (e.shiftKey) {
            // Horizontal scroll with shift
            this.viewX += e.deltaY * panSpeed;
        } else {
            this.viewX += e.deltaX * panSpeed;
            this.viewY += e.deltaY * panSpeed;
        }

        this.render();
    }

    private centerView(): void {
        const level = this.state.getLevel();
        this.viewX = -50;
        this.viewY = level.worldHeight - this.canvas.height / this.zoom + 50;
    }

    render(): void {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const level = this.state.getLevel();

        ctx.fillStyle = '#0a0a1e';
        ctx.fillRect(0, 0, width, height);

        this.grid.render(ctx, this.viewX, this.viewY, width, height, this.zoom);

        this.renderWorldBounds(ctx, level.worldWidth, level.worldHeight);

        for (let i = 0; i < level.platforms.length; i++) {
            const p = level.platforms[i];
            const selected = this.state.getSelection().type === 'platform' &&
                           this.state.getSelection().index === i;
            this.renderPlatform(ctx, p.x, p.y, p.width, p.height, selected);
        }

        this.renderSpawn(ctx, level.spawn.x, level.spawn.y);

        if (level.victory) {
            this.renderVictory(ctx, level.victory.x, level.victory.y);
        }

        if (this.showJumpArc) {
            this.renderJumpArcs(ctx);
        }

        if (this.currentTool) {
            this.currentTool.render(ctx, this.viewX, this.viewY, this.zoom);
        }
    }

    private renderWorldBounds(ctx: CanvasRenderingContext2D, worldWidth: number, worldHeight: number): void {
        const topLeft = this.worldToScreen(0, 0);
        const bottomRight = this.worldToScreen(worldWidth, worldHeight);

        ctx.strokeStyle = '#5a5a8a';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 5]);
        ctx.strokeRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
        ctx.setLineDash([]);
    }

    private renderPlatform(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        w: number,
        h: number,
        selected: boolean
    ): void {
        const screen = this.worldToScreen(x, y);
        const screenW = w * this.zoom;
        const screenH = h * this.zoom;

        ctx.fillStyle = selected ? '#6a8abe' : '#4a6a8e';
        ctx.fillRect(screen.x, screen.y, screenW, screenH);

        ctx.strokeStyle = selected ? '#9abaee' : '#5a7a9e';
        ctx.lineWidth = selected ? 2 : 1;
        ctx.strokeRect(screen.x, screen.y, screenW, screenH);

        if (selected) {
            this.renderResizeHandles(ctx, screen.x, screen.y, screenW, screenH);
        }
    }

    private renderResizeHandles(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        w: number,
        h: number
    ): void {
        const handleSize = 8;
        ctx.fillStyle = '#ffffff';

        const handles = [
            { x: x - handleSize / 2, y: y - handleSize / 2 },
            { x: x + w - handleSize / 2, y: y - handleSize / 2 },
            { x: x - handleSize / 2, y: y + h - handleSize / 2 },
            { x: x + w - handleSize / 2, y: y + h - handleSize / 2 },
            { x: x + w / 2 - handleSize / 2, y: y - handleSize / 2 },
            { x: x + w / 2 - handleSize / 2, y: y + h - handleSize / 2 },
            { x: x - handleSize / 2, y: y + h / 2 - handleSize / 2 },
            { x: x + w - handleSize / 2, y: y + h / 2 - handleSize / 2 },
        ];

        for (const handle of handles) {
            ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
        }
    }

    private renderSpawn(ctx: CanvasRenderingContext2D, x: number, y: number): void {
        const screen = this.worldToScreen(x, y);
        const size = 32 * this.zoom;
        const selected = this.state.getSelection().type === 'spawn';

        ctx.fillStyle = selected ? '#4ade4a' : '#2a9e2a';
        ctx.beginPath();
        ctx.moveTo(screen.x, screen.y);
        ctx.lineTo(screen.x - size / 2, screen.y - size);
        ctx.lineTo(screen.x + size / 2, screen.y - size);
        ctx.closePath();
        ctx.fill();

        if (selected) {
            ctx.strokeStyle = '#8aff8a';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        ctx.fillStyle = '#ffffff';
        ctx.font = `${12 * this.zoom}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('SPAWN', screen.x, screen.y - size - 4 * this.zoom);
    }

    private renderVictory(ctx: CanvasRenderingContext2D, x: number, y: number): void {
        const screen = this.worldToScreen(x, y);
        const size = 32 * this.zoom;
        const selected = this.state.getSelection().type === 'victory';

        // Draw star/flag pointing up (inverted from spawn)
        ctx.fillStyle = selected ? '#ffd700' : '#daa520';
        ctx.beginPath();
        ctx.moveTo(screen.x, screen.y - size);
        ctx.lineTo(screen.x - size / 2, screen.y);
        ctx.lineTo(screen.x + size / 2, screen.y);
        ctx.closePath();
        ctx.fill();

        if (selected) {
            ctx.strokeStyle = '#ffec8a';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        ctx.fillStyle = '#ffffff';
        ctx.font = `${12 * this.zoom}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('VICTORY', screen.x, screen.y - size - 4 * this.zoom);
    }

    getZoom(): number {
        return this.zoom;
    }

    setShowJumpArc(show: boolean): void {
        this.showJumpArc = show;
        this.render();
    }

    private renderJumpArcs(ctx: CanvasRenderingContext2D): void {
        const level = this.state.getLevel();

        ctx.strokeStyle = 'rgba(255, 100, 100, 0.6)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);

        for (const platform of level.platforms) {
            // Draw jump arc from left edge
            this.drawJumpArc(ctx, platform.x, platform.y, -1);
            // Draw jump arc from right edge
            this.drawJumpArc(ctx, platform.x + platform.width, platform.y, 1);
        }

        ctx.setLineDash([]);
    }

    private drawJumpArc(
        ctx: CanvasRenderingContext2D,
        startX: number,
        startY: number,
        direction: number
    ): void {
        const vx = this.MAX_SPEED * direction;
        const vy = -this.JUMP_FORCE;

        ctx.beginPath();

        const screen = this.worldToScreen(startX, startY);
        ctx.moveTo(screen.x, screen.y);

        // Draw trajectory until it falls below start height + some margin
        const dt = 0.02;
        const maxTime = 2;

        for (let t = dt; t < maxTime; t += dt) {
            const x = startX + vx * t;
            const y = startY + vy * t + 0.5 * this.GRAVITY * t * t;

            // Stop if we've fallen well below the starting point
            if (y > startY + 200) break;

            const screenPos = this.worldToScreen(x, y);
            ctx.lineTo(screenPos.x, screenPos.y);
        }

        ctx.stroke();
    }
}
