import * as THREE from 'https://cdn.skypack.dev/three';
import {OrbitControls} from "https://cdn.skypack.dev/three/examples/jsm/controls/OrbitControls";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

const orbitControl = new OrbitControls( camera, renderer.domElement );

const axisZ = new THREE.Vector3(0,0,1);

const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshBasicMaterial( { color: 0x003300 } );
var cube = new THREE.Mesh( geometry, material );
scene.add( cube );

cube = new THREE.Mesh( geometry, material );
cube.position.x = 2;
scene.add( cube );

cube = new THREE.Mesh( geometry, material );
cube.position.x = -2;

var group = new THREE.Group();
group.add( cube );
group.rotateZ(0.1);
scene.add(group);

camera.position.z = 5;
orbitControl.update();

class rgb332 {
  constructor(rgb332) {
    this.color8 = rgb332;

    var red = this.color8 >> 5;
    this.redf = red/7;
    this.red8 = this.redf * 0xFF;

    var green = (this.color8 & 0x1C) >> 2;
    this.greenf = green/7;
    this.green8 = this.greenf * 0xFF;

    var blue = this.color8 & 0x03;
    this.bluef = blue/3;
    this.blue8 = this.bluef * 0xFF;

    this.color24 = this.red8 << 16 | this.green8 << 8 | this.blue8;
  }
}

function animate() {
  requestAnimationFrame( animate );
  orbitControl.update();
  renderer.render( scene, camera );
}
animate();
