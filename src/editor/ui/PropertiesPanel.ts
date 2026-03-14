import { EditorState } from '../EditorState';

export class PropertiesPanel {
    private container: HTMLElement;
    private state: EditorState;

    constructor(container: HTMLElement, state: EditorState) {
        this.container = container;
        this.state = state;

        this.state.on('selectionChange', () => this.render());
        this.state.on('change', () => this.render());
        this.render();
    }

    private render(): void {
        const selection = this.state.getSelection();

        if (selection.type === 'platform' && selection.index !== null) {
            const platform = this.state.getSelectedPlatform();
            if (platform) {
                this.renderPlatformProperties(platform, selection.index);
                return;
            }
        }

        if (selection.type === 'movingPlatform' && selection.index !== null) {
            const mp = this.state.getSelectedMovingPlatform();
            if (mp) {
                this.renderMovingPlatformProperties(mp, selection.index);
                return;
            }
        }

        if (selection.type === 'spawn') {
            const spawn = this.state.getLevel().spawn;
            this.renderSpawnProperties(spawn);
            return;
        }

        if (selection.type === 'victory') {
            const victory = this.state.getLevel().victory;
            if (victory) {
                this.renderVictoryProperties(victory);
                return;
            }
        }

        if (selection.type === 'monster' && selection.index !== null) {
            const monster = this.state.getSelectedMonster();
            if (monster) {
                this.renderMonsterProperties(monster, selection.index);
                return;
            }
        }

        if (selection.type === 'coin' && selection.index !== null) {
            const coin = this.state.getSelectedCoin();
            if (coin) {
                this.renderCoinProperties(coin, selection.index);
                return;
            }
        }

        this.container.innerHTML = `
            <h3>Properties</h3>
            <p class="no-selection">No selection</p>
        `;
    }

    private renderPlatformProperties(platform: { x: number; y: number; width: number; height: number }, index: number): void {
        this.container.innerHTML = `
            <h3>Platform Properties</h3>
            <div class="panel-row-half">
                <div>
                    <label for="prop-x">X</label>
                    <input type="number" id="prop-x" value="${platform.x}" step="32">
                </div>
                <div>
                    <label for="prop-y">Y</label>
                    <input type="number" id="prop-y" value="${platform.y}" step="32">
                </div>
            </div>
            <div class="panel-row-half">
                <div>
                    <label for="prop-w">W</label>
                    <input type="number" id="prop-w" value="${platform.width}" step="32" min="32">
                </div>
                <div>
                    <label for="prop-h">H</label>
                    <input type="number" id="prop-h" value="${platform.height}" step="32" min="32">
                </div>
            </div>
            <button class="danger" id="delete-platform">Delete Platform</button>
        `;

        const xInput = this.container.querySelector('#prop-x') as HTMLInputElement;
        const yInput = this.container.querySelector('#prop-y') as HTMLInputElement;
        const wInput = this.container.querySelector('#prop-w') as HTMLInputElement;
        const hInput = this.container.querySelector('#prop-h') as HTMLInputElement;

        const updatePlatform = () => {
            this.state.updatePlatform(index, {
                x: parseInt(xInput.value) || 0,
                y: parseInt(yInput.value) || 0,
                width: Math.max(32, parseInt(wInput.value) || 32),
                height: Math.max(32, parseInt(hInput.value) || 32)
            });
        };

        xInput.addEventListener('change', updatePlatform);
        yInput.addEventListener('change', updatePlatform);
        wInput.addEventListener('change', updatePlatform);
        hInput.addEventListener('change', updatePlatform);

        this.container.querySelector('#delete-platform')!.addEventListener('click', () => {
            this.state.deletePlatform(index);
        });
    }

    private renderSpawnProperties(spawn: { x: number; y: number }): void {
        this.container.innerHTML = `
            <h3>Spawn Point</h3>
            <div class="panel-row-half">
                <div>
                    <label for="spawn-x">X</label>
                    <input type="number" id="spawn-x" value="${spawn.x}" step="32">
                </div>
                <div>
                    <label for="spawn-y">Y</label>
                    <input type="number" id="spawn-y" value="${spawn.y}" step="32">
                </div>
            </div>
        `;

        const xInput = this.container.querySelector('#spawn-x') as HTMLInputElement;
        const yInput = this.container.querySelector('#spawn-y') as HTMLInputElement;

        const updateSpawn = () => {
            this.state.setSpawn(
                parseInt(xInput.value) || 0,
                parseInt(yInput.value) || 0
            );
        };

        xInput.addEventListener('change', updateSpawn);
        yInput.addEventListener('change', updateSpawn);
    }

    private renderMovingPlatformProperties(
        mp: { width: number; height: number; path: { x: number; y: number }[]; speed?: number },
        index: number
    ): void {
        const start = mp.path[0] || { x: 0, y: 0 };
        const end = mp.path[1] || { x: 0, y: 0 };

        this.container.innerHTML = `
            <h3>Moving Platform</h3>
            <div class="panel-row-half">
                <div>
                    <label for="mp-w">W</label>
                    <input type="number" id="mp-w" value="${mp.width}" step="32" min="32">
                </div>
                <div>
                    <label for="mp-h">H</label>
                    <input type="number" id="mp-h" value="${mp.height}" step="32" min="32">
                </div>
            </div>
            <p class="info-text">Start Position</p>
            <div class="panel-row-half">
                <div>
                    <label for="mp-sx">X</label>
                    <input type="number" id="mp-sx" value="${start.x}" step="32">
                </div>
                <div>
                    <label for="mp-sy">Y</label>
                    <input type="number" id="mp-sy" value="${start.y}" step="32">
                </div>
            </div>
            <p class="info-text">End Position</p>
            <div class="panel-row-half">
                <div>
                    <label for="mp-ex">X</label>
                    <input type="number" id="mp-ex" value="${end.x}" step="32">
                </div>
                <div>
                    <label for="mp-ey">Y</label>
                    <input type="number" id="mp-ey" value="${end.y}" step="32">
                </div>
            </div>
            <div class="panel-row">
                <label for="mp-speed">Speed</label>
                <input type="number" id="mp-speed" value="${mp.speed || 60}" step="10" min="10">
            </div>
            <button class="danger" id="delete-mp">Delete</button>
        `;

        const wInput = this.container.querySelector('#mp-w') as HTMLInputElement;
        const hInput = this.container.querySelector('#mp-h') as HTMLInputElement;
        const sxInput = this.container.querySelector('#mp-sx') as HTMLInputElement;
        const syInput = this.container.querySelector('#mp-sy') as HTMLInputElement;
        const exInput = this.container.querySelector('#mp-ex') as HTMLInputElement;
        const eyInput = this.container.querySelector('#mp-ey') as HTMLInputElement;
        const speedInput = this.container.querySelector('#mp-speed') as HTMLInputElement;

        const update = () => {
            this.state.updateMovingPlatform(index, {
                width: Math.max(32, parseInt(wInput.value) || 32),
                height: Math.max(32, parseInt(hInput.value) || 32),
                speed: Math.max(10, parseInt(speedInput.value) || 60),
                path: [
                    { x: parseInt(sxInput.value) || 0, y: parseInt(syInput.value) || 0 },
                    { x: parseInt(exInput.value) || 0, y: parseInt(eyInput.value) || 0 }
                ]
            });
        };

        wInput.addEventListener('change', update);
        hInput.addEventListener('change', update);
        sxInput.addEventListener('change', update);
        syInput.addEventListener('change', update);
        exInput.addEventListener('change', update);
        eyInput.addEventListener('change', update);
        speedInput.addEventListener('change', update);

        this.container.querySelector('#delete-mp')!.addEventListener('click', () => {
            this.state.deleteMovingPlatform(index);
        });
    }

    private renderVictoryProperties(victory: { x: number; y: number }): void {
        this.container.innerHTML = `
            <h3>Chest Spawn</h3>
            <div class="panel-row-half">
                <div>
                    <label for="victory-x">X</label>
                    <input type="number" id="victory-x" value="${victory.x}" step="32">
                </div>
                <div>
                    <label for="victory-y">Y</label>
                    <input type="number" id="victory-y" value="${victory.y}" step="32">
                </div>
            </div>
        `;

        const xInput = this.container.querySelector('#victory-x') as HTMLInputElement;
        const yInput = this.container.querySelector('#victory-y') as HTMLInputElement;

        const updateVictory = () => {
            this.state.setVictory(
                parseInt(xInput.value) || 0,
                parseInt(yInput.value) || 0
            );
        };

        xInput.addEventListener('change', updateVictory);
        yInput.addEventListener('change', updateVictory);
    }

    private renderMonsterProperties(monster: { x: number; y: number }, index: number): void {
        this.container.innerHTML = `
            <h3>Monster</h3>
            <div class="panel-row-half">
                <div>
                    <label for="monster-x">X</label>
                    <input type="number" id="monster-x" value="${monster.x}" step="32">
                </div>
                <div>
                    <label for="monster-y">Y</label>
                    <input type="number" id="monster-y" value="${monster.y}" step="32">
                </div>
            </div>
            <button class="danger" id="delete-monster">Delete</button>
        `;

        const xInput = this.container.querySelector('#monster-x') as HTMLInputElement;
        const yInput = this.container.querySelector('#monster-y') as HTMLInputElement;

        const update = () => {
            this.state.updateMonster(index, {
                x: parseInt(xInput.value) || 0,
                y: parseInt(yInput.value) || 0
            });
        };

        xInput.addEventListener('change', update);
        yInput.addEventListener('change', update);

        this.container.querySelector('#delete-monster')!.addEventListener('click', () => {
            this.state.deleteMonster(index);
        });
    }

    private renderCoinProperties(coin: { x: number; y: number }, index: number): void {
        this.container.innerHTML = `
            <h3>Coin</h3>
            <div class="panel-row-half">
                <div>
                    <label for="coin-x">X</label>
                    <input type="number" id="coin-x" value="${coin.x}" step="32">
                </div>
                <div>
                    <label for="coin-y">Y</label>
                    <input type="number" id="coin-y" value="${coin.y}" step="32">
                </div>
            </div>
            <button class="danger" id="delete-coin">Delete</button>
        `;

        const xInput = this.container.querySelector('#coin-x') as HTMLInputElement;
        const yInput = this.container.querySelector('#coin-y') as HTMLInputElement;

        const update = () => {
            this.state.updateCoin(index, {
                x: parseInt(xInput.value) || 0,
                y: parseInt(yInput.value) || 0
            });
        };

        xInput.addEventListener('change', update);
        yInput.addEventListener('change', update);

        this.container.querySelector('#delete-coin')!.addEventListener('click', () => {
            this.state.deleteCoin(index);
        });
    }
}
