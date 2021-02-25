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
  duration: 6,
};

const sketch = ({ context }) => {
  // Create a renderer
  const renderer = new THREE.WebGLRenderer({
    canvas: context.canvas,
  });

  const background = new THREE.Color('#000000'); // #222
  const water = new THREE.Color('#AAEBED'); //#62A8E5
  const grass = new THREE.Color('#69E19D'); //#397E58
  const land = new THREE.Color('#F7ED94'); //#BB8B41

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

  // Setup a material
  const material = new THREE.ShaderMaterial({
    transparent: true,
    extensions: {
      derivatives: true,
    },
    uniforms: {
      scale: { value: 1.0 },
      size: { value: 0.1 },
      density: { value: 3.0 },
      background: { value: background },
      water: { value: water },
      grass: { value: grass },
      land: { value: land },
      time: { value: 0 },
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
      uniform vec3 water;
      uniform vec3 grass;
      uniform vec3 land;
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

        vec3 fragColor = water;

        if (v > 0.333 && v < 0.666) {
          fragColor = land;
        } else if (v >= 0.666) {
          fragColor = grass;
        }

        float rim = sphereRim(vPosition);
        fragColor += (1.0 - rim) * background * 0.25;

        float stroke = aastep(0.9, rim);
        fragColor = mix(fragColor, background, stroke);

        gl_FragColor = vec4(fragColor, 1.0);
      }
      `),
  });

  // Setup a mesh with geometry + material
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.fromArray([0, 0, 0]);
  mesh.scale.setScalar(1);
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
    render({ playhead, duration, deltaTime }) {
      mesh.material.uniforms.time.value = playhead;

      const omega = (Math.PI * 2) / (duration * 60);
      scene.rotation.y = playhead * Math.PI * 2;
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

function addNeighbourAttributes(
  bufferGeometry,
  baseVertices,
  neighbourCount = 3
) {
  if (bufferGeometry.getIndex()) {
    throw new Error(
      'This is only supported on un-indexed geometries right now.'
    );
  }

  // We will give each triangle in the geometry N nearest neighbours
  const positionAttr = bufferGeometry.getAttribute('position');
  const vertexCount = positionAttr.count;

  // First let's build a little list of attribute names + vertex data
  const neighbourAttribs = [];
  for (let i = 0; i < neighbourCount; i++) {
    neighbourAttribs.push({
      name: `neighbour${i}`,
      data: [],
    });
  }

  // For each triangle
  for (let i = 0; i < vertexCount / 3; i++) {
    // Get the triangle centroid, we will use that for comparison
    const centroid = new THREE.Vector3();
    for (let c = 0; c < 3; c++) {
      const x = positionAttr.getX(i * 3 + c);
      const y = positionAttr.getY(i * 3 + c);
      const z = positionAttr.getZ(i * 3 + c);
      const vert = new THREE.Vector3(x, y, z);
      centroid.add(vert);
    }
    centroid.divideScalar(3);

    // Get the N nearest neighbours to the centroid
    const neighbours = getNearestNeighbours(
      centroid,
      baseVertices,
      neighbourCount
    );

    // Go through each neighbour and add its XYZ data in
    neighbours.forEach((n, i) => {
      // Repeat this 3 times so that we do it for each vertex
      // in the triangle
      for (let c = 0; c < 3; c++) {
        neighbourAttribs[i].data.push(...n.toArray());
      }
    });
  }

  // Now that we have flat arrays for each neighbour,
  // we add it into the buffer geometry
  neighbourAttribs.forEach((attrib) => {
    const array = new Float32Array(attrib.data);
    const buf = new THREE.BufferAttribute(array, 3);
    bufferGeometry.addAttribute(attrib.name, buf);
  });
}

// a simple but inefficient method to extract N
// nearest neighbours from a point with a given vertex list
function getNearestNeighbours(point, list, count) {
  // get distance squared from this point to all others
  const data = list
    // Avoid any that match the input point
    .filter((p) => p.point !== point)
    // Get an object with distance
    .map((other) => {
      return {
        distance: point.distanceToSquared(other),
        point: other,
      };
    });
  // sort by distance
  data.sort((a, b) => a.distance - b.distance);
  // return only N neighbours
  return data.slice(0, count).map((p) => p.point);
}
