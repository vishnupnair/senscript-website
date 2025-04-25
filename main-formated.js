import * as THREE from './three.module.js';
import { OBJLoader } from './OBJLoader.js';
import { GLTFLoader } from "./GLTFLoader.js";
import { OrbitControls } from './OrbitControls.js';
import { FBOHelper } from './FBOHelper.js';
import { PingPongTexture } from './PingPongTexture.js';
import { Bloom } from './newBloom.js';
import * as BufferGeometryUtils from './BufferGeometryUtils.js';
import { GUI } from './lil-gui.module.min.js';
import { load as loadGeometries } from "./LoadGeometrys.js";
import { randomInRange } from "./Maf.js";
import gsap from "https://cdn.skypack.dev/gsap";
import ScrollTrigger from "https://cdn.skypack.dev/gsap/ScrollTrigger";

'use strict';

// Constants
const WIDTH = 256;
const HEIGHT = 256;
const SHADOW_MAP_SIZE = 1024;
const FLOAT_TYPE = THREE.FloatType;

// Scene Setup
let renderer, camera, scene, mesh, simulation, bloom, helper;
let shadowCamera, shadowBuffer, baseFBO;
let models, posTexture;

// Parameters
const params = {
    scale: 3,
    scaleX: 1,
    scaleY: 1,
    scaleZ: 1,
    decay: 0.6,
    speed: 0.23,
    spread: 0.5,
    persistence: 0.5,
    animate: true,
    animateAll: false,
    post: true,
    squashiness: 0.75,
    drawRange: 0.2 * WIDTH * HEIGHT,
    mesh: 0,
    cameraX: 0,
    cameraY: 0,
    cameraZ: 152,
    animationSpeed: 2
};

// Initialize the application
async function init() {
    // Load models
    try {
        models = await loadGeometries();
        setupScene();
        setupGUI();
        setupEventListeners();
        animate();
    } catch (error) {
        console.error('Error loading models:', error);
    }
}

// Setup the scene
function setupScene() {
    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas'), antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x00ff00, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    // Scene
    scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0x0af0d9)); // Soft white light

    // Camera
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 10000);
    camera.position.set(0, 125, 250);
    camera.lookAt(0, 0, 0);
    scene.add(camera);

    // Shadow Camera
    const shadowSize = 500;
    shadowCamera = new THREE.OrthographicCamera(-shadowSize, shadowSize, shadowSize, -shadowSize, 0.1, 1000);
    shadowCamera.position.set(-10, 10, 350);
    shadowCamera.lookAt(scene.position);

    // Shadow Buffer
    shadowBuffer = new THREE.WebGLRenderTarget(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE, {
        wrapS: THREE.ClampToEdgeWrapping,
        wrapT: THREE.ClampToEdgeWrapping,
        format: THREE.RGBAFormat,
        type: FLOAT_TYPE,
        stencilBuffer: false,
        depthBuffer: true
    });

    // Base FBO
    baseFBO = new THREE.WebGLRenderTarget(1, 1, {
        wrapS: THREE.ClampToEdgeWrapping,
        wrapT: THREE.ClampToEdgeWrapping,
        format: THREE.RGBAFormat,
        type: FLOAT_TYPE,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        stencilBuffer: false,
        depthBuffer: true
    });

    // Helper
    helper = new FBOHelper(renderer);
    helper.show(false);

    // Bloom
    bloom = new Bloom(2, helper, baseFBO, renderer);
    bloom.highlightShader.uniforms.threshold.value = 0.2;

    // Initialize mesh and simulation
    initMesh(models);
    initSimulation();
}

// Initialize the mesh
function initMesh(models) {
    const bufferGeometry = new THREE.BoxBufferGeometry();
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.index = bufferGeometry.index;
    geometry.attributes.position = bufferGeometry.attributes.position;
    geometry.attributes.normal = bufferGeometry.attributes.normal;

    const lookup = [];
    for (let y = 0; y < HEIGHT; y++) {
        for (let x = 0; x < WIDTH; x++) {
            lookup.push(x / WIDTH, y / HEIGHT);
        }
    }
    geometry.addAttribute('lookup', new THREE.InstancedBufferAttribute(new Float32Array(lookup), 2));

    const material = new THREE.RawShaderMaterial({
        uniforms: {
            scale: { value: new THREE.Vector3(1, 1, 1) },
            squashiness: { value: 0 },
            curPos: { value: posTexture },
            prevPos: { value: posTexture },
            resolution: { value: new THREE.Vector2() },
            depthTexture: { value: null },
            lightPosition: { value: shadowCamera.position },
            shadowMVP: { value: new THREE.Matrix4() },
            shadowV: { value: new THREE.Matrix4() },
            shadowP: { value: new THREE.Matrix4() },
            shadow: { value: 0 }
        },
        vertexShader: document.getElementById('vertexShader').textContent,
        fragmentShader: document.getElementById('fragmentShader').textContent,
        side: THREE.DoubleSide
    });

    mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
}

// Initialize the simulation
function initSimulation() {
    const simulationShader = new THREE.RawShaderMaterial({
        uniforms: {
            source: { value: null },
            seed: { value: posTexture },
            resolution: { value: new THREE.Vector2(WIDTH, HEIGHT) },
            time: { value: 0 },
            persistence: { value: params.persistence },
            speed: { value: params.speed },
            spread: { value: params.spread },
            decay: { value: params.decay },
            init: { value: 1 },
            animateAll: { value: params.animateAll }
        },
        vertexShader: document.getElementById('ortho-vs').textContent,
        fragmentShader: document.getElementById('sim-fs').textContent
    });

    simulation = new PingPongTexture(renderer, simulationShader, WIDTH, HEIGHT, THREE.RGBAFormat, FLOAT_TYPE);
    helper.attach(simulation.front, 'front');
    helper.attach(simulation.back, 'back');
}

// Setup GUI
function setupGUI() {
    const gui = new GUI();
    const f1 = gui.addFolder('Simulation');
    f1.add(params, 'persistence', 0, 1).listen();
    f1.add(params, 'speed', 0.1, 1).listen();
    f1.add(params, 'spread', 0.5, 4).listen();
    f1.add(params, 'decay', 0, 1).listen();
    f1.add(params, 'animate').listen();
    f1.add(params, 'animateAll').listen();
    f1.add(params, 'cameraX', -500, 500).listen();
    f1.add(params, 'cameraY', -500, 500).listen();
    f1.add(params, 'cameraZ', 0, 1000).listen();

    const f2 = gui.addFolder('Rendering');
    f2.add(params, 'mesh', { cube: 0, sphere: 1, disc: 2, cylinder: 3 }).listen().onChange(() => setGeometry(params.mesh));
    f2.add(params, 'scale', 0, 10).listen();
    f2.add(params, 'scaleX', 0, 1).listen();
    f2.add(params, 'scaleY', 0, 1).listen();
    f2.add(params, 'scaleZ', 0, 1).listen();
    f2.add(params, 'squashiness', 0, 1).listen();
    f2.add(params, 'drawRange', 0, WIDTH * HEIGHT).listen();
    f2.add(params, 'post').listen();

    f1.open();
    f2.open();
    gui.close();
}

// Setup event listeners
function setupEventListeners() {
    window.addEventListener('resize', onWindowResized);
    window.addEventListener('keydown', (e) => {
        if (e.keyCode === 32) params.animate = !params.animate;
    });
}

// Handle window resize
function onWindowResized() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    const dPR = window.devicePixelRatio;
    bloom.setSize(width * dPR, height * dPR);
    baseFBO.setSize(width * dPR, height * dPR);
    helper.refreshFBO(baseFBO);
    helper.setSize(width, height);
}
let clock = new THREE.Clock();
// Animation loop
function animate() {
    requestAnimationFrame(animate);
    const time = clock.getElapsedTime();

    // Update mesh position
    mesh.position.y = Math.sin(time * 1.5) * 5.8;
    mesh.position.x = Math.cos(time * 0.8) * 2.8;

    // Update simulation
    if (params.animate) {
        simulation.shader.uniforms.decay.value = params.decay;
        simulation.shader.uniforms.persistence.value = params.persistence;
        simulation.shader.uniforms.speed.value = params.speed;
        simulation.shader.uniforms.spread.value = params.spread;
        simulation.shader.uniforms.animateAll.value = params.animateAll;
        simulation.shader.uniforms.time.value = performance.now();
        simulation.render();
        mesh.material.uniforms.curPos.value = simulation.front.texture;
        mesh.material.uniforms.prevPos.value = simulation.back.texture;
        simulation.shader.uniforms.seed.value = posTexture;
        simulation.shader.uniforms.init.value = 0;
    }

    // Render the scene
    if (params.post) {
        renderer.autoClear = false;
        renderer.render(scene, camera, baseFBO, false);
        bloom.render();
    } else {
        renderer.autoClear = true;
        renderer.render(scene, camera);
    }

    helper.update();
}

// Start the application
init();