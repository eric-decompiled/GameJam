import * as THREE from 'three';
import { Vector2 } from '../utils/Vector2';
import { Renderer } from '../graphics/Renderer';

export interface Bounds {
    x: number;
    y: number;
    width: number;
    height: number;
    left: number;
    right: number;
    top: number;
    bottom: number;
}

export class Entity {
    position: Vector2;
    velocity: Vector2;
    width: number;
    height: number;
    tags: Set<string>;
    active: boolean;
    mesh: THREE.Object3D | null;
    depth: number;

    constructor(x: number = 0, y: number = 0, width: number = 32, height: number = 32) {
        this.position = new Vector2(x, y);
        this.velocity = new Vector2(0, 0);
        this.width = width;
        this.height = height;
        this.tags = new Set();
        this.active = true;
        this.mesh = null;
        this.depth = 32;
    }

    addTag(tag: string): this {
        this.tags.add(tag);
        return this;
    }

    removeTag(tag: string): this {
        this.tags.delete(tag);
        return this;
    }

    hasTag(tag: string): boolean {
        return this.tags.has(tag);
    }

    get left(): number { return this.position.x; }
    get right(): number { return this.position.x + this.width; }
    get top(): number { return this.position.y; }
    get bottom(): number { return this.position.y + this.height; }

    get centerX(): number { return this.position.x + this.width / 2; }
    get centerY(): number { return this.position.y + this.height / 2; }

    intersects(other: Entity): boolean {
        return this.left < other.right &&
               this.right > other.left &&
               this.top < other.bottom &&
               this.bottom > other.top;
    }

    getBounds(): Bounds {
        return {
            x: this.position.x,
            y: this.position.y,
            width: this.width,
            height: this.height,
            left: this.left,
            right: this.right,
            top: this.top,
            bottom: this.bottom
        };
    }

    createMesh(): THREE.Object3D {
        const geometry = new THREE.BoxGeometry(this.width, this.height, this.depth);
        const material = new THREE.MeshLambertMaterial({ color: 0x888888 });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        this.updateMeshPosition();
        return this.mesh;
    }

    updateMeshPosition(): void {
        if (this.mesh) {
            const pos = Renderer.gameToThreePos(
                this.position.x,
                this.position.y,
                this.width,
                this.height
            );
            this.mesh.position.x = pos.x;
            this.mesh.position.y = pos.y;
        }
    }

    addToScene(renderer: Renderer): void {
        if (this.mesh) {
            renderer.add(this.mesh);
        }
    }

    removeFromScene(renderer: Renderer): void {
        if (this.mesh) {
            renderer.remove(this.mesh);
        }
    }

    update(_dt: number): void {
        // Override in subclasses
    }

    render(_renderer: Renderer): void {
        this.updateMeshPosition();
    }
}
