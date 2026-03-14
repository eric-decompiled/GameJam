import { InputManager } from './InputManager';
import { Player } from '../entities/Player';

export class Debug {
    private element: HTMLElement | null;
    private fps: number = 0;
    private frameCount: number = 0;
    private lastFpsUpdate: number;
    private input: InputManager | null = null;
    private player: Player | null = null;
    private getDeaths: (() => number) | null = null;

    constructor() {
        this.element = document.getElementById('debugOverlay');
        this.lastFpsUpdate = performance.now();
    }

    setInput(input: InputManager): void {
        this.input = input;
    }

    setPlayer(player: Player): void {
        this.player = player;
    }

    setDeathsCallback(callback: () => number): void {
        this.getDeaths = callback;
    }

    update(): void {
        this.frameCount++;
        const now = performance.now();
        const elapsed = now - this.lastFpsUpdate;

        if (elapsed >= 500) {
            this.fps = Math.round((this.frameCount / elapsed) * 1000);
            this.frameCount = 0;
            this.lastFpsUpdate = now;
        }

        this.render();
    }

    private render(): void {
        if (!this.element || !this.input) return;

        const left = this.input.isDown('ArrowLeft') || this.input.isDown('KeyA');
        const right = this.input.isDown('ArrowRight') || this.input.isDown('KeyD');
        const jump = this.input.isDown('Space') || this.input.isDown('ArrowUp') || this.input.isDown('KeyW');

        let posX = 0, posY = 0, velX = 0, velY = 0, grounded = false;
        if (this.player) {
            posX = Math.round(this.player.position.x);
            posY = Math.round(this.player.position.y);
            velX = Math.round(this.player.velocity.x);
            velY = Math.round(this.player.velocity.y);
            grounded = this.player.grounded;
        }

        const deaths = this.getDeaths ? this.getDeaths() : 0;

        this.element.innerHTML = `
            <div>FPS: ${this.fps}</div>
            <div>X: ${posX} Y: ${posY}</div>
            <div>vX: ${velX} vY: ${velY}</div>
            <div>grounded: ${grounded}</div>
            <div>deaths: ${deaths}</div>
            <div style="margin-top: 6px;">
                <span class="key ${left ? 'pressed' : ''}">←</span>
                <span class="key ${right ? 'pressed' : ''}">→</span>
                <span class="key ${jump ? 'pressed' : ''}">⬆</span>
            </div>
        `;
    }
}
