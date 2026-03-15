import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Entity } from './Entity';
import { Renderer } from '../graphics/Renderer';
import { InputManager } from '../core/InputManager';
import { PLAYER } from '../utils/constants';
import type { Platform } from './Platform';
import type { InputState, PlayerState } from '../network/Protocol';

const gltfLoader = new GLTFLoader();

// Player colors for multiplayer
const PLAYER_COLORS = [0x4a90d9, 0xd94a4a]; // Blue, Red

export class Player extends Entity {
    playerId: number = 0;
    isRemote: boolean = false;
    hasReachedVictory: boolean = false;

    moveDirection: number = 0;
    facingRight: boolean = true;
    grounded: boolean = false;
    standingOnPlatform: Platform | null = null;
    coyoteTimer: number = 0;
    jumpBufferTimer: number = 0;
    wasGrounded: boolean = false;

    private mixer: THREE.AnimationMixer | null = null;
    private idleAction: THREE.AnimationAction | null = null;
    private walkAction: THREE.AnimationAction | null = null;
    private runAction: THREE.AnimationAction | null = null;
    private jumpAction: THREE.AnimationAction | null = null;
    private currentAction: THREE.AnimationAction | null = null;
    private playerModel: THREE.Object3D | null = null;
    private clock: THREE.Clock = new THREE.Clock();
    private modelScale: number = 1;

    constructor(x: number, y: number, playerId: number = 0, isRemote: boolean = false) {
        super(x, y, PLAYER.WIDTH, PLAYER.HEIGHT);
        this.playerId = playerId;
        this.isRemote = isRemote;
        this.addTag('player');
        this.depth = 32;
    }

    createMesh(): THREE.Object3D {
        this.mesh = new THREE.Group();

        const playerColor = PLAYER_COLORS[this.playerId % PLAYER_COLORS.length];

        // Placeholder while model loads
        const bodyGeom = new THREE.BoxGeometry(this.width, this.height, this.depth);
        const bodyMat = new THREE.MeshLambertMaterial({ color: playerColor, transparent: true, opacity: 0.3 });
        const body = new THREE.Mesh(bodyGeom, bodyMat);
        body.castShadow = true;
        body.receiveShadow = true;
        body.name = 'placeholder';
        this.mesh.add(body);

        // Load animations for this player
        this.loadAnimations();

        this.updateMeshPosition();
        return this.mesh;
    }

    private getModelPaths(): { idle: string; walk: string; run: string; jump: string } {
        const base = import.meta.env.BASE_URL;
        if (this.playerId === 1) {
            // Player 2 models
            return {
                idle: `${base}models/p2_idle.glb`,
                walk: `${base}models/p2_walk.glb`,
                run: `${base}models/p2_run.glb`,
                jump: `${base}models/p2_jump.glb`
            };
        }
        // Player 1 models
        return {
            idle: `${base}models/idle.glb`,
            walk: `${base}models/Walk.glb`,
            run: `${base}models/run.glb`,
            jump: `${base}models/jump.glb`
        };
    }

    private async loadAnimations(): Promise<void> {
        const paths = this.getModelPaths();

        try {
            // Load idle model first to set up the character
            const idleGltf = await gltfLoader.loadAsync(paths.idle);
            if (!this.mesh) return;

            // Remove placeholder
            const placeholder = this.mesh.getObjectByName('placeholder');
            if (placeholder) {
                this.mesh.remove(placeholder);
            }

            const model = idleGltf.scene;
            this.playerModel = model;

            // Measure and scale model to fit player dimensions
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            this.modelScale = (this.height / size.y) * 2.0;  // 2x size for visibility
            model.scale.setScalar(this.modelScale);

            // Recompute bounding box after scaling
            box.setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());

            // Center horizontally, but align feet to bottom of hitbox
            model.position.x = -center.x;
            model.position.z = -center.z;
            model.position.y = -box.min.y - 30;  // Lower to ground

            // Rotate model to face +X by default (model faces +Z originally)
            model.rotation.y = -Math.PI / 2;

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

            // Add idle animation
            if (idleGltf.animations.length > 0) {
                this.idleAction = this.mixer.clipAction(idleGltf.animations[0]);
            }

            // Load walk animation
            const walkGltf = await gltfLoader.loadAsync(paths.walk);
            if (walkGltf.animations.length > 0) {
                this.walkAction = this.mixer.clipAction(walkGltf.animations[0]);
                if (this.playerId === 0) {
                    this.walkAction.timeScale = -1;  // Play in reverse for P1
                }
            }

            // Load run animation
            const runGltf = await gltfLoader.loadAsync(paths.run);
            if (runGltf.animations.length > 0) {
                this.runAction = this.mixer.clipAction(runGltf.animations[0]);
            }

            // Load jump animation
            const jumpGltf = await gltfLoader.loadAsync(paths.jump);
            if (jumpGltf.animations.length > 0) {
                this.jumpAction = this.mixer.clipAction(jumpGltf.animations[0]);
                this.jumpAction.setLoop(THREE.LoopOnce, 1);
                this.jumpAction.clampWhenFinished = true;
            }

            // Start with idle
            if (this.idleAction) {
                this.idleAction.play();
                this.currentAction = this.idleAction;
            }
        } catch (error) {
            console.error(`Failed to load player ${this.playerId} animations:`, error);
        }
    }

    private switchAnimation(toAction: THREE.AnimationAction | null): void {
        if (!toAction || toAction === this.currentAction) return;

        const fadeTime = 0.2;

        toAction.reset();
        toAction.play();

        if (this.currentAction) {
            toAction.crossFadeFrom(this.currentAction, fadeTime, true);
        }

        this.currentAction = toAction;
    }

    handleInput(input: InputManager): void {
        const moveDir = input.getHorizontalAxis();
        if (moveDir !== 0) {
            this.facingRight = moveDir > 0;
            this.moveDirection = moveDir;
        } else {
            this.moveDirection = 0;
        }

        if (input.isJumpJustPressed()) {
            this.jumpBufferTimer = PLAYER.JUMP_BUFFER_TIME;
        }

        if (input.isJumpJustReleased() && this.velocity.y < 0) {
            this.velocity.y *= PLAYER.JUMP_CUT_MULTIPLIER;
        }
    }

    update(dt: number): void {
        if (this.moveDirection !== 0) {
            this.velocity.x += this.moveDirection * PLAYER.ACCELERATION * dt;
            if (Math.abs(this.velocity.x) > PLAYER.MAX_SPEED) {
                this.velocity.x = Math.sign(this.velocity.x) * PLAYER.MAX_SPEED;
            }
        } else if (this.grounded) {
            const friction = PLAYER.FRICTION * dt;
            if (Math.abs(this.velocity.x) <= friction) {
                this.velocity.x = 0;
            } else {
                this.velocity.x -= Math.sign(this.velocity.x) * friction;
            }
        }

        if (this.grounded) {
            this.coyoteTimer = PLAYER.COYOTE_TIME;
        } else {
            this.coyoteTimer -= dt * 1000;
        }

        this.jumpBufferTimer -= dt * 1000;

        const canJump = this.coyoteTimer > 0;
        const wantsJump = this.jumpBufferTimer > 0;

        if (canJump && wantsJump) {
            this.velocity.y = -PLAYER.JUMP_FORCE;
            this.coyoteTimer = 0;
            this.jumpBufferTimer = 0;
        }

        this.wasGrounded = this.grounded;
    }

    render(_renderer: Renderer): void {
        // Update animation mixer
        if (this.mixer) {
            const delta = this.clock.getDelta();
            this.mixer.update(delta);
        }

        // Switch animation based on state
        if (!this.grounded && this.jumpAction) {
            this.switchAnimation(this.jumpAction);
        } else {
            const speed = Math.abs(this.velocity.x);
            const runThreshold = PLAYER.MAX_SPEED * 0.7;  // 70% of max speed triggers run

            if (speed > runThreshold && this.runAction) {
                this.switchAnimation(this.runAction);
            } else if (speed > 10 && this.walkAction) {
                this.switchAnimation(this.walkAction);
            } else if (speed <= 10 && this.idleAction) {
                this.switchAnimation(this.idleAction);
            }
        }

        // Rotate to face direction
        if (this.mesh) {
            const targetRotation = this.facingRight ? Math.PI : 0;
            this.mesh.rotation.y += (targetRotation - this.mesh.rotation.y) * 0.2;
        }
        this.updateMeshPosition();
    }

    // Handle input from network state (for remote players on host)
    handleRemoteInput(input: InputState): void {
        const moveDir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
        if (moveDir !== 0) {
            this.facingRight = moveDir > 0;
            this.moveDirection = moveDir;
        } else {
            this.moveDirection = 0;
        }

        if (input.jumpJustPressed) {
            this.jumpBufferTimer = PLAYER.JUMP_BUFFER_TIME;
        }

        if (input.jumpJustReleased && this.velocity.y < 0) {
            this.velocity.y *= PLAYER.JUMP_CUT_MULTIPLIER;
        }
    }

    // Apply state received from network (for clients)
    applyState(state: PlayerState): void {
        this.position.x = state.x;
        this.position.y = state.y;
        this.velocity.x = state.vx;
        this.velocity.y = state.vy;
        this.grounded = state.grounded;
        this.facingRight = state.facingRight;
        this.hasReachedVictory = state.hasReachedVictory;
    }

    // Get current state for network broadcast
    getState(): PlayerState {
        return {
            id: this.playerId,
            x: this.position.x,
            y: this.position.y,
            vx: this.velocity.x,
            vy: this.velocity.y,
            grounded: this.grounded,
            facingRight: this.facingRight,
            animState: this.getAnimState(),
            hasReachedVictory: this.hasReachedVictory
        };
    }

    private getAnimState(): 'idle' | 'walk' | 'run' | 'jump' {
        if (!this.grounded) return 'jump';
        const speed = Math.abs(this.velocity.x);
        const runThreshold = PLAYER.MAX_SPEED * 0.7;
        if (speed > runThreshold) return 'run';
        if (speed > 10) return 'walk';
        return 'idle';
    }
}
