import { NetworkManager } from './NetworkManager';
import {
    NetworkMessage,
    InputMessage,
    StateMessage,
    PlayerState,
    InputState,
    WorldState,
    isInputMessage
} from './Protocol';

export class HostSession {
    private networkManager: NetworkManager;
    private clientInput: InputState | null = null;
    private clientPosition: { x: number; y: number } | null = null;
    private prevJumpHeld: boolean = false;
    private stateSeq: number = 0;
    private clientReady: boolean = false;
    private onClientReadyCallback: (() => void) | null = null;

    constructor(networkManager: NetworkManager) {
        this.networkManager = networkManager;
    }

    setOnClientReady(callback: () => void): void {
        this.onClientReadyCallback = callback;
    }

    handleMessage(message: NetworkMessage): void {
        if (isInputMessage(message)) {
            this.handleInput(message);
        } else if (message.type === 'ready') {
            this.clientReady = true;
            this.onClientReadyCallback?.();
        }
    }

    private handleInput(message: InputMessage): void {
        // Track jump state transitions locally to avoid missing one-frame events
        const jumpHeld = message.keys.jump;
        const jumpJustPressed = jumpHeld && !this.prevJumpHeld;
        const jumpJustReleased = !jumpHeld && this.prevJumpHeld;
        this.prevJumpHeld = jumpHeld;

        this.clientInput = {
            ...message.keys,
            jumpJustPressed,
            jumpJustReleased
        };

        // Store client's reported position for collision detection
        if (message.x !== undefined && message.y !== undefined) {
            this.clientPosition = { x: message.x, y: message.y };
        }
    }

    getClientInput(): InputState | null {
        const input = this.clientInput;
        // Clear just-pressed/released after reading so they only fire once
        if (this.clientInput) {
            this.clientInput = {
                ...this.clientInput,
                jumpJustPressed: false,
                jumpJustReleased: false
            };
        }
        return input;
    }

    getClientPosition(): { x: number; y: number } | null {
        return this.clientPosition;
    }

    isClientReady(): boolean {
        return this.clientReady;
    }

    broadcastState(players: PlayerState[], world?: WorldState): void {
        const message: StateMessage = {
            type: 'state',
            players,
            world,
            seq: this.stateSeq++
        };
        this.networkManager.send(message);
    }

    sendStart(level: string): void {
        this.networkManager.send({
            type: 'start',
            level
        });
    }

    sendVictory(playerId: number): void {
        this.networkManager.send({
            type: 'victory',
            playerId
        });
    }

    sendRespawn(playerId: number): void {
        this.networkManager.send({
            type: 'respawn',
            playerId
        });
    }
}
