export interface Tool {
    onMouseDown(worldX: number, worldY: number, e: MouseEvent): void;
    onMouseMove(worldX: number, worldY: number, e: MouseEvent): void;
    onMouseUp(worldX: number, worldY: number, e: MouseEvent): void;
    render(ctx: CanvasRenderingContext2D, viewX: number, viewY: number, zoom: number): void;
    getCursor(): string;
}
