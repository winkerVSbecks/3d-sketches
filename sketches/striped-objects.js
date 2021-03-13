// Ensure ThreeJS is in global scope for the 'examples/'
global.THREE = require('three');

// Include any additional ThreeJS examples below
require('three/examples/js/controls/OrbitControls');

const Random = require('canvas-sketch-util/random');
const canvasSketch = require('canvas-sketch');
const packSpheres = require('pack-spheres');
const glslify = require('glslify');
const clrs = require('../clrs')();

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

  const background = new THREE.Color(clrs.bg);

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

  // Setup a geometry
  const geometry1 = new THREE.TorusGeometry(1, 0.5, 16, 100);
  const geometry2 = new THREE.IcosahedronBufferGeometry(1, 3);
  const geometry3 = new THREE.ConeGeometry(0.5, 1, 32);
  // const geometry = new THREE.IcosahedronBufferGeometry(1, 3);

  const bounds = 1.5;
  const spheres = packSpheres({
    sample: () => Random.insideSphere(),
    outside: (position, radius) => {
      return (
        new THREE.Vector3().fromArray(position).length() + radius >= bounds
      );
    },
    minRadius: () =>
      Math.max(0.05, 0.05 + Math.min(1.0, Math.abs(Random.gaussian(0, 0.1)))),
    maxCount: 20,
    packAttempts: 4000,
    bounds,
    maxRadius: 1.5,
    minRadius: 0.05,
  });

  const meshes = spheres.map((sphere) => {
    const color1 = clrs.ink();
    const color2 = clrs.ink();

    // Setup a material
    const material = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      extensions: {
        derivatives: true,
      },
      uniforms: {
        color1: { value: new THREE.Color(color1) },
        color2: { value: new THREE.Color(color2) },
        playhead: { value: 0 },
        tiling: { value: Random.rangeFloor(1, 10) }, // { value: 10.0 }, // 1-500
        direction: { value: Random.range(0, 1) }, // { value: 0.5 }, // 0-1
        warpScale: { value: Random.range(0, 1) }, // { value: 0.0 }, // 0-1
        warpTiling: { value: Random.rangeFloor(0, 10) }, // { value: 2.0 }, // 1-10
      },
      vertexShader: glslify(/*glsl*/ `
      varying vec2 vUv;

      void main () {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
      `),
      fragmentShader: glslify(/* glsl */ `
        // precision highp float;
        uniform float playhead;
        uniform float tiling;
        uniform float direction;
        uniform float warpScale;
        uniform float warpTiling;
        uniform vec3 color1;
        uniform vec3 color2;

        varying vec2 vUv;

        #define PI 3.141592653589793

        void main() {
          vec2 pos;
          // Blend the direction between x and y
          pos.x = mix(vUv.x, vUv.y, direction);
          pos.y = mix(vUv.y, 1.0 - vUv.x, direction);

          pos.x += (playhead + sin(pos.y * warpTiling * PI * 2.0) * warpScale);
          pos.x *= tiling;

          float value = floor(fract(pos.x) + 0.5);
          vec3 color = mix(color1, color2, value);

          gl_FragColor = vec4(color, 1.0);
        }
      `),
    });

    // Setup a mesh with geometry + material
    const geometry = Random.pick([geometry1, geometry2, geometry3]);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.fromArray(sphere.position);
    mesh.scale.setScalar(sphere.radius);
    mesh.quaternion.fromArray(Random.quaternion());
    scene.add(mesh);
    return mesh;
  });

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
      meshes.forEach((mesh) => {
        mesh.material.uniforms.playhead.value = playhead;
      });
      scene.rotation.y = playhead * Math.PI * 2;

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
