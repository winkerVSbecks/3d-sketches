// Ensure ThreeJS is in global scope for the 'examples/'
global.THREE = require('three');

// Include any additional ThreeJS examples below
require('three/examples/js/controls/OrbitControls');

const Random = require('canvas-sketch-util/random');
const { mapRange } = require('canvas-sketch-util/math');
const canvasSketch = require('canvas-sketch');
const packSpheres = require('pack-spheres');
const glslify = require('glslify');
const clrs = require('../clrs')();

const settings = {
  scaleToView: true,
  dimensions: [1080, 1080],
  context: 'webgl',
  animate: true,
  duration: 12,
};

const sketch = ({ context, width, height }) => {
  // Create a renderer
  const renderer = new THREE.WebGLRenderer({
    canvas: context.canvas,
  });

  const background = new THREE.Color('#000'); // new THREE.Color(clrs.bg);

  // WebGL background color
  renderer.setClearColor(background, 1);

  // Setup a camera
  const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 100);
  camera.position.set(2, 2, -2);
  camera.lookAt(new THREE.Vector3());

  // Setup camera controller
  const controls = new THREE.OrbitControls(camera, context.canvas);

  // Setup your scene
  const scene = new THREE.Scene();

  // Setup a geometry
  const geometry = new THREE.IcosahedronBufferGeometry(1, 10);

  // Setup a material
  const material = new THREE.ShaderMaterial({
    uniforms: {
      u_time: { value: 0 },
      u_resolution: { value: [width, height] },
      u_scale: { value: 1 },
    },
    vertexShader: /*glsl*/ `
      precision highp float;
      varying vec2 vUv;
      varying vec3 vPosition;

      void main () {
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        // vUv = uv;
        vUv = position.xy * 0.5 + 0.5;
      }
    `,
    fragmentShader: glslify(/* glsl */ `
      #ifdef GL_ES
      precision mediump float;
      #endif

      #pragma glslify: noise = require(glsl-noise/simplex/4d);
      #pragma glslify: grain = require(glsl-film-grain);
      #pragma glslify: blend = require('glsl-blend-soft-light');
      #define gold vec3(1.0, 0.843, 0.0)

      uniform vec2 u_resolution;
      uniform float u_time;
      uniform float u_scale;

      varying vec3 vPosition;
      varying vec2 vUv;

      const int AMOUNT = 4;

      float loopNoise (vec3 v, float t, float scale, float offset) {
        float duration = scale;
        float current = t * scale;
        return ((duration - current) * noise(vec4(v, current + offset)) + current * noise(vec4(v, current - duration + offset))) / duration;
      }

      void main(){
        vec2 coord = 20.0 * vUv;

        vec3 p = vPosition * 1.0;
        float v = 0.0;
        float amp = 0.5;
        v += loopNoise(p, u_time, 1.0, 60.0) * amp;

        float len;

        for (int i = 0; i < AMOUNT; i++){
          len = length(vec2(coord.x, coord.y));
          coord.x = coord.x - cos(coord.y + sin(len)) + cos(u_time / 9.0);
          coord.y = coord.y + sin(coord.x + cos(len)) + sin(u_time / 12.0);
        }

        len += v * u_scale;
        vec3 color = vec3(cos(len), cos(len), cos(len));

        float grainSize = 1.0;
        float g = grain(vUv, u_resolution / grainSize);
        vec3 noiseColor = blend(vec3(g), gold);
        color = blend(color, noiseColor);

        gl_FragColor = vec4(color, 1.0);
      }
    `),
  });

  // Setup a mesh with geometry + material
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.fromArray([0, 0, 0]);
  mesh.scale.setScalar(0.75);
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
    render({ playhead, duration }) {
      mesh.material.uniforms.u_time.value = Math.sin(Math.PI * 2 * playhead);
      mesh.material.uniforms.u_scale.value =
        1 + 6 * Math.abs(Math.sin(Math.PI * 2 * playhead));
      // const omega = (Math.PI * 2) / (duration * 60);
      // scene.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), omega);

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
