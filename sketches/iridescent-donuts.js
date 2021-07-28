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

  const background = new THREE.Color('#000');

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
    // Setup a material
    const material = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      extensions: {
        derivatives: true,
      },
      uniforms: {
        u_time: { value: 0 },
      },
      vertexShader: /*glsl*/ `
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec3 vLight;

        void main () {
          vPosition = (projectionMatrix* modelViewMatrix * vec4(position, 1.0)).xyz;
          vNormal = (projectionMatrix* modelViewMatrix * vec4(normal, 1.0)).xyz;
          vLight = (projectionMatrix* modelViewMatrix * vec4(-4.,-4.,-4., 1.0)).xyz;

          vNormal = normalize(mat3(modelMatrix) * normal.xyz);
          vPosition = (modelMatrix * vec4(position, 1.0)).xyz;

          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: glslify(/* glsl */ `
        // based on https://codepen.io/winkerVSbecks/pen/wvdyREG?editors=1000
        precision highp float;
        #pragma glslify: aastep = require('glsl-aastep');

        uniform float u_time;

        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec3 vLight;
        varying vec2 vUv;

        // Pallete function by Inigo Quilez - iquilezles.org
        // a - brigthness, b - contrast, c - osc, d - phase
        vec3 palette(in vec3 t, in vec3 a, in vec3 b, in vec3 c, in vec3 d) { return a + b*cos( 6.28318*(c*t+d) ); }

        // Got rotation functions from akella - twitter.com/akella
        mat4 rotationMatrix(vec3 axis, float angle) {
            axis = normalize(axis);
            float s = sin(angle);
            float c = cos(angle);
            float oc = 1.0 - c;

            return mat4(oc * axis.x * axis.x + c,
                oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
                        oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,
                oc * axis.y * axis.z - axis.x * s,  0.0,
                        oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,
                0.0,
                        0.0,
                0.0,
                0.0,
                1.0);
        }

        vec3 rotate(vec3 v, vec3 axis, float angle) {
          mat4 m = rotationMatrix(axis, angle);
          return (m * vec4(v, 1.0)).xyz;
        }

        float diffuse (in vec3 light, in vec3 nor) {
          return clamp(0.5, 1., dot(nor, light));
        }

        vec3 baseColor (in vec3 pos, in vec3 nor, in vec3 rayDir, in float rayDepth) {
          vec3 color = vec3(0);

          float dNR = dot(nor, -rayDir);

          color = palette(vec3(dNR), vec3(0.5), vec3(0.5), vec3(1), vec3(0, 0.33, 0.67));
          return color;
        }

        vec4 shade (vec3 pos, vec3 rayDir, float rayDepth) {
          vec3 nor = vNormal;

          nor += 0.1 * sin(13. * nor + 3.14 * 2. * u_time);
          nor = normalize(nor);

          vec3 color = palette(
            nor,
            vec3(0.65, 0.95, 0.85), // brightness
            vec3(rayDepth) * 2., // contrast
            vec3(1), // osc
            vec3(0., 0.33, 0.67) // phase
          );

          vec3 lightPos = rotate(vLight, vec3(0, 1, 0), 3.14 * 2. * u_time);

          float dif = diffuse(lightPos, nor);
          color = dif * baseColor(pos, nor, rayDir, rayDepth);
          vec4 shapeColor = vec4(color, 1.0);

          return shapeColor;
        }

        vec4 iridescent(vec3 rayDir) {
          float rayDepth = length(vPosition);
          return shade(vPosition + rayDir * rayDepth, rayDir, rayDepth);
        }

        float outerRim () {
          vec3 V = normalize(cameraPosition - vPosition);
          float rim = 1.0 - max(dot(V, vNormal), 0.0);
          return pow(smoothstep(0.0, 1.0, rim), 0.5);
        }

        void main() {
          vec3 rayDir = normalize(vPosition); // DOF
          vec4 iridescence = vec4(iridescent(rayDir));

          // outer stroke
          float rim2 = outerRim();
          float stroke = aastep(0.95, rim2);
          vec4 fragColor = mix(iridescence, vec4(1), stroke);

          gl_FragColor = fragColor;
        }
      `),
    });

    // Setup a mesh with geometry + material
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.fromArray(sphere.position);
    mesh.scale.setScalar(sphere.radius);
    mesh.quaternion.fromArray(Random.quaternion());
    mesh.rotationSpeed = Random.rangeFloor(1, 3) * (Math.PI * 2);
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
        mesh.material.uniforms.u_time.value = playhead;
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
