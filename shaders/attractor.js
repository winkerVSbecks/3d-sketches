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
// ping pong inputs
uniform sampler2DRect particles0;
uniform sampler2DRect particles1;

uniform float timestep;

in vec2 texCoordVarying;

layout(location = 0) out vec4 posOut;
layout(location = 1) out vec4 velOut;


// Lorenz Attractor parameters
float a = 10.0;
float b = 28.0;
float c = 2.6666666667;


void main()
{

    int id = int(texCoordVarying.s) + int(texCoordVarying.t)*int(textureSize(particles0).x);
    vec3 pos = texture(particles0, texCoordVarying.st).xyz;
    vec3 vel = texture(particles1, texCoordVarying.st).xyz;

    // Previous positions
    float x = pos.x;
    float y = pos.y;
    float z = pos.z;

   	// Increments calculation
    float dx = (a * (y - x))   * timestep;
    float dy = (x * (b-z) - y) * timestep;
    float dz = (x*y - c*z)     * timestep;

	// Add the new increments to the previous position
    vec3 attractorForce = vec3(dx, dy, dz) ;
    pos +=attractorForce;

    posOut = vec4(pos, id);
    velOut = vec4(vel, 0.0);
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
      timestep: ({ time }) => time,
    },
  });
};

canvasSketch(sketch, settings);
