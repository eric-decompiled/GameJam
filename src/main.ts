import { Game } from './core/Game';

// Register service worker for caching
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.warn('Service worker registration failed:', error);
    });
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.add('hidden');
        setTimeout(() => overlay.remove(), 500);
    }
}

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
            game.initFromJSON(testLevel).then(() => hideLoading()).catch(error => {
                console.error('Failed to load test level:', error);
                hideLoading();
            });
        } else {
            game.init('level1').then(() => hideLoading()).catch(error => {
                console.error('Failed to initialize game:', error);
                hideLoading();
            });
        }
    } else {
        // Show multiplayer menu for normal game start
        game.showMultiplayerMenu();
        hideLoading();
    }

    levelSelect?.addEventListener('change', () => {
        game.loadLevel(levelSelect.value).catch(error => {
            console.error('Failed to load level:', error);
        });
    });
});
