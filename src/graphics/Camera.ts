import { Vector2 } from '../utils/Vector2';
import { CAMERA } from '../utils/constants';
import { Entity } from '../entities/Entity';

export interface VisibleBounds {
    left: number;
    right: number;
    top: number;
    bottom: number;
}

export class Camera {
    position: Vector2;
    viewportWidth: number;
    viewportHeight: number;
    worldWidth: number;
    worldHeight: number;
    deadZone: { x: number; y: number };
    target: Vector2;

    constructor(viewportWidth: number, viewportHeight: number) {
        this.position = new Vector2(0, 0);
        this.viewportWidth = viewportWidth;
        this.viewportHeight = viewportHeight;
        this.worldWidth = viewportWidth;
        this.worldHeight = viewportHeight;
        this.deadZone = {
            x: CAMERA.DEAD_ZONE_X,
            y: CAMERA.DEAD_ZONE_Y
        };
        this.target = new Vector2(0, 0);
    }

    setWorldBounds(width: number, height: number): void {
        this.worldWidth = width;
        this.worldHeight = height;
    }

    follow(entity: Entity, dt: number): void {
        const deadLeft = this.position.x + (this.viewportWidth - this.deadZone.x) / 2;
        const deadRight = this.position.x + (this.viewportWidth + this.deadZone.x) / 2;
        const deadTop = this.position.y + (this.viewportHeight - this.deadZone.y) / 2;
        const deadBottom = this.position.y + (this.viewportHeight + this.deadZone.y) / 2;

        if (entity.centerX < deadLeft) {
            this.target.x = entity.centerX - (this.viewportWidth - this.deadZone.x) / 2;
        } else if (entity.centerX > deadRight) {
            this.target.x = entity.centerX - (this.viewportWidth + this.deadZone.x) / 2;
        }

        if (entity.centerY < deadTop) {
            this.target.y = entity.centerY - (this.viewportHeight - this.deadZone.y) / 2;
        } else if (entity.centerY > deadBottom) {
            this.target.y = entity.centerY - (this.viewportHeight + this.deadZone.y) / 2;
        }

        const smoothing = 1 - Math.pow(0.001, dt * CAMERA.SMOOTH_SPEED);
        this.position.x += (this.target.x - this.position.x) * smoothing;
        this.position.y += (this.target.y - this.position.y) * smoothing;

        this.clampToBounds();
    }

    private clampToBounds(): void {
        this.position.x = Math.max(0, Math.min(this.position.x, this.worldWidth - this.viewportWidth));
        this.position.y = Math.max(0, Math.min(this.position.y, this.worldHeight - this.viewportHeight));
    }

    getVisibleBounds(): VisibleBounds {
        return {
            left: this.position.x,
            right: this.position.x + this.viewportWidth,
            top: this.position.y,
            bottom: this.position.y + this.viewportHeight
        };
    }

    isVisible(entity: Entity): boolean {
        const bounds = this.getVisibleBounds();
        return entity.right > bounds.left &&
               entity.left < bounds.right &&
               entity.bottom > bounds.top &&
               entity.top < bounds.bottom;
    }
}
