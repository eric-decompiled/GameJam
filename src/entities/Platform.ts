import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Entity } from './Entity';
import { Renderer } from '../graphics/Renderer';
import { Vector2 } from '../utils/Vector2';

export interface PathPoint {
    x: number;
    y: number;
}

// Shared loader and cached model
const gltfLoader = new GLTFLoader();
let cachedPlatformModel: THREE.Object3D | null = null;
let modelLoadPromise: Promise<THREE.Object3D> | null = null;

// Base dimensions of the GLB model (will be measured on first load)
let baseModelWidth = 100;
let baseModelHeight = 32;
let baseModelDepth = 60;

function loadPlatformModel(): Promise<THREE.Object3D> {
    if (cachedPlatformModel) {
        return Promise.resolve(cachedPlatformModel);
    }
    if (modelLoadPromise) {
        return modelLoadPromise;
    }

    modelLoadPromise = new Promise((resolve, reject) => {
        gltfLoader.load(
            `${import.meta.env.BASE_URL}models/Platform_mk1.glb`,
            (gltf) => {
                cachedPlatformModel = gltf.scene;

                // Measure the model's bounding box
                const box = new THREE.Box3().setFromObject(cachedPlatformModel);
                const size = box.getSize(new THREE.Vector3());
                baseModelWidth = size.x;
                baseModelHeight = size.y;
                baseModelDepth = size.z;

                // Enable shadows on all meshes
                cachedPlatformModel.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                resolve(cachedPlatformModel);
            },
            undefined,
            reject
        );
    });

    return modelLoadPromise;
}

export class Platform extends Entity {
    color: number = 0x5d4e37;
    topColor: number = 0x7a6b54;
    private modelLoaded: boolean = false;

    constructor(x: number, y: number, width: number, height: number) {
        super(x, y, width, height);
        this.addTag('platform');
        this.addTag('solid');
        this.depth = 60;
    }

    createMesh(): THREE.Object3D {
        // Create placeholder mesh, will be replaced when GLB loads
        this.mesh = new THREE.Group();

        // Add temporary box while model loads
        const tempGeom = new THREE.BoxGeometry(this.width, this.height, this.depth);
        const tempMat = new THREE.MeshLambertMaterial({ color: this.color });
        const tempMesh = new THREE.Mesh(tempGeom, tempMat);
        tempMesh.castShadow = true;
        tempMesh.receiveShadow = true;
        tempMesh.name = 'placeholder';
        this.mesh.add(tempMesh);

        // Load and apply the GLB model
        this.loadModel();

        this.updateMeshPosition();
        return this.mesh;
    }

    private async loadModel(): Promise<void> {
        try {
            const model = await loadPlatformModel();
            if (!this.mesh) return;

            // Remove placeholder
            const placeholder = this.mesh.getObjectByName('placeholder');
            if (placeholder) {
                this.mesh.remove(placeholder);
            }

            // Clone the model for this platform
            const clone = model.clone();

            // Scale to match platform dimensions
            const scaleX = this.width / baseModelWidth;
            const scaleY = this.height / baseModelHeight;
            const scaleZ = this.depth / baseModelDepth;
            clone.scale.set(scaleX, scaleY, scaleZ);

            // Enable shadows on cloned meshes
            clone.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            this.mesh.add(clone);
            this.modelLoaded = true;
        } catch (error) {
            console.error('Failed to load platform model:', error);
        }
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
