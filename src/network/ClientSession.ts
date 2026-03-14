import { NetworkManager } from './NetworkManager';
import {
    NetworkMessage,
    InputMessage,
    StateMessage,
    InputState,
    PlayerState,
    isStateMessage
} from './Protocol';

export class ClientSession {
    private networkManager: NetworkManager;
    private inputSeq: number = 0;
    private latestState: PlayerState[] | null = null;
    private lastStateSeq: number = -1;
    private onStartCallback: ((level: string) => void) | null = null;
    private onVictoryCallback: ((playerId: number) => void) | null = null;
    private onRespawnCallback: ((playerId: number) => void) | null = null;

    constructor(networkManager: NetworkManager) {
        this.networkManager = networkManager;
    }

    setOnStart(callback: (level: string) => void): void {
        this.onStartCallback = callback;
    }

    setOnVictory(callback: (playerId: number) => void): void {
        this.onVictoryCallback = callback;
    }

    setOnRespawn(callback: (playerId: number) => void): void {
        this.onRespawnCallback = callback;
    }

    handleMessage(message: NetworkMessage): void {
        if (isStateMessage(message)) {
            this.handleState(message);
        } else if (message.type === 'start') {
            this.onStartCallback?.(message.level);
        } else if (message.type === 'victory') {
            this.onVictoryCallback?.(message.playerId);
        } else if (message.type === 'respawn') {
            this.onRespawnCallback?.(message.playerId);
        }
    }

    private handleState(message: StateMessage): void {
        // Only accept newer states
        if (message.seq > this.lastStateSeq) {
            this.latestState = message.players;
            this.lastStateSeq = message.seq;
        }
    }

    getLatestState(): PlayerState[] | null {
        const state = this.latestState;
        this.latestState = null;
        return state;
    }

    sendInput(input: InputState): void {
        const message: InputMessage = {
            type: 'input',
            keys: input,
            seq: this.inputSeq++
        };
        this.networkManager.send(message);
    }

    sendReady(): void {
        this.networkManager.send({ type: 'ready' });
    }
}
