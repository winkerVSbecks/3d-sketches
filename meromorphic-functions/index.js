const canvasSketch = require('canvas-sketch');
const createShader = require('canvas-sketch-util/shader');
const { vert, frag } = require('./shader');
const colors = require('./colors');
const animations = require('./animations');

const settings = {
  // dimensions: [1080, 1080],
  dimensions: [1920, 1080],
  // dimensions: [1080, 1920],
  context: 'webgl2',
  animate: true,
  duration: 12,
};

const sketch = ({ gl, width, height }) => {
  return createShader({
    clearColor: '#fff',
    gl,
    vert,
    frag,
    uniforms: {
      u_colorMode: 3,
      u_resolution: [width, height],
      u_col_1: colors[0],
      u_col_2: colors[1],
      u_col_3: colors[2],
      u_col_4: colors[3],
      u_time: ({ playhead }) => playhead,
      ...animations.polynomial,
    },
  });
};

canvasSketch(sketch, settings);
