const aspect = 1 / 1;
const padding = 0;
const maxFrameWidth = Infinity;

export function resize(embed) {
  const maxFrameHeight = window.innerHeight * 0.5;
  const parentElement = embed.parentElement;
  if (!parentElement) return;
  const rect = parentElement.getBoundingClientRect();

  const parentWidth = rect.width;
  const parentHeight = rect.height;

  const windowAspect = parentWidth / parentHeight;
  const scaleToFitPadding = 0;
  const maxWidth = Math.min(
    maxFrameWidth,
    Math.round(parentWidth - padding * 2)
  );
  let width;
  let height;
  width = maxWidth;
  height = Math.round(width / aspect);
  embed.width = width;
  embed.height = height;
  embed.style.width = `${width}px`;
  embed.style.height = `${height}px`;
}
