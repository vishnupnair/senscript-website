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
let globalUniforms = {
  time: {value: 0},
  bloom: {value: 0}
}
scene = new THREE.Scene(); 
const light = new THREE.AmbientLight( 0x0af0d9 ); // soft white light
scene.add( light );
//scene.background = new THREE.Color(0xFEFCFF);
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

//	var s = 500;
//	shadowCamera = new THREE.OrthographicCamera( -s, s, s, -s, .1, 1000 );
    const shadowFrustumSize = 700; // Adjust this value based on your scene size
    const aspect = window.innerWidth / window.innerHeight;
    shadowCamera = new THREE.OrthographicCamera(
      shadowFrustumSize * aspect / -2,
      shadowFrustumSize * aspect / 2,
      shadowFrustumSize / 2,
      shadowFrustumSize / -2,
      0.1,
      1000
    );
     
     
     
	shadowCamera.position.set( 0,0,450 );
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
//	geometry.attributes.uv = bufferGeometry.attributes.uv;
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
    mesh.position.set(-100,0,0);
//    mesh.scale.set( 1.8, 1.8, 1.8 );
//	mesh2 = new THREE.Mesh( geometry2, material2);
	scene.add( mesh );
//	scene.add( mesh2 );
     


/// BackGroud

let bg = new THREE.SphereGeometry(840, 64, 32);
  let bm = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  uniforms: {
    bloom: globalUniforms.bloom,
    time: globalUniforms.time
  },
  vertexShader:`
    varying vec3 vNormal;
    void main() {
      vNormal = normal;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }
  `,
  fragmentShader:`
    uniform float bloom;
    uniform float time;
    varying vec3 vNormal;
    ${noiseV3}
    void main() {
      //vec3 col = vec3(0.012, 0.1 , 0.1);
      vec3 col = vec3(0.2, 0.2, 0.2);
      float ns = snoise(vec4(vNormal, time * 0.1));
      col = mix(col * 3., vec3(0.0, 0.0, 0.0), pow(abs(ns), 0.0125));
      col = mix(col, vec3(0), bloom);
      gl_FragColor = vec4( col, 1.0 );
    }
  `
});
let bo = new THREE.Mesh(bg, bm);
scene.add(bo);
     
     
     
     
     rotateCameraAroundTarget(camera, mesh.position,0, 0.2);
    


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
    /////////
    this.a1 = 1.2;
	this.b1 = 0.8;
	this.m1 = 5.9;
	this.n11 = 2.7;
	this.n21 = 4.7;
	this.n31 = 7.4;

	this.a2 = 1.8;
	this.b2 = 2;
	this.m2 = 16.5;
	this.n12 = 34.7;
	this.n22 = 14;
	this.n32 = -15.3;
    this.animationSpeed = 2;
};
var params = new Params();

var invalidateShadow = true;
const animationScripts = [];

function updateTextureData(index) {
  
      pos = models.solid[index].attributes.position.array
	 positions = new Float32Array(width*height*4);
    console.log(positions.length,"positions");
      for(  var j=0,i=0; j < positions.length; j+= 4,i+=3) {      
                positions[ j + 0 ] = pos[i]*5.3;
                positions[ j + 1 ] = pos[i+1]*5;
                positions[ j + 2 ] = pos[i+2]*5;
                positions[ j + 3 ] = Math.random() * 100;}
    
//    var r = 100;
//	for( var j=0; j < positions.length; j+= 4 ) {
//		positions[ j + 0 ] = randomInRange(-r,r);
//		positions[ j + 1 ] = randomInRange(-r,r);
//		positions[ j + 2 ] = randomInRange(-r,r);
//		positions[ j + 3 ] = Math.random() * 100;
//	}

	posTexture = new THREE.DataTexture( positions, width, height, THREE.RGBAFormat, floatType );
	posTexture.needsUpdate = true;
        
  
	}



async function init(models) {

//	container = document.body;

	backdropScene = new THREE.Scene();
 

//    // With this
    const frustumSize = 350; // Adjust this value based on your scene size
    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.OrthographicCamera(
      frustumSize * aspect / -2,
      frustumSize * aspect / 2,
      frustumSize / 2,
      frustumSize / -2,
      0.1,
      10000
    );

    
    
    
//	camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, .1, 10000 );
	camera.target = new THREE.Vector3( 0, 0, 0 );
	camera.position.set( 0,0,250 );
	camera.lookAt( camera.position );
	scene.add( camera );
	backdropCamera = camera.clone();
    
//	renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer = new THREE.WebGLRenderer({ canvas : document.getElementById('canvas'), antialias:true, alpha: true });
	renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setClearColor(0x00ff00, 0);
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
    
    
gsap.to(mesh.position, {
    y: "+=0.2",
    duration: 2,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut"
});
   
//console.log(Math.PI/6);
////add an animation that flashes the cube through 100 percent of scroll
animationScripts.push({
    start: 0,
    end: 5,
    func: () => {
         params.animateAll = false;
         mesh.getObjectByName('wireframe_face').visible = true;
         updateTextureData(3);
         rotateCameraAroundTarget(camera, mesh.position,0, lerp(0, 0.2, scalePercent(0, 5)));

    },
})
animationScripts.push({
    start: 5,
    end: 15,
    func: () => {
         params.animateAll = false;
         mesh.getObjectByName('wireframe_face').visible = true;
         updateTextureData(3);
         rotateCameraAroundTarget(camera, mesh.position,lerp(0, Math.PI/6, scalePercent(5, 15)),0.2);

    },
})

//add an animation that moves the cube through first 40 percent of scroll
animationScripts.push({
    start: 15,
    end: 20,
    func: () => {
         params.animateAll = true;
         mesh.getObjectByName('wireframe_face').visible = false;
         params.persistence = lerp(0.5, 0.1, scalePercent(15, 20));
         params.speed = lerp(0.5, 0.1, scalePercent(15, 20));
         
        
        
    },
})

//add an animation that rotates the cube between 40-60 percent of scroll
animationScripts.push({
    start: 21,
    end: 35,
    func: () => {
//        camera.lookAt(mesh.position)
//        camera.position.set(30, 125, 300)
//        mesh.rotation.x = lerp(0, -Math.PI/4, scalePercent(40, 60))
//          params.scale =  lerp(4, 1.9, scalePercent(40, 60))
        //console.log(cube.rotation.z)
        
        params.animateAll = false;
        updateTextureData(4);
        rotateCameraAroundTarget(camera, mesh.position,lerp(0, Math.PI/6, scalePercent(21, 35)),0);
//        mesh.getObjectByName('wireframe_face').visible = false;
        
//        params.persistence = lerp(0.1, 0.6, scalePercent(40, 60));
//        params.decay = lerp(0.6, 1.0, scalePercent(40, 60));
    },
})


animationScripts.push({
    start: 35,
    end: 40,
    func: () => {
        params.animateAll = true;
         params.persistence = lerp(0.5, 0.0, scalePercent(35, 40));
         params.speed = lerp(0.5, 0.01, scalePercent(35, 40));

    },
})
    
 animationScripts.push({
    start: 35,
    end: 45,
    func: () => {
         params.animateAll = false;
        updateTextureData(5);
        rotateCameraAroundTarget(camera, mesh.position, lerp( 0,Math.PI/3, scalePercent(35, 45)), 0);
    },
})   
    
//
animationScripts.push({
    start: 45,
    end: 50,
    func: () => {
        //auto rotate
//        mesh.rotation.x += 0.01
//        mesh.rotation.y += 0.01
        updateTextureData(5);
         rotateCameraAroundTarget(camera, mesh.position, lerp( 0,Math.PI/3, scalePercent(80, 100)), 0);
    },
})



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
    
    renderer.setSize( w   , h );
	camera.aspect = w  / h;
//	renderer.setSize( w * 0.66  , h );
//	camera.aspect = w * 0.66 / h;
     
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

function lerp(x, y, a) {
    return (1 - a) * x + a * y
}

// Used to fit the lerps to start and end at specific scrolling percentages
function scalePercent(start, end) {
    return (scrollPercent - start) / (end - start)
}

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



function playScrollAnimations() {
    animationScripts.forEach((a) => {
        if (scrollPercent >= a.start && scrollPercent < a.end) {
            a.func()
        }
    })
}

document.body.onscroll = () => {
    //calculate the current scroll progress as a percentage
    scrollPercent =
        ((document.documentElement.scrollTop || document.body.scrollTop) /
            ((document.documentElement.scrollHeight ||
                document.body.scrollHeight) -
                document.documentElement.clientHeight)) *
        100
    ;
// console.log(scrollPercent);
}
let clock = new THREE.Clock();
function animate() {

	requestAnimationFrame( animate );
   //playScrollAnimations()
//	controls.update();
//    console.log(camera.position.x);
//	backdrop.position.copy( camera.position );
    
    let time = clock.getElapsedTime();
    mesh.position.y = Math.sin(time * 1.5) * 5.8; 

    // Slight side-to-side movement
    mesh.position.x = Math.cos(time * 0.8) * 2.8;

    // Slow rotation
//    mesh.rotation.y =  Math.cos(time * 0.1) * 0.5;; 
    
    globalUniforms.time.value = time;
    //globalUniforms.bloom.value = 1;
    
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



if (params.animate || invalidateShadow) {
  mesh.material.uniforms.depthTexture.value = null;
  mesh.material.uniforms.shadow.value = true;
  renderer.render(scene, shadowCamera, shadowBuffer);
  mesh.material.uniforms.depthTexture.value = shadowBuffer.texture;
  mesh.material.uniforms.shadow.value = false;

  tmpVector.copy(scene.position);
  tmpVector.sub(shadowCamera.position);
  tmpVector.normalize();
  tmpMatrix.copy(shadowCamera.projectionMatrix);
  tmpMatrix.multiply(shadowCamera.matrixWorldInverse);
  tmpMatrix.multiply(mesh.matrixWorld);
  mesh.material.uniforms.shadowMVP.value.copy(tmpMatrix);
  mesh.material.uniforms.shadowP.value.copy(shadowCamera.projectionMatrix);
  mesh.material.uniforms.shadowV.value.copy(shadowCamera.matrixWorldInverse);

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
    globalUniforms.bloom.value = 0;
	//capturer.capture(renderer.domElement);
	helper.update();

}
