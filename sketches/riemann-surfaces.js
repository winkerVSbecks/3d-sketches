import { Quaternion } from 'three';
// Ensure ThreeJS is in global scope for the 'examples/'
global.THREE = require('three');

// Include any additional ThreeJS examples below
require('three/examples/js/controls/OrbitControls');

const canvasSketch = require('canvas-sketch');
const Random = require('canvas-sketch-util/random');
const { mapRange } = require('canvas-sketch-util/math');

const settings = {
  scaleToView: true,
  dimensions: [1080, 1080],
  context: 'webgl',
  animate: true,
  duration: 4,
};

const sketch = ({ width, height, context }) => {
  // Create a renderer
  const renderer = new THREE.WebGLRenderer({
    canvas: context.canvas,
  });

  const clrs = {
    bg: '#0C07B9',
    top: ['#FD7093', '#F543BE'],
    bottom: ['#D127E8', '#6B13D5'],
  };

  // WebGL background color
  renderer.setClearColor(clrs.bg, 1);

  // Setup a camera
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 100);
  camera.position.set(0, 2, 0);
  camera.lookAt(new THREE.Vector3());

  // Setup camera controller
  const controls = new THREE.OrbitControls(camera, context.canvas);

  // Setup your scene
  const scene = new THREE.Scene();

  // Setup a mesh with geometry + material
  const [meshTopA, meshTopB] = makeMesh(clrs.top, riemannSurfaceTop());
  scene.add(meshTopA);
  scene.add(meshTopB);

  const [meshBottomA, meshBottomB] = makeMesh(
    clrs.bottom,
    riemannSurfaceBottom()
  );
  scene.add(meshBottomA);
  scene.add(meshBottomB);

  return {
    resize({ pixelRatio, viewportWidth, viewportHeight }) {
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(viewportWidth, viewportHeight, false);
      camera.aspect = viewportWidth / viewportHeight;
      camera.updateProjectionMatrix();
    },
    render({ playhead }) {
      controls.update();
      renderer.render(scene, camera);

      meshTopA.rotation.z = playhead * Math.PI * 2;
      meshTopB.rotation.z = playhead * Math.PI * 2;
      meshBottomA.rotation.z = playhead * Math.PI * 2;
      meshBottomB.rotation.z = playhead * Math.PI * 2;
    },
    unload() {
      controls.dispose();
      renderer.dispose();
    },
  };
};

canvasSketch(sketch, settings);

function makeMesh([colorA, colorB], geometryFn) {
  const geometry = new THREE.ParametricGeometry(geometryFn, 1000, 1000);

  const materialA = new THREE.MeshBasicMaterial({
    color: colorA,
    side: THREE.FrontSide,
  });
  const meshA = new THREE.Mesh(geometry, materialA);

  const materialB = new THREE.MeshBasicMaterial({
    color: colorB,
    side: THREE.BackSide,
  });
  const meshB = new THREE.Mesh(geometry, materialB);

  return [meshA, meshB];
}

const riemannFunctions = [
  {
    Re1: (x, y) =>
      Math.pow(x * x + y * y, 1 / 4) * Math.cos((1 / 2) * Math.atan2(y, x)),
    Re2: (x, y) =>
      Math.pow(x * x + y * y, 1 / 4) *
      Math.cos((1 / 2) * (Math.atan2(y, x) + 2 * Math.PI)),
  },
  {
    Re1: (x, y) =>
      Math.pow(x * x + y * y, 1 / 4) * Math.sin((1 / 2) * Math.atan2(y, x)),
    Re2: (x, y) =>
      Math.pow(x * x + y * y, 1 / 4) *
      Math.sin((1 / 2) * (Math.atan2(y, x) + 2 * Math.PI)),
  },
];

function riemannSurfaceTop() {
  var Re1 = riemannFunctions[0].Re1;

  return (u, v, target) => {
    u *= 1;
    v = mapRange(v, 0, 1, -Math.PI, Math.PI);

    var x = u * Math.cos(v);
    var y = u * Math.sin(v);
    var z = Re1(u * Math.cos(v), u * Math.sin(v));

    target.set(x, y, z);
  };
}

function riemannSurfaceBottom() {
  var Re2 = riemannFunctions[0].Re2;

  return (u, v, target) => {
    u *= -1;
    v = mapRange(v, 0, 1, -Math.PI, Math.PI);

    var x = u * Math.cos(v);
    var y = u * Math.sin(v);
    var z = Re2(u * Math.cos(v), u * Math.sin(v));

    target.set(x, y, z);
  };
}
