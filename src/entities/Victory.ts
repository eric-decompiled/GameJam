import * as THREE from 'three';
import { Entity } from './Entity';
import { Renderer } from '../graphics/Renderer';

export class Victory extends Entity {
    private time: number = 0;

    constructor(x: number, y: number) {
        super(x - 16, y - 32, 32, 32);
        this.addTag('victory');
    }

    createMesh(): THREE.Object3D {
        const group = new THREE.Group();

        // Create a golden star/diamond shape
        const geometry = new THREE.OctahedronGeometry(20, 0);
        const material = new THREE.MeshLambertMaterial({
            color: 0xffd700,
            emissive: 0xaa8800,
            emissiveIntensity: 0.3
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;

        group.add(mesh);

        this.mesh = group;
        this.updateMeshPosition();
        return this.mesh;
    }

    update(dt: number): void {
        this.time += dt;
    }

    render(_renderer: Renderer): void {
        if (this.mesh) {
            const pos = Renderer.gameToThreePos(
                this.position.x,
                this.position.y,
                this.width,
                this.height
            );
            this.mesh.position.x = pos.x;
            this.mesh.position.y = pos.y + Math.sin(this.time * 3) * 5;
            this.mesh.rotation.y = this.time * 2;
        }
    }
}
