const canvasSketch = require('canvas-sketch');
const { lerpArray } = require('canvas-sketch-util/math');
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

  const [a0, a1, a2, a3, b0, b1, b2, b3] = circle();

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

function circle() {
  const a0 = [
    [0.5, 0.0],
    [0.0, 0.5],
  ];
  const a1 = [
    [0.0, 0.5],
    [0.5, 0.0],
  ];
  const a2 = [
    [0.5, 0.0],
    [0.0, 0.5],
  ];
  const a3 = [
    [0.0, 0.5],
    [0.5, 0.0],
  ];
  const b0 = [
    [0.0, 0.5],
    [0.5, 0],
  ];
  const b1 = [
    [0.5, 0.0],
    [0, 0.5],
  ];
  const b2 = [
    [0.0, 0.5],
    [0.5, 0],
  ];
  const b3 = [
    [0.5, 0.0],
    [0, 0.5],
  ];

  return [a0, a1, a2, a3, b0, b1, b2, b3];
}
