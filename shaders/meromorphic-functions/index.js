const canvasSketch = require('canvas-sketch');
const { lerp, lerpArray } = require('canvas-sketch-util/math');
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

const sketch = ({ gl, width, height }) => {
  const animatePoint = (pt, playhead) =>
    lerpArray(pt[0], pt[1], Math.sin(playhead * Math.PI));

  const [a0, a1, a2, a3, b0, b1, b2, b3] = flippedRandomOnCircle(); // randomOnCircle();

  return createShader({
    clearColor: '#fff',
    gl,
    vert,
    frag,
    uniforms: {
      u_resolution: [width, height],
      u_col_1: colors[0],
      u_col_2: colors[1],
      u_col_3: colors[2],
      u_col_4: colors[3],

      u_a0: ({ playhead }) => animatePoint(a0, playhead),
      u_a1: ({ playhead }) => animatePoint(a1, playhead),
      u_a2: ({ playhead }) => animatePoint(a2, playhead),
      u_a3: ({ playhead }) => animatePoint(a3, playhead),
      u_b0: ({ playhead }) => animatePoint(b0, playhead),
      u_b1: ({ playhead }) => animatePoint(b1, playhead),
      u_b2: ({ playhead }) => animatePoint(b2, playhead),
      u_b3: ({ playhead }) => animatePoint(b3, playhead),

      u_time: ({ playhead }) => playhead,
    },
  });
};

canvasSketch(sketch, settings);

function flippedRandomOnCircle() {
  const randomPoint = () => Random.onCircle(1);

  const a0 = [randomPoint(), randomPoint()];
  const a1 = [randomPoint(), randomPoint()];
  const a2 = [randomPoint(), randomPoint()];
  const a3 = [randomPoint(), randomPoint()];

  const b0 = [a0[1], a0[0]];
  const b1 = [a1[1], a1[0]];
  const b2 = [a2[1], a2[0]];
  const b3 = [a3[1], a3[0]];

  return [a0, a1, a2, a3, b0, b1, b2, b3];
}

function randomOnCircle() {
  const randomPoint = () => Random.onCircle(1);

  const a0 = [randomPoint(), randomPoint()];
  const a1 = [randomPoint(), randomPoint()];
  const a2 = [randomPoint(), randomPoint()];
  const a3 = [randomPoint(), randomPoint()];

  const b0 = [randomPoint(), randomPoint()];
  const b1 = [randomPoint(), randomPoint()];
  const b2 = [randomPoint(), randomPoint()];
  const b3 = [randomPoint(), randomPoint()];

  return [a0, a1, a2, a3, b0, b1, b2, b3];
}
