import * as THREE from './three.js';
import {OrbitControls} from './OrbitControls.js';

var scene;
var camera;
var renderer;
var orbitControl;

function begin() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color( 0x808080 );

  var aspect = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera( 75, aspect, 0.1, 1000 );
  //camera = new THREE.OrthographicCamera( -20*aspect, 20*aspect, 20, -20, 0.1, 1000 );
  camera.position.z = 35;

  renderer = new THREE.WebGLRenderer();
  renderer.setSize( window.innerWidth, window.innerHeight );
  document.body.appendChild( renderer.domElement );

  orbitControl = new OrbitControls( camera, renderer.domElement );
}

class RGB332 {
  constructor(rgb332) {
    this.color8 = rgb332;

    // Convert to 24-bit RGB888 and also prepare fractional RGB for later
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

    // Use fractional RGB to calculate HSV using algorithm modified from
    // https://dystopiancode.blogspot.com/2012/06/hsv-rgb-conversion-algorithms-in-c.html

    var major = Math.max(this.redf, this.greenf, this.bluef);
    var minor = Math.min(this.redf, this.greenf, this.bluef);
    var chroma = major-minor;

    this.val = major;

    if (0.0 != chroma) {
      if (major == this.redf) {
        this.hue = (( this.greenf - this.bluef ) / chroma) % 6.0;
      } else if (major == this.greenf) {
        this.hue = (( this.bluef - this.redf ) / chroma) + 2.0;
      } else {
        this.hue = (( this.redf - this.greenf ) / chroma) + 4.0;
      }
      this.hue *= 60.0;

      if (0 < major) {
        this.sat = chroma / major;
      } else {
        this.sat = 0;
      }
    } else {
      this.hue = 0;
      this.sat = 0;
    }
  }
}

var hsvCyl;

function addColors() {
  const boxGeometry = new THREE.BoxGeometry();
  const satScale = 15;
  const valScale = 10;

  hsvCyl = new THREE.Group();

  for(var i = 0; i <= 0xFF; i++) {
    var nowColor = new RGB332(i);
    var nowMat = new THREE.MeshBasicMaterial( { color: nowColor.color24 } );
    var nowCube = new THREE.Mesh( boxGeometry, nowMat );
    nowCube.position.y = nowColor.sat * satScale;
    // Top layer only if (1 == nowColor.val) {
    nowCube.position.z = nowColor.val * valScale;

    var rotor = new THREE.Group();
    rotor.add(nowCube);
    rotor.rotateZ(2*Math.PI*nowColor.hue/360);
    hsvCyl.add(rotor);
    // Top layer only }
  }

  hsvCyl.rotateZ(-Math.PI/3);
  scene.add(hsvCyl);
}

function animate() {
  requestAnimationFrame( animate );
  orbitControl.update();
  renderer.render( scene, camera );
}

begin();
addColors();
animate();
