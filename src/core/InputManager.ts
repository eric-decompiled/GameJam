type KeyState = Record<string, boolean>;

export class InputManager {
    private keys: KeyState = {};
    private justPressed: KeyState = {};
    private justReleased: KeyState = {};

    constructor() {
        this.setupListeners();
    }

    private setupListeners(): void {
        window.addEventListener('keydown', (e: KeyboardEvent) => {
            if (!this.keys[e.code]) {
                this.justPressed[e.code] = true;
            }
            this.keys[e.code] = true;

            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
                e.preventDefault();
            }
        });

        window.addEventListener('keyup', (e: KeyboardEvent) => {
            this.keys[e.code] = false;
            this.justReleased[e.code] = true;
        });

        window.addEventListener('blur', () => {
            this.keys = {};
        });
    }

    isDown(key: string): boolean {
        return !!this.keys[key];
    }

    isJustPressed(key: string): boolean {
        return !!this.justPressed[key];
    }

    isJustReleased(key: string): boolean {
        return !!this.justReleased[key];
    }

    clear(): void {
        this.justPressed = {};
        this.justReleased = {};
    }

    getHorizontalAxis(): number {
        let axis = 0;
        if (this.isDown('ArrowLeft') || this.isDown('KeyA')) axis -= 1;
        if (this.isDown('ArrowRight') || this.isDown('KeyD')) axis += 1;
        return axis;
    }

    isJumpPressed(): boolean {
        return this.isDown('Space') || this.isDown('ArrowUp') || this.isDown('KeyW');
    }

    isJumpJustPressed(): boolean {
        return this.isJustPressed('Space') || this.isJustPressed('ArrowUp') || this.isJustPressed('KeyW');
    }

    isJumpJustReleased(): boolean {
        return this.isJustReleased('Space') || this.isJustReleased('ArrowUp') || this.isJustReleased('KeyW');
    }
}
