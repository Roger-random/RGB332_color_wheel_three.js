import * as THREE from 'https://cdn.skypack.dev/three';
import {OrbitControls} from "https://cdn.skypack.dev/three/examples/jsm/controls/OrbitControls";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

const orbitControl = new OrbitControls( camera, renderer.domElement );

const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshBasicMaterial( { color: 0x003300 } );
var cube = new THREE.Mesh( geometry, material );
scene.add( cube );

cube = new THREE.Mesh( geometry, material );
cube.position.x = 2;
scene.add( cube );

cube = new THREE.Mesh( geometry, material );
cube.position.x = -2;
scene.add( cube );

camera.position.z = 5;
orbitControl.update();

function animate() {
    requestAnimationFrame( animate );
    orbitControl.update();
    renderer.render( scene, camera );
}
animate();
