/**
 * Inspired by
 * https://www.artsy.net/artwork/matt-shlian-unholy-153-now-we-put-the-river-to-sleep-number-3
 */
const Random = require('canvas-sketch-util/random');
const { MeshLine, MeshLineMaterial } = require('three.meshline');
const clrs = require('../clrs')();
global.THREE = require('three');

// Include any additional ThreeJS examples below
require('three/examples/js/controls/OrbitControls');
require('three/examples/js/shaders/SubsurfaceScatteringShader');

const canvasSketch = require('canvas-sketch');

const settings = {
  dimensions: [1080, 1080],
  scaleToView: true,
  animate: true,
  duration: 12,
  context: 'webgl',
};

const sketch = ({ context, width, height }) => {
  // const background = clrs.bg;
  const background = '#fff';
  const foreground = clrs.ink();

  const matCaps = {
    glassyGold:
      'https://makio135.com/matcaps/512/D8C949_F5F19E_6B7855_9A9858-512px.png',
    shinyGreen:
      'https://makio135.com/matcaps/64/8B892C_D4E856_475E2D_47360A-64px.png',
    yellowOrange:
      'https://makio135.com/matcaps/512/C35C04_F9C30C_EE9F04_E08304-512px.png',
    reflection: 'assets/reflection.jpg',
  };

  const plasticTexture = new THREE.TextureLoader().load(
    // 'assets/D0CCCB_524D50_928891_727581-512px.png'
    // 'assets/B6B8B1_994A24_315C81_927963-512px.png'
    // 'assets/5E5855_C6C4CD_C89B67_8F8E98.png'
    // 'assets/pearl.jpg'
    // 'https://makio135.com/matcaps/64/8B892C_D4E856_475E2D_47360A-64px.png'
    // 'https://makio135.com/matcaps/512/C35C04_F9C30C_EE9F04_E08304-512px.png'
    matCaps.glassyGold
  );

  const shader = THREE.SubsurfaceScatteringShader;
  const uniforms = THREE.UniformsUtils.clone(shader.uniforms);

  const loader = new THREE.TextureLoader();
  const imgTexture = loader.load('assets/white.jpg');
  const thicknessTexture = loader.load('assets/bunny_thickness.jpg');

  uniforms['map'].value = imgTexture;

  uniforms['diffuse'].value = new THREE.Vector3(1.0, 0.2, 0.2);
  uniforms['shininess'].value = 500;

  uniforms['thicknessMap'].value = thicknessTexture;
  uniforms['thicknessColor'].value = new THREE.Vector3(0.5, 0.3, 0.0);
  uniforms['thicknessDistortion'].value = 0.1;
  uniforms['thicknessAmbient'].value = 0.4;
  uniforms['thicknessAttenuation'].value = 0.8;
  uniforms['thicknessPower'].value = 2.0;
  uniforms['thicknessScale'].value = 16.0;

  // Create a renderer
  const renderer = new THREE.WebGLRenderer({
    canvas: context.canvas,
  });

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(background, 1);

  // Setup a camera
  const aspect = width / height;
  const d = 5.25;
  const camera = new THREE.OrthographicCamera(
    -d * aspect,
    d * aspect,
    d,
    -d,
    -20,
    1000
  );

  // camera.position.set(10, 10, 10);
  camera.position.set(0, d, 0);
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
  const pyramidColor = foreground;

  // 11-36 in 26 steps, 28 for square
  for (let count = 11; count <= 28; count++) {
    const baseSize = 11 / count;

    for (let idx = 0; idx < count; idx++) {
      const geometry = pyramidGeometry({ s: baseSize, h: 2 * baseSize });

      // const material = new THREE.MeshMatcapMaterial({
      //   matcap: plasticTexture,
      //   flatShading: true,
      // });

      const material = new THREE.MeshPhysicalMaterial({
        clearcoat: 1,
        clearcoatRoughness: 0,
        sheen: new THREE.Color('#736fbd'),
        color: '#FDC22D',
      });

      // const material = new THREE.ShaderMaterial({
      //   uniforms: uniforms,
      //   vertexShader: shader.vertexShader,
      //   fragmentShader: shader.fragmentShader,
      //   lights: true,
      // });
      // material.extensions.derivatives = true;

      // const material = new THREE.MeshBasicMaterial({
      //   // color: pyramidColor,
      //   side: THREE.DoubleSide,
      //   vertexColors: true,
      // });
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

  scene.add(sculpture);

  // sculpture.position.y = -0.4;
  sculpture.position.y = -0.9;

  // Base
  const planeGeometry = new THREE.BoxGeometry(
    Math.abs(sculptureSize.max.x - sculptureSize.min.x),
    Math.abs(sculptureSize.max.z - sculptureSize.min.z),
    0.5,
    1,
    1
  );
  // const plane = makeMeshWithEdge(planeGeometry, foreground, background);
  // const planeMaterial = new THREE.MeshMatcapMaterial({
  //   // matcap: porcelainTexture,
  //   matcap: plasticTexture,
  //   // color: pyramidColor,
  // });
  const planeMaterial = new THREE.MeshPhysicalMaterial({
    clearcoat: 1,
    clearcoatRoughness: 0,
    sheen: new THREE.Color('#736fbd'),
    color: '#FDC22D',
  });
  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.receiveShadow = true;

  plane.rotateX(Math.PI / 2);
  plane.position.x = -sculptureSize.min.x / 2;
  plane.position.z = -sculptureSize.min.z / 2;
  plane.position.y = -0.75;
  scene.add(plane);

  convergence.translateX(-sculpture.position.x);
  convergence.translateZ(-sculpture.position.z);
  const origin = convergence.position.clone();

  // Lights
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

function vecField(x, y) {
  return [Math.sin(y - x), Math.sin(-x - y)];
  // return [
  //   Math.sin(((y - x) * Math.PI) / 4),
  //   Math.cos(((-x - y) * Math.PI) / 4),
  // ];
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
    distortPyramid(pyramid, c);
  });
}

function distortPyramid(pyramid, c) {
  const positions = pyramid.geometry.attributes.position.array;

  const h = vecField(pyramid.position.x - c.x, pyramid.position.z - c.z);
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
  pinkLight.castShadow = true;
  pinkLight.shadow.mapSize.width = 1024 * 2;
  pinkLight.shadow.mapSize.height = 1024 * 2;
  pinkLight.position.set(-5, 5, 5);
  scene.add(pinkLight);

  const yellowLight = new THREE.PointLight('#FB331C', 12, 40);
  yellowLight.castShadow = true;
  yellowLight.shadow.mapSize.width = 1024 * 2;
  yellowLight.shadow.mapSize.height = 1024 * 2;
  yellowLight.position.set(10, 5, 0);
  scene.add(yellowLight);

  // const yellowLightHelper = new THREE.PointLightHelper(yellowLight, 1);
  // scene.add(yellowLightHelper);
  // const pinkLightHelper = new THREE.PointLightHelper(pinkLight, 1);
  // scene.add(pinkLightHelper);
}
