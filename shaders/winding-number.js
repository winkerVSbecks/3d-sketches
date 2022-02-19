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
  }
`);

const frag = glsl(/* glsl */ `
  #ifdef GL_ES
  precision mediump float;
  #endif

  #define PI 3.141592653589793
  #define Thickness 0.001

  uniform vec2 resolution;
  uniform float time;

  vec2 as_polar(vec2 z) {
    return vec2(
      length(z),
      atan(z.y, z.x)
    );
  }

  vec2 c_pow(vec2 v, float p) {
    vec2 z = as_polar(v);
    return pow(z.x, p) * vec2(cos(z.y * p), sin(z.y * p));
  }

  vec2 c_mul(vec2 a, vec2 b) {
    return vec2(
      a.x * b.x - a.y * b.y,
      a.x * b.y + a.y * b.x
    );
  }

  vec2 c_div(vec2 a, vec2 b) {
    return vec2(
      a.x * b.x + a.y * b.y,
      a.y * b.x - a.x * b.y
    ) / dot(b, b);
  }

  float im(vec2 z) {
    return ((atan(z.y, z.x) / PI) + 1.0) * 0.5;
  }

  // Just experimenting
  float distanceCurve(vec2 z, vec2 a, vec2 b, vec2 c, vec2 d) {
    vec2 az = z - a;
    vec2 bz = z - b;
    vec2 cz = z - c;
    vec2 dz = z - d;

    vec2 den = c_mul(az, az);
    vec2 num = c_mul(c_mul(c_mul(az, bz), cz), dz);

    // vec2 den = c_mul(az, az);
    // vec2 num = c_mul(bz, cz);

    vec2 pz_over_qz = c_div(num, den);
    vec2 log_pz_over_qz = c_pow(pz_over_qz, 1.0);
    float im_z = im(log_pz_over_qz);
    return im_z;
  }

  float distanceToLine(vec2 z, vec2 p, vec2 q) {
    vec2 pz = z - p;
    vec2 qz = z - q;

    vec2 pz_over_qz = c_div(pz, qz);
    vec2 log_pz_over_qz = c_pow(pz_over_qz, 1.0);
    float im_z = im(log_pz_over_qz);
    return im_z;
  }

  float distanceFromPointToLine(vec2 a, vec2 b, vec2 c) {
    vec2 ba = a - b;
    vec2 bc = c - b;
    float d = dot(ba, bc);
    float len = length(bc);
    float param = 0.0;
    if (len != 0.0) {
      param = clamp(d / (len * len), 0.0, 1.0);
    }
    vec2 r = b + bc * param;
    return distance(a, r);
  }

  float drawLine(vec2 p1, vec2 p2) {
    vec2 uv = gl_FragCoord.xy / resolution.xy;

    float a = abs(distance(p1, uv));
    float b = abs(distance(p2, uv));
    float c = abs(distance(p1, p2));

    if ( a >= c || b >=  c ) return 0.0;

    float p = (a + b + c) * 0.5;

    // median to (p1, p2) vector
    float h = 2. / c * sqrt( p * ( p - a) * ( p - b) * ( p - c));

    return mix(1.0, 0.0, smoothstep(0.5 * Thickness, 1.5 * Thickness, h));
  }

  void main() {
    vec2 z = gl_FragCoord.xy / resolution;
    float t = 0.125 * sin(time * 2. * PI);

    // The line
    // vec2 p = vec2(0.2, 0.5 + 0.25 * sin(time * 2. * PI));
    // vec2 q = vec2(0.7, 0.5 - 0.25 * sin(time * 2. * PI));
    // float alpha = distanceToLine( z, p, q );

    // // The Q
    // vec2 a = vec2(0.2, 0.25 + t);
    // vec2 b = vec2(0.4, 0.5 - t);
    // vec2 c = vec2(0.6, 0.75 + t);
    // vec2 d = vec2(0.8, 0.5 - t);
    // float alpha = distanceCurve(z, a, b, c, d);

    // // Add some color
    // vec3 c0 = vec3(0.047,0.027,0.725); //vec3(0.992,0.439,0.576);
    // vec3 c1 = vec3(0.82,0.153,0.91);
    // vec3 col = mix(c0, c1, alpha); //c0 * alpha + c1 * (1.0 - alpha);


    vec2 p1 = vec2(0.4, 0.25 + t);
    vec2 q1 = vec2(0.6, 0.25 - t);
    vec2 p2 = vec2(0.2 + t, 0.75);
    vec2 q2 = vec2(0.6 - t, 0.75);
    float alpha1 = distanceToLine(z, p1, q1);
    float alpha2 = distanceToLine(z, p2, q2);

    float d1 = distanceFromPointToLine(z, p1, q1);
    float d2 = distanceFromPointToLine(z, p2, q2);
    float ratio = d1 / (d1+d2);

    // Add some color
    vec3 col1 = mix(vec3(0.992,0.439,0.576), vec3(0.961,0.263,0.745), alpha1);
    vec3 col2 = mix(vec3(0.047,0.027,0.725), vec3(0.42,0.075,0.835), alpha2);

    vec3 col = mix(col1, col2, ratio); // sin(time * 2. * PI)
    col = mix(col, vec3(.8), drawLine(p1, q1));
    col = mix(col, vec3(.8), drawLine(p2, q2));

    // Output to screen
    gl_FragColor = vec4(col, 1.0);
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
