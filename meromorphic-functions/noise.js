const canvasSketch = require('canvas-sketch');
const { lerp, lerpArray, mapRange } = require('canvas-sketch-util/math');
const Random = require('canvas-sketch-util/random');
const createShader = require('canvas-sketch-util/shader');
const { vert, frag } = require('./shader');
const colors = require('./colors');

const settings = {
  dimensions: [1080, 1080],
  context: 'webgl2',
  animate: true,
  duration: 12,
};

const randomPoint = () => Random.onCircle(1 /* Random.pick([1, 2, 4]) */);
const a0 = randomPoint();
const a1 = randomPoint();
const a2 = randomPoint();
const a3 = randomPoint();

const b0 = randomPoint();
const b1 = randomPoint();
const b2 = randomPoint();
const b3 = randomPoint();

function loopNoise({ x, y, radius = 1, range }, playhead) {
  const v = Random.noise2D(
    x + (radius * Math.cos(Math.PI * 2 * playhead)) / 10,
    y + (radius * Math.sin(Math.PI * 2 * playhead)) / 10,
    1,
    1
  );

  return mapRange(v, -1, 1, range[0], range[1]);
}

function movePoint([x, y], playhead) {
  const r = loopNoise({ x, y, offset: 0, range: [-5, 5] }, playhead);
  const theta = loopNoise(
    { x, y, offset: 1000, range: [0, 2 * Math.PI] },
    playhead
  );

  return [x + r * Math.cos(theta), y + r * Math.sin(theta)];
}

const sketch = ({ gl, width, height }) => {
  return createShader({
    clearColor: '#fff',
    gl,
    vert,
    frag,
    uniforms: {
      u_colorMode: 0,
      u_resolution: [width, height],
      u_col_1: colors[0],
      u_col_2: colors[1],
      u_col_3: colors[2],
      u_col_4: colors[3],

      // Random.noise2D(a0[0], playhead),
      // Random.noise2D(a0[1], playhead),

      u_a0: ({ playhead }) => movePoint(a0, playhead),
      u_a1: ({ playhead }) => movePoint(a1, playhead),
      u_a2: ({ playhead }) => movePoint(a2, playhead),
      u_a3: ({ playhead }) => movePoint(a3, playhead),
      u_b0: ({ playhead }) => movePoint(b0, playhead),
      u_b1: ({ playhead }) => movePoint(b1, playhead),
      u_b2: ({ playhead }) => movePoint(b2, playhead),
      u_b3: ({ playhead }) => movePoint(b3, playhead),

      u_time: ({ playhead }) => playhead,
    },
  });
};

canvasSketch(sketch, settings);
