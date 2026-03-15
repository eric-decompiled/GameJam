import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

export type MultiplayerMode = 'single' | 'host' | 'join';

const gltfLoader = new GLTFLoader();

// Character model paths
const CHARACTER_MODELS = [
    `${import.meta.env.BASE_URL}models/idle.glb`,
    `${import.meta.env.BASE_URL}models/p2_idle.glb`
];

// Preloaded model cache
const preloadedModels: Map<string, THREE.Group> = new Map();
const preloadedAnimations: Map<string, THREE.AnimationClip[]> = new Map();

export interface MultiplayerCallbacks {
    onSinglePlayer: (characterId: number) => void;
    onHost: () => void;
    onJoin: (code: string) => void;
}

export class MultiplayerUI {
    private container: HTMLElement;
    private callbacks: MultiplayerCallbacks | null = null;
    private currentOverlay: HTMLElement | null = null;

    constructor() {
        this.container = document.body;
        this.injectStyles();
        this.preloadCharacterModels();
    }

    private async preloadCharacterModels(): Promise<void> {
        for (const path of CHARACTER_MODELS) {
            try {
                const gltf = await gltfLoader.loadAsync(path);
                preloadedModels.set(path, SkeletonUtils.clone(gltf.scene) as THREE.Group);
                preloadedAnimations.set(path, gltf.animations);
            } catch (error) {
                console.error(`Failed to preload ${path}:`, error);
            }
        }
    }

    private injectStyles(): void {
        if (document.getElementById('multiplayer-styles')) return;

        const style = document.createElement('style');
        style.id = 'multiplayer-styles';
        style.textContent = `
            .mp-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
            }

            .mp-panel {
                background: #2a2a3a;
                border-radius: 12px;
                padding: 32px;
                min-width: 320px;
                text-align: center;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
            }

            .mp-title {
                font-size: 28px;
                color: #fff;
                margin: 0 0 24px 0;
                font-weight: bold;
            }

            .mp-button {
                display: block;
                width: 100%;
                padding: 14px 24px;
                margin: 12px 0;
                font-size: 18px;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                transition: transform 0.1s, background-color 0.2s;
            }

            .mp-button:hover {
                transform: scale(1.02);
            }

            .mp-button:active {
                transform: scale(0.98);
            }

            .mp-button-primary {
                background: #4a90d9;
                color: white;
            }

            .mp-button-primary:hover {
                background: #5aa0e9;
            }

            .mp-button-secondary {
                background: #5a5a6a;
                color: white;
            }

            .mp-button-secondary:hover {
                background: #6a6a7a;
            }

            .mp-button-success {
                background: #4ad97a;
                color: white;
            }

            .mp-button-success:hover {
                background: #5ae98a;
            }

            .mp-code {
                font-size: 48px;
                font-family: monospace;
                color: #4ad97a;
                letter-spacing: 8px;
                margin: 24px 0;
                user-select: all;
            }

            .mp-input {
                width: 100%;
                padding: 14px;
                font-size: 24px;
                text-align: center;
                border: 2px solid #4a4a5a;
                border-radius: 8px;
                background: #1a1a2a;
                color: #fff;
                letter-spacing: 4px;
                text-transform: uppercase;
                box-sizing: border-box;
            }

            .mp-input:focus {
                outline: none;
                border-color: #4a90d9;
            }

            .mp-text {
                color: #aaa;
                margin: 16px 0;
                font-size: 14px;
            }

            .mp-status {
                color: #4ad97a;
                margin: 16px 0;
                font-size: 16px;
            }

            .mp-status.waiting {
                color: #d9d94a;
            }

            .mp-status.error {
                color: #d94a4a;
            }

            .mp-back {
                color: #888;
                background: transparent;
                border: none;
                cursor: pointer;
                font-size: 14px;
                margin-top: 16px;
                padding: 8px;
            }

            .mp-back:hover {
                color: #aaa;
            }

            .mp-connection-status {
                position: fixed;
                top: 10px;
                right: 10px;
                background: rgba(0, 0, 0, 0.7);
                color: #4ad97a;
                padding: 8px 16px;
                border-radius: 4px;
                font-size: 14px;
                z-index: 999;
            }

            .mp-connection-status.disconnected {
                color: #d94a4a;
            }

            .mp-character-select {
                display: flex;
                gap: 24px;
                justify-content: center;
                margin: 24px 0;
            }

            .mp-character {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 12px;
                padding: 16px 24px;
                background: #3a3a4a;
                border: 3px solid #4a4a5a;
                border-radius: 12px;
                cursor: pointer;
                transition: transform 0.1s, border-color 0.2s;
                color: #fff;
                font-size: 16px;
            }

            .mp-character:hover {
                transform: scale(1.05);
                border-color: #6a6a7a;
            }

            .mp-character:active {
                transform: scale(0.98);
            }

            .mp-character-preview {
                width: 64px;
                height: 96px;
                border-radius: 8px;
            }

            .mp-character-canvas {
                width: 128px;
                height: 192px;
                border-radius: 8px;
            }

            .mp-character-name {
                font-size: 18px;
                font-weight: bold;
                margin-top: 8px;
            }

            .mp-credits-link {
                position: absolute;
                bottom: 16px;
                right: 16px;
                color: #888;
                font-size: 12px;
                cursor: pointer;
                text-decoration: underline;
            }

            .mp-credits-link:hover {
                color: #aaa;
            }

            .mp-credits-content {
                text-align: left;
                color: #ccc;
                font-size: 14px;
                line-height: 1.6;
            }

            .mp-credits-content a {
                color: #4a90d9;
                text-decoration: none;
            }

            .mp-credits-content a:hover {
                text-decoration: underline;
            }

            .mp-warning {
                color: #d9a84a;
                font-size: 12px;
                margin-top: 16px;
                line-height: 1.4;
            }
        `;
        document.head.appendChild(style);
    }

    setCallbacks(callbacks: MultiplayerCallbacks): void {
        this.callbacks = callbacks;
    }

    showMainMenu(): void {
        this.removeOverlay();

        const overlay = document.createElement('div');
        overlay.className = 'mp-overlay';
        overlay.innerHTML = `
            <div class="mp-panel">
                <h1 class="mp-title">Treasure Heist</h1>
                <button class="mp-button mp-button-primary" id="mp-single">Single Player</button>
                <button class="mp-button mp-button-success" id="mp-host">Host Game</button>
                <button class="mp-button mp-button-secondary" id="mp-join">Join Game</button>
                <p class="mp-warning">Multiplayer requires LAN. <a href="https://github.com/eric-decompiled/GameJam" target="_blank" style="color: #6ab0de;">Setup instructions</a></p>
                <button class="mp-button mp-button-secondary" id="mp-edit" style="margin-top: 24px;">Level Editor</button>
            </div>
            <span class="mp-credits-link" id="mp-credits">Credits</span>
        `;

        this.container.appendChild(overlay);
        this.currentOverlay = overlay;

        document.getElementById('mp-single')?.addEventListener('click', () => {
            this.showCharacterSelect();
        });

        document.getElementById('mp-host')?.addEventListener('click', () => {
            this.callbacks?.onHost();
        });

        document.getElementById('mp-join')?.addEventListener('click', () => {
            this.showJoinScreen();
        });

        document.getElementById('mp-credits')?.addEventListener('click', () => {
            this.showCredits();
        });

        document.getElementById('mp-edit')?.addEventListener('click', () => {
            window.location.href = '/editor.html';
        });
    }

    showCredits(): void {
        this.removeOverlay();

        const overlay = document.createElement('div');
        overlay.className = 'mp-overlay';
        overlay.innerHTML = `
            <div class="mp-panel">
                <h1 class="mp-title">Credits</h1>
                <div class="mp-credits-content">
                    <p><strong>Music</strong></p>
                    <p>Menu music by Cleyton Kauffman<br>
                    <a href="https://soundcloud.com/cleytonkauffman" target="_blank">soundcloud.com/cleytonkauffman</a></p>
                    <br>
                    <p>Adventure music by <a href="https://pixabay.com/users/hitslab-47305729/" target="_blank">Ievgen Poltavskyi</a><br>
                    from <a href="https://pixabay.com/music/" target="_blank">Pixabay</a></p>
                    <br>
                    <p>Battle theme by Cynic Music<br>
                    <a href="https://cynicmusic.com" target="_blank">cynicmusic.com</a> | <a href="https://pixelsphere.org" target="_blank">pixelsphere.org</a></p>
                </div>
                <button class="mp-button mp-button-secondary" id="mp-back">Back</button>
            </div>
        `;

        this.container.appendChild(overlay);
        this.currentOverlay = overlay;

        document.getElementById('mp-back')?.addEventListener('click', () => {
            this.showMainMenu();
        });
    }

    private characterPreviews: Array<{ renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.Camera; mixer: THREE.AnimationMixer; clock: THREE.Clock }> = [];
    private characterAnimationFrame: number = 0;

    showCharacterSelect(): void {
        this.removeOverlay();
        this.cleanupCharacterPreviews();

        const overlay = document.createElement('div');
        overlay.className = 'mp-overlay';
        overlay.innerHTML = `
            <div class="mp-panel">
                <h1 class="mp-title">Select Character</h1>
                <div class="mp-character-select">
                    <button class="mp-character" id="mp-char-0">
                        <canvas class="mp-character-canvas" id="mp-canvas-0" width="128" height="192"></canvas>
                        <span class="mp-character-name">Carl</span>
                    </button>
                    <button class="mp-character" id="mp-char-1">
                        <canvas class="mp-character-canvas" id="mp-canvas-1" width="128" height="192"></canvas>
                        <span class="mp-character-name">Lisa</span>
                    </button>
                </div>
                <button class="mp-back" id="mp-back">Back</button>
            </div>
        `;

        this.container.appendChild(overlay);
        this.currentOverlay = overlay;

        // Set up 3D previews
        this.setupCharacterPreview(0, 'mp-canvas-0', `${import.meta.env.BASE_URL}models/idle.glb`);
        this.setupCharacterPreview(1, 'mp-canvas-1', `${import.meta.env.BASE_URL}models/p2_idle.glb`);

        document.getElementById('mp-char-0')?.addEventListener('click', () => {
            this.cleanupCharacterPreviews();
            this.removeOverlay();
            this.callbacks?.onSinglePlayer(0);
        });

        document.getElementById('mp-char-1')?.addEventListener('click', () => {
            this.cleanupCharacterPreviews();
            this.removeOverlay();
            this.callbacks?.onSinglePlayer(1);
        });

        document.getElementById('mp-back')?.addEventListener('click', () => {
            this.cleanupCharacterPreviews();
            this.showMainMenu();
        });
    }

    private async setupCharacterPreview(index: number, canvasId: string, modelPath: string): Promise<void> {
        const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        if (!canvas) return;

        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
        renderer.setSize(128, 192);
        renderer.setClearColor(0x000000, 0);

        const scene = new THREE.Scene();

        const camera = new THREE.PerspectiveCamera(35, 128 / 192, 0.1, 100);
        camera.position.set(0, 1, 3);
        camera.lookAt(0, 0.8, 0);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 2, 2);
        scene.add(directionalLight);

        try {
            // Always load fresh for character select to avoid clone issues
            const gltf = await gltfLoader.loadAsync(modelPath);
            const model = gltf.scene;
            const animations = gltf.animations;

            // Scale and position model
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const scale = 1.5 / size.y;
            model.scale.setScalar(scale);

            box.setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            model.position.x = -center.x;
            model.position.y = -box.min.y;
            model.position.z = -center.z;

            // Rotate to face camera (same as Player.ts)
            model.rotation.y = -Math.PI / 2;

            scene.add(model);

            // Set up animation
            const mixer = new THREE.AnimationMixer(model);
            if (animations.length > 0) {
                const action = mixer.clipAction(animations[0]);
                action.play();
            }

            const clock = new THREE.Clock();
            this.characterPreviews[index] = { renderer, scene, camera, mixer, clock };

            // Start animation loop if not already running
            if (this.characterAnimationFrame === 0) {
                this.animateCharacterPreviews();
            }
        } catch (error) {
            console.error(`Failed to load character preview ${index}:`, error);
        }
    }

    private animateCharacterPreviews(): void {
        let hasActive = false;

        for (const preview of this.characterPreviews) {
            if (preview) {
                hasActive = true;
                const delta = preview.clock.getDelta();
                preview.mixer.update(delta);
                preview.renderer.render(preview.scene, preview.camera);
            }
        }

        if (hasActive) {
            this.characterAnimationFrame = requestAnimationFrame(() => this.animateCharacterPreviews());
        } else {
            this.characterAnimationFrame = 0;
        }
    }

    private cleanupCharacterPreviews(): void {
        if (this.characterAnimationFrame) {
            cancelAnimationFrame(this.characterAnimationFrame);
            this.characterAnimationFrame = 0;
        }
        for (const preview of this.characterPreviews) {
            if (preview) {
                preview.renderer.dispose();
            }
        }
        this.characterPreviews = [];
    }

    showHostWaiting(code: string): void {
        this.removeOverlay();

        const overlay = document.createElement('div');
        overlay.className = 'mp-overlay';
        overlay.innerHTML = `
            <div class="mp-panel">
                <h1 class="mp-title">Hosting Game</h1>
                <p class="mp-text">Share this code with your friend:</p>
                <div class="mp-code">${code}</div>
                <p class="mp-status waiting">Waiting for player to join...</p>
                <button class="mp-back" id="mp-back">Cancel</button>
            </div>
        `;

        this.container.appendChild(overlay);
        this.currentOverlay = overlay;

        document.getElementById('mp-back')?.addEventListener('click', () => {
            this.showMainMenu();
        });
    }

    showJoinScreen(): void {
        this.removeOverlay();

        const overlay = document.createElement('div');
        overlay.className = 'mp-overlay';
        overlay.innerHTML = `
            <div class="mp-panel">
                <h1 class="mp-title">Join Game</h1>
                <p class="mp-text">Enter the room code:</p>
                <input type="text" class="mp-input" id="mp-code-input" maxlength="6" placeholder="ABC123">
                <button class="mp-button mp-button-success" id="mp-connect">Connect</button>
                <button class="mp-back" id="mp-back">Back</button>
            </div>
        `;

        this.container.appendChild(overlay);
        this.currentOverlay = overlay;

        const input = document.getElementById('mp-code-input') as HTMLInputElement;
        input?.focus();

        document.getElementById('mp-connect')?.addEventListener('click', () => {
            const code = input?.value.trim().toUpperCase();
            if (code && code.length === 6) {
                this.showConnecting();
                this.callbacks?.onJoin(code);
            }
        });

        input?.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                const code = input?.value.trim().toUpperCase();
                if (code && code.length === 6) {
                    this.showConnecting();
                    this.callbacks?.onJoin(code);
                }
            }
        });

        document.getElementById('mp-back')?.addEventListener('click', () => {
            this.showMainMenu();
        });
    }

    showConnecting(): void {
        this.removeOverlay();

        const overlay = document.createElement('div');
        overlay.className = 'mp-overlay';
        overlay.innerHTML = `
            <div class="mp-panel">
                <h1 class="mp-title">Connecting...</h1>
                <p class="mp-status waiting">Establishing connection...</p>
            </div>
        `;

        this.container.appendChild(overlay);
        this.currentOverlay = overlay;
    }

    showError(message: string): void {
        this.removeOverlay();

        const overlay = document.createElement('div');
        overlay.className = 'mp-overlay';
        overlay.innerHTML = `
            <div class="mp-panel">
                <h1 class="mp-title">Error</h1>
                <p class="mp-status error">${message}</p>
                <button class="mp-button mp-button-secondary" id="mp-back">Back to Menu</button>
            </div>
        `;

        this.container.appendChild(overlay);
        this.currentOverlay = overlay;

        document.getElementById('mp-back')?.addEventListener('click', () => {
            this.showMainMenu();
        });
    }

    showDisconnected(): void {
        this.removeOverlay();

        const overlay = document.createElement('div');
        overlay.className = 'mp-overlay';
        overlay.innerHTML = `
            <div class="mp-panel">
                <h1 class="mp-title">Disconnected</h1>
                <p class="mp-status error">Connection to other player lost.</p>
                <button class="mp-button mp-button-secondary" id="mp-back">Back to Menu</button>
            </div>
        `;

        this.container.appendChild(overlay);
        this.currentOverlay = overlay;

        document.getElementById('mp-back')?.addEventListener('click', () => {
            this.showMainMenu();
        });
    }

    removeOverlay(): void {
        if (this.currentOverlay) {
            this.currentOverlay.remove();
            this.currentOverlay = null;
        }
    }

    showConnectionStatus(isConnected: boolean, isHost: boolean): void {
        let status = document.getElementById('mp-connection-status');
        if (!status) {
            status = document.createElement('div');
            status.id = 'mp-connection-status';
            status.className = 'mp-connection-status';
            this.container.appendChild(status);
        }

        if (isConnected) {
            status.className = 'mp-connection-status';
            status.textContent = isHost ? 'Hosting (P1)' : 'Connected (P2)';
        } else {
            status.className = 'mp-connection-status disconnected';
            status.textContent = 'Disconnected';
        }
    }

    hideConnectionStatus(): void {
        document.getElementById('mp-connection-status')?.remove();
    }
}
