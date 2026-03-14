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

    private renderVictoryProperties(victory: { x: number; y: number }): void {
        this.container.innerHTML = `
            <h3>Victory Point</h3>
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
}
