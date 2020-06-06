import { ShaderMaterial } from 'three';
global.THREE = require('three');
require('three/examples/js/controls/OrbitControls');
const canvasSketch = require('canvas-sketch');
const { lerpArray } = require('canvas-sketch-util/math');
const Random = require('canvas-sketch-util/random');
const clrs = require('../clrs')();

// Maroon #590A07
// Tomato #ED4844 vec3(0.929, 0.282, 0.266);
// Light Grey #D3D2D0
// Saddle Brown #8F1311
// Brick Red #C92C2A

const settings = {
  dimensions: [800, 800],
  // Make the loop animated
  animate: true,
  duration: 2,
  // Get a WebGL canvas rather than 2D
  context: 'webgl',
};

const sketch = ({ width, height, context }) => {
  // Create a renderer
  const renderer = new THREE.WebGLRenderer({
    canvas: context.canvas,
  });

  // WebGL background color
  renderer.setClearColor(clrs.bg, 1);

  // Setup a camera
  // const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 100);
  const camera = new THREE.OrthographicCamera(-7.5, 7.5, -7.5, 7.5, 0.01, 100);
  camera.position.set(0, 0, -20);
  camera.lookAt(new THREE.Vector3());

  // Setup camera controller
  const controls = new THREE.OrbitControls(camera, context.canvas);

  // Setup your scene
  const scene = new THREE.Scene();

  // var light = new THREE.PointLight(0xffffff, 1, 0);
  // light.position.set(0, 0, -20);
  // scene.add(light);

  // var pointLightHelper = new THREE.PointLightHelper(light, 1);
  // scene.add(pointLightHelper);

  // Setup a geometry
  // const geometry = new THREE.PlaneBufferGeometry(10, 10, 5, 5);
  const geometry = sculptureGeometry(10, 10, 5, 5);
  geometry.computeVertexNormals();

  // Setup a material
  const vertexShader = /* glsl */ `
    varying vec3 vNormal;

    void main () {
      vNormal  = (normalize(normal) * 0.5 ) + 0.5;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = /* glsl */ `
    varying vec3 vNormal;
    uniform vec3 uInk;

    void main() {
        vec3 view_nv  = normalize(vNormal);
        vec3 intensity = vNormal ;
        // vec3 c = uInk * max(intensity.x, max(intensity.y, intensity.z));
        vec3 c = uInk / intensity.x * intensity.y * intensity.z;
        gl_FragColor  = vec4(c, 1.0);
    }
  `;

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uInk: {
        value: new THREE.Color(clrs.ink()),
      },
    },
    vertexShader,
    fragmentShader,
    // side: THREE.DoubleSide,
  });

  // const material = new THREE.MeshNormalMaterial({
  //   flatShading: true,
  //   side: THREE.DoubleSide,
  // });

  // Setup a mesh with geometry + material
  const mesh = new THREE.Mesh(geometry, material);
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
    render({ time }) {
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

function sculptureGeometry(
  width,
  height,
  widthSegments = 1,
  heightSegments = 1,
) {
  const geometry = new THREE.BufferGeometry();

  const widthHalf = width / 2;
  const heightHalf = height / 2;

  const gridX = Math.floor(widthSegments);
  const gridY = Math.floor(heightSegments);

  const segmentWidth = width / gridX;
  const segmentHeight = height / gridY;

  const faces = [];

  /**
   * Create the base grid with each segment
   * split into 4 triangles
   * (x0,-y2)  *-----------* (x2,-y2)
   *           |           |
   *           |     *     |
   *           | (x1,-y1)  |
   * (x0,-y0)  *-----------* (x2,-y0)
   */
  for (let iy = 1; iy < gridY + 1; iy++) {
    const y0 = iy * segmentHeight - heightHalf;
    const y1 = y0 - segmentHeight / 2;
    const y2 = y0 - segmentHeight;

    for (let ix = 1; ix < gridX + 1; ix++) {
      const x0 = ix * segmentWidth - widthHalf;
      const x1 = x0 - segmentWidth / 2;
      const x2 = x0 - segmentWidth;

      // Ordered so that the first
      // two vertices are on the outside
      faces.push([
        [x0, -y0, 0],
        [x0, -y2, 0],
        [x1, -y1, 0],
      ]);
      faces.push([
        [x2, -y0, 0],
        [x0, -y0, 0],
        [x1, -y1, 0],
      ]);
      faces.push([
        [x2, -y2, 0],
        [x2, -y0, 0],
        [x1, -y1, 0],
      ]);
      faces.push([
        [x0, -y2, 0],
        [x2, -y2, 0],
        [x1, -y1, 0],
      ]);
    }
  }

  const vertices = [];

  for (const face of faces) {
    const [a, b, c] = face;
    vertices.push(...subdivide()(a, b, c));
  }

  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(vertices, 3),
  );

  return geometry;
}

const subdivisionTypes = [subdivideA, subdivideB, subdivideC];
function subdivide() {
  return Random.pick(subdivisionTypes);
}

const ELEVATION = 0.25;

/**
 *           mp
 *    a *****◾️***** b
 *       *********
 *        ***◾️----- d (elevated)
 *         *****
 *          ***
 *           *
 *           c
 *
 */
function subdivideA(a, b, c) {
  const mp = lerpArray(a, b, 0.5);
  const d = lerpArray(c, mp, 0.5);
  d[2] = ELEVATION;

  return [b, d, a, c, d, b, a, d, c].flat();
}

/**
 *
 *    a *********** b
 *       *********
 *        ******◾️ d (elevated)
 *         *****
 *          ***
 *           *
 *           c
 *
 */
function subdivideB(a, b, c) {
  const side = Random.pick([
    [a, c],
    [b, c],
  ]);

  const d = lerpArray(...side, 0.5);
  d[2] = ELEVATION;

  return [b, d, a, a, d, c, c, d, b].flat();
}

/**
 *    a *********** b
 *       *********
 *        *******
 *         *****
 *          ***
 *           *
 *           c, d(elevated)
 *
 */
function subdivideC(a, b, c) {
  const d = [c[0], c[1], ELEVATION];
  return [a, d, c, c, d, b, a, b, d].flat();
}
