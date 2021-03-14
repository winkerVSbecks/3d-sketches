import { Quaternion } from 'three';
// Ensure ThreeJS is in global scope for the 'examples/'
global.THREE = require('three');

// Include any additional ThreeJS examples below
require('three/examples/js/controls/OrbitControls');

const Random = require('canvas-sketch-util/random');
const canvasSketch = require('canvas-sketch');

const settings = {
  scaleToView: true,
  dimensions: [1080, 1080],
  context: 'webgl',
  animate: true,
  duration: 4,
  fps: 50,
};

const sketch = ({ context }) => {
  // Create a renderer
  const renderer = new THREE.WebGLRenderer({
    canvas: context.canvas,
  });

  const background = '#000';

  // WebGL background color
  renderer.setClearColor(background, 1);

  // Setup a camera
  const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 100);
  camera.position.set(2, 2, -4);
  camera.lookAt(new THREE.Vector3());

  // Setup camera controller
  const controls = new THREE.OrbitControls(camera, context.canvas);

  // Setup your scene
  const scene = new THREE.Scene();

  let attractor;
  const scale = 1.125;
  const PARTICLE_COUNT = 10000;

  const geometry = new THREE.BufferGeometry();

  const positions = new Float32Array(3 * PARTICLE_COUNT);
  const rawPositions = new Float32Array(3 * PARTICLE_COUNT);

  for (let i = 0; i < positions.length; i += 3) {
    const p = Random.onSphere(1);
    positions.set(p, i);
    rawPositions.set(p, i);
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute(
    'rawPosition',
    new THREE.BufferAttribute(rawPositions, 3)
  );

  const material = new THREE.PointsMaterial({
    color: 'rgba(255, 255, 255, 0.5)',
    size: 0.01,
    sizeAttenuation: true,
    transparent: true,
  });

  attractor = new THREE.Points(geometry, material);
  attractor.position.set(0, 0, 0);
  attractor.frustumCulled = false;
  scene.add(attractor);

  return {
    resize({ pixelRatio, viewportWidth, viewportHeight }) {
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(viewportWidth, viewportHeight, false);
      camera.aspect = viewportWidth / viewportHeight;
      camera.updateProjectionMatrix();
    },
    render({ playhead, duration, deltaTime }) {
      const geometry = attractor.geometry;
      updatePosition(geometry, scale);

      attractor.rotation.z += 0.001;

      controls.update();
      renderer.render(scene, camera);
    },
    unload() {
      controls.dispose();
      renderer.dispose();
    },
  };
};

canvasSketch(sketch, settings);

const timeStep = 0.001;

function updatePosition(geometry, scale) {
  const rawPositions = geometry.attributes.rawPosition.array;

  for (let i = 0; i < rawPositions.length; i += 3) {
    let x = rawPositions[i];
    let y = rawPositions[i + 1];
    let z = rawPositions[i + 2];

    const [dx, dy, dz] = lorenzMod2Attractor([x, y, z], timeStep);

    x += dx;
    y += dy;
    z += dz;

    const v = new THREE.Vector3(x, y, z)
      .normalize()
      .multiplyScalar(scale)
      .toArray();

    geometry.attributes.rawPosition.set([x, y, z], i);
    geometry.attributes.position.set(v, i);
  }

  geometry.attributes.position.needsUpdate = true;
  geometry.attributes.rawPosition.needsUpdate = true;
}

function dadrasAttractor([x, y, z], timestep) {
  const a = 3;
  const b = 2.7;
  const c = 1.7;
  const d = 2;
  const e = 9;

  const dx = (y - a * x + b * y * z) * timestep;
  const dy = (c * y - x * z + z) * timestep;
  const dz = (d * x * y - e * z) * timestep;

  return [dx, dy, dz];
}

/**
 * https://fusefactory.github.io/openfuse/strange%20attractors/particle%20system/Strange-Attractors-GPU/
 */
function dequanAttractor([x, y, z], timestep) {
  const a = 40.0;
  const b = 1.833;
  const c = 0.16;
  const d = 0.65;
  const e = 55.0;
  const f = 20.0;

  const dx = (a * (y - x) + c * x * z) * timestep;
  const dy = (e * x + f * y - x * z) * timestep;
  const dz = (b * z + x * y - d * x * x) * timestep;

  return [dx, dy, dz];
}

function lorenzAttractor([x, y, z], timestep) {
  const beta = 8 / 3;
  const rho = 28;
  const sigma = 10;

  const dx = sigma * (y - x) * timestep;
  const dy = (x * (rho - z) - y) * timestep;
  const dz = (x * y - beta * z) * timestep;

  return [dx, dy, dz];
}

function lorenzMod2Attractor([x, y, z], timestep) {
  const a = 0.9;
  const b = 5.0;
  const c = 9.9;
  const d = 1.0;

  const dx = (-a * x + y * y - z * z + a * c) * timestep;
  const dy = (x * (y - b * z) + d) * timestep;
  const dz = (-z + x * (b * y + z)) * timestep;

  return [dx, dy, dz];
}
