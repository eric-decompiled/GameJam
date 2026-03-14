import { EditorState } from './EditorState';
import { EditorCanvas } from './EditorCanvas';
import { Grid } from './Grid';
import { Tool } from './tools/Tool';
import { SelectTool } from './tools/SelectTool';
import { PlatformTool } from './tools/PlatformTool';
import { SpawnTool } from './tools/SpawnTool';
import { VictoryTool } from './tools/VictoryTool';
import { MovingPlatformTool } from './tools/MovingPlatformTool';
import { MonsterTool } from './tools/MonsterTool';
import { CoinTool } from './tools/CoinTool';
import { Toolbar } from './ui/Toolbar';
import { PropertiesPanel } from './ui/PropertiesPanel';
import { LevelPanel } from './ui/LevelPanel';
import { ActionsPanel } from './ui/ActionsPanel';

export class EditorApp {
    private state: EditorState;
    private canvas: EditorCanvas;
    private grid: Grid;
    private tools: Map<string, Tool> = new Map();
    private currentToolName: string = 'select';
    private statusBar: HTMLElement;
    private showJumpArc: boolean = true;

    constructor() {
        this.state = new EditorState();
        this.grid = new Grid();

        const canvasEl = document.getElementById('editorCanvas') as HTMLCanvasElement;
        this.canvas = new EditorCanvas(canvasEl, this.state, this.grid);
        this.statusBar = document.getElementById('statusBar')!;

        this.initTools();
        this.initUI();
        this.setupKeyboardShortcuts();

        this.setTool('select');

        // Set initial jump arc state
        this.canvas.setShowJumpArc(this.showJumpArc);
    }

    private initTools(): void {
        this.tools.set('select', new SelectTool(this.state, this.grid, this.canvas));
        this.tools.set('platform', new PlatformTool(this.state, this.grid));
        this.tools.set('moving', new MovingPlatformTool(this.state, this.grid));
        this.tools.set('spawn', new SpawnTool(this.state, this.grid));
        this.tools.set('victory', new VictoryTool(this.state, this.grid));
        this.tools.set('monster', new MonsterTool(this.state, this.grid));
        this.tools.set('coin', new CoinTool(this.state, this.grid));
    }

    private initUI(): void {
        const toolbarEl = document.getElementById('toolbar')!;
        new Toolbar(
            toolbarEl,
            this.currentToolName,
            this.showJumpArc,
            (toolName) => this.setTool(toolName),
            () => this.toggleJumpArc(),
            () => this.testLevel()
        );

        const propertiesEl = document.getElementById('propertiesPanel')!;
        new PropertiesPanel(propertiesEl, this.state);

        const levelEl = document.getElementById('levelPanel')!;
        new LevelPanel(levelEl, this.state);

        const actionsEl = document.getElementById('actionsPanel')!;
        new ActionsPanel(actionsEl, this.state, (msg) => this.setStatus(msg));
    }

    private setupKeyboardShortcuts(): void {
        document.addEventListener('keydown', (e) => {
            // Handle undo even in input fields
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                if (this.state.undo()) {
                    this.setStatus('Undo');
                }
                return;
            }

            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            switch (e.key.toLowerCase()) {
                case 'v':
                case '1':
                    this.setTool('select');
                    break;
                case 'm':
                case '2':
                    this.setTool('moving');
                    break;
                case 's':
                case '3':
                    if (!e.ctrlKey && !e.metaKey) {
                        this.setTool('spawn');
                    }
                    break;
                case 'g':
                case '4':
                    this.setTool('victory');
                    break;
                case 'n':
                case '5':
                    this.setTool('monster');
                    break;
                case 'c':
                case '6':
                    if (!e.ctrlKey && !e.metaKey) {
                        this.setTool('coin');
                    }
                    break;
                case 'j':
                    this.toggleJumpArc();
                    document.querySelector('#toggleJumpArc')?.classList.toggle('active', this.showJumpArc);
                    break;
                case 't':
                    if (!e.ctrlKey && !e.metaKey) {
                        this.testLevel();
                    }
                    break;
                case 'delete':
                case 'backspace':
                    this.deleteSelected();
                    break;
                case 'escape':
                    this.state.clearSelection();
                    break;
            }
        });
    }

    private setTool(name: string): void {
        const tool = this.tools.get(name);
        if (tool) {
            this.currentToolName = name;
            this.canvas.setTool(tool);

            document.querySelectorAll('.toolbar button[data-tool]').forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute('data-tool') === name);
            });

            this.setStatus(`Tool: ${name.charAt(0).toUpperCase() + name.slice(1)}`);
        }
    }

    private deleteSelected(): void {
        const selection = this.state.getSelection();
        if (selection.type === 'platform' && selection.index !== null) {
            this.state.deletePlatform(selection.index);
            this.setStatus('Platform deleted');
        } else if (selection.type === 'movingPlatform' && selection.index !== null) {
            this.state.deleteMovingPlatform(selection.index);
            this.setStatus('Moving platform deleted');
        } else if (selection.type === 'monster' && selection.index !== null) {
            this.state.deleteMonster(selection.index);
            this.setStatus('Monster deleted');
        } else if (selection.type === 'coin' && selection.index !== null) {
            this.state.deleteCoin(selection.index);
            this.setStatus('Coin deleted');
        }
    }

    private setStatus(message: string): void {
        this.statusBar.textContent = message;
    }

    private toggleJumpArc(): void {
        this.showJumpArc = !this.showJumpArc;
        this.canvas.setShowJumpArc(this.showJumpArc);
        this.setStatus(this.showJumpArc ? 'Jump arc: ON' : 'Jump arc: OFF');
    }

    private testLevel(): void {
        const json = this.state.exportJSON();
        sessionStorage.setItem('testLevel', json);
        window.open('/?test=1', '_blank');
    }
}
