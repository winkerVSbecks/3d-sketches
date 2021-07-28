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

const sketch = ({ width, height, context }) => {
  // Create a renderer
  const renderer = new THREE.WebGLRenderer({
    canvas: context.canvas,
  });

  const background = '#111';

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
      geometry: new THREE.ConeGeometry(0.5, 1, 64),
      mode: 0,
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
        u_resolution: { value: new THREE.Vector2(width, height) },
        u_time: { value: 0 },
        u_camera: { value: new THREE.Vector3(2, 2, -4) },
      },
      vertexShader: /*glsl*/ `
        uniform vec3 u_camera;
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec3 vLight;
        varying vec3 vCamera;
        varying vec2 vUv;

        void main () {
          vPosition = (projectionMatrix* modelViewMatrix * vec4(position, 1.0)).xyz;
          vNormal = (projectionMatrix* modelViewMatrix * vec4(normal, 1.0)).xyz;
          vLight = (projectionMatrix* modelViewMatrix * vec4(-1.,-1.,-1., 1.0)).xyz;
          vCamera = (projectionMatrix* modelViewMatrix * vec4(u_camera, 1.0)).xyz;
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: glslify(/* glsl */ `
        precision highp float;

        uniform vec2 u_resolution;
        uniform float u_time;
        uniform vec3 u_camera;

        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec3 vLight;
        varying vec3 vCamera;
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

        // Torus function by Inigo Quilez - iquilezles.org
        // p - position, t - size
        float sdTorus(vec3 p, vec2 t) {
          vec2 q = vec2(length(p.xz)-t.x,p.y);
          return length(q)-t.y;
        }

        float scene(vec3 pos) {
          return abs(length(pos - vPosition));
        }

        const int RAYMARCH_MAX_STEPS = 500;
        const float RAYMARCH_MAX_DIST = 20.;
        const float EPSILON = 0.0001;

        // hoisting for raymarch fn return val
        vec4 shade (vec3 pos, vec3 rayDir, float rayDepth);

        vec4 raymarch(vec3 rayDir, vec3 pos) {
          // Define the start state
          // reset to 0 steps
          float currentDist = 0.0;
          float rayDepth = 0.0;
          vec3 rayLength = vec3(0.0);

          // shooting the ray
          for (int i=0; i < RAYMARCH_MAX_STEPS; i++) {
            // steps travelled
            currentDist = scene(pos + rayDir * rayDepth);
            rayDepth += currentDist;

            // We're inside the scene - magic happens here
            if (currentDist < EPSILON) return shade(pos + rayDir * rayDepth, rayDir, rayDepth);
            // We've gone too far
            if (rayDepth > RAYMARCH_MAX_DIST) return vec4(0, 0, 0, 1.);
          }

          return vec4(0, 0, 0, 1.);
        }

        vec3 getNormal (in vec3 pos, in float depth) {
          return normalize(vNormal);
          // const vec2 epsilon = vec2(0.0001, 0.);
          // vec3 nor = vec3(
          //   scene(pos + epsilon.rgg) - scene(pos - epsilon.rgg), // x
          //   scene(pos + epsilon.grg) - scene(pos - epsilon.grg), // y
          //   scene(pos + epsilon.ggr) - scene(pos - epsilon.ggr) // z
          // );
          // return normalize(nor);
        }

        float diffuse (in vec3 light, in vec3 nor) {
          return clamp(0., 1., dot(nor, light));
        }

        vec3 baseColor (in vec3 pos, in vec3 nor, in vec3 rayDir, in float rayDepth) {
          vec3 color = vec3(0);

          float dNR = dot(nor, -rayDir * 2.);

          color = palette(vec3(dNR), vec3(0.5), vec3(0.5), vec3(1), vec3(0, 0.33, 0.67));
          return color;
        }

        vec4 shade (vec3 pos, vec3 rayDir, float rayDepth) {
          vec3 nor = getNormal(pos, rayDepth);

          nor += .3 * sin(13. * nor + u_time);
          nor = normalize(nor);

          vec3 color = palette(
            nor,
            vec3(0.65, 0.95, 0.85), // brightness
            vec3(rayDepth) * 2., // contrast
            vec3(1), // osc
            vec3(0., 0.33, 0.67) // phase
          );

          // vec3 lightPos = rotate(vec3(1.), vec3(0, 1, 0), 3.14 * u_time);
          // vec3 lightPos = rotate(vec3(2, 2, -4), vec3(1, 1, 0), 3.14 * u_time);
          // vec3 lightPos = rotate(vLight, vec3(0, 1, 0), 3.14 * u_time);
          vec3 lightPos = vPosition;

          float dif = diffuse(lightPos, nor);
          color = dif * baseColor(pos, nor, rayDir, rayDepth);
          vec4 shapeColor = vec4(color, 1.0);

          return shapeColor;
        }

        void main() {
          vec2 uv = (gl_FragCoord.xy - u_resolution * .5) / u_resolution.yy;
          // vec3 camPos = vec3(0.0, 0.0, 5.0); // x, y, z axis
          // vec3 rayDir = normalize(vec3(uv, -1.0)); // DOF
          // gl_FragColor = vec4(raymarch(rayDir, camPos));

          vec3 rayDir = normalize(vPosition); // DOF
          gl_FragColor = vec4(raymarch(rayDir, vec3(0)));

          // vec3 rayDir = normalize(vPosition - u_camera); // DOF
          // float dist = length(vPosition - u_camera);
          // vec4 color = shade(vPosition, rayDir, dist);
          // gl_FragColor = vec4(color);
          // gl_FragColor = vec4(1,0,0,1.);
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

  return {
    resize({ pixelRatio, viewportWidth, viewportHeight }) {
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(viewportWidth, viewportHeight, false);
      camera.aspect = viewportWidth / viewportHeight;
      camera.updateProjectionMatrix();

      meshes.forEach((mesh) => {
        mesh.material.uniforms.u_resolution.value = new THREE.Vector2(
          viewportWidth * pixelRatio,
          viewportHeight * pixelRatio
        );
      });
    },
    render({ playhead }) {
      meshes.forEach((mesh) => {
        mesh.material.uniforms.u_time.value = playhead;
        mesh.rotation.y = playhead * Math.PI * 2;
      });

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
