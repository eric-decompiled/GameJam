import { EditorState } from '../EditorState';

export class LevelPanel {
    private container: HTMLElement;
    private state: EditorState;

    constructor(container: HTMLElement, state: EditorState) {
        this.container = container;
        this.state = state;

        this.state.on('change', () => this.render());
        this.render();
    }

    private render(): void {
        const level = this.state.getLevel();

        this.container.innerHTML = `
            <h3>Level Settings</h3>
            <div class="panel-row">
                <label for="level-name">Name</label>
                <input type="text" id="level-name" value="${this.escapeHtml(level.name)}">
            </div>
            <div class="panel-row-half">
                <div>
                    <label for="level-w">W</label>
                    <input type="number" id="level-w" value="${level.worldWidth}" step="100" min="800">
                </div>
                <div>
                    <label for="level-h">H</label>
                    <input type="number" id="level-h" value="${level.worldHeight}" step="100" min="600">
                </div>
            </div>
            <p class="info-text">${level.platforms.length} platforms</p>
        `;

        const nameInput = this.container.querySelector('#level-name') as HTMLInputElement;
        const widthInput = this.container.querySelector('#level-w') as HTMLInputElement;
        const heightInput = this.container.querySelector('#level-h') as HTMLInputElement;

        nameInput.addEventListener('change', () => {
            this.state.updateLevelInfo({ name: nameInput.value });
        });

        widthInput.addEventListener('change', () => {
            this.state.updateLevelInfo({ worldWidth: Math.max(800, parseInt(widthInput.value) || 800) });
        });

        heightInput.addEventListener('change', () => {
            this.state.updateLevelInfo({ worldHeight: Math.max(600, parseInt(heightInput.value) || 600) });
        });
    }

    private escapeHtml(str: string): string {
        return str.replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;')
                  .replace(/"/g, '&quot;');
    }
}
