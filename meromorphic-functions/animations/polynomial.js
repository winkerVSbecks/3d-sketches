const PolynomialRegression = require('ml-regression-polynomial');
const Random = require('canvas-sketch-util/random');
const { mapRange } = require('canvas-sketch-util/math');

const randomPoint = () => [Random.range(-1, 1), Random.range(-1, 1)];

const [a0, a1, a2, a3, b0, b1, b2, b3] = getPoints();

module.exports = {
  u_a0: ({ playhead }) => movePoint(a0, playhead),
  u_a1: ({ playhead }) => movePoint(a1, playhead),
  u_a2: ({ playhead }) => movePoint(a2, playhead),
  u_a3: ({ playhead }) => movePoint(a3, playhead),
  u_b0: ({ playhead }) => movePoint(b0, playhead),
  u_b1: ({ playhead }) => movePoint(b1, playhead),
  u_b2: ({ playhead }) => movePoint(b2, playhead),
  u_b3: ({ playhead }) => movePoint(b3, playhead),
};

function coefficients() {
  const points = new Array(4).fill(0).map(randomPoint);
  const x = points.map((p) => p[0]);
  const y = points.map((p) => p[1]);

  const regression = new PolynomialRegression(x, y, 3);

  return regression.coefficients;
}

function getPoints() {
  const ax = coefficients();
  const ay = Random.chance() ? coefficients() : ax;

  const a0 = [ax[0], ay[0]];
  const a1 = [ax[1], ay[1]];
  const a2 = [ax[2], ay[2]];
  const a3 = [ax[3], ay[3]];

  const bx = coefficients();
  const by = coefficients();

  const b0 = [bx[0], by[0]];
  const b1 = [bx[1], by[1]];
  const b2 = [bx[2], by[2]];
  const b3 = [bx[3], by[3]];

  return [a0, a1, a2, a3, b0, b1, b2, b3];
}

function movePoint([x, y], playhead) {
  const r = loopNoise({ x, y, offset: 0, range: [-10, 10] }, playhead);
  const theta = loopNoise(
    { x, y, offset: 1000, range: [0, 2 * Math.PI] },
    playhead
  );

  return [x + r * Math.cos(theta), y + r * Math.sin(theta)];
}

// function movePoint (point, playhead)  {
//   const d = Math.sin(playhead * Math.PI) * 2;
//   return [point[0] + d, point[1] + d];
// };

function loopNoise({ x, y, radius = 1, range }, playhead) {
  const v = Random.noise2D(
    x + (radius * Math.cos(Math.PI * 2 * playhead)) / 10,
    y + (radius * Math.sin(Math.PI * 2 * playhead)) / 10,
    1,
    1
  );

  return mapRange(v, -1, 1, range[0], range[1]);
}
