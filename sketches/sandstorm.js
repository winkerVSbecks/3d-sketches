import { Quaternion } from 'three';
// Ensure ThreeJS is in global scope for the 'examples/'
global.THREE = require('three');

// Include any additional ThreeJS examples below
require('three/examples/js/controls/OrbitControls');

const Random = require('canvas-sketch-util/random');
const canvasSketch = require('canvas-sketch');
const glslify = require('glslify');

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

  const background = '#fff';

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

  let x = 15 * Math.random();
  let y = 15 * Math.random();
  let z = 15 * Math.random();

  const speed = 5; // integer, increase for faster visualization
  const scale = 5;

  const steps = 100000;
  let current = 1;
  const shown = 10000;

  const beta = 8 / 3;
  const rho = 28;
  const sigma = 10;

  const dt = 0.005;

  const geometry = new THREE.BufferGeometry();

  const positions = new Float32Array(3 * shown);

  for (let i = 0; i < positions.length; i += 3) {
    positions.set([scale * x, scale * y, scale * z], i);
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const colors = new Float32Array(3 * shown);

  for (let i = 0; i < positions.length; i += 3) {
    colors.set([1, 0, 0], i);
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.LineBasicMaterial({ vertexColors: true });

  attractor = new THREE.Line(geometry, material);
  attractor.position.set(0, 1.5, -2);
  attractor.frustumCulled = false;
  scene.add(attractor);

  // draw each frame
  return {
    // Handle resize events here
    resize({ pixelRatio, viewportWidth, viewportHeight }) {
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(viewportWidth, viewportHeight, false);
      camera.aspect = viewportWidth / viewportHeight;
      camera.updateProjectionMatrix();
    },
    // Update & render your scene here
    render({ playhead, duration, deltaTime }) {
      const geometry = attractor.geometry;
      geometry.attributes.position.array.copyWithin(3);
      geometry.attributes.color.array.copyWithin(3);

      for (let i = 0; i < speed; i++) {
        if (current < steps) {
          const dx = sigma * (y - x) * dt;
          const dy = (x * (rho - z) - y) * dt;
          const dz = (x * y - beta * z) * dt;

          x += dx;
          y += dy;
          z += dz;

          const v = new THREE.Vector3(
            scale * x,
            scale * y,
            scale * z
          ).normalize(2);

          geometry.attributes.position.set(v.toArray(), 0);
          // light.color.setHSL(current / steps, 1, 0.5);
          // geometry.attributes.color.set(light.color.toArray(), 0);
        }

        if (current < steps + shown) {
          current++;
        } else {
          current = 0;
        }
      }

      attractor.geometry.attributes.position.needsUpdate = true;
      attractor.geometry.attributes.color.needsUpdate = true;
      attractor.rotation.z += 0.001;

      controls.update();
      renderer.render(scene, camera);
    },
    // Dispose of events & renderer for cleaner hot-reloading
    unload() {
      controls.dispose();
      renderer.dispose();
    },
  };
};

canvasSketch(sketch, settings);
