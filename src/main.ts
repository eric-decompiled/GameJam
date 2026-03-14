import { Game } from './core/Game';

window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement | null;

    if (!canvas) {
        console.error('Canvas element not found!');
        return;
    }

    const game = new Game(canvas);
    game.init().catch(error => {
        console.error('Failed to initialize game:', error);
    });
});
