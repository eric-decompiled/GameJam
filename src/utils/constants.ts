export const GAME = {
    WIDTH: 800,
    HEIGHT: 600,
    FPS: 60,
    TIMESTEP: 1000 / 60,
    MAX_FRAME_SKIP: 5
} as const;

export const PHYSICS = {
    GRAVITY: 1800,
    MAX_FALL_SPEED: 800
} as const;

export const PLAYER = {
    WIDTH: 32,
    HEIGHT: 48,
    ACCELERATION: 2000,
    FRICTION: 1500,
    MAX_SPEED: 300,
    JUMP_FORCE: 550,
    JUMP_CUT_MULTIPLIER: 0.4,
    COYOTE_TIME: 100,
    JUMP_BUFFER_TIME: 100,
    COLOR: '#4a90d9',
    OUTLINE_COLOR: '#2d5a87'
} as const;

export const PLATFORM = {
    COLOR: '#5d4e37',
    OUTLINE_COLOR: '#3d3227',
    MOVING_COLOR: '#7a6b54'
} as const;

export const CAMERA = {
    DEAD_ZONE_X: 100,
    DEAD_ZONE_Y: 80,
    SMOOTH_SPEED: 5
} as const;

export const COLORS = {
    BACKGROUND: '#87ceeb',
    DEBUG: '#ff0000'
} as const;
