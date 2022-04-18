const canvasSketch = require('canvas-sketch');
const { lerpArray } = require('canvas-sketch-util/math');
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
      u_colorMode: 0,
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

// animated colors
// u_col_1: ({ playhead }) => [
//   0.52,
//   lerp(0.45, 0.45 - 0.2, Math.sin(playhead * Math.PI)),
//   lerp(0.61, 0.61 + 0.2, Math.sin(playhead * Math.PI)),
// ],
// u_col_2: ({ playhead }) => [
//   0.4,
//   lerp(0.42, 0.42 - 0.2, Math.sin(playhead * Math.PI)),
//   lerp(0.31, 0.31 + 0.2, Math.sin(playhead * Math.PI)),
// ],
// u_col_3: ({ playhead }) => [
//   0.26,
//   lerp(0.3, 0.3 - 0.2, Math.sin(playhead * Math.PI)),
//   lerp(0.35, 0.35 + 0.2, Math.sin(playhead * Math.PI)),
// ],
// u_col_4: ({ playhead }) => [
//   0.996,
//   lerp(0.843, 0.843 - 0.2, Math.sin(playhead * Math.PI)),
//   lerp(0.314, 0.314 + 0.2, playhead),
// ]

// basic colors
// [0.52, 0.45, 0.61],
// [0.4, 0.42, 0.31],
// [0.26, 0.3, 0.35],
// [0.15, 0.4, 0.4],

// basic
// const a0 = vec2(0.32, -0.45);
// const a1 = vec2(-0.49, -0.32);
// const a2 = vec2(-0.31, 0.38);
// const a3 = vec2(-0.12, 0.04);
// const b0 = vec2(-0.71, 0.53);
// const b1 = vec2(0.01, 0.23);
// const b2 = vec2(-0.24, 0.31);
// const b3 = vec2(-0.01, -0.42);

// u_a0: ({ playhead }) =>
//   animatePoint(
//     [
//       [0.0, 0.0],
//       [0.0, 0.0],
//     ],
//     playhead
//   ),
// u_a1: ({ playhead }) =>
//   animatePoint(
//     [
//       [0.25, 0.0],
//       [0.25, 0.1],
//     ],
//     playhead
//   ),
// u_a2: ({ playhead }) =>
//   animatePoint(
//     [
//       [1.0, 0.0],
//       [1.0, 0.1],
//     ],
//     playhead
//   ),
// u_a3: ({ playhead }) =>
//   animatePoint(
//     [
//       [0.75, 0.0],
//       [0.75, 0.1],
//     ],
//     playhead
//   ),
