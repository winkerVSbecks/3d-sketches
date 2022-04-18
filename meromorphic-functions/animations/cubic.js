const { lerpArray } = require('canvas-sketch-util/math');
const Random = require('canvas-sketch-util/random');

const animatePoint = ({ start, amplitude }, playhead) => {
  const d = Math.sin(playhead * Math.PI) * amplitude;
  return [start[0] + d, start[1] + d];
};

const [a0, a1, a2, a3, b0, b1, b2, b3] = getPoints();

module.exports = {
  u_a0: ({ playhead }) => animatePoint(a0, playhead),
  u_a1: ({ playhead }) => animatePoint(a1, playhead),
  u_a2: ({ playhead }) => animatePoint(a2, playhead),
  u_a3: ({ playhead }) => animatePoint(a3, playhead),
  u_b0: ({ playhead }) => animatePoint(b0, playhead),
  u_b1: ({ playhead }) => animatePoint(b1, playhead),
  u_b2: ({ playhead }) => animatePoint(b2, playhead),
  u_b3: ({ playhead }) => animatePoint(b3, playhead),
};

function getPoints() {
  const ax = Random.quaternion()
    .map(Math.abs)
    .map((v) => v - 1);
  const ay = Random.quaternion()
    .map(Math.abs)
    .map((v) => v - 1);

  const a0 = { start: [ax[0], ay[0]], amplitude: Random.range(2, 2) };
  const a1 = { start: [ax[1], ay[1]], amplitude: Random.range(2, 2) };
  const a2 = { start: [ax[2], ay[2]], amplitude: Random.range(2, 2) };
  const a3 = { start: [ax[3], ay[3]], amplitude: Random.range(2, 2) };

  const bx = Random.quaternion();
  const by = Random.quaternion();

  const b0 = { start: [bx[0], by[0]], amplitude: Random.range(2, 2) };
  const b1 = { start: [bx[1], by[1]], amplitude: Random.range(2, 2) };
  const b2 = { start: [bx[2], by[2]], amplitude: Random.range(2, 2) };
  const b3 = { start: [bx[3], by[3]], amplitude: Random.range(2, 2) };

  return [a0, a1, a2, a3, b0, b1, b2, b3];
}
