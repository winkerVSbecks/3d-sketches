const { lerp } = require('canvas-sketch-util/math');
const Random = require('canvas-sketch-util/random');

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

const [polygonA, polygonB] = randomPolygons();

module.exports = {
  u_a0: ({ playhead }) => lissajous(polygonA[0](playhead)),
  u_a1: ({ playhead }) => lissajous(polygonA[1](playhead)),
  u_a2: ({ playhead }) => lissajous(polygonA[2](playhead)),
  u_a3: ({ playhead }) => lissajous(polygonA[3](playhead)),
  u_b0: ({ playhead }) => lissajous(polygonB[0](playhead)),
  u_b1: ({ playhead }) => lissajous(polygonB[1](playhead)),
  u_b2: ({ playhead }) => lissajous(polygonB[2](playhead)),
  u_b3: ({ playhead }) => lissajous(polygonB[3](playhead)),
};

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
  const size = Random.range(0.05, 0.5);
  const r = Random.range(0.125, 1);
  const vel = [Random.rangeFloor(1, 3), Random.rangeFloor(4, 6)];
  const movement = 1; //0;
  const scale = 1; //0.0625;

  const polygonA = [0, 1, 2, 3].map((idx) => (t) => ({
    vel,
    r,
    angle: (Math.PI * size * idx + 2 * Math.PI * t * movement) * scale,
  }));

  const polygonB = [0, 1, 2, 3].map((idx) => (t) => ({
    vel,
    r,
    angle:
      (Math.PI * size * idx +
        Math.PI * lerp(0, size, Math.sin(Math.PI * t)) + // offset
        2 * Math.PI * t * movement) *
      scale,
  }));

  return [polygonA, polygonB];
}
