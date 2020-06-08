import { ShaderMaterial } from 'three';
global.THREE = require('three');
require('three/examples/js/controls/OrbitControls');
const canvasSketch = require('canvas-sketch');
const { lerpArray, mapRange } = require('canvas-sketch-util/math');
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
  duration: 4,
  // Get a WebGL canvas rather than 2D
  context: 'webgl',
};

const sketch = ({ context }) => {
  // Create a renderer
  const renderer = new THREE.WebGLRenderer({
    canvas: context.canvas,
  });

  const foreground = clrs.ink();

  // WebGL background color
  renderer.setClearColor(foreground, 1);

  // Setup a camera
  const camera = new THREE.OrthographicCamera(-6, 6, -6, 6, 0.01, 100);
  camera.position.set(0, 0, -20);
  camera.lookAt(new THREE.Vector3());

  // Setup camera controller
  const controls = new THREE.OrbitControls(camera, context.canvas);

  // Setup your scene
  const scene = new THREE.Scene();

  // Setup a geometry
  const geometry = sculptureGeometry(10, 10, 5, 5);
  geometry.computeVertexNormals();

  // Shader material that darkens the vertex
  // color based on the vertex normal
  const vertexShader = /* glsl */ `
    varying vec4 vertColor;

    uniform float uTime;
    uniform vec3 uLightPosition;
    uniform vec3 uColor;

    vec3 rgb2hsb( in vec3 c ){
        vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
        vec4 p = mix(vec4(c.bg, K.wz),
                    vec4(c.gb, K.xy),
                    step(c.b, c.g));
        vec4 q = mix(vec4(p.xyw, c.r),
                    vec4(c.r, p.yzx),
                    step(p.x, c.r));
        float d = q.x - min(q.w, q.y);
        float e = 1.0e-10;
        return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)),
                    d / (q.x + e),
                    q.x);
    }

    //  Function from Iñigo Quiles
    //  https://www.shadertoy.com/view/MsS3Wc
    vec3 hsb2rgb( in vec3 c ){
        vec3 rgb = clamp(abs(mod(c.x*6.0+vec3(0.0,4.0,2.0),
                                6.0)-3.0)-1.0,
                        0.0,
                        1.0 );
        rgb = rgb*rgb*(3.0-2.0*rgb);
        return c.z * mix(vec3(1.0), rgb, c.y);
    }

    void main () {
      // vec3 ecPosition = vec3(modelViewMatrix * vec4(position, 1.0));
      // vec3 ecNormal = normalize(normalMatrix * normal);
      // vec3 direction = normalize(uLightPosition.xyz - ecPosition);
      // float intensity = max(0.0, dot(direction, ecNormal));
      // vertColor = vec4(intensity, intensity, intensity, 1.0) * vec4(uColor, 1.0);

      // vec3 vNormal  = normalMatrix * normal;
      // vec3 intensity = (normalize(normal) * 0.5) + 0.5;
      // vec3 col = uColor / intensity.x * intensity.y * intensity.z;
      // vertColor = vec4(uColor * col, 1.0);

      vec3 intensity = normalize( normal ) * 0.5 + 0.5;
      vec3 col = rgb2hsb(uColor) * vec3(1.0, intensity.xy);
      vertColor = vec4(hsb2rgb(col), 1.0);

      // vec3 ecPosition = vec3(modelViewMatrix * vec4(position, 1.0));
      // vec3 ecNormal = normalize(normalMatrix * normal);
      // vec3 direction = normalize(uLightPosition.xyz - ecPosition);
      // float intensity = abs(dot(direction, ecNormal));
      // vec3 col = rgb2hsb(uColor);
      // col.z = col.z - 0.25 * intensity;
      // vertColor = vec4(hsb2rgb(col), 1.0);

      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = /* glsl */ `
    varying vec4 vertColor;

    void main() {
      gl_FragColor = vertColor;
    }
  `;

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(foreground) },
      uLightPosition: { value: camera.position.clone().multiplyScalar(-1) },
    },
    vertexShader,
    fragmentShader,
  });

  const wireFrameMaterial = new THREE.MeshBasicMaterial({
    color: foreground,
    wireframe: true,
    flatShading: true,
  });

  const normalMaterial = new THREE.MeshNormalMaterial({
    flatShading: true,
  });

  // const light = new THREE.PointLight(foreground, 1, 100);
  // light.position.set(0, 0, 20);
  // scene.add(light);
  // const pointLightHelper = new THREE.PointLightHelper(light, 1);
  // scene.add(pointLightHelper);

  // Setup a mesh with geometry + material
  const planeGeometry = new THREE.PlaneGeometry(10, 10, 5, 5);
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  let state = 'init';

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
      // const t = Math.floor(mapRange(playhead, 0, 1, 0, 5));

      // if (t === 0 && state !== 'init') {
      //   state = 'init';
      //   renderer.setClearColor('#fefefe', 1);
      //   mesh.geometry = new THREE.PlaneGeometry(10, 10, 5, 5);
      //   mesh.material = wireFrameMaterial;
      // } else if (t === 1 && state === 'init') {
      //   const geometry = sculptureGeometry(10, 10, 5, 5);
      //   geometry.computeVertexNormals();
      //   // mesh.geometry.dispose();
      //   mesh.geometry = geometry;
      //   state = 'sculpt';
      // } else if (t === 2 && state === 'sculpt') {
      //   // mesh.material.dispose();
      //   mesh.material = normalMaterial;
      //   state = 'normal';
      // } else if (t === 3 && state === 'normal') {
      //   renderer.setClearColor(foreground, 1);
      //   // mesh.material.dispose();
      //   mesh.material = material;
      //   state = 'final';
      // }

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

  const tiles = [];

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
      tiles.push([
        [
          [x0, -y0, 0],
          [x0, -y2, 0],
          [x1, -y1, 0],
        ],
        [
          [x2, -y0, 0],
          [x0, -y0, 0],
          [x1, -y1, 0],
        ],
        [
          [x2, -y2, 0],
          [x2, -y0, 0],
          [x1, -y1, 0],
        ],
        [
          [x0, -y2, 0],
          [x2, -y2, 0],
          [x1, -y1, 0],
        ],
      ]);
    }
  }

  const vertices = [];

  for (const tile of tiles) {
    pickTileType().forEach((type, idx) => {
      const face = tile[idx];
      const [a, b, c] = face;
      vertices.push(...type(a, b, c));
    });
  }

  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(vertices, 3),
  );

  return geometry;
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
function subdivideInCenter(a, b, c) {
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
function subdivideOnEdge(edge = 0) {
  return (a, b, c) => {
    const side = [
      [a, c],
      [b, c],
    ][edge];

    const d = lerpArray(...side, 0.5);
    d[2] = ELEVATION;

    return [b, d, a, a, d, c, c, d, b].flat();
  };
}

/**
 *
 *    a *********** b
 *       *********
 *        *******
 *         *****
 *          ***
 *           *  ◾️ d (elevated)
 *           c
 *
 */
function subdivideOnFaceEdge(edge = 0) {
  return (a, b, c) => {
    const axis = [0, 1].find((idx) => a[idx] !== b[idx]);
    const dir = edge === 0 ? a : b;
    const dest = [...c];
    dest[axis] = dir[axis];

    const d = lerpArray(c, dest, 0.5);
    d[2] = ELEVATION;

    return [b, d, a, a, d, c, c, d, b].flat();
  };
}

/**
 *          mp
 *    a *****◾️***** b
 *       *********
 *        ***◾️----- d (elevated)
 *         .....
 *          ...
 *           .
 *           c
 *
 */
function subdivideSmallRaisedFullFace(a, b, c) {
  const mp = lerpArray(a, b, 0.5);
  const d = lerpArray(c, mp, 0.5);
  d[2] = ELEVATION;

  return [b, d, a].flat();
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
function subdivideRaisedFullFace(a, b, c) {
  const d = [c[0], c[1], ELEVATION];
  return [a, d, c, c, d, b, a, b, d].flat();
}

//    2
// 1     3
//    4
const tileTypes = [
  [
    subdivideRaisedFullFace,
    subdivideRaisedFullFace,
    subdivideRaisedFullFace,
    subdivideRaisedFullFace,
  ],
  [
    subdivideOnEdge(0),
    subdivideOnEdge(1),
    subdivideInCenter,
    subdivideInCenter,
  ],
  [
    subdivideOnEdge(1),
    subdivideOnEdge(0),
    subdivideOnEdge(1),
    subdivideOnEdge(0),
  ],
  [
    subdivideInCenter,
    subdivideInCenter,
    subdivideOnEdge(0),
    subdivideOnEdge(1),
  ],
  [subdivideInCenter, subdivideInCenter, subdivideInCenter, subdivideInCenter],
  [
    subdivideInCenter,
    subdivideOnEdge(0),
    subdivideOnEdge(1),
    subdivideInCenter,
  ],
  [
    subdivideOnEdge(0),
    subdivideOnEdge(1),
    subdivideOnEdge(0),
    subdivideOnEdge(1),
  ],
  [
    subdivideOnEdge(1),
    subdivideInCenter,
    subdivideInCenter,
    subdivideOnEdge(0),
  ],
  [
    subdivideSmallRaisedFullFace,
    subdivideOnFaceEdge(1),
    subdivideInCenter,
    subdivideOnFaceEdge(0),
  ],
  [
    subdivideOnFaceEdge(0),
    subdivideSmallRaisedFullFace,
    subdivideOnFaceEdge(1),
    subdivideInCenter,
  ],
  [
    subdivideInCenter,
    subdivideOnFaceEdge(0),
    subdivideSmallRaisedFullFace,
    subdivideOnFaceEdge(1),
  ],
  [
    subdivideOnFaceEdge(1),
    subdivideInCenter,
    subdivideOnFaceEdge(0),
    subdivideSmallRaisedFullFace,
  ],
];

function pickTileType() {
  return Random.pick(tileTypes);
}
