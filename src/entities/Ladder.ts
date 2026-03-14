import * as THREE from 'three';
import { Entity } from './Entity';
import { Renderer } from '../graphics/Renderer';

export class Ladder extends Entity {
    constructor(x: number, y: number, height: number) {
        super(x, y, 32, height);
        this.addTag('ladder');
    }

    createMesh(): THREE.Object3D {
        // Ladder visuals disabled - keeping collision/logic only
        this.mesh = new THREE.Group();
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
            this.mesh.position.z = -10; // Put ladder behind player
        }
    }
}
