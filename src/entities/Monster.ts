import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Entity } from './Entity';
import { Renderer } from '../graphics/Renderer';
import { Player } from './Player';
import { Platform } from './Platform';
import { AudioManager } from '../core/AudioManager';

const gltfLoader = new GLTFLoader();

export class Monster extends Entity {
    private platform: Platform;
    private patrolSpeed: number = 40;
    private chaseSpeed: number = 80;
    private direction: number = 1; // 1 = right, -1 = left
    private mixer: THREE.AnimationMixer | null = null;
    private walkAction: THREE.AnimationAction | null = null;
    private clock: THREE.Clock = new THREE.Clock();
    private targetPlayer: Player | null = null;
    isDead: boolean = false;

    constructor(platform: Platform) {
        // Position monster on top of platform - bigger size (72x72)
        const x = platform.position.x + platform.width / 2 - 36;
        const y = platform.position.y - 72;
        super(x, y, 72, 72);
        this.platform = platform;
        this.addTag('monster');
        this.depth = 72;
    }

    createMesh(): THREE.Object3D {
        this.mesh = new THREE.Group();

        // Placeholder while model loads
        const bodyGeom = new THREE.BoxGeometry(this.width, this.height, this.depth);
        const bodyMat = new THREE.MeshLambertMaterial({ color: 0x8b0000, transparent: true, opacity: 0.3 });
        const body = new THREE.Mesh(bodyGeom, bodyMat);
        body.castShadow = true;
        body.receiveShadow = true;
        body.name = 'placeholder';
        this.mesh.add(body);

        this.loadModel();

        this.updateMeshPosition();
        return this.mesh;
    }

    private async loadModel(): Promise<void> {
        try {
            const gltf = await gltfLoader.loadAsync(`${import.meta.env.BASE_URL}models/monster.glb`);
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
            const scale = (this.height / size.y) * 1.5;
            model.scale.setScalar(scale);

            // Recompute bounding box after scaling
            box.setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());

            model.position.x = -center.x;
            model.position.z = -center.z;
            model.position.y = -box.min.y;

            // Enable shadows
            model.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            this.mesh.add(model);

            // Set up animation mixer
            this.mixer = new THREE.AnimationMixer(model);

            if (gltf.animations.length > 0) {
                this.walkAction = this.mixer.clipAction(gltf.animations[0]);
                this.walkAction.play();
            }
        } catch (error) {
            console.error('Failed to load monster model:', error);
        }
    }

    update(dt: number): void {
        const platformLeft = this.platform.position.x;
        const platformRight = this.platform.position.x + this.platform.width;

        // Check if chasing a player
        if (this.targetPlayer) {
            // Chase the target player
            const playerCenterX = this.targetPlayer.centerX;
            const monsterCenterX = this.centerX;

            if (playerCenterX < monsterCenterX - 5) {
                this.direction = -1;
            } else if (playerCenterX > monsterCenterX + 5) {
                this.direction = 1;
            }

            this.velocity.x = this.direction * this.chaseSpeed;
        } else {
            // Patrol back and forth on platform
            this.velocity.x = this.direction * this.patrolSpeed;
        }

        // Apply velocity
        this.position.x += this.velocity.x * dt;

        // Reverse direction at platform edges
        if (this.position.x <= platformLeft) {
            this.position.x = platformLeft;
            this.direction = 1;
        } else if (this.position.x + this.width >= platformRight) {
            this.position.x = platformRight - this.width;
            this.direction = -1;
        }

        // Keep monster on top of platform (follow moving platforms)
        this.position.y = this.platform.position.y - this.height;
    }

    // Check if player is on the same platform and set as target
    checkForPlayers(players: Player[]): void {
        const wasChasing = this.targetPlayer !== null;
        this.targetPlayer = null;

        for (const player of players) {
            if (this.isPlayerOnPlatform(player)) {
                this.targetPlayer = player;
                break; // Chase first player found
            }
        }

        // Play roar when starting to chase
        if (!wasChasing && this.targetPlayer !== null) {
            AudioManager.play('monster_roar', 0.5);
        }
    }

    private isPlayerOnPlatform(player: Player): boolean {
        // Check if player is standing on this monster's platform
        const platformTop = this.platform.position.y;
        const platformLeft = this.platform.position.x;
        const platformRight = this.platform.position.x + this.platform.width;

        const playerBottom = player.position.y + player.height;
        const playerCenterX = player.centerX;

        // Player is on platform if their bottom is near platform top and they're within bounds
        const onTop = Math.abs(playerBottom - platformTop) < 10;
        const withinBounds = playerCenterX >= platformLeft && playerCenterX <= platformRight;

        return onTop && withinBounds && player.grounded;
    }

    // Check collision with player - returns 'kill' if player should die, 'stomp' if monster should die
    checkPlayerCollision(player: Player): 'kill' | 'stomp' | null {
        if (this.isDead) return null;
        if (!this.intersects(player)) return null;

        // Check if player is stomping (falling onto monster from above)
        const playerBottom = player.position.y + player.height;
        const monsterTop = this.position.y;
        const playerFalling = player.velocity.y > 0;

        // Player stomps if they're falling and their feet are near monster's head
        if (playerFalling && playerBottom < monsterTop + 20) {
            return 'stomp';
        }

        // Otherwise monster kills player
        return 'kill';
    }

    kill(): void {
        this.isDead = true;
        this.active = false;
        if (this.mesh) {
            this.mesh.visible = false;
        }
    }

    render(_renderer: Renderer): void {
        if (this.isDead) return;
        // Update animation mixer
        if (this.mixer) {
            const delta = this.clock.getDelta();
            this.mixer.update(delta);
        }

        // Face movement direction
        if (this.mesh) {
            const targetRotation = this.direction > 0 ? 0 : Math.PI;
            this.mesh.rotation.y += (targetRotation - this.mesh.rotation.y) * 0.2;
        }

        this.updateMeshPosition();
    }
}
