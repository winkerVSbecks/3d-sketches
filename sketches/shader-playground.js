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
  duration: 12,
};

const vert = glsl(/*glsl*/ `
  precision highp float;
  attribute vec3 position;
  varying vec2 vUv;
  varying vec3 vPosition;

  void main () {
    vPosition = position;
    gl_Position = vec4(position.xyz, 1.0);
    vUv = gl_Position.xy * 0.5 + 0.5;
  }
`);

// Your glsl code
const frag = glsl(/* glsl */ `
#ifdef GL_ES
precision mediump float;
#endif

#pragma glslify: noise = require(glsl-noise/simplex/4d);
#pragma glslify: grain = require(glsl-film-grain);
#pragma glslify: blend = require('glsl-blend-soft-light');
#define gold vec3(1.0, 0.843, 0.0)

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_scale;

varying vec3 vPosition;
varying vec2 vUv;

const int AMOUNT = 4;

float loopNoise (vec3 v, float t, float scale, float offset) {
  float duration = scale;
  float current = t * scale;
  return ((duration - current) * noise(vec4(v, current + offset)) + current * noise(vec4(v, current - duration + offset))) / duration;
}

void main(){
	vec2 coord = 10.0 * vUv; // 20.0 * (gl_FragCoord.xy - u_resolution / 2.0) / min(u_resolution.y, u_resolution.x);

  vec3 p = vPosition * 1.0;
  float v = 0.0;
  float amp = 0.5;
  v += loopNoise(p, u_time, 1.0, 60.0) * amp;

	float len;

	for (int i = 0; i < AMOUNT; i++){
		len = length(vec2(coord.x, coord.y));

		coord.x = coord.x - cos(coord.y + sin(len)) + cos(u_time / 9.0);
		coord.y = coord.y + sin(coord.x + cos(len)) + sin(u_time / 12.0);
	}

  len += v * u_scale;

	vec3 color = vec3(cos(len), cos(len), cos(len));

  float grainSize = 1.0;
  float g = grain(vUv, u_resolution / grainSize);
  vec3 noiseColor = blend(vec3(g), gold);
  color = blend(color, noiseColor);

	gl_FragColor = vec4(color, 1.0);
}
`);

// Your sketch, which simply returns the shader
const sketch = ({ gl, width, height }) => {
  // gl.getExtension('OES_standard_derivatives');

  // Create the shader and return it
  return createShader({
    render: (props) => {
      console.log(props);
    },
    clearColor: 'rgb(0, 0, 0)',
    // Pass along WebGL context
    gl,
    // Specify fragment and/or vertex shader strings
    vert,
    frag,
    // Specify additional uniforms to pass down to the shaders
    uniforms: {
      u_time: ({ playhead }) => Math.sin(Math.PI * 2 * playhead),
      u_scale: ({ playhead }) =>
        1 + 6 * Math.abs(Math.sin(Math.PI * 2 * playhead)),
      u_resolution: [width, height],
    },
  });
};

canvasSketch(sketch, settings);
