const Random = require('canvas-sketch-util/random');
const { mapRange } = require('canvas-sketch-util/math');
global.THREE = require('three');
const { MeshLine, MeshLineMaterial } = require('three.meshline');

// Include any additional ThreeJS examples below
require('three/examples/js/controls/OrbitControls');

const canvasSketch = require('canvas-sketch');

const settings = {
  dimensions: [1080, 1080],
  scaleToView: true,
  animate: true,
  duration: 12,
  context: 'webgl',
};

const RED = '#ce1212'; // '#AB2B31';

const sketch = ({ context, width, height }) => {
  const background = RED;

  // Create a renderer
  const renderer = new THREE.WebGLRenderer({
    canvas: context.canvas,
  });

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(background, 1);

  // Setup a camera
  const aspect = width / height;
  const d = 5;
  const camera = new THREE.OrthographicCamera(
    -d * aspect,
    d * aspect,
    d,
    -d,
    -20,
    1000
  );

  camera.position.set(d, d, d);
  camera.lookAt(new THREE.Vector3());

  // Setup camera controller
  const controls = new THREE.OrbitControls(camera, context.canvas);

  // Setup your scene
  const scene = new THREE.Scene();

  // Debug helpers
  // const axesHelper = new THREE.AxesHelper(5);
  // scene.add(axesHelper);

  let xOff = 0;

  const sculpture = new THREE.Group();

  const pyramids = [];

  // 11-36 in 26 steps, 28 for square
  for (let count = 11; count <= 28; count++) {
    const baseSize = 11 / count;

    for (let idx = 0; idx < count; idx++) {
      const geometry = pyramidGeometry({ s: baseSize, h: 1.25 * baseSize });

      const material = new THREE.MeshPhysicalMaterial({
        clearcoat: 1,
        clearcoatRoughness: 0,
        sheen: new THREE.Color('#f1d93c'),
        color: '#FB331C',
      });

      const pyramid = new THREE.Mesh(geometry, material);

      pyramid.castShadow = true;
      pyramid.receiveShadow = true;

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
    new THREE.MeshStandardMaterial({ visible: false })
  );
  convergence.position.y = 1;

  sculpture.add(convergence);

  // Centre the sculpture
  const sculptureSize = new THREE.Box3().setFromObject(sculpture);
  sculptureSize.getCenter(sculpture.position).multiplyScalar(-1);

  sculpture.position.y = -0.8;

  const theWholeThing = new THREE.Group();

  theWholeThing.add(sculpture);

  // Case
  theWholeThing.add(base(sculptureSize));

  theWholeThing.position.y = 4;

  // Centre theWholeThing
  const theWholeThingSize = new THREE.Box3().setFromObject(theWholeThing);
  theWholeThingSize.getCenter(theWholeThing.position).multiplyScalar(-1);

  scene.add(theWholeThing);

  convergence.translateX(-sculpture.position.x);
  convergence.translateZ(-sculpture.position.z);
  const origin = convergence.position.clone();

  lights(scene);

  return {
    resize({ pixelRatio, viewportWidth, viewportHeight }) {
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(viewportWidth, viewportHeight, false);
      camera.aspect = viewportWidth / viewportHeight;
      camera.updateProjectionMatrix();
    },
    render({ playhead }) {
      controls.update();
      distortPyramids(pyramids, convergence, origin, playhead);
      renderer.render(scene, camera);
    },
    unload() {
      controls.dispose();
      renderer.dispose();
    },
  };
};

canvasSketch(sketch, settings);

function pyramidGeometry({ s = 1, h = 2 }) {
  const geometry = new THREE.BufferGeometry();

  const points = [
    [s / 2, h, s / 2],
    [0, 0, 0],
    [s, 0, 0],
    [s, 0, s],
    [0, 0, s],
  ];

  // prettier-ignore
  const vertices = [
    ...points[2],
    ...points[1],
    ...points[0],

    ...points[3],
    ...points[2],
    ...points[0],

    ...points[4],
    ...points[3],
    ...points[0],

    ...points[1],
    ...points[4],
    ...points[0],

    ...points[1],
    ...points[2],
    ...points[3],

    ...points[1],
    ...points[3],
    ...points[4],
  ];

  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array(vertices), 3)
  );

  const col = () =>
    new THREE.Color(
      Random.pick(['#0A1918', '#FDC22D', '#F992E2', '#FB331C', '#3624F4'])
    ).toArray();

  const colors = [];

  for (let index = 0; index < vertices.length; index += 3) {
    colors.push(...col());
  }

  geometry.setAttribute(
    'color',
    new THREE.BufferAttribute(new Float32Array(colors), 3, true)
  );

  geometry.computeVertexNormals();

  geometry.radius = (s * 2 ** 0.5) / 2;

  return geometry;
}

function vecField(x, y, playhead) {
  // return [Math.sin(y - x), Math.sin(-x - y)];
  // const t = mapRange(
  //   Math.sin(Math.PI * playhead),
  //   0,
  //   1,
  //   Math.PI / 16,
  //   Math.PI / 4
  // );
  // return [Math.sin((y - x) * t), Math.sin((-x - y) * t)];
  return [
    Math.sin(((y - x) * Math.PI) / 4),
    Math.cos(((-x - y) * Math.PI) / 4),
  ];
  // return [y - x, -x - y];
}

function distortPyramids(pyramids, convergence, origin, playhead = 0) {
  const c = convergence.position;
  const t = Math.sin(playhead * 2 * Math.PI);

  const xOff = Random.noise2D(c.x / 100, t, 0.1, 2 * Math.PI);
  const zOff = Random.noise2D(c.z / 100, t + 0.5, 0.1, 2 * Math.PI);

  c.x = origin.x + 5 * Math.cos(xOff);
  c.z = origin.z + 5 * Math.sin(zOff);

  pyramids.forEach((pyramid) => {
    distortPyramid(pyramid, c, playhead);
  });
}

function distortPyramid(pyramid, c, playhead) {
  const positions = pyramid.geometry.attributes.position.array;

  const h = vecField(
    pyramid.position.x - c.x,
    pyramid.position.z - c.z,
    playhead
  );
  const theta = Math.atan2(h[1], h[0]);

  for (let i = 0, l = positions.length; i < l; i += 3) {
    if (positions[i + 1] > 0) {
      positions[i] = pyramid.geometry.radius * Math.cos(theta);
      positions[i + 2] = pyramid.geometry.radius * Math.sin(theta);
    }
  }

  pyramid.geometry.attributes.position.needsUpdate = true;
}

function base(sculptureSize) {
  const geometry = new THREE.BoxGeometry(
    Math.abs(sculptureSize.max.x - sculptureSize.min.x),
    Math.abs(sculptureSize.max.z - sculptureSize.min.z),
    0.5,
    1,
    1
  );

  const material = new THREE.MeshBasicMaterial({
    color: RED,
  });

  const plane = new THREE.Mesh(geometry, material);
  plane.receiveShadow = true;

  plane.rotateX(Math.PI / 2);
  plane.position.x = -sculptureSize.min.x / 2;
  plane.position.z = -sculptureSize.min.z / 2;
  plane.position.y = -0.75;

  return plane;
}

function lights(scene) {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  const frontLight = new THREE.PointLight(0xffffff, 0.8);
  const backLight = new THREE.PointLight(0xffffff, 0.8);
  frontLight.castShadow = true;
  frontLight.shadow.mapSize.width = 1024 * 2;
  frontLight.shadow.mapSize.height = 1024 * 2;
  backLight.castShadow = true;
  backLight.shadow.mapSize.width = 1024 * 2;
  backLight.shadow.mapSize.height = 1024 * 2;
  frontLight.position.set(10, 5, 0);
  backLight.position.set(-10, 5, -5);
  scene.add(frontLight);
  scene.add(backLight);
  scene.add(ambientLight);
}
