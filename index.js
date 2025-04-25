import * as THREE from './three.module.js'; 
//import * as THREE from '../js/jsm/three.module.js'
import { OBJLoader } from './OBJLoader.js';
import { GLTFLoader } from "./GLTFLoader.js";
import { OrbitControls } from './OrbitControls.js';
import { FBOHelper } from './FBOHelper.js';
import { PingPongTexture } from './PingPongTexture.js';
import { Bloom } from './newBloom.js';
import * as BufferGeometryUtils  from './BufferGeometryUtils.js';
//import { vertexShader,fragmentShader } from '../js/shader.js';
import { GUI } from './lil-gui.module.min.js';
import {  load as loadGeometries } from "./LoadGeometrys.js";    
import {  randomInRange } from "./Maf.js";
import gsap from "https://cdn.skypack.dev/gsap";
import ScrollTrigger from "https://cdn.skypack.dev/gsap/ScrollTrigger";
 
'use strict';


var container, renderer, camera, controls, scene;
var mesh,mesh2,Cubegeo;
var pos,bufferGeometry;
var helper;
var positions,posTexture;
//var container = document.body;
var simulation;

var shadowCamera, shadowBuffer;
var shadowMapSize = 1024;
var floatType = THREE.FloatType;
var resolution = new THREE.Vector2();
var baseFBO;
var backdrop, bloom;
var backdropScene, backdropCamera;
let scrollPercent = 0;
var width = 256;
var height = 256;
var models;
//if (isMobile.any) {
//	width = 128;
//	height = 128;
//}
scene = new THREE.Scene(); 
const light = new THREE.AmbientLight( 0x0af0d9 ); // soft white light
scene.add( light );
//scene.background = new THREE.Color(0x0000ff);
//const geometries = await loadGeometries();
loadGeometries().then(obj => {
    
//    console.log(models);
   models = obj;
    init(models);
    animate();

    // Start rendering the scene
//    render();
}).catch(error => {
    console.error('Error loading models:', error);
});
   

 
    
function mapToRange(value, min, max, newMin = -1, newMax = 1) {
    // Clamp the value to the range [min, max]
    const clampedValue = Math.min(Math.max(value, min), max);
    
    // Map the clamped value to the new range
    const mappedValue = newMin + ((clampedValue - min) / (max - min)) * (newMax - newMin);
    
    return mappedValue;
}

function setGeometry( id ) {

	var s = 1.;
	var bufferGeometry;
	if( id == 0 ) bufferGeometry = new THREE.BoxBufferGeometry( s,s,s );
	if( id == 1 ) bufferGeometry = new THREE.IcosahedronBufferGeometry( s, 1 );
	if( id == 2 ) bufferGeometry = new THREE.CylinderBufferGeometry( s, s, s, 10, 1 );
	if( id == 3 ) {
		bufferGeometry = new THREE.CylinderBufferGeometry( s, s, s, 10, 1 );
		var rot = new THREE.Matrix4().makeRotationX(Math.PI/2);
		bufferGeometry.applyMatrix(rot);
	}

	mesh.geometry.index = bufferGeometry.index;
	mesh.geometry.attributes.position = bufferGeometry.attributes.position;
	mesh.geometry.attributes.uv = bufferGeometry.attributes.uv;
	mesh.geometry.attributes.normal = bufferGeometry.attributes.normal;

}
 function initScene(models) {

	baseFBO = new THREE.WebGLRenderTarget( 1, 1, {
		wrapS: THREE.ClampToEdgeWrapping,
		wrapT: THREE.ClampToEdgeWrapping,
		format: THREE.RGBAFormat,
		type: floatType,
		minFilter: THREE.LinearFilter,
		magFilter: THREE.LinearFilter,
		stencilBuffer: false,
		depthBuffer: true
	});

	baseFBO.generateMipMaps = false;

	helper.attach( baseFBO, 'base' );

	var s = 500;
	shadowCamera = new THREE.OrthographicCamera( -s, s, s, -s, .1, 1000 );
	shadowCamera.position.set( -10,10,350 );
	shadowCamera.lookAt( scene.position );

	shadowBuffer = new THREE.WebGLRenderTarget( shadowMapSize, shadowMapSize, {
		wrapS: THREE.ClampToEdgeWrapping,
		wrapT: THREE.ClampToEdgeWrapping,
		format: THREE.RGBAFormat,
		type: floatType,
//		minFilter: THREE.LinearMipMapLinearFilter,
//		magFilter: THREE.LinearMipMapLinearFilter,
		stencilBuffer: false,
		depthBuffer: true,

	});

	//shadowBuffer.texture.generateMipMaps = false;
//	helper.attach( shadowBuffer, 'shadow' );
    
   var index = 3 ;
       
    updateTextureData(index);

	var instances = width * height;

	var s = 1.;

//	var bufferGeometry = models.solid[2];
	var bufferGeometry = new THREE.BoxBufferGeometry();
	var geometry = new THREE.InstancedBufferGeometry();
	geometry.index = bufferGeometry.index;
	geometry.attributes.position = bufferGeometry.attributes.position;
	geometry.attributes.uv = bufferGeometry.attributes.uv;
	geometry.attributes.normal = bufferGeometry.attributes.normal;

	var lookup = [];

	for ( var y = 0; y < height; y ++ ) {
		for ( var x = 0; x < width; x ++ ) {
			lookup.push( x / width );
			lookup.push( y / height );
		}
	}

	geometry.addAttribute( 'lookup', new THREE.InstancedBufferAttribute( new Float32Array( lookup ), 2 ) );
    
	var material = new THREE.RawShaderMaterial( {
		uniforms: {
			scale: { type: 'v3', value: new THREE.Vector3(1,1,1) },
			squashiness: { type: 'f', value: 0 },
			curPos: { type: 't', value: posTexture },
			prevPos: { type: 't', value: posTexture },
			resolution: { type: 'v2', value: resolution },
			depthTexture: { type: 't', value: null },
			lightPosition: { type: 'v3', value: shadowCamera.position },
			shadowMVP: { type: 'm4', value: new THREE.Matrix4() },
			shadowV: { type: 'm4', value: new THREE.Matrix4() },
			shadowP: { type: 'm4', value: new THREE.Matrix4() },
			shadow: { float: 't', value: 0 },
		},
		vertexShader:  document.getElementById( 'vertexShader' ).textContent,
		fragmentShader: document.getElementById( 'fragmentShader' ).textContent,
		side: THREE.DoubleSide
	} );
    
    
    

	mesh = new THREE.Mesh( geometry, material );
    mesh.position.set(0,0,0);
//	mesh2 = new THREE.Mesh( geometry2, material2);
	 scene.add( mesh );
//	 scene.add( mesh2 );
    const spheregeometry = new THREE.SphereGeometry( 4, 32, 16 ); 
   const spherematerial = new THREE.MeshStandardMaterial( { color: 0xbbfab1} ); 
   const sphere = new THREE.Mesh( spheregeometry, spherematerial );
   sphere.position.set(-33,5,55);
   const sphere2 = sphere.clone();
   sphere2.position.set(33,5,55);
//   mesh.add( sphere );
//   mesh.add( sphere2 );
//     
     
//// wire frame ////
     
      var material2 = new THREE.ShaderMaterial({
            vertexShader: document.getElementById('linevertexShader').textContent,
            fragmentShader: document.getElementById('linefragmentShader').textContent,
            wireframe: true,
            side: THREE.DoubleSide
        });



    const mesh1 = new THREE.Mesh(  models.solid[3], material2 );
    mesh1.name = "wireframe_face"
    mesh1.position.set( 0, 0, 0 );
    mesh1.scale.set( 5.5, 5, 5 );

    mesh.add( mesh1 );
    ///////////////////////////////////////


	var simulationShader = new THREE.RawShaderMaterial( {
		uniforms: {
			source: { type: 't', value: null },
			seed: { type: 't', value: posTexture },
			resolution: { type: 'v2', value: new THREE.Vector2(width,height) },
			time: { type: 'f', value: 0 },
			persistence: { type: 'f', value: 1. },
			speed: { type: 'f', value: .5 },
			spread: { type: 'f', value: .5 },
			decay: { type: 'f', value: .1 },
			init: { type: 'f', value: 1 },
			animateAll: { type: 'f', value: 1 }
		},
		vertexShader: document.getElementById('ortho-vs').textContent,
		fragmentShader: document.getElementById('sim-fs').textContent,
	} );

	simulation = new PingPongTexture( renderer, simulationShader, width, height, THREE.RGBAFormat, floatType );
    

//    console.log(mesh);
	helper.attach( simulation.front, 'front' );
	helper.attach( simulation.back, 'back' );

//	backdrop = new Backdrop( shadowCamera.position, 0xb3d6f3, 0x162d40);
//	backdropScene.add( backdrop );

	bloom = new Bloom(2,helper,baseFBO,renderer);
	bloom.highlightShader.uniforms.threshold.value = .2;

}
    


    


var Params = function() {
	this.scale = 3;
	this.scaleX = 1;
	this.scaleY = 1;
	this.scaleZ = 1;
	this.decay = 0.6;
	this.speed = 0.23;
    this.spread = 0.5
	this.persistence = 0.5;
	this.animate = true;
	this.animateAll = false;
	this.post = true;
	this.squashiness = .75;
	this.drawRange = .2 * width * height;
	this.mesh = 0;
    this.cameraX =0;
    this.cameraY =0;
    this.cameraZ =152;
   
};
var params = new Params();

var invalidateShadow = true;
const animationScripts = [];

function updateTextureData(index) {
  
      pos = models.solid[index].attributes.position.array
	 positions = new Float32Array(width*height*4);
      for(  var j=0,i=0; j < positions.length; j+= 4,i+=3) {      
                positions[ j + 0 ] = pos[i]*5.5;
                positions[ j + 1 ] = pos[i+1]*5;
                positions[ j + 2 ] = pos[i+2]*5;
                positions[ j + 3 ] = Math.random() * 100;}
//}

	posTexture = new THREE.DataTexture( positions, width, height, THREE.RGBAFormat, floatType );
	posTexture.needsUpdate = true;
        
//  console.log(positions.length,pos.length);
	}



async function init(models) {

//	container = document.body;

	backdropScene = new THREE.Scene();
 

	camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, .1, 10000 );
	camera.target = new THREE.Vector3( 0, 0, 0 );
	camera.position.set( 0,0,250 );
	camera.lookAt( camera.target );
	scene.add( camera );
	backdropCamera = camera.clone();
    
//	renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer = new THREE.WebGLRenderer({ canvas : document.getElementById('canvas'), antialias:true, alpha: true });
	renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setClearColor(0x000000, 0);
//	container.appendChild( renderer.domElement );
//    scene.fog = new THREE.Fog( 0x0066ff, 2.7, 4 );
   // renderer.setClearColor(0x021c12, 1);
	helper = new FBOHelper( renderer );
	helper.show(false);

//	addCommonUI(renderer.domElement);

	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFShadowMap;

//	controls = new OrbitControls( camera, renderer.domElement );
	initScene(models);
	onWindowResized();
    gsap.registerPlugin(ScrollTrigger);
    const timeline = gsap.timeline({
      scrollTrigger: {
          markers: true,
          trigger: "#start",
          scrub: 7,
          start: "2% top",
          endTrigger: "#end",
          end: "top top",
        }
    })
    
let angle =  new THREE.Vector3(0,0,0);
scrollListener();
 

function scrollListener() {
//    
   timeline.to(angle, {
    duration: 0.5,
    x: 0,  // Rotate 360 degrees horizontally
    y: Math.PI / 8,  // Rotate 45 degrees vertically
    onUpdate: () => {
        rotateCameraAroundTarget(camera, mesh.position, angle.x, angle.y);
    },
    ease: "power1.inOut"
});
   timeline.to(angle, {
    duration: 1,
    x: Math.PI / 4,  // Rotate 360 degrees horizontally
    y: 0,  // Rotate 45 degrees vertically
    onUpdate: () => {
        params.animateAll = false;
        updateTextureData(3);
        mesh.getObjectByName('wireframe_face').visible = true;
        rotateCameraAroundTarget(camera, mesh.position, angle.x, angle.y);
        
    },
    ease: "power1.inOut"
});
  // First
  timeline.to(params, {
	speed : 1,
	persistence : 0.5,
    duration: 0.1,
    ease: "none",
    onUpdate: () => {
       params.animateAll = true;
       mesh.getObjectByName('wireframe_face').visible = false;
    },
  }, );
    timeline.to(params, {
	speed : 0.1,
	persistence : 0.0,
    duration: 0.5,
    ease: "power4.out",
    onUpdate: () => {
       params.animateAll = true;
    },
    onComplete: () => {
        params.animateAll = false;
        updateTextureData(4);
    }
  }, );
    
   timeline.to(params, {
	speed : 0.01,
	persistence : 0.0,
    duration: 2,
    ease: "power4.out",
    onUpdate: () => {
        params.animateAll = false;
        updateTextureData(4);
    },
  }, );
    
 timeline.to(params, {
	speed : 1,
	persistence : 0.5,
    duration: 0.1,
    ease: "none",
    onUpdate: () => {
       params.animateAll = true;
    },
  }, );
    timeline.to(params, {
	speed : 0.1,
	persistence : 0.0,
    duration: 0.5,
    ease: "power4.out",
    onUpdate: () => {
       params.animateAll = true;
    },
  }, );
 timeline.to(params, {
	speed : 0.01,
	persistence : 0.0,
    duration: 2,
    ease: "power4.out",
    onUpdate: () => {
        params.animateAll = false;
        updateTextureData(5);
    },
  }, );

//  timeline.to(camera.rotation, {
//    x: -1.4883567225982262, 
//    y: 1.4111816307806428, 
//    z: 1.4873002026311628,
//    duration: 2,
//  }, "<");
//  
//  // Second
//  timeline.to(camera.position, {
//    x: -0.36, 
//    y: 1.458624, 
//    z: 0.353078,
//    duration: 2,
//  }, ">");
//
//  timeline.to(camera.rotation, {
//    x: -3.128337, 
//    y: 0.006627, 
//    z: 3.141505,
//    duration: 2,
//  }, "<");
//  
}

   


	window.addEventListener( 'resize', onWindowResized );

	window.addEventListener( 'keydown', function(e) {
		if( e.keyCode === 32 ){
			params.animate = !params.animate;
		}
	})

	var gui = new GUI();
	var f1 = gui.addFolder('Simulation');
	f1.add(params, 'persistence', 0, 1 ).listen();
	f1.add(params, 'speed', 0.1, 1 ).listen();
	f1.add(params, 'spread', 0.5, 4 ).listen();
	f1.add(params, 'decay', 0, 1 ).listen();
	f1.add(params, 'animate' ).listen();
	f1.add(params, 'animateAll' ).listen();
	f1.add(params, 'cameraX',-500,500 ).listen();
	f1.add(params, 'cameraY',-500,500 ).listen();
	f1.add(params, 'cameraZ',0,1000 ).listen();
	var f2 = gui.addFolder('Rendering');
	f2.add(params, 'mesh', { cube: 0, sphere: 1, disc: 2, cylinder: 3 } ).listen().onChange( function() {
		setGeometry( params.mesh );
		invalidateShadow = true;
	});
	f2.add(params, 'scale', 0, 10 ).listen().onChange( function() { invalidateShadow = true });
	f2.add(params, 'scaleX', 0, 1 ).listen().onChange( function() { invalidateShadow = true });
	f2.add(params, 'scaleY', 0, 1 ).listen().onChange( function() { invalidateShadow = true });
	f2.add(params, 'scaleZ', 0, 1 ).listen().onChange( function() { invalidateShadow = true });
	f2.add(params, 'squashiness', 0, 1 ).listen().onChange( function() { invalidateShadow = true });
	f2.add(params, 'drawRange', 0, width * height ).listen().onChange( function() { invalidateShadow = true });
	f2.add(params, 'post' ).listen();

	f1.open();
	f2.open();
	gui.close();

	

}

function onWindowResized( event ) {

	var w = window.innerWidth;
	var h = window.innerHeight ;

	renderer.setSize( w * 0.66  , h );
	camera.aspect = w * 0.66 / h;
     
	camera.updateProjectionMatrix();

	var dPR = 1.0 * window.devicePixelRatio;
	bloom.setSize( w * dPR, h * dPR );
	resolution.set( w * dPR, h * dPR );
	baseFBO.setSize(w * dPR, h * dPR );
	helper.refreshFBO( baseFBO );

	helper.setSize( w,h );

}

var tmpVector = new THREE.Vector3();
var tmpMatrix = new THREE.Matrix4();


function rotateCameraAroundTarget(camera, target, angleX, angleY) {
    // Calculate the direction vector from the camera to the target
    const direction = new THREE.Vector3();
    direction.subVectors(camera.position, target);
    
    // Calculate the distance from the camera to the target
    const distance = direction.length();
    
    // Calculate the new position of the camera
    const theta = angleX; // Horizontal angle
    const phi = angleY;   // Vertical angle
    
    const newX = target.x + distance * Math.sin(theta) * Math.cos(phi);
    const newY = target.y + distance * Math.sin(phi);
    const newZ = target.z + distance * Math.cos(theta) * Math.cos(phi);
    
    // Set the new position of the camera
    camera.position.set(newX, newY, newZ);
    
    // Make the camera look at the target
    camera.lookAt(target);
}

function animate() {

	requestAnimationFrame( animate );
//	controls.update();
//    console.log(camera.position.x);
//	backdrop.position.copy( camera.position );
	backdropCamera.position.copy( camera.position );
	backdropCamera.rotation.copy( camera.rotation );
    shadowCamera.position.set( params.cameraX,params.cameraY,params.cameraZ );
//     mesh.rotation.y += 0.001;
	if( params.animate ) {
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
    

	mesh.material.uniforms.scale.value.set( params.scaleX, params.scaleY, params.scaleZ ).multiplyScalar( params.scale );
	mesh.material.uniforms.squashiness.value = params.squashiness;
	mesh.geometry.maxInstancedCount = Math.round(params.drawRange);



	if( params.animate || invalidateShadow ) {
		mesh.material.uniforms.depthTexture.value = null;
		mesh.material.uniforms.shadow.value = true;
		renderer.render( scene, shadowCamera, shadowBuffer );
		mesh.material.uniforms.depthTexture.value = shadowBuffer.texture;
		mesh.material.uniforms.shadow.value = false;
      

		tmpVector.copy( scene.position );
		tmpVector.sub( shadowCamera.position );
		tmpVector.normalize();
		tmpMatrix.copy( shadowCamera.projectionMatrix );
		tmpMatrix.multiply( mesh.matrixWorld );
		tmpMatrix.multiply( shadowCamera.matrixWorldInverse);
		mesh.material.uniforms.shadowMVP.value.copy( tmpMatrix );
		mesh.material.uniforms.shadowP.value.copy( shadowCamera.projectionMatrix );
		mesh.material.uniforms.shadowV.value.copy( shadowCamera.matrixWorldInverse );

		invalidateShadow = false;
	}
 // Render the background to the full screen
//            renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
//            renderer.setScissor(0, 0, window.innerWidth, window.innerHeight);
//            renderer.setScissorTest(false); // Disable scissor test to render full background
//            renderer.render(scene, camera);

            // Render the scene on the right half of the screen
             // Enable scissor test for half screen
//            renderer.render(scene, camera);
//
	if( params.post ) {
		renderer.autoClear = false;
		renderer.render( backdropScene, backdropCamera, baseFBO, true );
		renderer.render( scene, camera, baseFBO, false );
        bloom.render();
//        renderer.setRenderTarget(baseFBO);
		
	} else {
		renderer.autoClear = true;
		renderer.render( scene, camera );
//         bloom.render();
	}

	//capturer.capture(renderer.domElement);
	helper.update();

}
