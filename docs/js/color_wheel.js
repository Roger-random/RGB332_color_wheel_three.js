import * as THREE from './three.js';
import {OrbitControls} from './OrbitControls.js';

var scene;
var camera;
var renderer;
var rayCaster;
var orbitControl;

var onScreenText;
var rgb332Text;
var colorMap;
var hsvCyl;
var downTarget;
var pointerLocation;

function begin() {
  scene = new THREE.Scene();

  var aspect = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera( 75, aspect, 0.1, 1000 );
  camera.position.z = 35;

  renderer = new THREE.WebGLRenderer();
  renderer.setSize( window.innerWidth, window.innerHeight );
  document.body.appendChild( renderer.domElement );

  rayCaster = new THREE.Raycaster();
  pointerLocation = new THREE.Vector2();

  orbitControl = new OrbitControls( camera, renderer.domElement );

  onScreenText = document.getElementsByClassName("onScreenText");
  rgb332Text = document.getElementById("rgb332code");

  window.addEventListener( 'pointerdown', down_handler, false );
  window.addEventListener( 'pointerup', up_handler, false );
}

function resizeView() {
  renderer.setSize( window.innerWidth, window.innerHeight );
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

function down_handler(pointerEvent) {
  downTarget = pointerObject(pointerEvent);
}

function up_handler(pointerEvent) {
  var upTarget = pointerObject(pointerEvent);

  if (upTarget != null && upTarget == downTarget) {
    updateBackground(colorMap.get(upTarget));
  }
}

function pointerObject(pointerEvent) {
  if (pointerEvent.isPrimary) {
    pointerLocation.x = ( pointerEvent.clientX / window.innerWidth ) * 2 - 1;
    pointerLocation.y = - ( pointerEvent.clientY / window.innerHeight ) * 2 + 1;

    rayCaster.setFromCamera(pointerLocation, camera);

    const intersects = rayCaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
      return intersects[0].object;
    }
  }

  return null;
}

function updateBackground(rgbObject) {
  var newTextColor;
  var hexPrefix;

  if (rgbObject.color8 < 15) {
    hexPrefix = "0x0";
  } else {
    hexPrefix = "0x";
  }
  rgb332Text.textContent = hexPrefix+rgbObject.color8.toString(16).toUpperCase();

  if (rgbObject.val > 0.5) {
    newTextColor = "black";
  } else {
    newTextColor = "white";
  }
  for(var i = 0; i < onScreenText.length; i++) {
    onScreenText[i].style.color = newTextColor;
  }

  scene.background = new THREE.Color(rgbObject.color24);
}

class RGB332 {
  constructor(rgb332) {
    this.color8 = rgb332;

    // Convert to 24-bit RGB888 and also prepare fractional RGB for later
    this.redf = (this.color8 >> 5)/7;
    this.red8 = this.redf * 0xFF;

    this.greenf = ((this.color8 & 0x1C) >> 2)/7;
    this.green8 = this.greenf * 0xFF;

    this.bluef = (this.color8 & 0x03)/3;
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

function addColors() {
  const boxGeometry = new THREE.BoxGeometry();
  const satScale = 15;
  const valScale = 10;

  colorMap = new Map();
  hsvCyl = new THREE.Group();

  for(var i = 0; i <= 0xFF; i++) {
    var nowColor = new RGB332(i);
    var nowMat = new THREE.MeshBasicMaterial( { color: nowColor.color24 } );
    var nowCube = new THREE.Mesh( boxGeometry, nowMat );
    nowCube.position.y = nowColor.sat * satScale;
    nowCube.position.z = nowColor.val * valScale;

    var rotor = new THREE.Group();
    rotor.add(nowCube);
    rotor.rotateZ(2*Math.PI*nowColor.hue/360);
    hsvCyl.add(rotor);

    colorMap.set(nowCube, nowColor);
  }

  hsvCyl.rotateZ(-Math.PI/3);
  scene.add(hsvCyl);
}

function animate() {
  requestAnimationFrame( animate );
  orbitControl.update();
  renderer.render( scene, camera );
}

function contentLoaded() {
  begin();
  addColors();
  animate();
}

//////////////////////////////////////////////////////////////////////////
//
//  Page load setup

document.addEventListener('DOMContentLoaded', contentLoaded, false);
document.defaultView.addEventListener('resize', resizeView);
