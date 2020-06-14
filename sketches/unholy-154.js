/**
 * Inspired by
 * https://www.artsy.net/artwork/matt-shlian-unholy-153-now-we-put-the-river-to-sleep-number-3
 */
const Random = require('canvas-sketch-util/random');
const Color = require('canvas-sketch-util/Color');
const risoColors = require('riso-colors').map((h) => h.hex);
const paperColors = require('paper-colors').map((h) => h.hex);
global.THREE = require('three');

// Include any additional ThreeJS examples below
require('three/examples/js/controls/OrbitControls');
require('three/examples/js/renderers/Projector');
require('three/examples/js/renderers/SVGRenderer');

const canvasSketch = require('canvas-sketch');

const settings = {
  // dimensions: [1600, 1600],
  scaleToView: true,
  context: 'webgl',
};

const sketch = ({ context, width, height, canvas }) => {
  canvas ? canvas.remove() : null;

  const background = Random.pick(paperColors); // #222
  const minContrast = 3;
  // const fogColor = palette.shift(); // 0x222222
  const inkColors = risoColors.filter(
    (color) => Color.contrastRatio(background, color) >= minContrast
  );
  const foreground = Random.pick(inkColors); // #00AA93

  // Create a renderer
  const renderer = new THREE.SVGRenderer();
  renderer.setSize(width, height);
  document.body.appendChild(renderer.domElement);

  // WebGL background color
  renderer.setClearColor(background, 1);

  // Setup a camera
  const camera = new THREE.PerspectiveCamera(50, width / height, 0.01, 200);
  camera.position.set(12, 8, 12);
  camera.lookAt(new THREE.Vector3());

  // Setup camera controller
  const controls = new THREE.OrbitControls(camera, context.canvas);

  // Setup your scene
  const scene = new THREE.Scene();
  // scene.fog = new THREE.FogExp2(background, 0.05);

  // Debug helpers
  // const axesHelper = new THREE.AxesHelper(5);
  // scene.add(axesHelper);

  const ambLight = new THREE.AmbientLight(0xffffff, 0.25);
  scene.add(ambLight);

  let xOff = 0;

  const sculpture = new THREE.Group();

  const pyramids = [];

  // 11-36 in 26 steps, 28 for square
  for (let count = 11; count <= 28; count++) {
    const baseSize = 11 / count;

    for (let idx = 0; idx < count; idx++) {
      const geometry = pyramidGeometry({
        s: baseSize,
        h: 2 * baseSize,
      });

      const pyramid = makeMesh2(geometry, background, foreground);

      pyramid.position.x = xOff;
      pyramid.position.z = idx * baseSize;
      pyramid.position.y = 0;

      sculpture.add(pyramid);
      pyramids.push(pyramid);
    }
    xOff += baseSize;
  }

  const convergence = new THREE.Mesh(
    new THREE.SphereGeometry(0.5),
    new THREE.MeshStandardMaterial({
      color: '#FF4C65',
      visible: false,
    })
  );
  convergence.position.y = 1;
  convergence.position.x = 1;
  convergence.position.z = 1;

  sculpture.add(convergence);

  // Centre the sculpture
  const sculptureSize = new THREE.Box3().setFromObject(sculpture);
  sculptureSize.getCenter(sculpture.position).multiplyScalar(-1);

  scene.add(sculpture);

  sculpture.position.y = -0.9;

  const planeGeometry = new THREE.BoxGeometry(
    Math.abs(sculptureSize.max.x - sculptureSize.min.x),
    Math.abs(sculptureSize.max.z - sculptureSize.min.z),
    0.5,
    1,
    1
  );
  const plane = makeMesh2(planeGeometry, foreground, background); // new THREE.Mesh(planeGeometry, planeMaterial);
  plane.rotateX(Math.PI / 2);
  plane.position.x = -sculptureSize.min.x / 2;
  plane.position.z = -sculptureSize.min.z / 2;
  plane.position.y = -0.75;
  // scene.add(plane);

  convergence.translateX(-sculpture.position.x);
  convergence.translateZ(-sculpture.position.z);
  const origin = convergence.position.clone();

  distortPyramids(pyramids, convergence, origin, 0);

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

function pyramidGeometry({ s = 1, h = 2 }) {
  const geometry = new THREE.Geometry();

  geometry.vertices.push(
    new THREE.Vector3(s / 2, h, s / 2),
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(s, 0, 0),
    new THREE.Vector3(s, 0, s),
    new THREE.Vector3(0, 0, s)
  );

  geometry.faces.push(
    new THREE.Face3(2, 1, 0),
    new THREE.Face3(3, 2, 0),
    new THREE.Face3(4, 3, 0),
    new THREE.Face3(1, 4, 0),
    new THREE.Face3(1, 2, 3),
    new THREE.Face3(1, 3, 4)
  );

  geometry.add;

  geometry.computeVertexNormals();

  geometry.radius = (s * 2 ** 0.5) / 2;

  return geometry;
}

function vecField(x, y) {
  return [y - x, -x - y];
  const l = Math.hypot(x, y) ** 0.5;
  const f = Math.sin(2 * x + 2 * y);
  const r = (x ** 2 + y ** 2) / (2 * x);

  // return [x, Math.sin(mapRange(x, 0, width, 0, 3 * Math.PI)) * y];
  // return [y, x ** 2 + y ** 2 * x - 3 * y];
  // return [x - y - x * (x ** 2 + y ** 2), x + y - y * (x ** 2 + y ** 2)];
  // return [x + 2 * y, 3 * x];
  // return [Math.cos(x) * y, Math.sin(x) * y];
  // return [x, (y ** 2 - x ** 2) / (2 * x * y)];
  // return [Math.cos(f), Math.sin(f)];
  // return [Math.sin(y), Math.sin(x)];
  // return [-y, x];
  return [Math.exp(y), y];
  return [x, l];
  return [x / x, y + Math.sin(y)];
  return [y, Math.cos(Math.log(l * Math.min(Math.cos(l))))];
  return [Math.tan(y - x), Math.tan(-x - y)];
}

function distortPyramids(pyramids, convergence, origin, playhead = 0) {
  const c = convergence.position;

  pyramids.forEach((pyramid) => {
    let vertices = [];

    pyramid.geometry.vertices.forEach((vertex, idx) => {
      if (idx === 0) {
        const h = vecField(pyramid.position.x - c.x, pyramid.position.z - c.z);
        const theta = Math.atan2(h[1], h[0]);

        vertex.x = pyramid.geometry.radius * Math.cos(theta);
        vertex.z = pyramid.geometry.radius * Math.sin(theta);
      }

      vertices.push(vertex.x, vertex.y, vertex.z);
    });

    pyramid.geometry.verticesNeedUpdate = true;
    pyramid.children[0].geometry.dispose();
    pyramid.children[0].geometry = new THREE.EdgesGeometry(pyramid.geometry);
  });
}

function makeMesh(geometry) {
  const solidMaterial = new THREE.MeshBasicMaterial({
    color: background,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  const mesh = new THREE.Mesh(geometry, solidMaterial);

  // const wireframeGeometry = new THREE.WireframeGeometry(mesh.geometry);
  const wireframeMaterial = new THREE.MeshBasicMaterial({
    color: '#FFB511',
    wireframe: true,
    wireframeLinewidth: 4,
  });
  // const wireframeMaterial = new THREE.LineBasicMaterial({
  //   color: '#FFB511',
  //   linewidth: 2,
  // });
  const wireframe = new THREE.Mesh(mesh.geometry, wireframeMaterial);
  mesh.add(wireframe);

  return mesh;
}

function makeMesh2(geometry, fill = background, stroke = '#FFB511') {
  const solidMaterial = new THREE.MeshBasicMaterial({
    color: fill,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
    // side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, solidMaterial);

  const wireframeGeometry = new THREE.EdgesGeometry(mesh.geometry);
  const wireframeMaterial = new THREE.LineBasicMaterial({
    color: stroke,
    linewidth: 2,
    side: THREE.DoubleSide,
  });
  const wireframe = new THREE.LineSegments(
    wireframeGeometry,
    wireframeMaterial
  );
  mesh.add(wireframe);

  return mesh;
}
