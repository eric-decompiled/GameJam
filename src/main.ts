import { Game } from './core/Game';

window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement | null;
    const levelSelect = document.getElementById('levelSelect') as HTMLSelectElement | null;

    if (!canvas) {
        console.error('Canvas element not found!');
        return;
    }

    const game = new Game(canvas);

    // Check if we're in test mode (launched from editor)
    const params = new URLSearchParams(window.location.search);
    const isTestMode = params.get('test') === '1';

    if (isTestMode) {
        const testLevel = sessionStorage.getItem('testLevel');
        if (testLevel) {
            game.initFromJSON(testLevel).catch(error => {
                console.error('Failed to load test level:', error);
            });
        } else {
            game.init('level1').catch(error => {
                console.error('Failed to initialize game:', error);
            });
        }
    } else {
        const initialLevel = levelSelect?.value || 'level1';
        game.init(initialLevel).catch(error => {
            console.error('Failed to initialize game:', error);
        });
    }

    levelSelect?.addEventListener('change', () => {
        game.loadLevel(levelSelect.value).catch(error => {
            console.error('Failed to load level:', error);
        });
    });
});
