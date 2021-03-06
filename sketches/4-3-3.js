const canvasSketch = require('canvas-sketch');
const { lerp } = require('canvas-sketch-util/math');
const Color = require('canvas-sketch-util/color');
const triangulate = require('delaunay-triangulate');
const clrs = require('../clrs')();

const settings = {
  dimensions: [400, 600],
  animate: true,
  duration: 8,
  scaleToView: true,
};

const rect = (context, x, y, width, height, color) => {
  context.fillStyle = color;
  context.fillRect(x, y, width, height);
};

const player = (context, x, y, radius, stroke, fill = stroke, lineWidth) => {
  context.strokeStyle = stroke;
  context.fillStyle = fill;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2, false);
  context.lineWidth = lineWidth;
  context.fill();
  context.stroke();
};

const ball = (context, x, y, radius, stroke, fill = stroke, lineWidth) => {
  context.fillStyle = fill;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2, false);
  context.lineWidth = lineWidth;
  context.fill();
};

const goal = (context, x, y, size, color = 'white') => {
  context.fillStyle = color;
  context.fillRect(x, y, size, 4);
};

const progress = (context, time, x, y, size, bg, foreground) => {
  context.fillStyle = bg;
  context.fillRect(x, y, size, 4);

  context.fillStyle = foreground;
  context.fillRect(x, y, size * time, 4);
};

const triangles = (context, triangles, pts, color, lineWidth) => {
  context.strokeStyle = color;
  context.lineWidth = lineWidth;
  context.lineJoin = 'round';
  context.lineCap = 'round';

  context.beginPath();
  triangles.forEach(([a, b, c]) => {
    context.moveTo(...pts[a]);
    context.lineTo(...pts[b]);
    context.lineTo(...pts[c]);
    context.lineTo(...pts[a]);
  });

  context.stroke();
};

const sketch = ({ width, height }) => {
  const point = [width * 0.5, height * 0.5];
  const margin = 25;

  const foreground = clrs.ink();
  const background = clrs.bg;
  const secondary = Color.offsetHSL(foreground, 0, 0, 20).hex;
  const tertiary = Color.offsetHSL(background, 0, 0, -20).hex;

  const x = (v) => lerp(margin, width - margin, v);
  const y = (v) => lerp(height - margin * 3, margin * 3, v);

  // barcelona formation
  // 4-1-2-3
  // prettier-ignore
  const formation = [
                                   [x(0.5), y(0.6)],
                          [x(0.2), y(0.5)], [x(0.8), y(0.5)],
                        [x(0.375), y(0.4)], [x(0.625), y(0.475)],
                                   [x(0.5), y(0.3)],
    [x(0.125), y(0.2)], [x(0.375), y(0.2)], [x(0.625), y(0.2)], [x(0.875), y(0.2)],
                                   [x(0.5), y(0.025)],
  ].reverse();

  // prettier-ignore
  const formationTo = [
              [x(0.2), y(0.5)], [x(0.5), y(0.6)], [x(0.8), y(0.5)],
                  [x(0.375), y(0.4)], [x(0.625), y(0.475)],
                              [x(0.5), y(0.3)],
    [x(0.125), y(0.2)], [x(0.375), y(0.2)], [x(0.625), y(0.2)], [x(0.875), y(0.2)],
                                [x(0.5), y(0.025)],
  ].reverse();

  const targets = [1, 8, 2, 5, 7, 6, 8, 10].map((x) => formation[x]);
  targets.push([x(0.5), y(1.1)]);

  const formationTriangles = triangulate(formation);

  return (props) => {
    const { context, width, height, playhead } = props;

    // Fill off-white background
    rect(context, 0, 0, width, height, background);

    // Draw triangles
    triangles(context, formationTriangles, formation, secondary, 4);

    // Draw this scene
    draw(props);

    // Also draw a timeline at the bottom
    progress(
      context,
      playhead,
      margin / 2,
      margin / 2,
      margin * 2,
      secondary,
      foreground
    );

    // Draw goals
    goal(context, x(0.5) - margin * 2, y(-0.1), margin * 4, tertiary);
    goal(context, x(0.5) - margin * 2, y(1.1), margin * 4, tertiary);
  };

  function draw({ context, playhead, deltaTime }) {
    // Chosoe size of circle & stroke
    const lineWidth = 4;
    const radius = 10;

    // Choose one of the N targets based on loop time
    const targetIndex = Math.floor(playhead * targets.length);
    const target = targets[targetIndex];

    // Draw the start and end point
    formation.forEach((p) => {
      player(context, p[0], p[1], radius, foreground, background, lineWidth);
    });

    // Determine a rate at which we will step forward each frame,
    // making it dependent on the time elapsed since last frame
    const rate = 4 * deltaTime;

    // Interpolate toward the target point at this rate
    point[0] = lerp(point[0], target[0], rate);
    point[1] = lerp(point[1], target[1], rate);

    // Draw ball
    ball(context, point[0], point[1], radius / 2, foreground);
  }
};

canvasSketch(sketch, settings);
