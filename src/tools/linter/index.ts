import * as fs from 'fs';
import * as path from 'path';
import { LevelData, LintReport } from './types';
import { buildGraph, findReachable, getUnreachablePlatforms } from './graph';
import { findSpawnPlatform } from './physics';

/**
 * Lint a level file to check if all platforms are reachable from spawn.
 */
export function lintLevel(levelPath: string): LintReport {
    // Read and parse level file
    const content = fs.readFileSync(levelPath, 'utf-8');
    const level: LevelData = JSON.parse(content);

    const platforms = level.platforms || [];
    const spawn = level.spawn;

    // Check if spawn platform exists
    const spawnPlatformId = findSpawnPlatform(platforms, spawn);
    const spawnPlatformFound = spawnPlatformId !== -1;

    if (!spawnPlatformFound) {
        return {
            levelName: level.name,
            isCompletable: false,
            totalPlatforms: platforms.length,
            reachablePlatforms: 0,
            unreachable: platforms,
            spawnPlatformFound: false
        };
    }

    // Build graph and find reachable platforms
    const graph = buildGraph(platforms, spawn);
    const reachable = findReachable(graph);
    const unreachable = getUnreachablePlatforms(graph, reachable);

    return {
        levelName: level.name,
        isCompletable: unreachable.length === 0,
        totalPlatforms: platforms.length,
        reachablePlatforms: reachable.size,
        unreachable,
        spawnPlatformFound: true
    };
}

/**
 * Lint all level files in a directory
 */
export function lintAllLevels(levelsDir: string): Map<string, LintReport> {
    const results = new Map<string, LintReport>();

    const files = fs.readdirSync(levelsDir);
    for (const file of files) {
        if (file.endsWith('.json')) {
            const levelPath = path.join(levelsDir, file);
            try {
                const report = lintLevel(levelPath);
                results.set(file, report);
            } catch (error) {
                console.error(`Error linting ${file}:`, error);
            }
        }
    }

    return results;
}

/**
 * CLI entry point
 */
function main(): void {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        // Default: lint all levels in public/levels/
        const levelsDir = path.join(process.cwd(), 'public', 'levels');
        console.log(`Linting all levels in ${levelsDir}\n`);

        const results = lintAllLevels(levelsDir);
        let allPassed = true;

        for (const [file, report] of results) {
            printReport(file, report);
            if (!report.isCompletable) allPassed = false;
        }

        process.exit(allPassed ? 0 : 1);
    } else {
        // Lint specific file(s)
        let allPassed = true;

        for (const arg of args) {
            const levelPath = path.resolve(arg);
            console.log(`Linting ${levelPath}\n`);

            try {
                const report = lintLevel(levelPath);
                printReport(path.basename(levelPath), report);
                if (!report.isCompletable) allPassed = false;
            } catch (error) {
                console.error(`Error: ${error}`);
                allPassed = false;
            }
        }

        process.exit(allPassed ? 0 : 1);
    }
}

function printReport(filename: string, report: LintReport, verbose: boolean = false): void {
    const status = report.isCompletable ? '✓ PASS' : '✗ FAIL';
    console.log(`${status} ${filename} - "${report.levelName}"`);
    console.log(`  Platforms: ${report.reachablePlatforms}/${report.totalPlatforms} reachable`);

    if (!report.spawnPlatformFound) {
        console.log('  ERROR: No platform found at spawn point');
    }

    if (report.unreachable.length > 0) {
        console.log('  Unreachable platforms:');
        for (const p of report.unreachable) {
            console.log(`    - Platform at (${p.x}, ${p.y}) size ${p.width}x${p.height}`);
        }
    }

    console.log('');
}

// Run if executed directly
main();
