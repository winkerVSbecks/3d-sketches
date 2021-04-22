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
  duration: 6,
};

const sketch = ({ context }) => {
  // Create a renderer
  const renderer = new THREE.WebGLRenderer({
    canvas: context.canvas,
  });

  const background = '#2B2B2B';

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

  // Setup a material
  const material = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    transparent: true,
    extensions: {
      derivatives: true,
    },
    uniforms: {
      time: { value: 0 },
      density: { value: 1.0 },
    },
    vertexShader: /*glsl*/ `
      varying vec3 vPosition;

      void main () {
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
      `,
    fragmentShader: glslify(/* glsl */ `
      precision highp float;

      varying vec3 vPosition;
      uniform float time;
      uniform float density;

      #pragma glslify: noise = require(glsl-noise/simplex/4d);
      #define PI 3.141592653589793

      float patternZebra(float v){
        float d = 1.0 / density;
        float s = -cos(v / d * PI * 2.);
        return smoothstep(.0, .1 * d, .1 * s / fwidth(s));
      }

      void main () {
        float frequency = .6;
        float amplitude = 1.5;
        float noiseValue = noise(vec4(vPosition * frequency, sin(PI * time))) * amplitude;
        float t = patternZebra(noiseValue);

        vec3 fragColor = mix(vec3(1.,0.4,0.369), vec3(0.824,0.318,0.369), t);

        gl_FragColor = vec4(fragColor, 1.);
      }
      `),
  });

  // Setup a geometry
  const geometry = new THREE.IcosahedronBufferGeometry(1, 16);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.fromArray([0, 0, 0]);
  mesh.quaternion.fromArray(Random.quaternion());
  scene.add(mesh);

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
    render({ playhead }) {
      mesh.material.uniforms.time.value = playhead;
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
