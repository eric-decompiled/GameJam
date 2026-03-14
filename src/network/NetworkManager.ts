import { NetworkMessage } from './Protocol';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

const SERVER_PORT = 9000;

export interface NetworkCallbacks {
    onMessage: (message: NetworkMessage) => void;
    onConnected: () => void;
    onDisconnected: () => void;
    onError: (error: string) => void;
}

export class NetworkManager {
    private ws: WebSocket | null = null;
    private callbacks: NetworkCallbacks | null = null;
    private _state: ConnectionState = 'disconnected';
    private _roomCode: string = '';
    private _isHost: boolean = false;

    get state(): ConnectionState {
        return this._state;
    }

    get roomCode(): string {
        return this._roomCode;
    }

    get isHost(): boolean {
        return this._isHost;
    }

    get isConnected(): boolean {
        return this._state === 'connected';
    }

    setCallbacks(callbacks: NetworkCallbacks): void {
        this.callbacks = callbacks;
    }

    private generateRoomCode(): string {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        return code;
    }

    private getServerUrl(): string {
        const host = window.location.hostname || 'localhost';
        return `ws://${host}:${SERVER_PORT}`;
    }

    async host(): Promise<string> {
        return new Promise((resolve, reject) => {
            this._isHost = true;
            this._roomCode = this.generateRoomCode();
            this._state = 'connecting';

            this.ws = new WebSocket(this.getServerUrl());

            this.ws.onopen = () => {
                console.log('Connected to relay server');
                this.ws!.send(JSON.stringify({ type: 'host', code: this._roomCode }));
            };

            this.ws.onmessage = (event) => {
                const msg = JSON.parse(event.data);

                if (msg.type === 'hosted') {
                    console.log('Room created:', msg.code);
                    resolve(this._roomCode);
                } else if (msg.type === 'client-connected') {
                    console.log('Client connected to room');
                    this._state = 'connected';
                    this.callbacks?.onConnected();
                } else if (msg.type === 'relay') {
                    this.callbacks?.onMessage(msg.data as NetworkMessage);
                } else if (msg.type === 'peer-disconnected') {
                    this._state = 'disconnected';
                    this.callbacks?.onDisconnected();
                } else if (msg.type === 'error') {
                    this._state = 'error';
                    this.callbacks?.onError(msg.message);
                    reject(new Error(msg.message));
                }
            };

            this.ws.onerror = () => {
                this._state = 'error';
                this.callbacks?.onError('Failed to connect to server');
                reject(new Error('WebSocket error'));
            };

            this.ws.onclose = () => {
                if (this._state === 'connected') {
                    this._state = 'disconnected';
                    this.callbacks?.onDisconnected();
                }
            };
        });
    }

    async join(code: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this._isHost = false;
            this._roomCode = code.toUpperCase();
            this._state = 'connecting';

            this.ws = new WebSocket(this.getServerUrl());

            this.ws.onopen = () => {
                console.log('Connected to relay server');
                this.ws!.send(JSON.stringify({ type: 'join', code: this._roomCode }));
            };

            this.ws.onmessage = (event) => {
                const msg = JSON.parse(event.data);

                if (msg.type === 'joined') {
                    console.log('Joined room:', msg.code);
                    this._state = 'connected';
                    this.callbacks?.onConnected();
                    resolve();
                } else if (msg.type === 'relay') {
                    this.callbacks?.onMessage(msg.data as NetworkMessage);
                } else if (msg.type === 'peer-disconnected') {
                    this._state = 'disconnected';
                    this.callbacks?.onDisconnected();
                } else if (msg.type === 'error') {
                    this._state = 'error';
                    this.callbacks?.onError(msg.message);
                    reject(new Error(msg.message));
                }
            };

            this.ws.onerror = () => {
                this._state = 'error';
                this.callbacks?.onError('Failed to connect to server');
                reject(new Error('WebSocket error'));
            };

            this.ws.onclose = () => {
                if (this._state === 'connected') {
                    this._state = 'disconnected';
                    this.callbacks?.onDisconnected();
                }
            };
        });
    }

    send(message: NetworkMessage): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'relay', data: message }));
        }
    }

    disconnect(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this._state = 'disconnected';
        this._roomCode = '';
    }
}
