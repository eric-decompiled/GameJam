import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Entity } from './Entity';
import { Renderer } from '../graphics/Renderer';
import { Player } from './Player';

const gltfLoader = new GLTFLoader();

export class Coin extends Entity {
    private spinSpeed: number = 3;
    private bobSpeed: number = 2;
    private bobAmount: number = 5;
    private baseY: number;
    private time: number = 0;
    collected: boolean = false;
    private coinModel: THREE.Object3D | null = null;

    constructor(x: number, y: number) {
        super(x, y, 24, 24);
        this.baseY = y;
        this.addTag('coin');
        this.depth = 24;
    }

    createMesh(): THREE.Object3D {
        this.mesh = new THREE.Group();

        // Placeholder while model loads
        const geometry = new THREE.CylinderGeometry(12, 12, 4, 16);
        const material = new THREE.MeshLambertMaterial({ color: 0xffd700 });
        const placeholder = new THREE.Mesh(geometry, material);
        placeholder.rotation.x = Math.PI / 2;
        placeholder.castShadow = true;
        placeholder.name = 'placeholder';
        this.mesh.add(placeholder);

        this.loadModel();

        this.updateMeshPosition();
        return this.mesh;
    }

    private async loadModel(): Promise<void> {
        try {
            const gltf = await gltfLoader.loadAsync(`${import.meta.env.BASE_URL}models/coin.glb`);
            if (!this.mesh) return;

            // Remove placeholder
            const placeholder = this.mesh.getObjectByName('placeholder');
            if (placeholder) {
                this.mesh.remove(placeholder);
            }

            const model = gltf.scene;
            this.coinModel = model;

            // Scale model to fit
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 24 / maxDim;
            model.scale.setScalar(scale);

            // Center the model
            box.setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            model.position.x = -center.x;
            model.position.y = -center.y;
            model.position.z = -center.z;

            // Enable shadows
            model.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            this.mesh.add(model);
        } catch (error) {
            console.error('Failed to load coin model:', error);
        }
    }

    update(dt: number): void {
        if (this.collected) return;

        this.time += dt;

        // Bob up and down
        this.position.y = this.baseY + Math.sin(this.time * this.bobSpeed) * this.bobAmount;
    }

    checkPlayerCollision(player: Player): boolean {
        if (this.collected) return false;
        return this.intersects(player);
    }

    collect(): void {
        this.collected = true;
        this.active = false;
        if (this.mesh) {
            this.mesh.visible = false;
        }
    }

    render(_renderer: Renderer): void {
        if (this.collected) return;

        // Spin the coin
        if (this.mesh) {
            this.mesh.rotation.y += this.spinSpeed * 0.016;
        }

        this.updateMeshPosition();
    }
}
