/**
 * Inspired by:
 * https://www.artsy.net/artwork/matt-shlian-some-caterpillars-stay-caterpillars-7-aquamarine
 */
global.THREE = require('three124');
require('three124/examples/js/controls/OrbitControls');
const canvasSketch = require('canvas-sketch');
const Random = require('canvas-sketch-util/random');
const { lerp } = require('canvas-sketch-util/math');
const clrs = require('../clrs')();

const settings = {
  dimensions: [1080, 1080],
  animate: true,
  duration: 10,
  context: 'webgl',
};

const config = {
  targets: 6,
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
      // best tileOne?
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
  });

  // Setup a geometry
  const targetGeometries = new Array(config.targets)
    .fill()
    .map(() => sculptureGeometry(10, 5));
  targetGeometries.push(targetGeometries[0]);

  let geometry = targetGeometries[0];
  geometry.computeVertexNormals();

  const sculpture = new THREE.Mesh(geometry, material);

  const box = new THREE.Box3().setFromObject(sculpture);
  box.getCenter(sculpture.position).multiplyScalar(-1);

  const pivot = new THREE.Group();
  scene.add(pivot);
  pivot.add(sculpture);

  // draw each frame
  return {
    begin() {
      sculpture.geometry = targetGeometries[0];
      sculpture.geometry.attributes.position.needsUpdate = true;
      sculpture.geometry.computeVertexNormals();
    },
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
    render({ playhead, deltaTime }) {
      // sculpture.rotation.x = (Math.PI / 16) * Math.sin(playhead * 2 * Math.PI);
      // sculpture.rotation.y = (Math.PI / 16) * Math.cos(playhead * 2 * Math.PI);

      const targetIndex = Math.floor(playhead * config.targets) + 1;
      const targetGeometry = targetGeometries[targetIndex];
      morph(geometry, targetGeometry, deltaTime);

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

function morph(current, target, deltaTime) {
  const positions = current.attributes.position.array;
  const targetPositions = target.attributes.position.array;

  for (let i = 0; i < positions.length; i += 3) {
    let x = positions[i];
    let y = positions[i + 1];
    let z = positions[i + 2];

    // lerp
    x = interpolate(x, targetPositions[i], deltaTime);
    y = interpolate(y, targetPositions[i + 1], deltaTime);
    z = interpolate(z, targetPositions[i + 2], deltaTime);

    current.attributes.position.set([x, y, z], i);
  }

  current.attributes.position.needsUpdate = true;
  current.computeVertexNormals();
}

function interpolate(current, target, deltaTime) {
  // Determine a rate at which we will step forward each frame,
  // making it dependent on the time elapsed since last frame
  const rate = 4 * deltaTime;

  // Interpolate toward the target point at this rate
  return lerp(current, target, rate);
}

function sculptureGeometry(size, segments = 1) {
  const geometry = new THREE.BufferGeometry();

  const grid = Math.floor(segments);
  const segmentSize = size / grid;

  const vertices = [];
  const halfSize = size / 2;

  for (let iy = 0; iy < grid; iy++) {
    for (let ix = 0; ix < grid; ix++) {
      const [x, y] = [halfSize - iy * segmentSize, halfSize - ix * segmentSize];

      const geometry = tileGeometry({
        x,
        y,
        tileSize: segmentSize,
        height: ELEVATION,
      });
      vertices.push(...geometry);
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
  return [
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
}

function tileTwo([x0, x1, x2, x3], [y0, y1, y2, y3], h) {
  /* prettier-ignore */
  return [
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
}
