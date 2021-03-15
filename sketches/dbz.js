import { Quaternion } from 'three';
// Ensure ThreeJS is in global scope for the 'examples/'
global.THREE = require('three');

// Include any additional ThreeJS examples below
require('three/examples/js/controls/OrbitControls');

const Random = require('canvas-sketch-util/random');
const { lerpFrames } = require('canvas-sketch-util/math');
const canvasSketch = require('canvas-sketch');
const glslify = require('glslify');

const settings = {
  scaleToView: true,
  dimensions: [1080, 1080],
  context: 'webgl',
  animate: true,
  duration: 8,
  fps: 50,
};

const sketch = ({ context, width, height }) => {
  // Create a renderer
  const renderer = new THREE.WebGLRenderer({
    canvas: context.canvas,
  });

  const background = '#222';

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

  const planetScale = 0.9;
  const scale = 1.25;
  const PARTICLE_COUNT = 10000;

  const attractors = new THREE.Group();

  const baseAttractor = createAttractor(
    PARTICLE_COUNT,
    '#88ff88',
    background,
    width,
    height
  );
  baseAttractor.simulation = aizawaAttractor;
  baseAttractor.timeStep = 0.005;
  attractors.add(baseAttractor);

  const mainAttractor = createAttractor(
    PARTICLE_COUNT,
    '#168FF9',
    background,
    width,
    height
  );
  mainAttractor.simulation = lorenzMod2Attractor;
  mainAttractor.timeStep = 0.001;
  attractors.add(mainAttractor);

  const secondaryAttractor = createAttractor(
    PARTICLE_COUNT,
    '#6CF4F8',
    background,
    width,
    height
  );
  secondaryAttractor.simulation = dequanAttractor;
  secondaryAttractor.timeStep = 0.001;
  attractors.add(secondaryAttractor);

  scene.add(attractors);

  const planet = silkyPlanet(width, height, planetScale, background);
  scene.add(planet);

  return {
    resize({ pixelRatio, viewportWidth, viewportHeight }) {
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(viewportWidth, viewportHeight, false);
      camera.aspect = viewportWidth / viewportHeight;
      camera.updateProjectionMatrix();
    },
    render({ playhead, duration, deltaTime }) {
      attractors.children.forEach((attractor) => {
        updateAttractor(
          scale,
          attractor.geometry,
          attractor.simulation,
          attractor.timeStep
        );
        attractor.material.uniforms.u_time.value = Math.sin(
          Math.PI * 2 * playhead
        );

        attractor.material.uniforms.u_opacity.value = lerpFrames(
          [0, 0.8, 0.8, 0.8, 0],
          playhead
        );
      });

      attractors.rotation.y = Math.cos(playhead * 2 * Math.PI);
      attractors.rotation.x = Math.sin(playhead * 2 * Math.PI);
      attractors.rotation.z = Math.cos(playhead * 2 * Math.PI);

      planet.material.uniforms.u_time.value = Math.sin(Math.PI * 2 * playhead);
      planet.material.uniforms.u_scale.value =
        1 + 6 * Math.abs(Math.sin(Math.PI * 2 * playhead));

      // planet.rotation.x = Math.sin(-playhead * 2 * Math.PI);
      // planet.rotation.y = Math.cos(-playhead * 2 * Math.PI);
      // planet.rotation.z = Math.cos(-playhead * 2 * Math.PI);

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

function silkyPlanet(width, height, scale, background) {
  const geometry = new THREE.IcosahedronBufferGeometry(1, 10);

  const material = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      u_time: { value: 0 },
      u_resolution: { value: [width, height] },
      u_scale: { value: 1 },
      u_background: { value: new THREE.Color('#F9EE54') },
      u_color: { value: new THREE.Color('#F3A903') },
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
      uniform vec3 u_background;
      uniform vec3 u_color;

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
        // vec3 color = vec3(cos(len), cos(len), cos(len));
        vec3 color = mix(u_background, u_color, cos(len));

        float grainSize = 1.0;
        float g = grain(vUv, u_resolution / grainSize);
        vec3 noiseColor = blend(vec3(g), gold);
        color = blend(color, noiseColor);

        gl_FragColor = vec4(color, 1.0);
      }
    `),
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.fromArray([0, 0, 0]);
  mesh.scale.setScalar(scale);
  mesh.quaternion.fromArray(Random.quaternion());
  return mesh;
}

function particleMaterial(width, height, color, background) {
  return new THREE.ShaderMaterial({
    transparent: true,
    // blending: THREE.AdditiveBlending,
    blending: THREE.NormalBlending,
    uniforms: {
      u_time: { value: 0 },
      u_resolution: { value: [width, height] },
      u_scale: { value: 1 },
      u_color: { value: new THREE.Color(color) },
      u_color2: { value: new THREE.Color('#fff') },
      u_opacity: { value: 0.8 },
    },
    vertexShader: /*glsl*/ `
      precision highp float;
      varying vec2 vUv;
      varying vec3 vPosition;

      void main () {
        vPosition = position;
        gl_PointSize = 2.0;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        vUv = position.xy * 0.5 + 0.5;
      }
    `,
    fragmentShader: glslify(/* glsl */ `
      #ifdef GL_ES
      precision mediump float;
      #endif

      #pragma glslify: noise = require(glsl-noise/simplex/4d);
      #define gold vec3(1.0, 0.843, 0.0)

      uniform vec2 u_resolution;
      uniform vec3 u_color;
      uniform vec3 u_color2;
      uniform float u_opacity;
      uniform float u_time;

      varying vec2 vUv;
      varying vec3 vPosition;

      void main(){
        float t = 1.0 + noise(vec4(vPosition, u_time));
        vec3 color = mix(u_color2, u_color, t);
        gl_FragColor = vec4(color, 0.5);
      }
    `),
  });
}

function createAttractor(
  particleCount,
  color = 'rgba(255, 255, 255, 0.25)',
  background,
  width,
  height
) {
  const geometry = new THREE.BufferGeometry();

  const positions = new Float32Array(3 * particleCount);
  const rawPositions = new Float32Array(3 * particleCount);

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

  const material = particleMaterial(width, height, color, background);

  const attractor = new THREE.Points(geometry, material);
  attractor.position.set(0, 0, 0);
  attractor.frustumCulled = false;
  return attractor;
}

function updateAttractor(scale, geometry, simulation, timeStep) {
  const rawPositions = geometry.attributes.rawPosition.array;

  for (let i = 0; i < rawPositions.length; i += 3) {
    let x = rawPositions[i];
    let y = rawPositions[i + 1];
    let z = rawPositions[i + 2];

    const [dx, dy, dz] = simulation([x, y, z], timeStep);

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

/**
 * Different attractor types
 */
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

function aizawaAttractor([x, y, z], timestep) {
  const a = 0.95;
  const b = 0.7;
  const c = 0.6;
  const d = 3.5;
  const e = 0.25;
  const f = 0.1;

  const dx = ((z - b) * x - d * y) * timestep;
  const dy = (d * x + (z - b) * y) * timestep;
  const dz =
    (c + a * z - (z * z * z) / 3 - x * x + f * z * (x * x * x)) * timestep;

  return [dx, dy, dz];
}

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
