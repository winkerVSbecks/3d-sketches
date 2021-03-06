import { Quaternion } from 'three';
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

  const background = '#FFF2F3';
  const highlight = '#FFE2C3';

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

  // const color1 = '#FFA6B3';
  // const color2 = '#1936FF';

  const solids = [
    {
      position: [-0.5, -0.5, 0],
      radius: 0.8,
      geometry: new THREE.TorusGeometry(1, 0.5, 16, 100),
      quaternion: [
        -0.04823637856952832,
        -0.8274726548561598,
        0.5594026425265238,
        0.005562443899742685,
      ],
      mode: 1,
      color1: '#FFD64B',
      color2: '#FF8758',
      tiling: 6,
      direction: 0,
      warpScale: 0.75,
      warpTiling: 1,
    },
    {
      position: [-2, -2, 4],
      radius: 2,
      geometry: new THREE.IcosahedronBufferGeometry(1, 3),
      quaternion: Random.quaternion(),
      mode: 1,
      color1: '#FF311C',
      color2: '#FFA261',
      tiling: 4,
      direction: 0,
      warpScale: 0.125,
      warpTiling: 1,
    },
    {
      position: [0.6, 0, 2],
      radius: 2,
      geometry: new THREE.ConeGeometry(0.5, 1, 32),
      mode: 0,
      color1: '#FFA6B3',
      color2: '#1936FF',
      tiling: 5,
      direction: 0.25,
      warpScale: 0.25,
      warpTiling: 6,
    },
  ];

  const meshes = solids.map((solid) => {
    // Setup a material
    const material = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      extensions: {
        derivatives: true,
      },
      uniforms: {
        color1: { value: new THREE.Color(solid.color1) },
        color2: { value: new THREE.Color(solid.color2) },
        background: { value: new THREE.Color(background) },
        highlight: { value: new THREE.Color(highlight) },
        playhead: { value: 0 },
        tiling: { value: solid.tiling },
        direction: { value: solid.direction },
        warpScale: { value: solid.warpScale },
        warpTiling: { value: solid.warpTiling },
      },
      vertexShader: glslify(/*glsl*/ `
        varying vec2 vUv;
        varying vec3 vPosition;
        varying vec3 vNormal;

        void main () {
          vUv = uv;
          vPosition = position;
          vNormal = normal;
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
        uniform vec3 background;
        uniform vec3 highlight;

        varying vec2 vUv;

        #define PI 3.141592653589793
        #pragma glslify: aastep = require('glsl-aastep');

        // For the rim
        varying vec3 vPosition;
        varying vec3 vNormal;
        uniform mat4 modelMatrix;

        float geometryRim (vec3 position) {
          vec3 worldNormal = normalize(mat3(modelMatrix) * vNormal.xyz);
          vec3 worldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          vec3 V = normalize(cameraPosition - worldPosition);
          float rim = 1.0 - max(dot(V, worldNormal), 0.0);
          return pow(smoothstep(0.0, 1.0, rim), 0.5);
        }

        void main() {
          vec2 pos;
          // Blend the direction between x and y
          pos.x = mix(vUv.x, vUv.y, direction);
          pos.y = mix(vUv.y, 1.0 - vUv.x, direction);

          pos.x += (playhead + sin(pos.y * warpTiling * PI * 2.0) * warpScale);
          pos.x *= tiling;

          float value = floor(fract(pos.x) + 0.5);
          vec3 color = mix(color1, color2, value);

          float rim = geometryRim(vPosition);
          float stroke = aastep(0.92, rim);
          color = mix(color, highlight, stroke);

          gl_FragColor = vec4(color, 1.0);
        }
      `),
    });

    // Setup a mesh with geometry + material
    const geometry = solid.geometry;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.fromArray(solid.position);
    mesh.scale.setScalar(solid.radius);
    if (solid.quaternion) {
      mesh.quaternion.fromArray(solid.quaternion);
    }
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
      // scene.rotation.y = playhead * Math.PI * 2;

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
