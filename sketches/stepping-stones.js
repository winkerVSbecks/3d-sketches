global.THREE = require('three');
require('three/examples/js/controls/OrbitControls');

const Random = require('canvas-sketch-util/random');
const canvasSketch = require('canvas-sketch');
const glslify = require('glslify');

const settings = {
  scaleToView: true,
  dimensions: [1080, 1080],
  context: 'webgl',
  animate: true,
  duration: 4,
  fps: 50,
};

const SIZE = 4;

const sketch = ({ width, height, context }) => {
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

  const cubeColors = cubeColourField();

  row(1, -3).forEach((position, idx) => {
    scene.add(cube(position, cubeColors[6][idx]));
  });

  row(0, -2).forEach((position, idx) => {
    scene.add(cube(position, cubeColors[5][idx]));
  });

  row(-1, -1).forEach((position, idx) => {
    scene.add(cube(position, cubeColors[4][idx]));
  });

  row(0, 0).forEach((position, idx) => {
    scene.add(cube(position, cubeColors[3][idx]));
  });

  row(1, 1).forEach((position, idx) => {
    scene.add(cube(position, cubeColors[2][idx]));
  });

  row(0, 2).forEach((position, idx) => {
    scene.add(cube(position, cubeColors[1][idx]));
  });

  row(-1, 3).forEach((position, idx) => {
    scene.add(cube(position, cubeColors[0][idx]));
  });

  scene.add(plane(camera, [5, 20], [-8.1, 0, 0]));
  scene.add(plane(camera, [5, 20], [8.1, 0, 0]));
  scene.add(plane(camera, [12, 5], [0, -9.45, 0]));
  scene.add(plane(camera, [12, 5], [0, 11, -28.5]));
  // scene.add(plane(camera, [12, 5], [0, 11, -30]));

  const light1 = new THREE.AmbientLight('#E7EEF6', 1);
  scene.add(light1);
  const light2 = new THREE.PointLight('#ff20f0', 3, 30);
  light2.position.set(10, 10, -5);
  scene.add(light2);
  const light3 = new THREE.PointLight('#e4be00', 3, 40);
  light3.position.set(-1, 15, -5);
  scene.add(light3);

  scene.add(new THREE.PointLightHelper(light2, 1));
  scene.add(new THREE.PointLightHelper(light3, 1));

  return {
    resize({ pixelRatio, viewportWidth, viewportHeight }) {
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(viewportWidth, viewportHeight, false);
      camera.aspect = viewportWidth / viewportHeight;
      camera.updateProjectionMatrix();
    },
    render({ playhead, duration, deltaTime }) {
      controls.update();
      renderer.render(scene, camera);
    },
    unload() {
      controls.dispose();
      renderer.dispose();
    },
  };
};

canvasSketch(sketch, settings);

function plane(camera, [width, height], [offsetX, offsetY, offsetZ]) {
  const geometry = new THREE.PlaneGeometry(width, height, 1);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    // color: 0xffff00,
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

function row(x, y) {
  const yPos =
    y === 0
      ? 0
      : Math.sign(y) * ((Math.abs(y) - 1) * SIZE + (Math.abs(y) * SIZE) / 4);
  const xPos = x * SIZE;

  // -SIZE + (2 * -SIZE) / 4;
  // -SIZE * ((y-1) + (y * 1) / 4);

  return [
    [xPos + yPos - SIZE * 1.5, 0, yPos + SIZE * 1.5],
    [xPos + yPos - SIZE * 0.5, 0, yPos + SIZE * 0.5],
    [xPos + yPos + SIZE * 0.5, 0, yPos - SIZE * 0.5],
    [xPos + yPos + SIZE * 1.5, 0, yPos - SIZE * 1.5],
  ];
}

// const colors = [
//   // '#0A1918',
//   '#FDC22D',
//   '#F992E2',
//   // '#E7EEF6',
//   '#FB331C',
//   '#3624F4',
// ].map((c) => new THREE.Color(c).toArray());

const colors = ['#DEB4D8', '#DF8488', '#DA3F3D', '#DAAA97'].map((c) =>
  new THREE.Color(c).toArray()
);

const white = new THREE.Color('#E7EEF6').toArray();

function cube(position, color) {
  // const geometry = new THREE.BoxGeometry(SIZE, SIZE * 0.25, SIZE);
  // const colorsAttr = geometry.attributes.normal.clone();
  // geometry.setAttribute('color', colorsAttr);

  // const bevel = SIZE * 0.04;
  // const length = SIZE - 4 * bevel;
  // const width = SIZE * 0.25 - 4 * bevel;

  // const shape = new THREE.Shape();
  // shape.moveTo(0, 0);
  // shape.lineTo(0, width);
  // shape.lineTo(length, width);
  // shape.lineTo(length, 0);
  // shape.lineTo(0, 0);

  // const extrudeSettings = {
  //   steps: 1,
  //   depth: SIZE,
  //   bevelEnabled: true,
  //   bevelThickness: bevel,
  //   bevelSize: bevel,
  //   bevelOffset: 1 * bevel,
  //   bevelSegments: 5,
  // };

  // const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

  const bevel = SIZE * 0.04;
  const width = SIZE;
  const height = SIZE * 0.25;
  const depth = SIZE;

  const geometry = createBoxWithRoundedEdges(width, height, depth, bevel, 4);

  const colorsAttr = cubeColours(geometry);

  geometry.setAttribute(
    'color',
    new THREE.BufferAttribute(new Float32Array(colorsAttr), 3)
  );

  // const material = new THREE.MeshBasicMaterial({
  //   vertexColors: THREE.VertexColors,
  // });
  const material = new THREE.MeshPhysicalMaterial({
    clearcoat: 1,
    clearcoatRoughness: 0,
    sheen: new THREE.Color('#736fbd'),
    color,
    // color: Random.pick(['hotpink', '#e4be00', '#736fbd']),
    // color: Random.pick([
    //   '#0A1918',
    //   '#FDC22D',
    //   '#F992E2',
    //   // '#E7EEF6',
    //   '#FB331C',
    //   '#3624F4',
    // ]),
  });

  const cube = new THREE.Mesh(geometry, material);
  cube.position.set(...position);
  return cube;
}

const MODE = 'POSITIONS';

function cubeColours(geometry) {
  const colorsAttr = [];
  const clrByPosition = {};

  if (MODE === 'NORMALS') {
    const normals = geometry.attributes.normal.array;

    for (let index = 0; index < normals.length; index += 3) {
      if (normals[index + 1] === -0.5) {
        colorsAttr.push(...white);
      } else {
        const p = `${normals[index]} ${normals[index + 1]} ${
          normals[index + 2]
        }`;
        const c = Random.pick(colors);
        clrByPosition[p] = clrByPosition[p] || c;

        colorsAttr.push(...clrByPosition[p]);
      }
    }
  } else {
    const positions = geometry.attributes.position.array;

    for (let index = 0; index < positions.length; index += 3) {
      if (positions[index + 1] === -0.5) {
        colorsAttr.push(...white);
      } else {
        const p = `${positions[index + 1]} ${positions[index]}`;
        const c = Random.pick(colors);
        clrByPosition[p] = clrByPosition[p] || c;

        colorsAttr.push(...clrByPosition[p]);
      }
    }
  }

  return colorsAttr;
}

function cubeColourField() {
  const rowCount = 7;
  const colCount = 4;
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
    Random.pick(['#0A1918', '#FDC22D', '#F992E2', '#FB331C', '#3624F4']);
  const c = col();
  return neighbourColors.includes(c) ? pickColor(neighbourColors) : c;
}

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
    amount: depth - radius0 * 2,
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
