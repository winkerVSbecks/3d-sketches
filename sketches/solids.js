import { Quaternion } from 'three';
// Ensure ThreeJS is in global scope for the 'examples/'
global.THREE = require('three');

// Include any additional ThreeJS examples below
require('three/examples/js/controls/OrbitControls');

const Random = require('canvas-sketch-util/random');
const canvasSketch = require('canvas-sketch');
const packSpheres = require('pack-spheres');
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

  const solids = [
    {
      position: [-0.5, -0.5, 0],
      radius: 0.8,
      geometry: new THREE.TorusGeometry(1, 0.5, 16, 100),
      quaternion: Random.quaternion(),
      mode: 1,
    },
    {
      position: [-2, -2, 4],
      radius: 2,
      geometry: new THREE.IcosahedronBufferGeometry(1, 3),
      quaternion: Random.quaternion(),
      mode: 1,
    },
    {
      position: [0.6, 0, 2],
      radius: 2,
      geometry: new THREE.ConeGeometry(0.5, 1, 32),
      mode: 0,
    },
  ];

  const meshes = solids.map((solid) => {
    const primary = '#000';

    // Setup a material
    const material = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      extensions: {
        derivatives: true,
      },
      uniforms: {
        scale: { value: 1.0 },
        size: { value: 1.0 },
        density: { value: 1.0 },
        mode: { value: solid.mode },
        background: { value: new THREE.Color(background) },
        primary: { value: new THREE.Color(primary) },
        time: { value: 0 },
      },
      vertexShader: /*glsl*/ `
      varying vec3 vPosition;
      varying vec3 vNormal;

      void main () {
        vPosition = position;
        vNormal = normal;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
      `,
      fragmentShader: glslify(/* glsl */ `
      precision highp float;

      varying vec3 vPosition;
      varying vec3 vNormal;
      uniform vec3 primary;
      uniform vec3 background;
      uniform int mode;

      // For the noisy contours
      #pragma glslify: aastep = require('glsl-aastep');
      #pragma glslify: noise = require(glsl-noise/simplex/4d);
      #define PI 3.141592653589793

      uniform float time;
      uniform float scale;
      uniform float size;
      uniform float density;

      float patternZebra(float v){
        float d = 1.0 / density;
        float s = -cos(v / d * PI * 2.);
        return smoothstep(.0, .1 * d, .1 * s / fwidth(s));
      }

      float loopNoise (vec3 v, float t, float scale, float offset) {
        float duration = scale;
        float current = t * scale;
        return ((duration - current) * noise(vec4(v, current + offset)) + current * noise(vec4(v, current - duration + offset))) / duration;
      }

      // For the rim
      uniform mat4 modelMatrix;

      float geometryRim (vec3 position) {
        vec3 worldNormal = normalize(mat3(modelMatrix) * vNormal.xyz);
        vec3 worldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        vec3 V = normalize(cameraPosition - worldPosition);
        float rim = 1.0 - max(dot(V, worldNormal), 0.0);
        return pow(smoothstep(0.0, 1.0, rim), 0.5);
      }

      float innerRim (vec3 position) {
        vec3 worldNormal = normalize(mat3(modelMatrix) * vNormal.xyz);
        vec3 worldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        vec3 V = normalize(cameraPosition - worldPosition);
        float rim = 1.0 - max(0.7 - dot(V, worldNormal), 0.0);
        return pow(smoothstep(0.0, 1.0, rim), 0.5);
      }

      void main () {
        // Contours
        vec3 p = vPosition * scale;
        float amp = 0.5;
        float v = 0.0;

        v += loopNoise(p, time, 1.0, 60.0) * amp;
        amp *= 0.5;
        p *= 2.0;
        v /= size;

        vec3 fragColor = background;
        float t = patternZebra(v);

        // fragColor = mix(primary, background, t);

        fragColor = primary;

        float rim = geometryRim(vPosition);
        fragColor += (1.0 - rim) * background * 0.25;

        float stroke = aastep(0.85, rim);
        fragColor = mix(fragColor, background, stroke);

        stroke = aastep(0.95, rim);
        fragColor = mix(fragColor, primary, stroke);

        // gloss effect
        rim = innerRim(vPosition);
        float fill = aastep(0.9999, rim);
        fragColor = mix(fragColor, mix(primary, background, fill), 0.125);

        float alpha = 1.0;
        if(v > 0.1) {
          if (mode==1) {
            // fragColor = background;
          } else {
            alpha = 0.0;
          }
        }

        gl_FragColor = vec4(fragColor, alpha);
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
        mesh.material.uniforms.time.value = playhead;
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
