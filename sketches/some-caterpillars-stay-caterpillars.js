/**
 * Inspired by:
 * https://www.artsy.net/artwork/matt-shlian-some-caterpillars-stay-caterpillars-7-aquamarine
 */
global.THREE = require('three');
require('three/examples/js/controls/OrbitControls');
const canvasSketch = require('canvas-sketch');
const Random = require('canvas-sketch-util/random');
const clrs = require('../clrs')();

const settings = {
  // dimensions: [800, 800],
  animate: true,
  duration: 4,
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
      // Processing light shader
      // vec3 ecPosition = vec3(modelViewMatrix * vec4(position, 1.0));
      // vec3 ecNormal = normalize(normalMatrix * normal);
      // vec3 direction = normalize(uLightPosition.xyz - ecPosition);
      // float intensity = max(0.0, dot(direction, ecNormal));
      // vertColor = vec4(intensity, intensity, intensity, 1.0) * vec4(uColor, 1.0);

      // MeshNormalMaterial style
      // vec3 vNormal  = normalMatrix * normal;
      // vec3 intensity = (normalize(normal) * 0.5) + 0.5;
      // vec3 col = uColor / intensity.x * intensity.y * intensity.z;
      // vertColor = vec4(uColor * col, 1.0);

      // MeshNormalMaterial with hsb to adjust s & b
      // best one?
      vec3 intensity = normalize(normal) * 0.5 + 0.5;
      vec3 col = rgb2hsb(uColor) * vec3(1.0, intensity.x * 2.0, intensity.y);
      vertColor = vec4(hsb2rgb(col), 1.0);

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
    // side: THREE.DoubleSide,
  });

  const wireFrameMaterial = new THREE.MeshBasicMaterial({
    color: foreground,
    wireframe: true,
    flatShading: true,
  });

  const normalMaterial = new THREE.MeshNormalMaterial({
    flatShading: true,
  });

  // Setup a geometry
  const geometry = sculptureGeometry(10, 5);
  geometry.computeVertexNormals();

  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  // draw each frame
  return {
    // Handle resize events here
    resize({ pixelRatio, viewportWidth, viewportHeight }) {
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(viewportWidth, viewportHeight, false);

      const aspect = viewportWidth / viewportHeight;
      camera.left = -6 * aspect;
      camera.right = 6 * aspect;
      camera.top = -6;
      camera.bottom = 6;
      camera.updateProjectionMatrix();
    },
    // Update & render your scene here
    render() {
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

const ELEVATION = 0.25;

function sculptureGeometry(size, segments = 1) {
  const geometry = new THREE.BufferGeometry();

  const grid = Math.floor(segments);
  const segmentSize = size / grid;

  const vertices = [];
  const halfSize = size / 2;

  // vertices.push(
  //   ...tileGeometry({ x: 0, y: 0, tileSize: segmentSize, height: ELEVATION })
  // );

  for (let iy = 1; iy < grid + 1; iy++) {
    for (let ix = 1; ix < grid + 1; ix++) {
      const [x, y] = [halfSize - iy * segmentSize, halfSize - ix * segmentSize];

      vertices.push(
        ...tileGeometry({ x, y, tileSize: segmentSize, height: ELEVATION })
      );
    }
  }

  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(vertices, 3)
  );

  return geometry;
}

/**
 *
 *   0    *********
 *   a/3  *       *
 *   2a/3 *       *
 *   a    *********
 *       a          0
 */
function tileGeometry({ x, y, tileSize: a, height: h }) {
  const leftToRight = Random.chance();
  let vertices;
  const xs = [0, a / 3, (2 * a) / 3, a].map((v) => v + x);
  const ys = [0, a / 3, (2 * a) / 3, a].map((v) => v + y);

  return rightToLeftTileB(xs, ys, h);

  // if (leftToRight) {
  //   vertices = leftToRightTile(xs, ys, h);
  // } else {
  //   vertices = rightToLeftTile(xs, ys, h);
  // }

  return vertices;
}

function leftToRightTile([x0, x1, x2, x3], [y0, y1, y2, y3], h) {
  /* prettier-ignore */
  return [
    // 1
    x3, y0, 0,
    x3, y1, h,
    x2, y0, h,

    // 2
    x3, y3, 0,
    x2, y0, h,
    x3, y1, h,

    x0, y0, 0,
    x2, y0, h,
    x3, y3, 0,

    // 3
    x0, y0, 0,
    x3, y3, 0,
    x1, y3, h,

    x0, y0, 0,
    x1, y3, h,
    x0, y2, h,

    // 4
    x0, y2, h,
    x1, y3, h,
    x0, y3, 0,
  ];
}

// Goes to the right and bottom
function leftToRightTileA([x0, x1, x2, x3], [y0, y1, y2, y3], h) {
  /* prettier-ignore */
  return [
    // 1
    x1, y0, 0,
    x3, y0, 0,
    x3, y2, 0,

    // 2
    x1, y0, 0,
    x3, y2, 0,
    x3, y3, h,

    x1, y0, 0,
    x3, y3, h,
    x0, y0, h,

    // 3
    x0, y0, h,
    x3, y3, h,
    x1, y3, 0,

    x0, y0, h,
    x1, y3, 0,
    x0, y2, 0,

    // 4
    x0, y2, 0,
    x1, y3, 0,
    x0, y3, 0,
  ];
}

// Goes to the left and top
function leftToRightTileB([x0, x1, x2, x3], [y0, y1, y2, y3], h) {
  /* prettier-ignore */
  return [
    // 1
    x2, y0, 0,
    x3, y0, 0,
    x3, y1, 0,

    // 2
    x2, y0, 0,
    x3, y1, 0,
    x3, y3, h,

    x0, y0, h,
    x2, y0, 0,
    x3, y3, h,

    // 3
    x0, y0, h,
    x3, y3, h,
    x2, y3, 0,

    x0, y0, h,
    x2, y3, 0,
    x0, y1, 0,

    // 4
    x0, y1, 0,
    x2, y3, 0,
    x0, y3, 0,
  ];
}

function rightToLeftTile([x0, x1, x2, x3], [y0, y1, y2, y3], h) {
  /* prettier-ignore */
  return [
    // 1
    x1, y0, h,
    x0, y1, h,
    x0, y0, 0,

    // 2
    x1, y0, h,
    x0, y3, 0,
    x0, y1, h,

    x3, y0, 0,
    x0, y3, 0,
    x1, y0, h,

    // 3
    x2, y3, h,
    x0, y3, 0,
    x3, y0, 0,

    x3, y0, 0,
    x3, y2, h,
    x2, y3, h,

    // 4
    x3, y3, 0,
    x2, y3, h,
    x3, y2, h,
  ];
}

// Goes to the right and top
function rightToLeftTileA([x0, x1, x2, x3], [y0, y1, y2, y3], h) {
  /* prettier-ignore */
  return [
    // 1
    x0, y0, 0,
    x1, y0, 0,
    x0, y1, 0,

    // 2
    x1, y0, 0,
    x3, y0, h,
    x0, y1, 0,

    x0, y1, 0,
    x3, y0, h,
    x0, y3, h,

    // 3
    x0, y3, h,
    x3, y0, h,
    x3, y1, 0,

    x0, y3, h,
    x3, y1, 0,
    x1, y3, 0,

    // 4
    x1, y3, 0,
    x3, y1, 0,
    x3, y3, 0,
  ];
}

// Goes to the left and bottom
function rightToLeftTileB([x0, x1, x2, x3], [y0, y1, y2, y3], h) {
  /* prettier-ignore */
  return [
    // 1
    x0, y0, 0,
    x2, y0, 0,
    x0, y2, 0,

    // 2
    x0, y2, 0,
    x2, y0, 0,
    x3, y0, h,

    x0, y2, 0,
    x3, y0, h,
    x0, y3, h,

    // 3
    x0, y3, h,
    x3, y0, h,
    x3, y2, 0,

    x0, y3, h,
    x3, y2, 0,
    x2, y3, 0,

    // 4
    x2, y3, 0,
    x3, y2, 0,
    x3, y3, 0,
  ];
}
