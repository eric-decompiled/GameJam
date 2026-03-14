import * as THREE from 'three';
import { Entity } from './Entity';
import { Renderer } from '../graphics/Renderer';
import { Vector2 } from '../utils/Vector2';

export interface PathPoint {
    x: number;
    y: number;
}

export class Platform extends Entity {
    color: number = 0x5d4e37;
    topColor: number = 0x7a6b54;

    constructor(x: number, y: number, width: number, height: number) {
        super(x, y, width, height);
        this.addTag('platform');
        this.addTag('solid');
        this.depth = 60;
    }

    createMesh(): THREE.Object3D {
        this.mesh = new THREE.Group();

        const bodyGeom = new THREE.BoxGeometry(this.width, this.height, this.depth);
        const bodyMat = new THREE.MeshLambertMaterial({ color: this.color });
        const body = new THREE.Mesh(bodyGeom, bodyMat);
        body.castShadow = true;
        body.receiveShadow = true;
        this.mesh.add(body);

        const topGeom = new THREE.BoxGeometry(this.width, 8, this.depth);
        const topMat = new THREE.MeshLambertMaterial({ color: this.topColor });
        const top = new THREE.Mesh(topGeom, topMat);
        top.position.y = this.height / 2 - 4;
        top.castShadow = true;
        this.mesh.add(top);

        this.updateMeshPosition();
        return this.mesh;
    }

    render(_renderer: Renderer): void {
        this.updateMeshPosition();
    }
}

export class MovingPlatform extends Platform {
    path: PathPoint[];
    currentPathIndex: number = 0;
    speed: number;
    lastPosition: Vector2;
    deltaPosition: Vector2;
    waitTime: number = 0.5;
    currentWait: number = 0;
    waiting: boolean = false;

    constructor(x: number, y: number, width: number, height: number, path: PathPoint[], speed: number = 100) {
        super(x, y, width, height);
        this.addTag('moving');
        this.color = 0x6a5a4a;
        this.topColor = 0x8a7a6a;

        this.path = path || [{ x, y }];
        this.speed = speed;
        this.lastPosition = new Vector2(x, y);
        this.deltaPosition = new Vector2(0, 0);
    }

    update(dt: number): void {
        this.lastPosition.set(this.position.x, this.position.y);

        if (this.waiting) {
            this.currentWait -= dt;
            if (this.currentWait <= 0) {
                this.waiting = false;
                this.currentPathIndex = (this.currentPathIndex + 1) % this.path.length;
            }
        } else {
            const target = this.path[this.currentPathIndex];
            const dx = target.x - this.position.x;
            const dy = target.y - this.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < this.speed * dt) {
                this.position.set(target.x, target.y);
                this.waiting = true;
                this.currentWait = this.waitTime;
            } else {
                const moveX = (dx / distance) * this.speed * dt;
                const moveY = (dy / distance) * this.speed * dt;
                this.position.x += moveX;
                this.position.y += moveY;
            }
        }

        this.deltaPosition.set(
            this.position.x - this.lastPosition.x,
            this.position.y - this.lastPosition.y
        );
    }

    getDeltaPosition(): Vector2 {
        return this.deltaPosition;
    }

    render(_renderer: Renderer): void {
        this.updateMeshPosition();
    }
}
