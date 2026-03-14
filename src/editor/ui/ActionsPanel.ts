import { EditorState } from '../EditorState';

export class ActionsPanel {
    private container: HTMLElement;
    private state: EditorState;
    private setStatus: (msg: string) => void;

    constructor(container: HTMLElement, state: EditorState, setStatus: (msg: string) => void) {
        this.container = container;
        this.state = state;
        this.setStatus = setStatus;
        this.render();
    }

    private render(): void {
        this.container.innerHTML = `
            <h3>Actions</h3>
            <button class="primary" id="copy-json">Copy to Clipboard</button>
            <button id="paste-json">Paste from Clipboard</button>
            <button id="new-level">New Level</button>
            <button class="danger" id="reset-editor">Reset Editor</button>
            <div style="margin-top: 12px;">
                <label style="display: block; margin-bottom: 4px; font-size: 13px; color: #a0a0c0;">Load Level</label>
                <select id="load-level">
                    <option value="">Select a level...</option>
                    <option value="level1">Level 1</option>
                </select>
            </div>
        `;

        this.container.querySelector('#copy-json')!.addEventListener('click', async () => {
            try {
                const json = this.state.exportJSON();
                await navigator.clipboard.writeText(json);
                this.setStatus('Level JSON copied to clipboard');
            } catch (err) {
                this.setStatus('Failed to copy to clipboard');
                console.error(err);
            }
        });

        this.container.querySelector('#paste-json')!.addEventListener('click', async () => {
            try {
                const json = await navigator.clipboard.readText();
                if (this.state.importJSON(json)) {
                    this.setStatus('Level loaded from clipboard');
                } else {
                    this.setStatus('Invalid level JSON in clipboard');
                }
            } catch (err) {
                this.setStatus('Failed to read clipboard');
                console.error(err);
            }
        });

        this.container.querySelector('#new-level')!.addEventListener('click', () => {
            if (confirm('Create a new level? Current changes will be lost.')) {
                this.state.newLevel();
                this.setStatus('New level created');
            }
        });

        this.container.querySelector('#reset-editor')!.addEventListener('click', () => {
            if (confirm('Reset editor and clear saved data? This cannot be undone.')) {
                this.state.reset();
                this.setStatus('Editor reset');
            }
        });

        const loadSelect = this.container.querySelector('#load-level') as HTMLSelectElement;
        loadSelect.addEventListener('change', async () => {
            const levelName = loadSelect.value;
            if (!levelName) return;

            try {
                const response = await fetch(`${import.meta.env.BASE_URL}levels/${levelName}.json`);
                if (!response.ok) throw new Error('Failed to load');
                const data = await response.json();
                this.state.setLevel(data);
                this.setStatus(`Loaded ${levelName}`);
            } catch (err) {
                this.setStatus(`Failed to load ${levelName}`);
                console.error(err);
            }

            loadSelect.value = '';
        });
    }
}
