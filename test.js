
import * as THREE from './three.module.js'; 
 const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas'), alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);

// Create a render target
const renderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
//    format: THREE.RGBAFormat,
//    type: THREE.UnsignedByteType,
//    stencilBuffer: false
});

// Add a simple cube
const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);
camera.position.z = 5;

// Render loop
function animate() {
    requestAnimationFrame(animate);

    // Render scene to render target
    renderer.setRenderTarget(renderTarget);
    renderer.render(scene, camera);

    // Render scene to screen
//    renderer.setRenderTarget(null);
//    renderer.clear();
//    renderer.render(scene, camera);
}
animate();
