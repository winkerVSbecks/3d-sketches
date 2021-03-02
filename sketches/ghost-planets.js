// Ensure ThreeJS is in global scope for the 'examples/'
global.THREE = require('three');

// Include any additional ThreeJS examples below
require('three/examples/js/controls/OrbitControls');

const Random = require('canvas-sketch-util/random');
const { mapRange } = require('canvas-sketch-util/math');
const canvasSketch = require('canvas-sketch');
const packSpheres = require('pack-spheres');
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

  const background = new THREE.Color('#120078'); // #413c69 // #fbaccc //#413c69 // #2a243c
  const foreground = new THREE.Color('#fecd1a'); // #709fb0 // #f1d1d0 // #4a47a3

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
  const geometry = new THREE.IcosahedronBufferGeometry(1, 3);
  const baseGeometry = new THREE.IcosahedronGeometry(1, 1);

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
    const size = 0.5; // mapRange(sphere.radius, 0, 0.75, 0.4, 0.1);

    // Setup a material
    const material = new THREE.ShaderMaterial({
      transparent: true,
      extensions: {
        derivatives: true,
      },
      uniforms: {
        scale: { value: 1.0 },
        size: { value: size },
        density: { value: 1.5 },
        background: { value: background },
        foreground: { value: foreground },
        time: { value: 0 },
      },
      vertexShader: /*glsl*/ `
      varying vec3 vPosition;
      attribute vec3 neighbour0;
      attribute vec3 neighbour1;
      attribute vec3 neighbour2;
      varying vec3 vNeighbour0;
      varying vec3 vNeighbour1;
      varying vec3 vNeighbour2;

      void main () {
        vPosition = position;

        vNeighbour0 = neighbour0 - vPosition;
        vNeighbour1 = neighbour1 - vPosition;
        vNeighbour2 = neighbour2 - vPosition;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
      `,
      fragmentShader: glslify(/* glsl */ `
      precision highp float;

      varying vec3 vPosition;
      uniform vec3 foreground;
      uniform vec3 background;

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

      // For the sphere rim
      uniform mat4 modelMatrix;

      float sphereRim (vec3 spherePosition) {
        vec3 normal = normalize(spherePosition.xyz);
        vec3 worldNormal = normalize(mat3(modelMatrix) * normal.xyz);
        vec3 worldPosition = (modelMatrix * vec4(spherePosition, 1.0)).xyz;
        vec3 V = normalize(cameraPosition - worldPosition);
        float rim = 1.0 - max(dot(V, worldNormal), 0.0);
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

        fragColor = mix(background, foreground, t);
        // background color invisible
        // fragColor = mix(background, foreground, t);

        float rim = sphereRim(vPosition);
        fragColor += (1.0 - rim) * foreground * 0.25;

        float stroke = aastep(0.9, rim);
        fragColor = mix(fragColor, background, stroke);

        float alpha = 1.0;
        if(v > 0.25) {
          alpha = 0.0;
        }

        // background color invisible
        // float alpha = t;

        gl_FragColor = vec4(fragColor, alpha);
      }
      `),
    });

    // Setup a mesh with geometry + material
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.fromArray(sphere.position);
    mesh.scale.setScalar(sphere.radius);
    mesh.quaternion.fromArray(Random.quaternion());
    mesh.rotationSpeed = Random.rangeFloor(1, 2) * (Math.PI * 2);
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
        // mesh.rotateOnWorldAxis(
        //   new THREE.Vector3(0, 1, 0),
        //   mesh.rotationSpeed / (duration * 60)
        // );
        mesh.material.uniforms.time.value = playhead;
      });
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
