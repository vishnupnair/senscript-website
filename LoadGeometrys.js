import * as THREE from './three.module.js';

import { GLTFLoader } from "./GLTFLoader.js";
import { OBJLoader } from "./OBJLoader.js";
import {  animation } from "./animation.js";
const GLTFloader = new GLTFLoader();
const OBJloader = new OBJLoader();

async function loadGLTFLoaderModel(file) {
  return new Promise((resolve, reject) => {
    GLTFloader.load(file, (scene) => {
      resolve(scene);
    });
  });
}
async function loadOBJLoaderModel(file) {
  return new Promise((resolve, reject) => {
    OBJloader.load(file, (scene) => {
      resolve(scene);
    });
  });
}

async function loadIcosahedron() {
  const scene = await loadGLTFLoaderModel("../assets/icosahedron.glb");
  const geo = scene.scene.children[0].children[0].geometry;
  geo.center();
  const scale = 15;
  geo.applyMatrix(new THREE.Matrix4().makeScale(scale, scale, scale));
  return geo;
}

async function loadDodecahedron() {
  const scene = await loadGLTFLoaderModel("../assets/dodecahedron.glb");
  const geo = scene.scene.children[0].children[0].geometry;
  geo.center();
  const scale = 15.3;
  geo.applyMatrix(new THREE.Matrix4().makeScale(scale, scale, scale));
  return geo;
}

async function loadBox() {
  const scene = await loadGLTFLoaderModel("../assets/box.glb");
  const geo = scene.scene.children[0].children[0].geometry;
  geo.center();
  const scale = 15.3;
  geo.applyMatrix(new THREE.Matrix4().makeScale(scale, scale, scale));
  return geo;
}
async function loadHead() {
  const scene = await loadOBJLoaderModel("./malehead.obj");
  const geo = scene.children[0].geometry;
  geo.center();
  const scale = 1.3;
//  geo.scale.set(scale,scale,scale);
  
    console.log(scene);
//  geo.applyMatrix(new THREE.Matrix4().makeScale(scale, scale, scale));
  return geo;
}
var params ={};
function CustomShape(index) {
  
  var a = animation[index];
        params.n11 = a[0];
        params.n21 = a[1];
        params.n31 = a[2];
        params.m1  = a[3];
        params.a1  = a[4];
        params.b1  = a[5];

        params.n12 = a[6];
        params.n22 = a[7];
        params.n32 = a[8];
        params.m2  = a[9];
        params.a2  = a[10];
        params.b2  = a[11];

//    var geometry = new THREE.IcosahedronBufferGeometry(1,6);
	var geometry = new THREE.SphereBufferGeometry(75,64,32);
	var pp = geometry.attributes.position.array;
	for( var j = 0; j < pp.length; j+= 3 ) {
		var x = pp[ j ];
		var y = pp[ j + 1 ];
		var z = pp[ j + 2 ];
		var theta = Math.atan2(y,x);
		var phi = Math.atan2(Math.sqrt(x*x+y*y),z) - Math.PI / 2;
        var d = ss(theta, phi)
		pp[ j ] = d.x * 30;
		pp[ j + 1 ] = d.y * 30;
		pp[ j + 2 ] = d.z * 30;
	}
  
    return geometry;
}
    
function sf( phi, n1, n2, n3, a, b, m ){

	var t1 = Math.abs(Math.cos(m * phi / 4.0)/a);
	t1 = Math.pow(t1, n2);

	var t2 = Math.abs(Math.sin(m * phi / 4.0)/b);
	t2 = Math.pow(t2, n3);

	var t3 = t1 + t2;

	var r = Math.pow(t3, -1.0 / n1);

	return r;
}

function r1(phi) {
	return sf(phi,params.n11,params.n21,params.n31,params.a1,params.b1,params.m1);
}

function r2(phi) {
	return sf(phi,params.n12,params.n22,params.n32,params.a2,params.b2,params.m2);
}

function ss(theta, phi) {

	var x = r1(theta)*Math.cos(theta)*r2(phi)*Math.cos(phi);
	var y = r1(theta)*Math.sin(theta)*r2(phi)*Math.cos(phi);
	var z = r2(phi)*Math.sin(phi);

	return new THREE.Vector3(x,y,z);

}

async function load() {
  const [icosahedron, dodecahedron, box,head] = await Promise.all([
    loadIcosahedron(),
    loadDodecahedron(),
    loadBox(),
    loadHead(),
    
  ]);
  return {
    solid: [
      icosahedron,
      dodecahedron,
      box,
      head,
      new THREE.TorusKnotBufferGeometry(10, 3, 100, 16),
      new THREE.TorusBufferGeometry( 10, 3, 16, 100 ),
        CustomShape(1),
        CustomShape(2),
        CustomShape(3),
        CustomShape(4),
      
    ],
  };
}



export { load };