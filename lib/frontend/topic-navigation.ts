export function getTopicIndex(
  key: string,
  index: number,
  count: number,
): number | null {
  if (count <= 0) return null;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  if (key === "ArrowRight") return (index + 1) % count;
  if (key === "ArrowLeft") return (index - 1 + count) % count;
  return null;
}

export function getScrollMetrics(
  scrollLeft: number,
  width: number,
  contentWidth: number,
) {
  const max = Math.max(0, contentWidth - width);
  return {
    left: scrollLeft > 2 && max > 0,
    right: max > 0 && scrollLeft < max - 2,
    progress: max > 0 ? Math.max(0, Math.min(1, scrollLeft / max)) : 0,
    fraction: width > 0 ? Math.min(1, width / Math.max(1, contentWidth)) : 1,
  };
}

export function getCenteredScroll(
  scrollLeft: number,
  viewportLeft: number,
  viewportWidth: number,
  tabLeft: number,
  tabWidth: number,
  contentWidth: number,
) {
  return Math.max(
    0,
    Math.min(
      contentWidth - viewportWidth,
      scrollLeft + tabLeft - viewportLeft - (viewportWidth - tabWidth) / 2,
    ),
  );
}
