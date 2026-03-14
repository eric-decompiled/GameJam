export class Toolbar {
    private container: HTMLElement;
    private onToolChange: (tool: string) => void;
    private onToggleJumpArc: () => void;
    private onTest: () => void;

    constructor(
        container: HTMLElement,
        initialTool: string,
        initialJumpArc: boolean,
        onToolChange: (tool: string) => void,
        onToggleJumpArc: () => void,
        onTest: () => void
    ) {
        this.container = container;
        this.onToolChange = onToolChange;
        this.onToggleJumpArc = onToggleJumpArc;
        this.onTest = onTest;
        this.render(initialTool, initialJumpArc);
    }

    private render(activeTool: string, jumpArcOn: boolean): void {
        this.container.innerHTML = `
            <div class="toolbar-group">
                <button data-tool="select" class="${activeTool === 'select' ? 'active' : ''}" title="Select/Draw (V)">Edit</button>
                <button data-tool="spawn" class="${activeTool === 'spawn' ? 'active' : ''}" title="Spawn tool (S)">Spawn</button>
                <button data-tool="victory" class="${activeTool === 'victory' ? 'active' : ''}" title="Victory tool (G)">Victory</button>
            </div>
            <div class="toolbar-group">
                <button id="toggleJumpArc" class="${jumpArcOn ? 'active' : ''}" title="Show jump trajectory (J)">Jump Arc</button>
                <button id="testLevel" class="primary" title="Test level in new tab">Test</button>
            </div>
            <a href="/" class="nav-link">Play Game</a>
        `;

        this.container.querySelectorAll('button[data-tool]').forEach(btn => {
            btn.addEventListener('click', () => {
                const tool = btn.getAttribute('data-tool')!;
                this.onToolChange(tool);
            });
        });

        this.container.querySelector('#toggleJumpArc')!.addEventListener('click', () => {
            const btn = this.container.querySelector('#toggleJumpArc')!;
            btn.classList.toggle('active');
            this.onToggleJumpArc();
        });

        this.container.querySelector('#testLevel')!.addEventListener('click', () => {
            this.onTest();
        });
    }
}
