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
    private prevJumpHeld: boolean = false;
    private pendingJumpPress: boolean = false; // Latch for jump press - persists until consumed
    private pendingJumpRelease: boolean = false; // Latch for jump release
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

        // Latch jump press/release - don't overwrite if already pending
        // This ensures we don't miss jump presses if multiple messages arrive between physics ticks
        if (jumpJustPressed) {
            this.pendingJumpPress = true;
        }
        if (jumpJustReleased) {
            this.pendingJumpRelease = true;
        }

        this.clientInput = {
            ...message.keys,
            jumpJustPressed: this.pendingJumpPress,
            jumpJustReleased: this.pendingJumpRelease
        };
    }

    getClientInput(): InputState | null {
        const input = this.clientInput;
        // Clear latched jump states after reading so they only fire once
        if (this.clientInput) {
            this.clientInput = {
                ...this.clientInput,
                jumpJustPressed: false,
                jumpJustReleased: false
            };
            // Clear the latches so new jump presses can be detected
            this.pendingJumpPress = false;
            this.pendingJumpRelease = false;
        }
        return input;
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
