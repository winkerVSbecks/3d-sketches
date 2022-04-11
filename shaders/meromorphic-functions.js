/**
 * Somewhat based on https://www.shadertoy.com/view/4s2SRt
 */
const canvasSketch = require('canvas-sketch');
const { lerp, lerpArray } = require('canvas-sketch-util/math');
const Random = require('canvas-sketch-util/random');
const createShader = require('canvas-sketch-util/shader');
const Color = require('canvas-sketch-util/color');
const glsl = require('glslify');
const { generateRandomColorRamp } = require('fettepalette/dist/index.cjs');

// Setup our sketch
const settings = {
  dimensions: [1080, 1080],
  context: 'webgl2',
  animate: true,
  duration: 12,
};

const clrs = generateRandomColorRamp({
  total: 9,
  centerHue: 289.2, // Random.range(240, 300),
  hueCycle: 0.5,
  curveMethod: 'lamé',
  curveAccent: 0.2,
  offsetTint: 0.251,
  offsetShade: 0.01,
  tintShadeHueShift: 0.0,
  offsetCurveModTint: 0.03,
  offsetCurveModShade: 0.03,
  minSaturationLight: [0, 0],
  maxSaturationLight: [1, 1],
});

const hsl = (c) => `hsl(${c[0]}, ${c[1] * 100}%, ${c[2] * 100}%)`;
const colors = clrs.all
  .map(hsl)
  .map((c) => Color.parse(c).rgb.map((v) => v / 255));

const u_colors = [
  Random.pick(colors),
  Random.pick(colors),
  Random.pick(colors),
  Random.pick(colors),
];

// Your glsl code
const vert = glsl(/* glsl */ `#version 300 es
  precision highp float;
  in vec3 position;

  void main () {
    gl_Position = vec4(position.xyz, 1.0);
  }
`);

const frag = glsl(/* glsl */ `#version 300 es
  precision highp float;
  out vec4 fragColor;

  uniform vec2 u_resolution;
  uniform float u_time;
  uniform vec3 u_col_1;
  uniform vec3 u_col_2;
  uniform vec3 u_col_3;
  uniform vec3 u_col_4;
  // Define our points
  uniform vec2 u_a0;
  uniform vec2 u_a1;
  uniform vec2 u_a2;
  uniform vec2 u_a3;
  uniform vec2 u_b0;
  uniform vec2 u_b1;
  uniform vec2 u_b2;
  uniform vec2 u_b3;

  #define PI 3.1415926535897932384626433832795

  #define cx_mul(a, b) vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x)
  #define cx_div(a, b) vec2(((a.x*b.x + a.y*b.y)/(b.x*b.x + b.y*b.y)),((a.y*b.x - a.x*b.y)/(b.x*b.x + b.y*b.y)))
  #define cx_sin(a) vec2(sin(a.x) * cosh(a.y), cos(a.x) * sinh(a.y))
  #define cx_cos(a) vec2(cos(a.x) * cosh(a.y), -sin(a.x) * sinh(a.y))

  vec2 cx_tan(vec2 a) {return cx_div(cx_sin(a), cx_cos(a)); }
  vec2 cx_log(vec2 a) {
      float rpart = sqrt((a.x*a.x)+(a.y*a.y));
      float ipart = atan(a.y,a.x);
      if (ipart > PI) ipart=ipart-(2.0*PI);
      return vec2(log(rpart),ipart);
  }

  vec2 as_polar(vec2 z) {
    return vec2(
      length(z),
      atan(z.y, z.x)
    );
  }
  vec2 cx_pow(vec2 v, float p) {
    vec2 z = as_polar(v);
    return pow(z.x, p) * vec2(cos(z.y * p), sin(z.y * p));
  }

  float im(vec2 z) {
    return ((atan(z.y, z.x) / PI) + 1.0) * 0.5;
  }

  vec3 pal( in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d ) {
    return a + b*cos(2.*PI*(c*t+d));
  }

  void main() {
      // Set up our imaginary plane
      vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.y, u_resolution.x);
      vec2 z = uv * 2.;

      // Calculate the sum of our first polynomial
      vec2 polyA = u_a0
          + cx_mul(u_a1, z)
          + cx_mul(u_a2, cx_pow(z, 2.0))
          + cx_mul(u_a3, cx_pow(z, 3.0));

      // Calculate the sum of our second polynomial
      vec2 polyB = u_b0
          + cx_mul(u_b1, z)
          + cx_mul(u_b2, cx_pow(z, 2.))
          + cx_mul(u_b3, cx_pow(z, 3.));

      // Calculate the ratio of our complex polynomials
      vec2 result = cx_div(polyA, polyB);

      float imaginary = cx_log(result).y;
      float col = (imaginary / PI);

      fragColor = vec4(pal(col, u_col_1, u_col_2, u_col_3, u_col_4),1.0);
  }
`);

// Your sketch, which simply returns the shader
const sketch = ({ gl, width, height }) => {
  const animatePoint = (pt, playhead) =>
    lerpArray(pt[0], pt[1], Math.sin(playhead * Math.PI));

  // const polygonA = [0, 1, 2, 3].map((idx) => (t) => ({
  //   r: 0.5,
  //   angle: Math.PI * 0.1 * idx + 2 * Math.PI * t,
  // }));

  // const polygonB = [0, 1, 2, 3].map((idx) => (t) => ({
  //   r: 0.5,
  //   angle:
  //     Math.PI * 0.1 * idx +
  //     Math.PI * lerp(0, 0.1, Math.sin(Math.PI * t)) + //offset
  //     2 * Math.PI * t,
  // }));

  const size = Random.range(0.05, 0.5);
  const r = Random.range(0.125, 1);
  const vel = [Random.rangeFloor(1, 3), Random.rangeFloor(4, 6)];

  const [a0, a1, a2, a3, b0, b1, b2, b3] = flippedRandomOnCircle(); // randomOnCircle();

  return createShader({
    clearColor: '#fff',
    gl,
    vert,
    frag,
    uniforms: {
      u_resolution: [width, height],
      u_col_1: u_colors[0],
      u_col_2: u_colors[1],
      u_col_3: u_colors[2],
      u_col_4: u_colors[3],

      // u_a0: ({ playhead }) => lissajous(polygonA[0](playhead)),
      // u_a1: ({ playhead }) => lissajous(polygonA[1](playhead)),
      // u_a2: ({ playhead }) => lissajous(polygonA[2](playhead)),
      // u_a3: ({ playhead }) => lissajous(polygonA[3](playhead)),
      // u_b0: ({ playhead }) => lissajous(polygonB[0](playhead)),
      // u_b1: ({ playhead }) => lissajous(polygonB[1](playhead)),
      // u_b2: ({ playhead }) => lissajous(polygonB[2](playhead)),
      // u_b3: ({ playhead }) => lissajous(polygonB[3](playhead)),

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

function lissajous({
  r,
  vel = [1, 3],
  start = [-Math.PI / 2, -Math.PI / 2],
  angle,
}) {
  const dt = 1;
  return [
    r * Math.cos((angle + 0.2 * dt) * vel[0] - start[0]),
    r * Math.sin((angle + 0.2 * dt) * vel[1] - start[1]),
  ];
}

function randomPolygons() {
  const polygonA = [0, 1, 2, 3].map((idx) => (t) => ({
    vel,
    r,
    angle: Math.PI * size * idx + 2 * Math.PI * t,
  }));

  const polygonB = [0, 1, 2, 3].map((idx) => (t) => ({
    vel,
    r,
    angle:
      Math.PI * size * idx +
      Math.PI * lerp(0, size, Math.sin(Math.PI * t)) + //offset
      2 * Math.PI * t,
  }));

  return [polygonA, polygonB];
}

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
