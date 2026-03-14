import * as THREE from 'three';
import { Entity } from './Entity';
import { Renderer } from '../graphics/Renderer';
import { InputManager } from '../core/InputManager';
import { PLAYER } from '../utils/constants';
import type { Platform } from './Platform';

export class Player extends Entity {
    moveDirection: number = 0;
    facingRight: boolean = true;
    grounded: boolean = false;
    standingOnPlatform: Platform | null = null;
    coyoteTimer: number = 0;
    jumpBufferTimer: number = 0;
    wasGrounded: boolean = false;

    private leftEye: THREE.Mesh | null = null;
    private rightEye: THREE.Mesh | null = null;

    constructor(x: number, y: number) {
        super(x, y, PLAYER.WIDTH, PLAYER.HEIGHT);
        this.addTag('player');
        this.depth = 32;
    }

    createMesh(): THREE.Object3D {
        this.mesh = new THREE.Group();

        const bodyGeom = new THREE.BoxGeometry(this.width, this.height, this.depth);
        const bodyMat = new THREE.MeshLambertMaterial({ color: 0x4a90d9 });
        const body = new THREE.Mesh(bodyGeom, bodyMat);
        body.castShadow = true;
        body.receiveShadow = true;
        this.mesh.add(body);

        const headGeom = new THREE.BoxGeometry(this.width * 0.8, this.height * 0.35, this.depth * 0.9);
        const headMat = new THREE.MeshLambertMaterial({ color: 0x5aa0e9 });
        const head = new THREE.Mesh(headGeom, headMat);
        head.position.y = this.height * 0.25;
        head.position.z = 2;
        head.castShadow = true;
        this.mesh.add(head);

        const eyeGeom = new THREE.BoxGeometry(6, 6, 6);
        const eyeMat = new THREE.MeshLambertMaterial({ color: 0x1a3050 });

        this.leftEye = new THREE.Mesh(eyeGeom, eyeMat);
        this.leftEye.position.set(-6, this.height * 0.28, this.depth / 2 + 2);
        this.mesh.add(this.leftEye);

        this.rightEye = new THREE.Mesh(eyeGeom, eyeMat);
        this.rightEye.position.set(6, this.height * 0.28, this.depth / 2 + 2);
        this.mesh.add(this.rightEye);

        this.updateMeshPosition();
        return this.mesh;
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
        if (this.mesh) {
            const targetRotation = this.facingRight ? 0.15 : -0.15;
            this.mesh.rotation.y += (targetRotation - this.mesh.rotation.y) * 0.2;
        }
        this.updateMeshPosition();
    }
}
