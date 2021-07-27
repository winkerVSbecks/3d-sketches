/**
 * Somewhat based on https://www.shadertoy.com/view/4s2SRt
 */
const canvasSketch = require('canvas-sketch');
const createShader = require('canvas-sketch-util/shader');
const glsl = require('glslify');

// Setup our sketch
const settings = {
  dimensions: [1080, 1080],
  context: 'webgl',
  animate: true,
  duration: 6,
  fps: 50,
};

// Your glsl code
const vert = glsl(/* glsl */ `
  precision highp float;
  attribute vec3 position;
  varying vec2 vUv;

  void main () {
    gl_Position = vec4(position.xyz, 1.0);
    vUv = gl_Position.xy * 0.5 + 0.5;
  }
`);

const frag = glsl(/* glsl */ `
  #ifdef GL_ES
  precision mediump float;
  #endif

  #define PI 3.141592653589793

  varying vec2 vUv;
  uniform vec2 resolution;
  uniform float time;

  void main() {
    vec2 p = (gl_FragCoord.xy * 2. - resolution ) / resolution.y;
    vec2 q = mod(p*p, p * .2);
    float s = sin(time * PI * 2.);
    float c = cos(time * PI * 2.);
    q *= mat2(c, s, -s, c);
    float v =.1 / abs(q.y) * q.x;
    float w = v * abs(sin(time * 2. * PI));

    gl_FragColor = vec4(vec3(w), 1.);
  }
`);

// Your sketch, which simply returns the shader
const sketch = ({ gl, width, height }) => {
  // gl.getExtension('OES_standard_derivatives');

  return createShader({
    clearColor: '#fff',
    gl,
    vert,
    frag,
    uniforms: {
      resolution: [width, height],
      time: ({ playhead }) => playhead,
    },
  });
};

canvasSketch(sketch, settings);
