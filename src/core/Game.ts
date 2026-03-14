import { GAME } from '../utils/constants';
import { Renderer } from '../graphics/Renderer';
import { InputManager } from './InputManager';
import { Debug } from './Debug';
import { Camera } from '../graphics/Camera';
import { Physics } from '../physics/Physics';
import { LevelManager } from '../levels/LevelManager';
import { Player } from '../entities/Player';
import { Entity } from '../entities/Entity';
import { Platform } from '../entities/Platform';
import { Victory } from '../entities/Victory';

export class Game {
    private renderer: Renderer;
    private input: InputManager;
    private debug: Debug;
    private camera: Camera;
    private physics: Physics;
    private levelManager: LevelManager;
    private entities: Entity[] = [];
    private player: Player | null = null;
    private lastTime: number = 0;
    private accumulator: number = 0;
    private running: boolean = false;
    private deathY: number = 0;
    private deaths: number = 0;
    private victoryPoint: { x: number; y: number } | null = null;
    private hasWon: boolean = false;

    constructor(canvas: HTMLCanvasElement) {
        this.renderer = new Renderer(canvas);
        this.input = new InputManager();
        this.debug = new Debug();
        this.camera = new Camera(GAME.WIDTH, GAME.HEIGHT);
        this.physics = new Physics();
        this.levelManager = new LevelManager();

        this.renderer.setCamera(this.camera);
        this.debug.setInput(this.input);
        this.debug.setDeathsCallback(() => this.deaths);
    }

    async init(levelName: string = 'level1'): Promise<void> {
        await this.levelManager.loadLevel(levelName);
        this.setupLevel();
    }

    async initFromJSON(json: string): Promise<void> {
        this.levelManager.loadFromJSON(json);
        this.setupLevel();
    }

    private setupLevel(): void {

        this.entities = this.levelManager.getEntities();

        const spawn = this.levelManager.getSpawnPoint();
        this.player = new Player(spawn.x, spawn.y);
        this.entities.push(this.player);
        this.debug.setPlayer(this.player);

        const bounds = this.levelManager.getWorldBounds();
        this.camera.setWorldBounds(bounds.width, bounds.height);
        this.deathY = bounds.height + 200; // Fall 200px below world to die
        this.victoryPoint = this.levelManager.getVictoryPoint();

        if (this.victoryPoint) {
            const victoryEntity = new Victory(this.victoryPoint.x, this.victoryPoint.y);
            this.entities.push(victoryEntity);
        }

        for (const entity of this.entities) {
            entity.createMesh();
            entity.addToScene(this.renderer);
        }

        this.running = true;
        this.lastTime = performance.now();
        requestAnimationFrame((time) => this.loop(time));
    }

    private loop(currentTime: number): void {
        if (!this.running) return;

        const frameTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        this.accumulator += Math.min(frameTime, GAME.TIMESTEP * GAME.MAX_FRAME_SKIP);

        while (this.accumulator >= GAME.TIMESTEP) {
            this.update(GAME.TIMESTEP / 1000);
            this.accumulator -= GAME.TIMESTEP;
        }

        this.render();

        requestAnimationFrame((time) => this.loop(time));
    }

    private update(dt: number): void {
        if (!this.player) return;

        this.player.handleInput(this.input);

        for (const entity of this.entities) {
            if (entity.active) {
                entity.update(dt);
            }
        }

        const platforms = this.entities.filter(e => e.hasTag('platform')) as Platform[];
        this.physics.update(this.player, platforms, dt);

        // Check for death (fell off screen)
        if (this.player.position.y > this.deathY) {
            this.respawnPlayer();
        }

        // Check for victory
        if (!this.hasWon && this.victoryPoint) {
            const dx = this.player.centerX - this.victoryPoint.x;
            const dy = this.player.centerY - this.victoryPoint.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 40) {
                this.hasWon = true;
                this.showVictory();
            }
        }

        this.camera.follow(this.player, dt);

        // Clear per-frame input states
        this.input.clear();
    }

    private respawnPlayer(): void {
        if (!this.player) return;

        this.deaths++;
        const spawn = this.levelManager.getSpawnPoint();
        this.player.position.set(spawn.x, spawn.y);
        this.player.velocity.set(0, 0);
        this.player.grounded = false;
        this.player.coyoteTimer = 0;
        this.player.jumpBufferTimer = 0;
    }

    getDeaths(): number {
        return this.deaths;
    }

    private showVictory(): void {
        const overlay = document.createElement('div');
        overlay.className = 'victory-overlay';
        overlay.innerHTML = `
            <div class="victory-content">
                <h1>Victory!</h1>
                <p>Deaths: ${this.deaths}</p>
                <button id="playAgain">Play Again</button>
            </div>
        `;
        document.body.appendChild(overlay);

        document.getElementById('playAgain')?.addEventListener('click', () => {
            overlay.remove();
            this.hasWon = false;
            this.respawnPlayer();
        });
    }

    private render(): void {
        for (const entity of this.entities) {
            if (entity.active) {
                entity.render(this.renderer);
            }
        }

        this.renderer.render();
        this.debug.update();
    }

    stop(): void {
        this.running = false;
    }

    async loadLevel(levelName: string): Promise<void> {
        // Remove old entities from scene
        for (const entity of this.entities) {
            entity.removeFromScene(this.renderer);
        }

        await this.levelManager.loadLevel(levelName);
        this.entities = this.levelManager.getEntities();

        const spawn = this.levelManager.getSpawnPoint();
        this.player = new Player(spawn.x, spawn.y);
        this.entities.push(this.player);
        this.debug.setPlayer(this.player);

        const bounds = this.levelManager.getWorldBounds();
        this.camera.setWorldBounds(bounds.width, bounds.height);
        this.deathY = bounds.height + 200;
        this.victoryPoint = this.levelManager.getVictoryPoint();
        this.hasWon = false;

        if (this.victoryPoint) {
            const victoryEntity = new Victory(this.victoryPoint.x, this.victoryPoint.y);
            this.entities.push(victoryEntity);
        }

        for (const entity of this.entities) {
            entity.createMesh();
            entity.addToScene(this.renderer);
        }

        this.deaths = 0;
    }
}
