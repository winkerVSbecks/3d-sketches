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

const sketch = ({ context, width, height }) => {
  const background = '#fff';

  const matCaps = {
    glassyGold:
      'https://makio135.com/matcaps/512/D8C949_F5F19E_6B7855_9A9858-512px.png',
    shinyGreen:
      'https://makio135.com/matcaps/64/8B892C_D4E856_475E2D_47360A-64px.png',
    yellowOrange:
      'https://makio135.com/matcaps/512/C35C04_F9C30C_EE9F04_E08304-512px.png',
    reflection: 'assets/reflection.jpg',
    rimGlow:
      'https://makio135.com/matcaps/512/161B1F_C7E0EC_90A5B3_7B8C9B-512px.png',
    miniRimGlow:
      'https://makio135.com/matcaps/512/070B0C_B2C7CE_728FA3_5B748B-512px.png',
    pearl: 'assets/pearl.jpg',
    plastic: 'assets/plastic.jpg',
    metallicGreenSheen:
      'https://makio135.com/matcaps/512/3F3A2F_91D0A5_7D876A_94977B-512px.png',
    metallicGreen:
      'https://makio135.com/matcaps/512/8B892C_D4E856_475E2D_47360A-512px.png',
    D0CCCB: 'assets/D0CCCB_524D50_928891_727581-512px.png',
    redGlow:
      'https://makio135.com/matcaps/512/660505_F2B090_DD4D37_AA1914-512px.png',
    fireBall: 'assets/FBB43F_FBE993_FB552E_FCDD65-512px.png',
    matte: 'assets/matte.jpg',
    betterPlastic: 'assets/FBB82D_FBEDBF_FBDE7D_FB7E05-512px.png',
    blueRim: 'assets/617586_23304C_1B1E30_4988CF-512px.png',
  };

  const plasticTexture = new THREE.TextureLoader().load(
    matCaps.betterPlastic
    // 'https://makio135.com/matcaps/512/430404_BD9295_7E1E21_94544C-512px.png'
  );

  // Create a renderer
  const renderer = new THREE.WebGLRenderer({
    canvas: context.canvas,
  });

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(background, 1);

  // Setup a camera
  const aspect = width / height;
  const d = 10;
  const camera = new THREE.OrthographicCamera(
    -d * aspect,
    d * aspect,
    d,
    -d,
    -20,
    1000
  );

  // camera.position.set(10, 10, 10);
  camera.position.set(d, d, d);
  // camera.position.set(0, d, 0);
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

      const material = new THREE.MeshMatcapMaterial({
        matcap: plasticTexture,
        // flatShading: true,
        // color: '#FDC22D',
      });

      const pyramid = new THREE.Mesh(geometry, material);

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
  theWholeThing.add(base(sculptureSize, plasticTexture));
  // theWholeThing.add(container(sculptureSize, plasticTexture));

  theWholeThing.position.y = 4;

  // Centre theWholeThing
  const theWholeThingSize = new THREE.Box3().setFromObject(theWholeThing);
  theWholeThingSize.getCenter(theWholeThing.position).multiplyScalar(-1);

  scene.add(theWholeThing);

  convergence.translateX(-sculpture.position.x);
  convergence.translateZ(-sculpture.position.z);
  const origin = convergence.position.clone();

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

function lights(scene) {
  // const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  // const frontLight = new THREE.PointLight(0xffffff, 0.8);
  // const backLight = new THREE.PointLight(0xffffff, 0.8);
  // frontLight.castShadow = true;
  // frontLight.shadow.mapSize.width = 1024 * 2;
  // frontLight.shadow.mapSize.height = 1024 * 2;
  // backLight.castShadow = true;
  // backLight.shadow.mapSize.width = 1024 * 2;
  // backLight.shadow.mapSize.height = 1024 * 2;
  // frontLight.position.set(10, 5, 0);
  // backLight.position.set(-10, 5, -5);
  // scene.add(frontLight);
  // scene.add(backLight);
  // scene.add(ambientLight);

  // const sphereSize = 1;
  // const frontLightHelper = new THREE.PointLightHelper(
  //   frontLight,
  //   sphereSize,
  //   'red'
  // );
  // scene.add(frontLightHelper);
  // const backLightHelper = new THREE.PointLightHelper(
  //   backLight,
  //   sphereSize,
  //   'red'
  // );
  // scene.add(backLightHelper);

  const whiteLight = new THREE.AmbientLight('#736fbd', 1);
  scene.add(whiteLight);

  const pinkLight = new THREE.PointLight('#ff20f0', 12, 30);
  scene.add(pinkLight);

  const yellowLight = new THREE.PointLight('#FB331C', 12, 40);
  yellowLight.position.set(10, 5, 0);
  scene.add(yellowLight);
}

function base(sculptureSize, plasticTexture) {
  const geometry = new THREE.BoxGeometry(
    Math.abs(sculptureSize.max.x - sculptureSize.min.x),
    Math.abs(sculptureSize.max.z - sculptureSize.min.z),
    0.5,
    1,
    1
  );

  const material = new THREE.MeshBasicMaterial({
    color: '#fff',
  });

  const plane = new THREE.Mesh(geometry, material);
  plane.receiveShadow = true;

  plane.rotateX(Math.PI / 2);
  plane.position.x = -sculptureSize.min.x / 2;
  plane.position.z = -sculptureSize.min.z / 2;
  plane.position.y = -0.75;

  return plane;
}

function container(sculptureSize) {
  const size = Math.abs(sculptureSize.max.x - sculptureSize.min.x) * 1.1;
  const geometry = new THREE.BoxGeometry(size, size * 0.75, size, 1, 1);

  const wireframeGeometry = new THREE.EdgesGeometry(geometry);
  const wireframeMaterial = new THREE.LineBasicMaterial({
    color: '#fff',
  });

  const wireframe = new THREE.LineSegments(
    wireframeGeometry,
    wireframeMaterial
  );

  wireframe.position.x = -sculptureSize.min.x / 2;
  wireframe.position.z = -sculptureSize.min.z / 2;
  wireframe.position.y = 4;

  return wireframe;
}
