export class Grid {
    private gridSize: number = 32;
    private showGrid: boolean = true;

    getGridSize(): number {
        return this.gridSize;
    }

    setGridSize(size: number): void {
        this.gridSize = size;
    }

    isVisible(): boolean {
        return this.showGrid;
    }

    setVisible(visible: boolean): void {
        this.showGrid = visible;
    }

    snap(value: number): number {
        return Math.round(value / this.gridSize) * this.gridSize;
    }

    snapPoint(x: number, y: number): { x: number; y: number } {
        return {
            x: this.snap(x),
            y: this.snap(y)
        };
    }

    render(
        ctx: CanvasRenderingContext2D,
        viewX: number,
        viewY: number,
        viewWidth: number,
        viewHeight: number,
        zoom: number
    ): void {
        if (!this.showGrid) return;

        const scaledGridSize = this.gridSize * zoom;

        if (scaledGridSize < 8) return;

        ctx.strokeStyle = '#2a2a4e';
        ctx.lineWidth = 1;

        const startX = Math.floor(viewX / this.gridSize) * this.gridSize;
        const startY = Math.floor(viewY / this.gridSize) * this.gridSize;
        const endX = viewX + viewWidth / zoom;
        const endY = viewY + viewHeight / zoom;

        ctx.beginPath();
        for (let x = startX; x <= endX; x += this.gridSize) {
            const screenX = (x - viewX) * zoom;
            ctx.moveTo(screenX, 0);
            ctx.lineTo(screenX, viewHeight);
        }
        for (let y = startY; y <= endY; y += this.gridSize) {
            const screenY = (y - viewY) * zoom;
            ctx.moveTo(0, screenY);
            ctx.lineTo(viewWidth, screenY);
        }
        ctx.stroke();

        ctx.strokeStyle = '#3a3a5e';
        ctx.lineWidth = 1;
        const majorGridSize = this.gridSize * 4;
        const majorStartX = Math.floor(viewX / majorGridSize) * majorGridSize;
        const majorStartY = Math.floor(viewY / majorGridSize) * majorGridSize;

        ctx.beginPath();
        for (let x = majorStartX; x <= endX; x += majorGridSize) {
            const screenX = (x - viewX) * zoom;
            ctx.moveTo(screenX, 0);
            ctx.lineTo(screenX, viewHeight);
        }
        for (let y = majorStartY; y <= endY; y += majorGridSize) {
            const screenY = (y - viewY) * zoom;
            ctx.moveTo(0, screenY);
            ctx.lineTo(viewWidth, screenY);
        }
        ctx.stroke();
    }
}
