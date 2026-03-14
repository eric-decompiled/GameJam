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
import { Monster } from '../entities/Monster';
import { Coin } from '../entities/Coin';
import { Chest } from '../entities/Chest';
import { ReturnBase } from '../entities/ReturnBase';
import { NetworkManager } from '../network/NetworkManager';
import { HostSession } from '../network/HostSession';
import { ClientSession } from '../network/ClientSession';
import { MultiplayerUI } from './MultiplayerUI';
import { AudioManager } from './AudioManager';
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
    private chestHud: HTMLElement | null = null;
    private muteButton: HTMLElement | null = null;
    private lastTime: number = 0;
    private accumulator: number = 0;
    private running: boolean = false;
    private deathY: number = 0;
    private deaths: number[] = [0, 0];
    private victoryPoint: { x: number; y: number } | null = null;
    private spawnPoint: { x: number; y: number } | null = null;
    private chest: Chest | null = null;
    private returnBase: ReturnBase | null = null;
    private hasWon: boolean = false;
    private levelTime: number = 0;
    private chestActivated: boolean = false;

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
    private audioReady: boolean = false;
    private musicStarted: boolean = false;

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
        this.createChestHud();
        this.createMuteButton();
        this.initAudio();
    }

    private async initAudio(): Promise<void> {
        await AudioManager.preload('monster_roar', `${import.meta.env.BASE_URL}audio/monster_roar.mp3`);
        await AudioManager.preload('menu_music', `${import.meta.env.BASE_URL}audio/menu_music.wav`);
        await AudioManager.preload('level_music', `${import.meta.env.BASE_URL}audio/level_music.mp3`);
        await AudioManager.preload('escape_music', `${import.meta.env.BASE_URL}audio/escape_music.mp3`);
        await AudioManager.preload('victory', `${import.meta.env.BASE_URL}audio/victory.mp3`);
        await AudioManager.preload('coin', `${import.meta.env.BASE_URL}audio/coin.mp3`);
        this.audioReady = true;
    }

    private createMuteButton(): void {
        this.muteButton = document.createElement('button');
        this.muteButton.id = 'mute-button';
        this.muteButton.style.cssText = `
            position: fixed;
            bottom: 16px;
            left: 16px;
            width: 44px;
            height: 44px;
            background: rgba(0, 0, 0, 0.6);
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 24px;
            z-index: 1001;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s;
        `;
        this.muteButton.innerHTML = '🔊';
        this.muteButton.title = 'Toggle sound';

        this.muteButton.addEventListener('mouseenter', () => {
            if (this.muteButton) this.muteButton.style.background = 'rgba(0, 0, 0, 0.8)';
        });
        this.muteButton.addEventListener('mouseleave', () => {
            if (this.muteButton) this.muteButton.style.background = 'rgba(0, 0, 0, 0.6)';
        });

        this.muteButton.addEventListener('click', (e) => {
            e.stopPropagation();
            AudioManager.toggleMute();
            this.updateMuteButton();
        });

        document.body.appendChild(this.muteButton);
    }

    private updateMuteButton(): void {
        if (this.muteButton) {
            this.muteButton.innerHTML = AudioManager.isMuted ? '🔇' : '🔊';
        }
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
            const total = this.coins.length;
            if (total > 0) {
                if (this.coinsCollected >= total) {
                    this.coinHud.textContent = `All coins collected!`;
                    this.coinHud.style.color = '#4ad97a';
                } else {
                    this.coinHud.textContent = `Coins: ${this.coinsCollected}/${total}`;
                    this.coinHud.style.color = '#ffffff';
                }
                this.coinHud.style.display = 'block';
            } else {
                this.coinHud.style.display = 'none';
            }
        }
    }

    private hideCoinHud(): void {
        if (this.coinHud) {
            this.coinHud.style.display = 'none';
        }
    }

    private createChestHud(): void {
        this.chestHud = document.createElement('div');
        this.chestHud.id = 'chest-hud';
        this.chestHud.style.cssText = `
            position: fixed;
            top: 50px;
            left: 10px;
            background: rgba(0, 0, 0, 0.7);
            color: #fff;
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            font-family: sans-serif;
            display: none;
            z-index: 100;
        `;
        document.body.appendChild(this.chestHud);
    }

    private updateChestHud(): void {
        if (this.chestHud && this.chest) {
            // Only show HUD if any player is within ~400px of chest
            const SHOW_DISTANCE = 400;
            let anyPlayerClose = false;
            for (const player of this.players) {
                const dx = player.centerX - this.chest.centerX;
                const dy = player.centerY - this.chest.centerY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < SHOW_DISTANCE) {
                    anyPlayerClose = true;
                    break;
                }
            }

            if (!anyPlayerClose) {
                this.chestHud.style.display = 'none';
                return;
            }

            const carrierCount = this.chest.getCarrierCount();
            const requiredCarriers = this.chest.getRequiredCarriers();
            const isCarrying = this.chest.isBeingCarried();

            if (isCarrying) {
                this.chestHud.style.color = '#4ad97a';
                this.chestHud.textContent = 'Carrying chest! Return to spawn';
            } else {
                this.chestHud.style.color = '#d9d94a';
                this.chestHud.textContent = `Chest: ${carrierCount}/${requiredCarriers} players nearby`;
            }
            this.chestHud.style.display = 'block';
        }
    }

    private hideChestHud(): void {
        if (this.chestHud) {
            this.chestHud.style.display = 'none';
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
        this.hideChestHud();
        this.musicStarted = false;
        this.multiplayerUI.showMainMenu();

        // Start music on first user interaction (required by browser autoplay policy)
        const startMusic = async () => {
            if (this.musicStarted) return;
            this.musicStarted = true;

            // Ensure audio is loaded
            if (!this.audioReady) {
                await AudioManager.preload('menu_music', `${import.meta.env.BASE_URL}audio/menu_music.wav`);
            }
            AudioManager.playMusic('menu_music', 0.8);
            document.removeEventListener('click', startMusic);
            document.removeEventListener('keydown', startMusic);
        };

        document.addEventListener('click', startMusic, { once: false });
        document.addEventListener('keydown', startMusic, { once: false });
    }

    private async startSinglePlayer(characterId: number): Promise<void> {
        this.mode = 'single';
        this.selectedCharacterId = characterId;
        AudioManager.stopMusic();
        AudioManager.playMusic('level_music', 0.5);
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
        AudioManager.stopMusic();
        AudioManager.playMusic('level_music', 0.5);
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
        AudioManager.stopMusic();
        AudioManager.playMusic('level_music', 0.5);
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
        this.chest = null;
        this.chestActivated = false;
        this.renderer.setBackgroundColor(0x6ab0de, 0x4a7a4a); // Reset to normal colors
        this.coinsCollected = 0;
        this.hasWon = false;
        this.levelTime = 0;
        this.updateCoinHud();
        Monster.isMultiplayerMode = false;

        const spawn = this.levelManager.getSpawnPoint();
        this.spawnPoint = { x: spawn.x, y: spawn.y };
        Monster.spawnPoint = this.spawnPoint;
        const player = new Player(spawn.x, spawn.y, this.selectedCharacterId, false);
        this.players.push(player);
        this.entities.push(player);
        this.debug.setPlayer(player);

        // Create return base at spawn point
        this.returnBase = new ReturnBase(spawn.x, spawn.y);
        this.entities.push(this.returnBase);

        const bounds = this.levelManager.getWorldBounds();
        this.camera.setWorldBounds(bounds.width, bounds.height);
        this.deathY = bounds.height + 200;
        this.victoryPoint = this.levelManager.getVictoryPoint();

        // Spawn coins (monsters spawn when escape sequence activates)
        this.spawnCoins();

        // Spawn chest immediately if no coins, otherwise wait for all coins
        if (this.coins.length === 0 && this.victoryPoint) {
            this.chest = new Chest(this.victoryPoint.x, this.victoryPoint.y);
            this.entities.push(this.chest);
        }

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
        const levelMonsters = this.levelManager.getMonsters();

        // If level has defined monsters, use those positions
        if (levelMonsters.length > 0) {
            for (const monsterData of levelMonsters) {
                // Find platform at or near the monster's position
                const platform = this.findPlatformAt(platforms, monsterData.x, monsterData.y);
                if (platform) {
                    const monster = new Monster(platform);
                    // Position monster at the specified X (adjusted for monster width)
                    monster.position.x = monsterData.x - monster.width / 2;
                    this.monsters.push(monster);
                    this.entities.push(monster);
                }
            }
            return;
        }

        // Fall back to random spawning if no level-defined monsters
        const eligiblePlatforms = platforms.filter(p =>
            p.width >= 200 && !p.hasTag('spawn-platform')
        );

        if (eligiblePlatforms.length > 0) {
            const platform = eligiblePlatforms[Math.floor(Math.random() * eligiblePlatforms.length)];
            const monster = new Monster(platform);
            this.monsters.push(monster);
            this.entities.push(monster);
        }
    }

    private findPlatformAt(platforms: Platform[], x: number, y: number): Platform | null {
        // Find platform below the given position (within reasonable range)
        const searchRange = 100;
        let bestPlatform: Platform | null = null;
        let bestDistance = Infinity;

        for (const platform of platforms) {
            // Check if x is within platform bounds
            if (x >= platform.position.x && x <= platform.position.x + platform.width) {
                // Check if platform is at or below y position
                const distance = platform.position.y - y;
                if (distance >= 0 && distance < searchRange && distance < bestDistance) {
                    bestDistance = distance;
                    bestPlatform = platform;
                }
            }
        }

        return bestPlatform;
    }

    private spawnCoins(): void {
        const levelCoins = this.levelManager.getCoins();

        // If level has defined coins, use those positions
        if (levelCoins.length > 0) {
            for (const coinData of levelCoins) {
                const coin = new Coin(coinData.x - 12, coinData.y - 24);
                this.coins.push(coin);
                this.entities.push(coin);
            }
            return;
        }

        // Fall back to random spawning if no level-defined coins
        const platforms = this.entities.filter(e => e.hasTag('platform')) as Platform[];

        for (const platform of platforms) {
            if (platform.hasTag('spawn-platform')) continue;
            if (Math.random() > 0.2) continue;

            const x = platform.position.x + platform.width / 2 - 12;
            const y = platform.position.y - 50;
            const coin = new Coin(x, y);
            this.coins.push(coin);
            this.entities.push(coin);
        }
    }

    private spawnChest(): void {
        if (!this.victoryPoint || this.chest) return;

        this.chest = new Chest(this.victoryPoint.x, this.victoryPoint.y);
        this.entities.push(this.chest);
        this.chest.createMesh();
        this.chest.addToScene(this.renderer);
    }

    private setupLevelMultiplayer(playerCount: number): void {
        this.entities = this.levelManager.getEntities();
        this.players = [];
        this.monsters = [];
        this.coins = [];
        this.chest = null;
        this.chestActivated = false;
        this.renderer.setBackgroundColor(0x6ab0de, 0x4a7a4a); // Reset to normal colors
        this.coinsCollected = 0;
        this.levelTime = 0;
        this.updateCoinHud();
        this.deaths = [0, 0];
        this.hasWon = false;
        Monster.isMultiplayerMode = true;

        const spawn = this.levelManager.getSpawnPoint();
        this.spawnPoint = { x: spawn.x, y: spawn.y };
        Monster.spawnPoint = this.spawnPoint;

        // Create return base at spawn point
        this.returnBase = new ReturnBase(spawn.x, spawn.y);
        this.entities.push(this.returnBase);

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

        // Spawn coins (monsters spawn when escape sequence activates)
        this.spawnCoins();

        // Spawn chest immediately if no coins, otherwise wait for all coins
        if (this.coins.length === 0 && this.victoryPoint) {
            this.chest = new Chest(this.victoryPoint.x, this.victoryPoint.y);
            this.entities.push(this.chest);
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
        if (this.players.length === 0) return;

        // Track level time
        if (!this.hasWon) {
            this.levelTime += dt;
        }

        if (this.mode === 'client') {
            this.updateAsClient(dt);
        } else {
            this.updateAsHostOrSingle(dt);
        }

        // Update chest HUD
        this.updateChestHud();

        // Clear per-frame input states
        this.input.clear();
    }

    private updateAsHostOrSingle(dt: number): void {
        const platforms = this.entities.filter(e => e.hasTag('platform')) as Platform[];

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
            this.physics.update(player, platforms, dt);

            // Check for death
            if (player.position.y > this.deathY) {
                this.respawnPlayer(player);
            }

            // Old per-player victory removed - now using chest mechanic

            // Check monster collisions
            const isMultiplayer = this.players.length > 1;
            for (const monster of this.monsters) {
                const collision = monster.checkPlayerCollision(player, isMultiplayer);
                if (collision === 'kill') {
                    this.respawnPlayer(player);
                    break;
                } else if (collision === 'stomp' || collision === 'back_attack') {
                    monster.kill();
                    player.velocity.y = -400; // Bounce up after stomp/back attack
                }
            }

            // Check coin collection
            for (const coin of this.coins) {
                if (coin.checkPlayerCollision(player)) {
                    coin.collect();
                    AudioManager.play('coin', 0.4);
                    this.coinsCollected++;
                    this.updateCoinHud();

                    // Check if all coins collected - spawn the chest
                    if (this.coinsCollected >= this.coins.length && !this.chest && this.victoryPoint) {
                        this.spawnChest();
                    }
                }
            }
        }

        // Update monsters - check for players on their platforms
        for (const monster of this.monsters) {
            monster.checkForPlayers(this.players);
        }

        // Update chest - check if players can carry it and run physics
        if (this.chest && !this.hasWon) {
            this.chest.checkCarriers(this.players);

            // Update return base glow based on chest carrying state
            if (this.returnBase) {
                this.returnBase.setActive(this.chest.isBeingCarried());
            }

            // First time chest is picked up - activate escape sequence!
            if (this.chest.isBeingCarried() && !this.chestActivated) {
                this.chestActivated = true;
                this.activateChestEscape(platforms);
            }

            this.chest.updatePhysics(dt, platforms);

            // Check if chest fell off the level - respawn to nearest platform edge
            if (this.chest.position.y > this.deathY) {
                this.respawnChestToNearestPlatform(platforms);
            }

            // Check if chest reached return base
            if (this.returnBase) {
                const dx = this.chest.centerX - this.returnBase.centerX;
                const dy = this.chest.centerY - this.returnBase.centerY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 70) {
                    this.hasWon = true;
                    this.showVictory();
                    if (this.mode === 'host') {
                        this.hostSession?.sendVictory(-1); // -1 indicates team victory
                    }
                }
            }
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

    private formatTime(seconds: number): string {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    private showVictory(): void {
        // Stop music and play victory fanfare
        AudioManager.stopMusic(0.3);
        AudioManager.play('victory', 0.7);

        const totalDeaths = this.deaths.reduce((a, b) => a + b, 0);
        const totalCoins = this.coins.length;
        const timeStr = this.formatTime(this.levelTime);
        const overlay = document.createElement('div');
        overlay.className = 'victory-overlay';
        overlay.innerHTML = `
            <div class="victory-content">
                <h1>Victory!</h1>
                <p>Chest delivered to base!</p>
                <p>Time: ${timeStr}</p>
                <p>Coins: ${this.coinsCollected} / ${totalCoins}</p>
                <p>Deaths: ${totalDeaths}</p>
                <button id="playAgain">Play Again</button>
            </div>
        `;
        document.body.appendChild(overlay);

        document.getElementById('playAgain')?.addEventListener('click', () => {
            overlay.remove();
            this.resetGameState();
        });
    }

    private resetGameState(): void {
        // Reset win state
        this.hasWon = false;
        this.chestActivated = false;
        for (const player of this.players) {
            player.hasReachedVictory = false;
        }

        // Reset background and music
        this.renderer.setBackgroundColor(0x6ab0de, 0x4a7a4a);
        AudioManager.playMusic('level_music', 0.5);

        // Reset chest
        if (this.chest) {
            this.chest.removeFromScene(this.renderer);
            this.entities = this.entities.filter(e => e !== this.chest);
            this.chest = null;
        }

        // Remove all monsters
        for (const monster of this.monsters) {
            monster.removeFromScene(this.renderer);
        }
        this.monsters = [];
        this.entities = this.entities.filter(e => !e.hasTag('monster'));

        // Reset coins
        this.coinsCollected = 0;
        for (const coin of this.coins) {
            coin.reset();
        }
        this.updateCoinHud();

        // Spawn chest if no coins, otherwise wait for collection
        if (this.coins.length === 0 && this.victoryPoint) {
            this.spawnChest();
        }

        // Reset deaths and time
        this.deaths = this.players.map(() => 0);
        this.levelTime = 0;

        // Respawn all players
        this.respawnAllPlayers();
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

    private respawnChestToNearestPlatform(platforms: Platform[]): void {
        if (!this.chest || platforms.length === 0) return;

        const chestX = this.chest.centerX;

        // Find the nearest platform edge
        let nearestX = 0;
        let nearestY = 0;
        let nearestDist = Infinity;

        for (const platform of platforms) {
            // Check left edge
            const leftEdgeX = platform.left + this.chest.width / 2;
            const leftDist = Math.abs(chestX - leftEdgeX);
            if (leftDist < nearestDist) {
                nearestDist = leftDist;
                nearestX = platform.left;
                nearestY = platform.top - this.chest.height;
            }

            // Check right edge
            const rightEdgeX = platform.right - this.chest.width / 2;
            const rightDist = Math.abs(chestX - rightEdgeX);
            if (rightDist < nearestDist) {
                nearestDist = rightDist;
                nearestX = platform.right - this.chest.width;
                nearestY = platform.top - this.chest.height;
            }

            // Check center of platform
            const centerX = platform.centerX;
            const centerDist = Math.abs(chestX - centerX);
            if (centerDist < nearestDist) {
                nearestDist = centerDist;
                nearestX = centerX - this.chest.width / 2;
                nearestY = platform.top - this.chest.height;
            }
        }

        // Respawn chest
        this.chest.position.x = nearestX;
        this.chest.position.y = nearestY;
        this.chest.velocity.set(0, 0);
    }

    private activateChestEscape(platforms: Platform[]): void {
        // Change background to fiery red and switch to escape music
        this.renderer.setBackgroundColor(0x8b2500, 0x4a2020);
        AudioManager.stopMusic(0.3);
        AudioManager.playMusic('escape_music', 0.6);

        // Show the return base
        if (this.returnBase) {
            this.returnBase.show();
        }

        // Spawn all monsters now (they only appear during escape)
        this.spawnMonsters();

        // Create meshes and add to scene for newly spawned monsters
        for (const monster of this.monsters) {
            monster.createMesh();
            monster.addToScene(this.renderer);
        }

        // Play roar sound for dramatic effect
        if (this.monsters.length > 0) {
            AudioManager.play('monster_roar', 0.7);
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
