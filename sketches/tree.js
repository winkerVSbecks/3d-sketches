/**
 * Inspired by
 * https://www.artsy.net/artwork/matt-shlian-unholy-153-now-we-put-the-river-to-sleep-number-3
 */
const Random = require('canvas-sketch-util/random');
const { lerp } = require('canvas-sketch-util/math');
const clrs = require('../clrs')();
global.THREE = require('three124');

// Include any additional ThreeJS examples below
require('three124/examples/js/controls/OrbitControls');

const canvasSketch = require('canvas-sketch');

const settings = {
  dimensions: [1600, 1200],
  scaleToView: true,
  animate: true,
  duration: 6,
  context: 'webgl',
};

const sketch = ({ context, width, height }) => {
  const background = clrs.bg;
  const foreground = clrs.ink();

  // Create a renderer
  const renderer = new THREE.WebGLRenderer({
    canvas: context.canvas,
  });

  // WebGL background color
  renderer.setClearColor(background, 1);

  // Setup a camera
  const camera = new THREE.PerspectiveCamera(50, width / height, 0.01, 200);
  camera.position.set(8, 8, 8);
  camera.lookAt(new THREE.Vector3());

  // Setup camera controller
  const controls = new THREE.OrbitControls(camera, context.canvas);

  // Setup your scene
  const scene = new THREE.Scene();

  const treeGroup = new THREE.Group();

  /**
   * Tree
   */
  const tree = generateTree();

  const [trunkGroup, trunkGeometry, trunkEdgesGeometry] = trunk(
    tree.trunk,
    background,
    foreground
  );
  treeGroup.add(trunkGroup);

  const branchEdgesGeometries = [];

  const branchGeometries = tree.branches.map((b) => {
    const [bGroup, branchGeometry, branchEdgesGeometry] = branch(
      b,
      background,
      foreground
    );
    treeGroup.add(bGroup);

    branchEdgesGeometries.push(branchEdgesGeometry);
    return branchGeometry;
  });

  treeGroup.position.y = -2;
  scene.add(treeGroup);

  /**
   * Targets
   */
  const trees = [];
  for (let index = 0; index <= 12; index++) {
    trees.push(generateTree());
  }

  const targets = trees.map((tree) => {
    const _branchGeometries = tree.branches.map(
      (b) => new THREE.PlaneGeometry(b.size, b.size, 32)
    );

    const _branchEdgesGeometries = _branchGeometries.map(
      (g) => new THREE.EdgesGeometry(g)
    );

    const _trunkGeometry = new THREE.BoxGeometry(
      tree.trunk.width,
      tree.trunk.height,
      tree.trunk.width,
      1,
      1
    );

    const _trunkEdgesGeometry = new THREE.EdgesGeometry(_trunkGeometry);

    return {
      branchGeometries: _branchGeometries,
      branchEdgesGeometries: _branchEdgesGeometries,
      trunkGeometry: _trunkGeometry,
      trunkEdgesGeometry: _trunkEdgesGeometry,
    };
  });

  return {
    resize({ pixelRatio, viewportWidth, viewportHeight }) {
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(viewportWidth, viewportHeight, false);
      camera.aspect = viewportWidth / viewportHeight;
      camera.updateProjectionMatrix();
    },
    render({ deltaTime, playhead }) {
      const targetIndex = Math.floor(playhead * targets.length);
      const target = targets[targetIndex];

      controls.update();
      treeGroup.rotation.y = Math.PI * 2 * playhead;
      // treeGroup.rotation.x = -Math.PI * 2 * playhead;
      // treeGroup.rotation.z = Math.PI * 2 * playhead;
      morphTree(
        {
          trunkGeometry,
          trunkEdgesGeometry,
          branchGeometries,
          branchEdgesGeometries,
        },
        target,
        deltaTime
      );
      renderer.render(scene, camera);
    },
    unload() {
      controls.dispose();
      renderer.dispose();
    },
  };
};

canvasSketch(sketch, settings);

function morphTree(tree, target, deltaTime) {
  const rate = 4 * deltaTime;

  morphVertex(tree.trunkGeometry, target.trunkGeometry, rate);
  morphEdgeGeometry(tree.trunkEdgesGeometry, target.trunkEdgesGeometry, rate);

  tree.branchGeometries.forEach((branchGeometry, idx) => {
    morphVertex(branchGeometry, target.branchGeometries[idx], rate);

    morphEdgeGeometry(
      tree.branchEdgesGeometries[idx],
      target.branchEdgesGeometries[idx],
      rate
    );
  });
}

function morphEdgeGeometry(geometry, target, rate) {
  const positions = geometry.attributes.position.array;
  const targetPositions = target.attributes.position.array;

  positions.forEach((_, idx) => {
    positions[idx] = lerp(positions[idx], targetPositions[idx], rate);
  });

  geometry.attributes.position.needsUpdate = true;
}

function morphVertex(geometry, targetGeometry, rate) {
  geometry.vertices.forEach((vertex, idx) => {
    vertex.x = lerp(vertex.x, targetGeometry.vertices[idx].x, rate);
    vertex.y = lerp(vertex.y, targetGeometry.vertices[idx].y, rate);
    vertex.z = lerp(vertex.z, targetGeometry.vertices[idx].z, rate);
  });

  geometry.verticesNeedUpdate = true;
}

function generateTree() {
  const trunk = {
    width: Random.range(0.5, 2),
    height: Random.rangeFloor(2, 6),
  };
  const branches = [];

  const yDelta = Random.range(0.5, 1);
  const sizeDelta = Random.range(0.25, 0.75);

  for (let index = 0; index <= 7; index++) {
    const size = Math.max(0.25, 4 - sizeDelta * index);
    const y = 0.5 + yDelta * index;
    branches.push({ size, y });
  }

  return { trunk, branches };
}

function branch({ size, y }, fill, stroke) {
  const group = new THREE.Group();

  const material = new THREE.MeshBasicMaterial({
    color: fill,
    side: THREE.DoubleSide,
  });
  const branchGeometry = new THREE.PlaneGeometry(size, size, 32);

  const plane = new THREE.Mesh(branchGeometry, material);
  group.add(plane);

  const branchEdgesGeometry = new THREE.EdgesGeometry(branchGeometry);
  const line = new THREE.LineSegments(
    branchEdgesGeometry,
    new THREE.LineBasicMaterial({ color: stroke, lineWidth: 4 })
  );
  group.add(line);

  group.rotateX(Math.PI / 2);
  group.position.y = y;

  return [group, branchGeometry, branchEdgesGeometry];
}

function trunk({ width, height }, fill, stroke) {
  const group = new THREE.Group();

  const trunkGeometry = new THREE.BoxGeometry(width, height, width, 1, 1);

  const material = new THREE.MeshBasicMaterial({
    color: fill,
    side: THREE.DoubleSide,
  });
  const trunk = new THREE.Mesh(trunkGeometry, material);
  group.add(trunk);

  const trunkEdgesGeometry = new THREE.EdgesGeometry(trunkGeometry);
  const line = new THREE.LineSegments(
    trunkEdgesGeometry,
    new THREE.LineBasicMaterial({ color: stroke, lineWidth: 4 })
  );
  group.add(line);

  group.position.y = -height / 2;

  return [group, trunkGeometry, trunkEdgesGeometry];
}
