// Network message types for multiplayer communication

export interface InputState {
    left: boolean;
    right: boolean;
    up: boolean;
    down: boolean;
    jump: boolean;
    jumpJustPressed: boolean;
    jumpJustReleased: boolean;
}

export interface InputMessage {
    type: 'input';
    keys: InputState;
    seq: number;
}

export interface PlayerState {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    grounded: boolean;
    facingRight: boolean;
    animState: 'idle' | 'walk' | 'run' | 'jump';
}

export interface StateMessage {
    type: 'state';
    players: PlayerState[];
    seq: number;
}

export interface StartMessage {
    type: 'start';
    level: string;
}

export interface RespawnMessage {
    type: 'respawn';
    playerId: number;
}

export interface VictoryMessage {
    type: 'victory';
    playerId: number;
}

export interface ReadyMessage {
    type: 'ready';
}

export type ControlMessage = StartMessage | RespawnMessage | VictoryMessage | ReadyMessage;

export type NetworkMessage = InputMessage | StateMessage | ControlMessage;

export function isInputMessage(msg: NetworkMessage): msg is InputMessage {
    return msg.type === 'input';
}

export function isStateMessage(msg: NetworkMessage): msg is StateMessage {
    return msg.type === 'state';
}

export function isControlMessage(msg: NetworkMessage): msg is ControlMessage {
    return msg.type === 'start' || msg.type === 'respawn' || msg.type === 'victory' || msg.type === 'ready';
}
