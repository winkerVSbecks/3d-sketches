global.THREE = require('three');
require('three/examples/js/controls/OrbitControls');

const Random = require('canvas-sketch-util/random');
const { mapRange } = require('canvas-sketch-util/math');
const canvasSketch = require('canvas-sketch');

const DEBUG = false;

const settings = {
  scaleToView: true,
  dimensions: [1080, 1080],
  context: 'webgl',
  animate: true,
  duration: 6,
  fps: 50,
};

const SIZE = 4;

const sketch = async ({ width, height, context }) => {
  // Setup text rendering
  const textManager = await canvasSketch(textSketch, {
    dimensions: [1024, 256],
    hotkeys: false,
    parent: false,
  });

  const otherCanvas = textManager.props.canvas;

  const map = new THREE.Texture(otherCanvas);
  textManager.update();
  map.needsUpdate = true;

  const renderer = new THREE.WebGLRenderer({
    canvas: context.canvas,
  });

  const background = '#000';
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

  camera.position.set(10, 10, 10);
  camera.lookAt(new THREE.Vector3());

  const controls = new THREE.OrbitControls(camera, context.canvas);

  const scene = new THREE.Scene();

  // const axesHelper = new THREE.AxesHelper(5);
  // scene.add(axesHelper);

  const cubes = [];

  const rows = [
    [1, -3],
    [0, -2],
    [-1, -1],
    [0, 0],
    [1, 1],
    [0, 2],
    [-1, 3],
  ];

  const cubeColors = cubeColourField(rows.length);

  rows.forEach((rowPosition, rowIdx) => {
    row(...rowPosition).forEach((position, idx) => {
      const _cube = cube(position, cubeColors[rows.length - 1 - rowIdx][idx]);

      const angle = Math.atan2(position[2], position[0]);
      const r = Math.hypot(position[2], position[0]);
      const delay = mapRange(r, 0, 17, 0, Math.PI);

      cubes.push({
        cube: _cube,
        origPosition: position,
        loc: [rowIdx, idx],
        delay,
        angle,
        r,
      });

      scene.add(_cube);
    });
  });

  scene.add(plane(camera, [5, 20], [-8.1, 0, 0]));
  scene.add(plane(camera, [5, 20], [8.1, 0, 0]));
  scene.add(
    plane(
      camera,
      [12, 3],
      [0, -8.5, 0],
      new THREE.MeshBasicMaterial({
        map,
      })
    )
  );
  // scene.add(plane(camera, [12, 5], [0, 9, -28.5]));
  scene.add(plane(camera, [6, 2.5], [0, 9.6, -30.4]));

  scene.add(plane(camera, [6, 2.5], [-6, 9.6, -25]));
  scene.add(plane(camera, [6, 2.5], [6, 9.6, -25]));

  const whiteLight = new THREE.AmbientLight('#736fbd', 1);
  scene.add(whiteLight);
  const pinkLight = new THREE.PointLight('#ff20f0', 3, 30);
  scene.add(pinkLight);
  const yellowLight = new THREE.PointLight('#e4be00', 3, 40);
  scene.add(yellowLight);

  if (DEBUG) {
    scene.add(new THREE.PointLightHelper(pinkLight, 1));
    scene.add(new THREE.PointLightHelper(yellowLight, 1));
  }

  return {
    resize({ pixelRatio, viewportWidth, viewportHeight }) {
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(viewportWidth, viewportHeight, false);
      camera.aspect = viewportWidth / viewportHeight;
      camera.updateProjectionMatrix();
    },
    render({ playhead }) {
      controls.update();
      renderer.render(scene, camera);

      const t = playhead * Math.PI;

      // Animate lights
      moveLights(yellowLight, pinkLight, t, 'CIRCLE', playhead);
      // Animate cubes
      // noise(cubes, t);
      breathe(cubes, t);
      // wave(cubes, t);
      // shift(cubes, t);
    },
    unload() {
      controls.dispose();
      renderer.dispose();
    },
  };
};

canvasSketch(sketch, settings);

/**
 * Animations
 */
function noise(cubes, t) {
  cubes.forEach((c) => {
    const y = Random.noise4D(
      c.origPosition[0],
      c.origPosition[2],
      c.delay,
      Math.cos(t * 2) + Math.sin(t * 2)
    );
    c.cube.scale.set(1, 1 + 0.25 * y, 1);
  });
}

function shift(cubes, t) {
  cubes.forEach((c) => {
    c.cube.position.set(
      c.origPosition[0],
      c.origPosition[1] + 0.25 * Math.sin(c.delay + _t),
      c.origPosition[2]
    );
  });
}

function breathe(cubes, t) {
  cubes.forEach((c) => {
    c.cube.scale.set(
      1 - 0.02 * Math.sin(t * 2),
      1 - 0.02 * Math.sin(t),
      1 - 0.02 * Math.sin(t * 2)
    );
  });
}

function wave(cubes, t) {
  cubes.forEach((c) => {
    c.cube.scale.set(1, 1 - 0.5 * Math.sin(c.delay + t * 2), 1);
  });
}

function moveLights(yellowLight, pinkLight, t, mode, playhead) {
  if (mode === 'HOVER') {
    pinkLight.position.set(10, 10 + 5 * Math.sin(t * 2), -5);
    yellowLight.position.set(-12, 15 + 5 * Math.sin(t * 2), 2);
  } else {
    const angle1 = (Math.sin(Math.PI * playhead) * Math.PI) / 2;
    const angle2 = mapRange(
      Math.sin(Math.PI * playhead),
      0,
      1,
      0.75 * Math.PI,
      0
    );

    pinkLight.position.set(
      -5 + 8 * Math.cos(angle2),
      15,
      -5 + 8 * Math.sin(angle2)
    );
    yellowLight.position.set(
      -1 + 16 * Math.cos(angle1),
      15,
      -5 + 16 * Math.sin(angle1)
    );
  }
}

/**
 * Geometries
 */
function createBoxWithRoundedEdges(width, height, depth, radius0, smoothness) {
  let shape = new THREE.Shape();
  let eps = 0.00001;
  let radius = radius0 - eps;
  shape.absarc(eps, eps, eps, -Math.PI / 2, -Math.PI, true);
  shape.absarc(eps, height - radius * 2, eps, Math.PI, Math.PI / 2, true);
  shape.absarc(
    width - radius * 2,
    height - radius * 2,
    eps,
    Math.PI / 2,
    0,
    true
  );
  shape.absarc(width - radius * 2, eps, eps, 0, -Math.PI / 2, true);
  let geometry = new THREE.ExtrudeBufferGeometry(shape, {
    depth: depth - radius0 * 2,
    bevelEnabled: true,
    bevelSegments: smoothness * 2,
    steps: 1,
    bevelSize: radius,
    bevelThickness: radius0,
    curveSegments: smoothness,
  });

  geometry.center();

  return geometry;
}

function plane(
  camera,
  [width, height],
  [offsetX, offsetY, offsetZ],
  _material
) {
  const geometry = new THREE.PlaneGeometry(width, height, 1);
  const material =
    _material ||
    new THREE.MeshBasicMaterial({
      color: DEBUG ? 0xffff00 : 0xffffff,
      side: THREE.DoubleSide,
    });
  const plane = new THREE.Mesh(geometry, material);

  plane.position.copy(camera.position);
  plane.rotation.copy(camera.rotation);
  plane.updateMatrix();
  plane.translateX(offsetX);
  plane.translateY(offsetY);
  plane.translateZ(offsetZ);

  return plane;
}

const textSketch = () => {
  return ({ context, width, height }) => {
    const text = 'चमकीले पत्थर';

    // Clear canvas
    context.clearRect(0, 0, width, height);

    // Draw background
    context.fillStyle = 'white';
    context.fillRect(0, 0, width, height);

    // Draw text
    const fontSize = 60;
    context.fillStyle = 'black';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = `${fontSize}px sans-serif`;
    context.fillText(text || '', width * 0.5, height * 0.35);
  };
};

/**
 * Cube Stuff
 */
function row(x, y) {
  const yPos =
    y === 0
      ? 0
      : Math.sign(y) * ((Math.abs(y) - 1) * SIZE + (Math.abs(y) * SIZE) / 4);
  const xPos = x * SIZE;

  return [
    [xPos + yPos - SIZE * 1.5, 0, yPos + SIZE * 1.5],
    [xPos + yPos - SIZE * 0.5, 0, yPos + SIZE * 0.5],
    [xPos + yPos + SIZE * 0.5, 0, yPos - SIZE * 0.5],
    [xPos + yPos + SIZE * 1.5, 0, yPos - SIZE * 1.5],
  ];
}

function cube(position, color) {
  const bevel = SIZE * 0.04;
  const width = SIZE;
  const height = SIZE * 0.25;
  const depth = SIZE;

  const geometry = createBoxWithRoundedEdges(width, height, depth, bevel, 12);

  const material = new THREE.MeshPhysicalMaterial({
    clearcoat: 1,
    clearcoatRoughness: 0.1,
    sheen: new THREE.Color('#736fbd'),
    color,
  });

  const cube = new THREE.Mesh(geometry, material);
  cube.position.set(...position);
  return cube;
}

function cubeColourField(rowCount, colCount = 4) {
  const colors = [];

  const col = () =>
    Random.pick(['#0A1918', '#FDC22D', '#F992E2', '#FB331C', '#3624F4']);

  for (let rowIdx = 0; rowIdx < rowCount; rowIdx++) {
    colors[rowIdx] = [];
    for (let colIdx = 0; colIdx < colCount; colIdx++) {
      if (rowIdx === 0) {
        colors[rowIdx].push(col());
      } else {
        const neighbourColors = [
          colors[rowIdx][colIdx - 1],
          colors[rowIdx - 1][colIdx - 1],
          colors[rowIdx - 1][colIdx],
          colors[rowIdx - 1][colIdx + 1],
        ];
        colors[rowIdx].push(pickColor(neighbourColors));
      }
    }
  }
  return colors;
}

function pickColor(neighbourColors) {
  const col = () =>
    Random.pick([
      '#0A1918',
      '#FDC22D',
      '#F992E2',
      '#FB331C',
      '#3624F4',
      '#E7EEF6',
    ]);
  const c = col();
  return neighbourColors.includes(c) ? pickColor(neighbourColors) : c;
}
