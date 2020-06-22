const Random = require('canvas-sketch-util/random');
const Color = require('canvas-sketch-util/color');
const risoColors = require('riso-colors').map((h) => h.hex);
const paperColors = require('paper-colors').map((h) => h.hex);

function clrs(minContrast = 3) {
  const background = Random.pick(paperColors);

  const inkColors = risoColors
    .filter((color) => Color.contrastRatio(background, color) >= minContrast)
    .filter((c) => c !== '#000000');

  const ink = () => Random.pick(inkColors);

  return {
    bg: background,
    paper: () => Random.pick(paperColors),
    ink,
    inkColors,
  };
}

module.exports = clrs;
