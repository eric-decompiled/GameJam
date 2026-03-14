import * as THREE from 'three';
import { GAME, COLORS } from '../utils/constants';
import { Camera } from './Camera';

export class Renderer {
    private canvas: HTMLCanvasElement;
    private renderer: THREE.WebGLRenderer;
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private shadowLight: THREE.DirectionalLight | null = null;
    private backgroundWall: THREE.Mesh | null = null;
    private backgroundGround: THREE.Mesh | null = null;
    private gameCamera: Camera | null = null;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;

        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
        });
        this.renderer.setSize(GAME.WIDTH, GAME.HEIGHT);
        this.renderer.setClearColor(new THREE.Color(COLORS.BACKGROUND));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.scene = new THREE.Scene();

        this.camera = new THREE.PerspectiveCamera(
            50,
            GAME.WIDTH / GAME.HEIGHT,
            1,
            5000
        );
        this.camera.position.set(0, -400, 800);
        this.camera.lookAt(0, 0, 0);

        this.setupLighting();
        this.setupBackground();
    }

    private setupLighting(): void {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
        mainLight.position.set(200, -400, 500);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        mainLight.shadow.camera.near = 1;
        mainLight.shadow.camera.far = 2000;
        mainLight.shadow.camera.left = -1000;
        mainLight.shadow.camera.right = 1000;
        mainLight.shadow.camera.top = 1000;
        mainLight.shadow.camera.bottom = -1000;
        this.scene.add(mainLight);
        this.shadowLight = mainLight;

        const fillLight = new THREE.DirectionalLight(0x4488ff, 0.3);
        fillLight.position.set(-100, 200, 100);
        this.scene.add(fillLight);
    }

    private setupBackground(): void {
        const wallGeom = new THREE.PlaneGeometry(4000, 2000);
        const wallMat = new THREE.MeshLambertMaterial({ color: 0x6ab0de });
        const wall = new THREE.Mesh(wallGeom, wallMat);
        wall.position.z = -100;
        wall.receiveShadow = true;
        this.scene.add(wall);
        this.backgroundWall = wall;

        const groundGeom = new THREE.PlaneGeometry(4000, 500);
        const groundMat = new THREE.MeshLambertMaterial({ color: 0x4a7a4a });
        const ground = new THREE.Mesh(groundGeom, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -850;
        ground.position.z = 0;
        ground.receiveShadow = true;
        this.scene.add(ground);
        this.backgroundGround = ground;
    }

    setCamera(camera: Camera): void {
        this.gameCamera = camera;
    }

    add(mesh: THREE.Object3D): void {
        this.scene.add(mesh);
    }

    remove(mesh: THREE.Object3D): void {
        this.scene.remove(mesh);
    }

    clear(): void {
        // Handled by render
    }

    private updateCameraPosition(): void {
        if (this.gameCamera) {
            const zoom = this.gameCamera.getZoom();
            const viewportWidth = this.gameCamera.viewportWidth;
            const viewportHeight = this.gameCamera.viewportHeight;

            const centerX = this.gameCamera.position.x + viewportWidth / 2;
            const centerY = this.gameCamera.position.y + viewportHeight / 2;

            // Adjust camera Z position based on zoom (farther = zoomed out)
            const baseZ = 800;
            const zOffset = baseZ / zoom;

            this.camera.position.x = centerX;
            this.camera.position.y = -centerY + 200;
            this.camera.position.z = zOffset;
            this.camera.lookAt(centerX, -centerY, 0);

            if (this.shadowLight) {
                this.shadowLight.position.set(centerX + 200, -centerY - 400, 500);
                this.shadowLight.target.position.set(centerX, -centerY, 0);
                this.shadowLight.target.updateMatrixWorld();
            }

            if (this.backgroundWall) {
                this.backgroundWall.position.x = centerX;
                this.backgroundWall.position.y = -centerY;
            }
            if (this.backgroundGround) {
                this.backgroundGround.position.x = centerX;
            }
        }
    }

    render(): void {
        this.updateCameraPosition();
        this.renderer.render(this.scene, this.camera);
    }

    static gameToThreePos(x: number, y: number, width: number, height: number): { x: number; y: number } {
        return {
            x: x + width / 2,
            y: -(y + height / 2),
        };
    }
}
