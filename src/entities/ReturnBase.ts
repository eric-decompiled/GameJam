import * as THREE from 'three';
import { Entity } from './Entity';
import { Renderer } from '../graphics/Renderer';

export class ReturnBase extends Entity {
    private time: number = 0;
    private ringMesh: THREE.Mesh | null = null;
    private glowMesh: THREE.Mesh | null = null;
    private isActive: boolean = false;
    private pulseIntensity: number = 0;
    private isVisible: boolean = false;

    constructor(x: number, y: number) {
        // Position at spawn, wide base
        super(x - 60, y, 120, 10);
        this.addTag('return-base');
        this.depth = 120;
    }

    createMesh(): THREE.Object3D {
        this.mesh = new THREE.Group();

        // Main ring/circle on ground
        const ringGeom = new THREE.RingGeometry(40, 55, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x00ff88,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.6
        });
        this.ringMesh = new THREE.Mesh(ringGeom, ringMat);
        this.ringMesh.rotation.x = -Math.PI / 2;
        this.ringMesh.position.y = 2;
        this.mesh.add(this.ringMesh);

        // Inner glow circle
        const glowGeom = new THREE.CircleGeometry(38, 32);
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0x00ff88,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.2
        });
        this.glowMesh = new THREE.Mesh(glowGeom, glowMat);
        this.glowMesh.rotation.x = -Math.PI / 2;
        this.glowMesh.position.y = 1;
        this.mesh.add(this.glowMesh);

        // Arrow indicators pointing inward
        const arrowGeom = new THREE.ConeGeometry(8, 20, 4);
        const arrowMat = new THREE.MeshBasicMaterial({
            color: 0x00ff88,
            transparent: true,
            opacity: 0.8
        });

        for (let i = 0; i < 4; i++) {
            const arrow = new THREE.Mesh(arrowGeom, arrowMat);
            const angle = (i / 4) * Math.PI * 2;
            arrow.position.x = Math.cos(angle) * 70;
            arrow.position.z = Math.sin(angle) * 70;
            arrow.position.y = 15;
            arrow.rotation.z = Math.PI; // Point down
            arrow.rotation.y = -angle + Math.PI / 2;
            this.mesh.add(arrow);
        }

        // Start hidden
        this.mesh.visible = false;

        this.updateMeshPosition();
        return this.mesh;
    }

    show(): void {
        this.isVisible = true;
        if (this.mesh) {
            this.mesh.visible = true;
        }
    }

    setActive(active: boolean): void {
        this.isActive = active;
    }

    update(dt: number): void {
        this.time += dt;

        // Pulse intensity when active
        if (this.isActive) {
            this.pulseIntensity = Math.min(1, this.pulseIntensity + dt * 3);
        } else {
            this.pulseIntensity = Math.max(0, this.pulseIntensity - dt * 3);
        }
    }

    render(_renderer: Renderer): void {
        if (!this.mesh || !this.isVisible) return;

        const pos = Renderer.gameToThreePos(
            this.position.x,
            this.position.y,
            this.width,
            this.height
        );
        this.mesh.position.x = pos.x;
        this.mesh.position.y = pos.y;

        // Animate when active (chest being carried)
        const baseOpacity = 0.3;
        const activeOpacity = 0.8;
        const pulse = Math.sin(this.time * 4) * 0.2 + 0.8;

        const opacity = baseOpacity + (activeOpacity - baseOpacity) * this.pulseIntensity * pulse;

        if (this.ringMesh) {
            (this.ringMesh.material as THREE.MeshBasicMaterial).opacity = opacity;
            // Color shifts to brighter when active
            const color = this.isActive ? 0x44ffaa : 0x00ff88;
            (this.ringMesh.material as THREE.MeshBasicMaterial).color.setHex(color);
        }

        if (this.glowMesh) {
            (this.glowMesh.material as THREE.MeshBasicMaterial).opacity = opacity * 0.5;
            // Scale pulse when active
            const scale = 1 + this.pulseIntensity * Math.sin(this.time * 6) * 0.1;
            this.glowMesh.scale.set(scale, scale, 1);
        }

        // Rotate slowly
        this.mesh.rotation.y = this.time * 0.5;
    }
}
