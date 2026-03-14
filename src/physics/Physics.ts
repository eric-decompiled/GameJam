import { PHYSICS } from '../utils/constants';
import { Player } from '../entities/Player';
import { Platform, MovingPlatform } from '../entities/Platform';

export class Physics {
    private epsilon: number = 0.001;

    update(player: Player, platforms: Platform[], dt: number): void {
        // Handle moving platform carrying
        if (player.standingOnPlatform && player.standingOnPlatform.hasTag('moving')) {
            const movingPlatform = player.standingOnPlatform as MovingPlatform;
            const delta = movingPlatform.getDeltaPosition();
            player.position.x += delta.x;
            player.position.y += delta.y;
        }

        // Store if we were grounded before this frame
        const wasGrounded = player.grounded;

        // Only apply gravity if not grounded
        if (!wasGrounded) {
            player.velocity.y += PHYSICS.GRAVITY * dt;
            if (player.velocity.y > PHYSICS.MAX_FALL_SPEED) {
                player.velocity.y = PHYSICS.MAX_FALL_SPEED;
            }
        }

        // Reset grounded - will be set by collision detection
        player.grounded = false;
        player.standingOnPlatform = null;

        // Move and resolve collisions
        const moveX = player.velocity.x * dt;
        const moveY = player.velocity.y * dt;

        this.moveAndCollideX(player, moveX, platforms);
        this.moveAndCollideY(player, moveY, platforms);

        // If we were grounded and didn't jump, check if still on ground
        if (wasGrounded && !player.grounded && player.velocity.y >= 0) {
            this.checkStillGrounded(player, platforms);
        }
    }

    private checkStillGrounded(player: Player, platforms: Platform[]): void {
        // Check if player is resting on a platform (within small tolerance)
        for (const platform of platforms) {
            if (!platform.hasTag('solid')) continue;

            const onTop = Math.abs(player.bottom - platform.top) < 1;
            const withinX = player.right > platform.left && player.left < platform.right;

            if (onTop && withinX) {
                player.grounded = true;
                player.standingOnPlatform = platform;
                player.velocity.y = 0;
                return;
            }
        }
    }

    private moveAndCollideX(player: Player, moveX: number, platforms: Platform[]): void {
        player.position.x += moveX;

        for (const platform of platforms) {
            if (!platform.hasTag('solid')) continue;
            if (!player.intersects(platform)) continue;

            if (moveX > 0) {
                player.position.x = platform.left - player.width - this.epsilon;
            } else if (moveX < 0) {
                player.position.x = platform.right + this.epsilon;
            }
            player.velocity.x = 0;
        }
    }

    private moveAndCollideY(player: Player, moveY: number, platforms: Platform[]): void {
        player.position.y += moveY;

        for (const platform of platforms) {
            if (!platform.hasTag('solid')) continue;
            if (!player.intersects(platform)) continue;

            if (player.velocity.y > 0) {
                player.position.y = platform.top - player.height - this.epsilon;
                player.velocity.y = 0;
                player.grounded = true;
                player.standingOnPlatform = platform;
            } else if (player.velocity.y < 0) {
                player.position.y = platform.bottom + this.epsilon;
                player.velocity.y = 0;
            }
        }
    }
}
