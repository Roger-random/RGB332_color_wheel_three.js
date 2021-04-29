/*

8-bit RGB332 color picker, using colors laid out in HSV color cylinder.

Copyright (c) Roger Cheng

MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

*/

//////////////////////////////////////////////////////////////////////////
//
//  Three.js (https://threejs.org/) objects

import * as THREE from './three.js';
import {OrbitControls} from './OrbitControls.js';

/** Three.js Scene */
var scene;

/** Three.js Camera, usually PerspectiveCamera */
var camera;

/** Three.js Renderer */
var renderer;

/** Three.js Raycaster */
var rayCaster;

/** Three.js Orbit control */
var orbitControl;

//////////////////////////////////////////////////////////////////////////
//
//  HTML DOM manipulation

/** Collection of all on-screen text objects */
var onScreenText;

/** Text object for RGB332 hex code */
var rgb332Text;

/** Map object from Three.js mesh to RGb332 class */
var colorMap;

/** Three.js Group of all the color blocks */
var hsvCyl;

/** Three.js Mesh object at location of PointerDown event */
var downTarget;

/** Three.js Vector2 representing normalized pointer event location */
var pointerLocation;

/** Called once upon HTML DOM initialization. */
function begin() {
  // Initialize Three.js environment, copied from tutorial.
  scene = new THREE.Scene();

  var aspect = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera( 75, aspect, 0.1, 1000 );
  camera.position.z = 35;

  renderer = new THREE.WebGLRenderer();
  renderer.setSize( window.innerWidth, window.innerHeight );
  document.body.appendChild( renderer.domElement );

  // Set up raycaster and location we'll use with it for pointer hit testing.
  rayCaster = new THREE.Raycaster();
  pointerLocation = new THREE.Vector2();

  // Orbit control allows user to navigate the 3D space
  orbitControl = new OrbitControls( camera, renderer.domElement );

  // Find text elements we'll be updating as we go.
  onScreenText = document.getElementsByClassName("onScreenText");
  rgb332Text = document.getElementById("rgb332code");

  // Start listening to pointer events.
  window.addEventListener( 'pointerdown', down_handler, false );
  window.addEventListener( 'pointerup', up_handler, false );
}

/** Update Three.js objects whenever window is resized */
function resizeView() {
  renderer.setSize( window.innerWidth, window.innerHeight );
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

/** Remember target at location of pointer down */
function down_handler(pointerEvent) {
  downTarget = pointerObject(pointerEvent);
}

/** If target at location of pointer up is the same object, treat as click. */
function up_handler(pointerEvent) {
  var upTarget = pointerObject(pointerEvent);

  if (upTarget != null && upTarget == downTarget) {
    updateBackground(colorMap.get(upTarget));
  }
}

/** Find Three.js Mesh object at the location of pointer event */
function pointerObject(pointerEvent) {
  if (pointerEvent.isPrimary) {
    // From https://threejs.org/docs/index.html#api/en/core/Raycaster
    pointerLocation.x = ( pointerEvent.clientX / window.innerWidth ) * 2 - 1;
    pointerLocation.y = - ( pointerEvent.clientY / window.innerHeight ) * 2 + 1;

    rayCaster.setFromCamera(pointerLocation, camera);

    const intersects = rayCaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
      // First object is the closest object
      return intersects[0].object;
    }
  }

  return null;
}

/** Update background and on-screen text to match new background color */
function updateBackground(rgbObject) {
  var newTextColor;
  var hexPrefix;

  // Display RGB332 hex code
  if (rgbObject.color8 < 0x10) {
    hexPrefix = "0x0";
  } else {
    hexPrefix = "0x";
  }
  rgb332Text.textContent = hexPrefix+rgbObject.color8.toString(16).toUpperCase();

  // Update on-screen text color
  if (rgbObject.val > 0.5) {
    // Black text for light background
    newTextColor = "black";
  } else {
    // White text for dark background
    newTextColor = "white";
  }
  for(var i = 0; i < onScreenText.length; i++) {
    onScreenText[i].style.color = newTextColor;
  }

  // Update background color
  scene.background = new THREE.Color(rgbObject.color24);
}

/** Calculate RGB888 and HSV equivalents of given RGB332 value */
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

/** Put 256 boxes in Three.js scene, one for each RGB332 color and arranged
    in a HSV color cylinder. */
function addColors() {
  // Box geometry object shared by all colorful boxes
  const boxGeometry = new THREE.BoxGeometry();

  // Adjust these values to increase/decrease density of colors in HSV cylinder
  const satScale = 15;
  const valScale = 10;

  // Map used to find color from its representative Mesh
  colorMap = new Map();

  // Group for all the boxes, handy to manipulate entire cylinder at once.
  hsvCyl = new THREE.Group();

  // Add 256 boxes, one for each color.
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

/** Callback to update rendering based on user navigation handled by orbitControl */
function animate() {
  requestAnimationFrame( animate );
  orbitControl.update();
  renderer.render( scene, camera );
}

/** Launch upon HTML DOM content load */
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
