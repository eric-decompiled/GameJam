import { Vector2 } from '../utils/Vector2';
import { CAMERA, GAME } from '../utils/constants';
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
    baseViewportWidth: number;
    baseViewportHeight: number;
    worldWidth: number;
    worldHeight: number;
    deadZone: { x: number; y: number };
    target: Vector2;
    zoom: number = 1;
    targetZoom: number = 1;

    constructor(viewportWidth: number, viewportHeight: number) {
        this.position = new Vector2(0, 0);
        this.viewportWidth = viewportWidth;
        this.viewportHeight = viewportHeight;
        this.baseViewportWidth = viewportWidth;
        this.baseViewportHeight = viewportHeight;
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

    followMultiple(entities: Entity[], dt: number): void {
        if (entities.length === 0) return;
        if (entities.length === 1) {
            this.targetZoom = 1;
            this.updateZoom(dt);
            this.follow(entities[0], dt);
            return;
        }

        // Calculate bounding box of all players
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;

        for (const entity of entities) {
            minX = Math.min(minX, entity.centerX);
            maxX = Math.max(maxX, entity.centerX);
            minY = Math.min(minY, entity.centerY);
            maxY = Math.max(maxY, entity.centerY);
        }

        // Calculate midpoint
        const midX = (minX + maxX) / 2;
        const midY = (minY + maxY) / 2;

        // Calculate required zoom to fit all players (with padding)
        const padding = 150;
        const requiredWidth = (maxX - minX) + padding * 2;
        const requiredHeight = (maxY - minY) + padding * 2;

        const zoomX = this.baseViewportWidth / requiredWidth;
        const zoomY = this.baseViewportHeight / requiredHeight;

        // Use the more restrictive zoom, clamped between 0.5 and 1
        this.targetZoom = Math.max(0.5, Math.min(1, Math.min(zoomX, zoomY)));
        this.updateZoom(dt);

        // Update viewport size based on zoom
        this.viewportWidth = this.baseViewportWidth / this.zoom;
        this.viewportHeight = this.baseViewportHeight / this.zoom;

        // Center camera on midpoint
        this.target.x = midX - this.viewportWidth / 2;
        this.target.y = midY - this.viewportHeight / 2;

        const smoothing = 1 - Math.pow(0.001, dt * CAMERA.SMOOTH_SPEED);
        this.position.x += (this.target.x - this.position.x) * smoothing;
        this.position.y += (this.target.y - this.position.y) * smoothing;

        this.clampToBounds();
    }

    private updateZoom(dt: number): void {
        const smoothing = 1 - Math.pow(0.001, dt * CAMERA.SMOOTH_SPEED);
        this.zoom += (this.targetZoom - this.zoom) * smoothing;
    }

    getZoom(): number {
        return this.zoom;
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
