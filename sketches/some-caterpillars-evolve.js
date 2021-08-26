/**
 * Inspired by:
 * https://www.artsy.net/artwork/matt-shlian-some-caterpillars-stay-caterpillars-7-aquamarine
 */
global.THREE = require('three124');
require('three124/examples/js/controls/OrbitControls');
const canvasSketch = require('canvas-sketch');
const Random = require('canvas-sketch-util/random');
const clrs = require('../clrs')();

const settings = {
  dimensions: [1600, 1600],
  animate: true,
  duration: 2,
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
    attribute float mode;
    varying vec2 vUv;
    varying float uMode;
    varying vec3 vNormal;

    void main () {
      vUv = uv;
      uMode = mode;
      vNormal = normal;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = /* glsl */ `
    uniform float uTime;
    uniform vec3 uLightPosition;
    uniform vec3 uColor;
    varying vec2 vUv;
    varying float uMode;
    varying vec3 vNormal;

    uniform float playhead;
    uniform float tiling;
    uniform float direction;
    uniform float warpScale;
    uniform float warpTiling;

    #define PI 3.141592653589793

    vec3 rgb2hsb( in vec3 c ) {
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

    void main() {
      vec2 pos;
      // Blend the direction between x and y
      if (uMode==1.0) {
        pos.x = mix(vUv.x, vUv.y, direction);
        pos.y = mix(vUv.y, 1.0 - vUv.x, direction);
      } else {
        pos.x = mix(1.0 - vUv.x, vUv.y, direction);
        pos.y = mix(vUv.y, vUv.x, direction);
      }

      pos.x += (playhead + sin(pos.y * warpTiling * PI * 2.0) * warpScale);
      pos.x *= tiling;

      vec3 intensity = normalize(vNormal) * 0.5 + 0.5;
      float stripeValue = floor(fract(pos.x) + 0.5);

      vec3 col = rgb2hsb(uColor) * vec3(1.0, intensity.x * 2.0, intensity.y + stripeValue);
      vec3 vertColor = hsb2rgb(col);

      gl_FragColor = vec4(vertColor, 1.0);
    }
  `;

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(foreground) },
      uLightPosition: { value: camera.position.clone().multiplyScalar(-1) },
      playhead: { value: 0 },
      tiling: { value: 6 },
      direction: { value: 0.5 },
      warpScale: { value: 0 },
      warpTiling: { value: 0 },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
  });

  // Setup a geometry
  const geometry = sculptureGeometry(10, 5);
  geometry.computeVertexNormals();

  const sculpture = new THREE.Mesh(geometry, material);
  // scene.add(sculpture);

  const box = new THREE.Box3().setFromObject(sculpture);
  box.getCenter(sculpture.position).multiplyScalar(-1);

  const pivot = new THREE.Group();
  scene.add(pivot);
  pivot.add(sculpture);

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
    render({ playhead }) {
      sculpture.rotation.x = (Math.PI / 16) * Math.sin(playhead * 2 * Math.PI);
      sculpture.rotation.y = (Math.PI / 16) * Math.cos(playhead * 2 * Math.PI);

      sculpture.material.uniforms.playhead.value = playhead;

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
  const uv = [];
  const modes = [];
  const halfSize = size / 2;

  for (let iy = 0; iy < grid; iy++) {
    for (let ix = 0; ix < grid; ix++) {
      const [x, y] = [halfSize - iy * segmentSize, halfSize - ix * segmentSize];

      const { geometry, uvs, mode } = tileGeometry({
        x,
        y,
        tileSize: segmentSize,
        height: ELEVATION,
      });
      vertices.push(...geometry);
      uv.push(...uvs);
      modes.push(...mode);
    }
  }

  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(vertices, 3)
  );
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setAttribute('mode', new THREE.Float32BufferAttribute(modes, 1));

  return geometry;
}

/**
 *
 *   0    ***********
 *        *         *
 *    a/2 *         *
 *        *         *
 *   a    ***********
 *       a          0
 */
function tileGeometry({ x, y, tileSize: a, height: h }) {
  const leftToRight = Random.chance();
  const xs = [0, a / 2, a].map((v) => v + x);
  const ys = [0, a / 2, a].map((v) => v + y);

  return leftToRight ? tileOne(xs, ys, h) : tileTwo(xs, ys, h);
}

function tileOne([x0, x1, x2], [y0, y1, y2], h) {
  /* prettier-ignore */
  const geometry = [
    // 1
    x1, y0, h,
    x2, y0, 0,
    x2, y1, h,

    // 2
    x0, y0, 0,
    x1, y0, h,
    x2, y1, h,

    x0, y0, 0,
    x2, y1, h,
    x2, y2, 0,

    // 3
    x0, y0, 0,
    x2, y2, 0,
    x1, y2, h,

    x0, y0, 0,
    x1, y2, h,
    x0, y1, h,

    // 4
    x0, y1, h,
    x1, y2, h,
    x0, y2, 0,
  ];

  /* prettier-ignore */
  const uvs = [
    0.5, 0.0,
    1.0, 0.0,
    1.0, 0.5,

    // 2
    0.0, 0.0,
    0.5, 0.0,
    1.0, 0.5,

    0.0, 0.0,
    1.0, 0.5,
    1.0, 1.0,

    // 3
    0.0, 0.0,
    1.0, 1.0,
    0.5, 1.0,

    0.0, 0.0,
    0.5, 1.0,
    0.0, 0.5,

    // 4
    0.0, 0.5,
    0.5, 1.0,
    0.0, 1.0,
  ];

  const mode = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

  return { geometry, uvs, mode };
}

function tileTwo([x0, x1, x2], [y0, y1, y2], h) {
  /* prettier-ignore */
  const geometry = [
    // 1
    x0, y0, 0,
    x1, y0, h,
    x0, y1, h,

    // 2
    x0, y1, h,
    x1, y0, h,
    x0, y2, 0,

    x1, y0, h,
    x2, y0, 0,
    x0, y2, 0,

    // 3
    x0, y2, 0,
    x2, y0, 0,
    x2, y1, h,

    x0, y2, 0,
    x2, y1, h,
    x1, y2, h,

    // 4
    x1, y2, h,
    x2, y1, h,
    x2, y2, 0,
  ];

  /* prettier-ignore */
  const uvs = [
    // 1
    0.0, 0.0,
    0.5, 0.0,
    0.0, 0.5,

    // 2
    0.0, 0.5,
    0.5, 0.0,
    0.0, 1.0,

    0.5, 0.0,
    1.0, 0.0,
    0.0, 1.0,

    // 3
    0.0, 1.0,
    1.0, 0.0,
    1.0, 0.5,

    0.0, 1.0,
    1.0, 0.5,
    0.5, 1.0,

    // 4
    0.5, 1.0,
    1.0, 0.5,
    1.0, 1.0,
  ];

  const mode = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];

  return { geometry, uvs, mode };
}
