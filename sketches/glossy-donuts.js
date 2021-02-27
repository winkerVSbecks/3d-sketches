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
  const geometry = new THREE.TorusGeometry(1, 0.5, 16, 100);

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
    const color3 = clrs.ink();
    const color4 = clrs.ink();

    // Setup a material
    const material = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      extensions: {
        derivatives: true,
      },
      uniforms: {
        scale: { value: 1.0 },
        size: { value: 0.5 },
        density: { value: 2.0 },
        background: { value: new THREE.Color(background) },
        color1: { value: new THREE.Color(color1) },
        color2: { value: new THREE.Color(color2) },
        color3: { value: new THREE.Color(color3) },
        color4: { value: new THREE.Color(color4) },
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
      uniform vec3 color1;
      uniform vec3 color2;
      uniform vec3 color3;
      uniform vec3 color4;
      uniform vec3 background;

      // For the noisy contours
      #pragma glslify: aastep = require('glsl-aastep');
      #pragma glslify: noise = require(glsl-noise/simplex/4d);
      #define PI 3.141592653589793

      uniform float time;
      uniform float scale;
      uniform float size;
      uniform float density;

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

        fragColor = color1;

        float rim = geometryRim(vPosition);
        fragColor += (1.0 - rim) * color2 * 0.25;

        float stroke = aastep(0.85, rim);
        fragColor = mix(fragColor, background, stroke);

        stroke = aastep(0.95, rim);
        fragColor = mix(fragColor, color1, stroke);

        // gloss effect
        rim = innerRim(vPosition);
        float fill = aastep(0.9999, rim);
        fragColor = mix(fragColor, mix(color1, background, fill), 0.125);

        float alpha = 1.0;
        // if(v > 0.25) {
        //   fragColor = color1;
        //   // alpha = 0.0;
        // }

        gl_FragColor = vec4(fragColor, alpha);
      }
      `),
    });

    // Setup a mesh with geometry + material
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
        mesh.material.uniforms.time.value = playhead;
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
