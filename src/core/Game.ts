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
import { Ladder } from '../entities/Ladder';
import { Victory } from '../entities/Victory';
import { Monster } from '../entities/Monster';
import { Coin } from '../entities/Coin';
import { NetworkManager } from '../network/NetworkManager';
import { HostSession } from '../network/HostSession';
import { ClientSession } from '../network/ClientSession';
import { MultiplayerUI } from './MultiplayerUI';
import type { PlayerState } from '../network/Protocol';

export type GameMode = 'single' | 'host' | 'client';

export class Game {
    private renderer: Renderer;
    private input: InputManager;
    private debug: Debug;
    private camera: Camera;
    private physics: Physics;
    private levelManager: LevelManager;
    private entities: Entity[] = [];
    private players: Player[] = [];
    private monsters: Monster[] = [];
    private coins: Coin[] = [];
    private coinsCollected: number = 0;
    private coinHud: HTMLElement | null = null;
    private lastTime: number = 0;
    private accumulator: number = 0;
    private running: boolean = false;
    private deathY: number = 0;
    private deaths: number[] = [0, 0];
    private victoryPoint: { x: number; y: number } | null = null;
    private hasWon: boolean = false;

    // Multiplayer
    private mode: GameMode = 'single';
    private networkManager: NetworkManager | null = null;
    private hostSession: HostSession | null = null;
    private clientSession: ClientSession | null = null;
    private multiplayerUI: MultiplayerUI;
    private stateBroadcastTimer: number = 0;
    private readonly STATE_BROADCAST_INTERVAL: number = 1000 / 20; // 20Hz
    private currentLevelName: string = 'level1';
    private selectedCharacterId: number = 0;

    constructor(canvas: HTMLCanvasElement) {
        this.renderer = new Renderer(canvas);
        this.input = new InputManager();
        this.debug = new Debug();
        this.camera = new Camera(GAME.WIDTH, GAME.HEIGHT);
        this.physics = new Physics();
        this.levelManager = new LevelManager();
        this.multiplayerUI = new MultiplayerUI();

        this.renderer.setCamera(this.camera);
        this.debug.setInput(this.input);
        this.debug.setDeathsCallback(() => this.deaths[0]);

        this.setupMultiplayerUI();
        this.createCoinHud();
    }

    private createCoinHud(): void {
        this.coinHud = document.createElement('div');
        this.coinHud.id = 'coin-hud';
        this.coinHud.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            background: rgba(0, 0, 0, 0.7);
            color: #ffd700;
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 18px;
            font-weight: bold;
            font-family: sans-serif;
            display: none;
            z-index: 100;
        `;
        document.body.appendChild(this.coinHud);
    }

    private updateCoinHud(): void {
        if (this.coinHud) {
            this.coinHud.textContent = `Coins: ${this.coinsCollected}`;
            this.coinHud.style.display = 'block';
        }
    }

    private hideCoinHud(): void {
        if (this.coinHud) {
            this.coinHud.style.display = 'none';
        }
    }

    private setupMultiplayerUI(): void {
        this.multiplayerUI.setCallbacks({
            onSinglePlayer: (characterId) => this.startSinglePlayer(characterId),
            onHost: () => this.startHost(),
            onJoin: (code) => this.joinGame(code)
        });
    }

    showMultiplayerMenu(): void {
        this.hideCoinHud();
        this.multiplayerUI.showMainMenu();
    }

    private async startSinglePlayer(characterId: number): Promise<void> {
        this.mode = 'single';
        this.selectedCharacterId = characterId;
        await this.init(this.currentLevelName);
    }

    private async startHost(): Promise<void> {
        this.mode = 'host';
        this.networkManager = new NetworkManager();

        // Create session first so callbacks work
        this.hostSession = new HostSession(this.networkManager);
        this.hostSession.setOnClientReady(() => this.startMultiplayerGame());

        this.networkManager.setCallbacks({
            onMessage: (msg) => this.hostSession?.handleMessage(msg),
            onConnected: () => this.onClientConnected(),
            onDisconnected: () => this.onDisconnected(),
            onError: (err) => this.multiplayerUI.showError(err)
        });

        try {
            const code = await this.networkManager.host();
            this.multiplayerUI.showHostWaiting(code);
        } catch {
            this.hostSession = null;
            this.multiplayerUI.showError('Failed to create room');
        }
    }

    private async joinGame(code: string): Promise<void> {
        this.mode = 'client';
        this.networkManager = new NetworkManager();

        // Create session first so callbacks work
        this.clientSession = new ClientSession(this.networkManager);
        this.clientSession.setOnStart((level) => this.initAsClient(level));
        this.clientSession.setOnVictory((playerId) => this.handleVictoryMessage(playerId));
        this.clientSession.setOnRespawn((playerId) => this.handleRespawnMessage(playerId));

        this.networkManager.setCallbacks({
            onMessage: (msg) => this.clientSession?.handleMessage(msg),
            onConnected: () => this.onConnectedToHost(),
            onDisconnected: () => this.onDisconnected(),
            onError: (err) => this.multiplayerUI.showError(err)
        });

        try {
            await this.networkManager.join(code);
            // Connection established, ready is sent in onConnectedToHost
        } catch {
            this.clientSession = null;
            this.multiplayerUI.showError('Failed to join room');
        }
    }

    private onClientConnected(): void {
        console.log('Client connected to host');
    }

    private onConnectedToHost(): void {
        console.log('Connected to host, sending ready');
        this.multiplayerUI.removeOverlay();
        this.clientSession?.sendReady();
    }

    private onDisconnected(): void {
        this.running = false;
        this.multiplayerUI.showDisconnected();
        this.cleanupNetwork();
    }

    private cleanupNetwork(): void {
        this.networkManager?.disconnect();
        this.networkManager = null;
        this.hostSession = null;
        this.clientSession = null;
    }

    private async startMultiplayerGame(): Promise<void> {
        // Host starts the game
        this.multiplayerUI.removeOverlay();
        this.multiplayerUI.showConnectionStatus(true, true);
        this.hostSession?.sendStart(this.currentLevelName);
        await this.initAsHost(this.currentLevelName);
    }

    async init(levelName: string = 'level1'): Promise<void> {
        this.currentLevelName = levelName;
        await this.levelManager.loadLevel(levelName);
        this.setupLevel();
    }

    async initFromJSON(json: string): Promise<void> {
        this.levelManager.loadFromJSON(json);
        this.setupLevel();
    }

    private async initAsHost(levelName: string): Promise<void> {
        this.currentLevelName = levelName;
        await this.levelManager.loadLevel(levelName);
        this.setupLevelMultiplayer(2);
    }

    private async initAsClient(levelName: string): Promise<void> {
        this.currentLevelName = levelName;
        this.multiplayerUI.showConnectionStatus(true, false);
        await this.levelManager.loadLevel(levelName);
        this.setupLevelMultiplayer(2);
    }

    private setupLevel(): void {
        this.entities = this.levelManager.getEntities();
        this.players = [];
        this.monsters = [];
        this.coins = [];
        this.coinsCollected = 0;
        this.updateCoinHud();

        const spawn = this.levelManager.getSpawnPoint();
        const player = new Player(spawn.x, spawn.y, this.selectedCharacterId, false);
        this.players.push(player);
        this.entities.push(player);
        this.debug.setPlayer(player);

        const bounds = this.levelManager.getWorldBounds();
        this.camera.setWorldBounds(bounds.width, bounds.height);
        this.deathY = bounds.height + 200;
        this.victoryPoint = this.levelManager.getVictoryPoint();

        if (this.victoryPoint) {
            const victoryEntity = new Victory(this.victoryPoint.x, this.victoryPoint.y);
            this.entities.push(victoryEntity);
        }

        // Spawn monsters and coins
        this.spawnMonsters();
        this.spawnCoins();

        for (const entity of this.entities) {
            entity.createMesh();
            entity.addToScene(this.renderer);
        }

        this.running = true;
        this.lastTime = performance.now();
        requestAnimationFrame((time) => this.loop(time));
    }

    private spawnMonsters(): void {
        const platforms = this.entities.filter(e => e.hasTag('platform')) as Platform[];

        // Find eligible platforms (wider than 200px, not spawn platform)
        const eligiblePlatforms = platforms.filter(p =>
            p.width >= 200 && !p.hasTag('spawn-platform')
        );

        // Spawn only 1 monster on a random eligible platform
        if (eligiblePlatforms.length > 0) {
            const platform = eligiblePlatforms[Math.floor(Math.random() * eligiblePlatforms.length)];
            const monster = new Monster(platform);
            this.monsters.push(monster);
            this.entities.push(monster);
        }
    }

    private spawnCoins(): void {
        const platforms = this.entities.filter(e => e.hasTag('platform')) as Platform[];

        // 20% chance to spawn a coin on each platform
        for (const platform of platforms) {
            if (platform.hasTag('spawn-platform')) continue; // Skip spawn platform
            if (Math.random() > 0.2) continue; // 20% chance

            const x = platform.position.x + platform.width / 2 - 12;
            const y = platform.position.y - 50; // Float above platform
            const coin = new Coin(x, y);
            this.coins.push(coin);
            this.entities.push(coin);
        }
    }

    private setupLevelMultiplayer(playerCount: number): void {
        this.entities = this.levelManager.getEntities();
        this.players = [];
        this.monsters = [];
        this.coins = [];
        this.coinsCollected = 0;
        this.updateCoinHud();
        this.deaths = [0, 0];
        this.hasWon = false;

        const spawn = this.levelManager.getSpawnPoint();

        // Create players with slight horizontal offset
        for (let i = 0; i < playerCount; i++) {
            const offsetX = (i - (playerCount - 1) / 2) * 50;
            const isRemote = (this.mode === 'host' && i === 1) || (this.mode === 'client' && i === 0);
            const player = new Player(spawn.x + offsetX, spawn.y, i, isRemote);
            this.players.push(player);
            this.entities.push(player);
        }

        // Debug follows local player
        const localPlayer = this.players.find(p => !p.isRemote);
        if (localPlayer) {
            this.debug.setPlayer(localPlayer);
        }

        const bounds = this.levelManager.getWorldBounds();
        this.camera.setWorldBounds(bounds.width, bounds.height);
        this.deathY = bounds.height + 200;
        this.victoryPoint = this.levelManager.getVictoryPoint();

        if (this.victoryPoint) {
            const victoryEntity = new Victory(this.victoryPoint.x, this.victoryPoint.y);
            this.entities.push(victoryEntity);
        }

        // Spawn monsters and coins
        this.spawnMonsters();
        this.spawnCoins();

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
        if (this.players.length === 0) return;

        if (this.mode === 'client') {
            this.updateAsClient(dt);
        } else {
            this.updateAsHostOrSingle(dt);
        }

        // Clear per-frame input states
        this.input.clear();
    }

    private updateAsHostOrSingle(dt: number): void {
        const platforms = this.entities.filter(e => e.hasTag('platform')) as Platform[];
        const ladders = this.entities.filter(e => e.hasTag('ladder')) as Ladder[];

        // Handle input for each player
        for (const player of this.players) {
            if (player.isRemote) {
                // Get input from network
                const remoteInput = this.hostSession?.getClientInput();
                if (remoteInput) {
                    player.handleRemoteInput(remoteInput);
                }
            } else {
                // Local input
                player.handleInput(this.input);
            }
        }

        // Update all entities
        for (const entity of this.entities) {
            if (entity.active) {
                entity.update(dt);
            }
        }

        // Run physics for each player
        for (const player of this.players) {
            this.physics.update(player, platforms, dt, ladders);

            // Check for death
            if (player.position.y > this.deathY) {
                this.respawnPlayer(player);
            }

            // Check for victory (per-player)
            if (!player.hasReachedVictory && this.victoryPoint) {
                const dx = player.centerX - this.victoryPoint.x;
                const dy = player.centerY - this.victoryPoint.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 40) {
                    player.hasReachedVictory = true;
                    if (this.mode === 'host') {
                        this.hostSession?.sendVictory(player.playerId);
                    }
                    this.checkAllPlayersVictory();
                }
            }

            // Check monster collisions
            for (const monster of this.monsters) {
                const collision = monster.checkPlayerCollision(player);
                if (collision === 'kill') {
                    this.respawnPlayer(player);
                    break;
                } else if (collision === 'stomp') {
                    monster.kill();
                    player.velocity.y = -400; // Bounce up after stomp
                }
            }

            // Check coin collection
            for (const coin of this.coins) {
                if (coin.checkPlayerCollision(player)) {
                    coin.collect();
                    this.coinsCollected++;
                    this.updateCoinHud();
                }
            }
        }

        // Update monsters - check for players on their platforms
        for (const monster of this.monsters) {
            monster.checkForPlayers(this.players);
        }

        // Camera follows all players in multiplayer
        if (this.mode === 'single') {
            this.camera.follow(this.players[0], dt);
        } else {
            this.camera.followMultiple(this.players, dt);
        }

        // Broadcast state to client (host only)
        if (this.mode === 'host' && this.networkManager?.isConnected) {
            this.stateBroadcastTimer += dt * 1000;
            if (this.stateBroadcastTimer >= this.STATE_BROADCAST_INTERVAL) {
                this.stateBroadcastTimer = 0;
                const states = this.players.map(p => p.getState());
                this.hostSession?.broadcastState(states);
            }
        }

        // Send local input to host (client mode handled in updateAsClient)
        if (this.mode === 'host') {
            // Host sends local player state along with physics
        }
    }

    private updateAsClient(dt: number): void {
        // Apply received state from host
        const states = this.clientSession?.getLatestState();
        if (states) {
            for (const state of states) {
                const player = this.players.find(p => p.playerId === state.id);
                if (player) {
                    player.applyState(state);
                }
            }
        }

        // Update entities (for animations, moving platforms, etc.)
        for (const entity of this.entities) {
            if (entity.active && !entity.hasTag('player')) {
                entity.update(dt);
            }
        }

        // Update player animations based on received state
        for (const player of this.players) {
            player.update(dt);
        }

        // Camera follows all players
        this.camera.followMultiple(this.players, dt);

        // Send local input to host
        if (this.networkManager?.isConnected) {
            this.clientSession?.sendInput(this.input.getInputState());
        }
    }

    private respawnPlayer(player: Player): void {
        this.deaths[player.playerId]++;
        const spawn = this.levelManager.getSpawnPoint();
        const offsetX = (player.playerId - (this.players.length - 1) / 2) * 50;
        player.position.set(spawn.x + offsetX, spawn.y);
        player.velocity.set(0, 0);
        player.grounded = false;
        player.coyoteTimer = 0;
        player.jumpBufferTimer = 0;
        player.hasReachedVictory = false;

        if (this.mode === 'host') {
            this.hostSession?.sendRespawn(player.playerId);
        }
    }

    private handleVictoryMessage(playerId: number): void {
        const player = this.players.find(p => p.playerId === playerId);
        if (player) {
            player.hasReachedVictory = true;
            this.checkAllPlayersVictory();
        }
    }

    private handleRespawnMessage(playerId: number): void {
        const player = this.players.find(p => p.playerId === playerId);
        if (player) {
            player.hasReachedVictory = false;
        }
    }

    private checkAllPlayersVictory(): void {
        const allWon = this.players.every(p => p.hasReachedVictory);
        if (allWon && !this.hasWon) {
            this.hasWon = true;
            this.showVictory();
        }
    }

    getDeaths(): number {
        return this.deaths[0];
    }

    private showVictory(): void {
        const totalDeaths = this.deaths.reduce((a, b) => a + b, 0);
        const totalCoins = this.coins.length;
        const overlay = document.createElement('div');
        overlay.className = 'victory-overlay';
        overlay.innerHTML = `
            <div class="victory-content">
                <h1>Victory!</h1>
                ${this.mode !== 'single' ? '<p>Both players reached the goal!</p>' : ''}
                <p>Coins: ${this.coinsCollected} / ${totalCoins}</p>
                <p>Deaths: ${totalDeaths}</p>
                <button id="playAgain">Play Again</button>
            </div>
        `;
        document.body.appendChild(overlay);

        document.getElementById('playAgain')?.addEventListener('click', () => {
            overlay.remove();
            this.hasWon = false;
            for (const player of this.players) {
                player.hasReachedVictory = false;
            }
            this.respawnAllPlayers();
        });
    }

    private respawnAllPlayers(): void {
        for (const player of this.players) {
            const spawn = this.levelManager.getSpawnPoint();
            const offsetX = (player.playerId - (this.players.length - 1) / 2) * 50;
            player.position.set(spawn.x + offsetX, spawn.y);
            player.velocity.set(0, 0);
            player.grounded = false;
            player.hasReachedVictory = false;
        }
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
        this.cleanupNetwork();
        this.multiplayerUI.hideConnectionStatus();
    }

    async loadLevel(levelName: string): Promise<void> {
        // Remove old entities from scene
        for (const entity of this.entities) {
            entity.removeFromScene(this.renderer);
        }

        this.currentLevelName = levelName;
        await this.levelManager.loadLevel(levelName);

        if (this.mode === 'single') {
            this.setupLevel();
        } else {
            this.setupLevelMultiplayer(2);
        }
    }
}
