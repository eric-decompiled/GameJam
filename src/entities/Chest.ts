import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Entity } from './Entity';
import { Renderer } from '../graphics/Renderer';
import { Player } from './Player';
import { Platform } from './Platform';

const gltfLoader = new GLTFLoader();

export class Chest extends Entity {
    private time: number = 0;
    private beingCarried: boolean = false;
    private carrierPlayers: Player[] = [];
    private grounded: boolean = false;
    private readonly CARRY_DISTANCE: number = 80; // How close players need to be
    private readonly GRAVITY: number = 1800;
    private totalPlayers: number = 1;

    constructor(x: number, y: number) {
        // Chest is 48x48
        super(x - 24, y - 48, 48, 48);
        this.addTag('chest');
        this.depth = 48;
    }

    createMesh(): THREE.Object3D {
        this.mesh = new THREE.Group();

        // Placeholder while model loads
        const geometry = new THREE.BoxGeometry(this.width, this.height, this.depth);
        const material = new THREE.MeshLambertMaterial({ color: 0x8b4513, transparent: true, opacity: 0.3 });
        const placeholder = new THREE.Mesh(geometry, material);
        placeholder.castShadow = true;
        placeholder.name = 'placeholder';
        this.mesh.add(placeholder);

        this.loadModel();

        this.updateMeshPosition();
        return this.mesh;
    }

    private async loadModel(): Promise<void> {
        try {
            const gltf = await gltfLoader.loadAsync(`${import.meta.env.BASE_URL}models/chest.glb`);
            if (!this.mesh) return;

            // Remove placeholder
            const placeholder = this.mesh.getObjectByName('placeholder');
            if (placeholder) {
                this.mesh.remove(placeholder);
            }

            const model = gltf.scene;

            // Scale model to fit
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const scale = this.height / size.y;
            model.scale.setScalar(scale);

            // Center the model
            box.setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            model.position.x = -center.x;
            model.position.y = -box.min.y;
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
            console.error('Failed to load chest model:', error);
        }
    }

    // Check which players are close enough to carry
    checkCarriers(players: Player[]): void {
        this.totalPlayers = players.length;
        this.carrierPlayers = [];

        for (const player of players) {
            const dx = Math.abs(player.centerX - this.centerX);
            const dy = Math.abs(player.centerY - this.centerY);
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Player can carry if close enough (don't require grounded - allow jumping!)
            if (distance <= this.CARRY_DISTANCE) {
                this.carrierPlayers.push(player);
            }
        }

        // In single player, one player can carry
        // In multiplayer, need both players
        const requiredCarriers = players.length >= 2 ? 2 : 1;
        this.beingCarried = this.carrierPlayers.length >= requiredCarriers;
    }

    updatePhysics(dt: number, platforms: Platform[]): void {
        this.time += dt;

        if (this.beingCarried && this.carrierPlayers.length > 0) {
            // Calculate target position (center of all carriers)
            let targetX = 0;
            let targetY = 0;
            for (const player of this.carrierPlayers) {
                targetX += player.centerX;
                targetY += player.centerY;
            }
            targetX /= this.carrierPlayers.length;
            targetY /= this.carrierPlayers.length;

            // Move chest toward target position smoothly
            const chestCenterX = this.centerX;
            const chestCenterY = this.centerY;

            const dx = targetX - chestCenterX;
            const dy = targetY - chestCenterY;

            // Smoothly follow carriers
            const followSpeed = 8; // Higher = snappier
            this.position.x += dx * followSpeed * dt;
            this.position.y += dy * followSpeed * dt;

            // Also inherit vertical velocity from carriers for jumping
            let avgVelY = 0;
            for (const player of this.carrierPlayers) {
                avgVelY += player.velocity.y;
            }
            avgVelY /= this.carrierPlayers.length;

            // If carriers are jumping up, chest follows
            if (avgVelY < -100) {
                this.velocity.y = avgVelY * 0.8;
            }

            this.grounded = false;
        } else {
            // Not being carried - apply gravity
            this.velocity.y += this.GRAVITY * dt;

            // Cap fall speed
            if (this.velocity.y > 800) {
                this.velocity.y = 800;
            }

            // Apply velocity
            this.position.y += this.velocity.y * dt;

            // Friction when grounded
            if (this.grounded) {
                this.velocity.x *= 0.9;
            }
            this.position.x += this.velocity.x * dt;
        }

        // Platform collision
        this.grounded = false;
        for (const platform of platforms) {
            if (this.intersects(platform)) {
                const chestBottom = this.bottom;
                const chestTop = this.top;
                const platformTop = platform.top;
                const platformBottom = platform.bottom;

                // Landing on top
                if (this.velocity.y > 0 && chestBottom > platformTop && chestTop < platformTop) {
                    this.position.y = platformTop - this.height;
                    this.velocity.y = 0;
                    this.grounded = true;
                }
                // Hitting bottom
                else if (this.velocity.y < 0 && chestTop < platformBottom && chestBottom > platformBottom) {
                    this.position.y = platformBottom;
                    this.velocity.y = 0;
                }
                // Side collisions
                else {
                    const chestCenterX = this.centerX;
                    const platformCenterX = platform.centerX;

                    if (chestCenterX < platformCenterX) {
                        // Push left
                        this.position.x = platform.left - this.width;
                    } else {
                        // Push right
                        this.position.x = platform.right;
                    }
                    this.velocity.x = 0;
                }
            }
        }
    }

    update(dt: number): void {
        // Physics is now handled by updatePhysics called from Game
        this.time += dt;
    }

    isBeingCarried(): boolean {
        return this.beingCarried;
    }

    getCarrierCount(): number {
        return this.carrierPlayers.length;
    }

    getRequiredCarriers(): number {
        return this.totalPlayers >= 2 ? 2 : 1;
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
            this.mesh.position.y = pos.y;

            // Gentle bob when being carried
            if (this.beingCarried) {
                this.mesh.position.y += Math.sin(this.time * 8) * 2;
            }

            // Slow rotation when idle and grounded
            if (!this.beingCarried && this.grounded) {
                this.mesh.rotation.y += 0.005;
            }
        }
    }
}
