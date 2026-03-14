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

    async init(): Promise<void> {
        await this.levelManager.loadLevel('level1');

        this.entities = this.levelManager.getEntities();

        const spawn = this.levelManager.getSpawnPoint();
        this.player = new Player(spawn.x, spawn.y);
        this.entities.push(this.player);
        this.debug.setPlayer(this.player);

        const bounds = this.levelManager.getWorldBounds();
        this.camera.setWorldBounds(bounds.width, bounds.height);
        this.deathY = bounds.height + 200; // Fall 200px below world to die

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
}
