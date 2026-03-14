import { PlatformData, Edge, EdgeType } from './types';

// Physics constants from the game
const JUMP_FORCE = 700;
const GRAVITY = 1800;
const MAX_SPEED = 300;
const COYOTE_TIME = 100; // ms
const PLAYER_WIDTH = 32;
const PLAYER_HEIGHT = 48;

// Derived constants
// Max jump height: v^2 / (2*g) = 700^2 / (2*1800) ≈ 136px
const MAX_JUMP_HEIGHT = (JUMP_FORCE * JUMP_FORCE) / (2 * GRAVITY);

// Time to reach max height: v/g = 700/1800 ≈ 0.389s
const TIME_TO_APEX = JUMP_FORCE / GRAVITY;

// Coyote jump extra: can run 30px past edge (100ms * 300px/s), fall ~9px during that time
const COYOTE_EXTRA_X = (COYOTE_TIME / 1000) * MAX_SPEED; // ~30px
const COYOTE_FALL_Y = 0.5 * GRAVITY * Math.pow(COYOTE_TIME / 1000, 2); // ~9px

/**
 * Check if player can reach destination platform from source platform.
 * Returns the edge type if reachable, null otherwise.
 */
export function canReach(src: PlatformData, dst: PlatformData): Edge | null {
    // Calculate platform surfaces (player stands on top of platform)
    const srcTop = src.y;
    const srcLeft = src.x;
    const srcRight = src.x + src.width;

    const dstTop = dst.y;
    const dstLeft = dst.x;
    const dstRight = dst.x + dst.width;

    // Vertical difference (positive means dst is below)
    const deltaY = dstTop - srcTop;

    // Horizontal gaps
    const gapRight = dstLeft - srcRight; // Gap when jumping right
    const gapLeft = srcLeft - dstRight;  // Gap when jumping left

    // Check if platforms overlap horizontally
    const overlapsX = srcRight > dstLeft && srcLeft < dstRight;

    // Check fall (destination below, within horizontal range)
    if (deltaY > 0) {
        const fallResult = checkFall(srcLeft, srcRight, dstLeft, dstRight, deltaY);
        if (fallResult) return { from: -1, to: -1, type: fallResult };
    }

    // Check standing jump (destination above, overlapping horizontally)
    if (deltaY < 0 && overlapsX && -deltaY <= MAX_JUMP_HEIGHT) {
        return { from: -1, to: -1, type: 'standing_jump' };
    }

    // Check running jump in either direction
    const runningJumpRight = checkRunningJump(gapRight, deltaY);
    if (runningJumpRight) return { from: -1, to: -1, type: runningJumpRight };

    const runningJumpLeft = checkRunningJump(gapLeft, deltaY);
    if (runningJumpLeft) return { from: -1, to: -1, type: runningJumpLeft };

    return null;
}

/**
 * Check if player can fall from src to dst
 */
function checkFall(
    srcLeft: number, srcRight: number,
    dstLeft: number, dstRight: number,
    deltaY: number
): EdgeType | null {
    // Time to fall deltaY pixels: y = 0.5*g*t^2, solve for t
    const fallTime = Math.sqrt((2 * deltaY) / GRAVITY);

    // Maximum horizontal distance during fall
    const maxFallX = MAX_SPEED * fallTime;

    // Check if we can reach destination falling right
    const canReachRight = srcRight + maxFallX >= dstLeft && srcRight <= dstRight + PLAYER_WIDTH;

    // Check if we can reach destination falling left
    const canReachLeft = srcLeft - maxFallX <= dstRight && srcLeft >= dstLeft - PLAYER_WIDTH;

    if (canReachRight || canReachLeft) {
        return 'fall';
    }

    return null;
}

/**
 * Check if a running jump can cover the gap and height difference.
 * Uses trajectory equation: y(t) = -JUMP_FORCE*t + 0.5*GRAVITY*t^2
 */
function checkRunningJump(gap: number, deltaY: number): EdgeType | null {
    // Negative gap means platforms overlap - no need for running jump
    if (gap <= 0) {
        // If going up and overlapping, standing jump handles it
        // If going down and overlapping, fall handles it
        return null;
    }

    // For a running jump, we need to check if the trajectory can reach the destination
    // The player jumps with horizontal velocity MAX_SPEED

    // Time to cross the gap horizontally (plus player width for landing)
    const minCrossTime = gap / MAX_SPEED;
    const maxCrossTime = (gap + PLAYER_WIDTH) / MAX_SPEED;

    // Check standard running jump
    if (checkTrajectory(minCrossTime, maxCrossTime, deltaY)) {
        return 'running_jump';
    }

    // Check coyote jump (run off edge, then jump)
    // This gives extra horizontal distance and slightly lower starting point
    const coyoteMinTime = (gap - COYOTE_EXTRA_X) / MAX_SPEED;
    const coyoteMaxTime = (gap - COYOTE_EXTRA_X + PLAYER_WIDTH) / MAX_SPEED;
    const coyoteDeltaY = deltaY - COYOTE_FALL_Y; // Started lower

    if (coyoteMinTime > 0 && checkTrajectory(coyoteMinTime, coyoteMaxTime, coyoteDeltaY)) {
        return 'coyote_jump';
    }

    return null;
}

/**
 * Check if trajectory reaches target height within time window.
 * y(t) = -JUMP_FORCE*t + 0.5*GRAVITY*t^2
 * We need y(t) >= deltaY for some t in [minTime, maxTime]
 */
function checkTrajectory(minTime: number, maxTime: number, deltaY: number): boolean {
    if (minTime < 0) minTime = 0;
    if (maxTime < 0) return false;

    // Find y at minTime and maxTime
    const yAtMinTime = -JUMP_FORCE * minTime + 0.5 * GRAVITY * minTime * minTime;
    const yAtMaxTime = -JUMP_FORCE * maxTime + 0.5 * GRAVITY * maxTime * maxTime;

    // Note: y is negative when above start, positive when below
    // deltaY is positive when dst is below src, negative when above

    // For landing, we need: y(t) >= deltaY (reached or passed the target height)
    // Also need to ensure we're at or past the apex for destinations above

    // If destination is below (deltaY > 0), we just need to fall enough
    if (deltaY >= 0) {
        // Can we be at or below destination level at some point in the window?
        // y increases over time after apex, so check at minTime
        // Actually y(t) is a parabola, minimum at apex (t = JUMP_FORCE/GRAVITY)
        const apexTime = TIME_TO_APEX;

        if (maxTime < apexTime) {
            // Entire window is before apex, check if we're low enough at maxTime
            return yAtMaxTime >= deltaY;
        } else if (minTime > apexTime) {
            // Entire window is after apex, check if we're high enough at minTime
            return yAtMinTime >= deltaY;
        } else {
            // Apex is in the window, y at apex is minimum
            const yAtApex = -JUMP_FORCE * apexTime + 0.5 * GRAVITY * apexTime * apexTime;
            // We can reach any height between yAtApex and max(yAtMinTime, yAtMaxTime)
            return Math.max(yAtMinTime, yAtMaxTime) >= deltaY;
        }
    }

    // Destination is above (deltaY < 0)
    // We need y(t) <= deltaY at some point (remember y is negative when above)
    // The highest point is at apex where y = -MAX_JUMP_HEIGHT

    const apexTime = TIME_TO_APEX;
    const yAtApex = -MAX_JUMP_HEIGHT;

    // Can we be high enough at some point in the window?
    if (yAtApex > deltaY) {
        // Can't reach that high even at apex
        return false;
    }

    // Find times when y(t) = deltaY
    // 0.5*g*t^2 - JUMP_FORCE*t - deltaY = 0
    // Using quadratic formula: t = (JUMP_FORCE ± sqrt(JUMP_FORCE^2 + 2*g*deltaY)) / g
    const discriminant = JUMP_FORCE * JUMP_FORCE + 2 * GRAVITY * deltaY;

    if (discriminant < 0) {
        // No real solutions - can't reach this height
        return false;
    }

    const sqrtD = Math.sqrt(discriminant);
    const t1 = (JUMP_FORCE - sqrtD) / GRAVITY; // Earlier time (going up)
    const t2 = (JUMP_FORCE + sqrtD) / GRAVITY; // Later time (coming down)

    // Check if either crossing time is within our window
    // t1 is when we reach the height going up, t2 is coming down
    const reachesOnWayUp = t1 >= minTime && t1 <= maxTime;
    const reachesOnWayDown = t2 >= minTime && t2 <= maxTime;

    // Or if we're above the target for the entire window
    const aboveAtMin = yAtMinTime <= deltaY;
    const aboveAtMax = yAtMaxTime <= deltaY;

    return reachesOnWayUp || reachesOnWayDown || aboveAtMin || aboveAtMax;
}

/**
 * Find which platform contains the spawn point
 */
export function findSpawnPlatform(platforms: PlatformData[], spawn: { x: number; y: number }): number {
    // Player spawns at spawn point, check which platform is directly below
    const playerBottom = spawn.y + PLAYER_HEIGHT;

    for (let i = 0; i < platforms.length; i++) {
        const p = platforms[i];
        const platformTop = p.y;
        const withinX = spawn.x >= p.x && spawn.x < p.x + p.width;
        const justAbove = playerBottom <= platformTop && playerBottom + 100 > platformTop;

        if (withinX && justAbove) {
            return i;
        }
    }

    // Fallback: find closest platform below spawn
    let closest = -1;
    let closestDist = Infinity;

    for (let i = 0; i < platforms.length; i++) {
        const p = platforms[i];
        const withinX = spawn.x >= p.x && spawn.x < p.x + p.width;
        const below = p.y > spawn.y;

        if (withinX && below) {
            const dist = p.y - spawn.y;
            if (dist < closestDist) {
                closestDist = dist;
                closest = i;
            }
        }
    }

    return closest;
}
