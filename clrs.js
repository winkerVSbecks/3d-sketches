const Random = require('canvas-sketch-util/random');
const Color = require('canvas-sketch-util/Color');
const risoColors = require('riso-colors').map((h) => h.hex);
const paperColors = require('paper-colors').map((h) => h.hex);

function clrs(minContrast = 3) {
  const background = Random.pick(paperColors);

  const inkColors = risoColors.filter(
    (color) => Color.contrastRatio(background, color) >= minContrast,
  );

  const ink = () => Random.pick(inkColors);

  return {
    bg: background,
    ink,
    inkColors,
  };
}

module.exports = clrs;
