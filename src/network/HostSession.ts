import { NetworkManager } from './NetworkManager';
import {
    NetworkMessage,
    InputMessage,
    StateMessage,
    PlayerState,
    InputState,
    isInputMessage
} from './Protocol';

export class HostSession {
    private networkManager: NetworkManager;
    private clientInput: InputState | null = null;
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
        this.clientInput = message.keys;
    }

    getClientInput(): InputState | null {
        return this.clientInput;
    }

    isClientReady(): boolean {
        return this.clientReady;
    }

    broadcastState(players: PlayerState[]): void {
        const message: StateMessage = {
            type: 'state',
            players,
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
