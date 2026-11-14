type Anchor = { left: number; top: number; bottom: number; width: number };

/** Keep the arrow aimed at the trigger while clamping the panel to the viewport. */
export function getContactPosition(anchor: Anchor, width: number, height: number, viewportWidth: number, viewportHeight: number) {
  const margin = 12;
  const gap = 12;
  const above = anchor.top - gap - margin;
  const below = viewportHeight - anchor.bottom - gap - margin;
  const side = above >= height || above >= below ? "top" : "bottom";
  const maxHeight = Math.max(80, side === "top" ? above : below);
  const panelHeight = Math.min(height, maxHeight);
  const left = viewportWidth < 480
    ? (viewportWidth - width) / 2
    : Math.max(margin, Math.min(anchor.left + anchor.width / 2 - width / 2, viewportWidth - width - margin));
  const top = Math.max(margin, side === "top" ? anchor.top - gap - panelHeight : anchor.bottom + gap);
  const arrow = Math.max(24, Math.min(anchor.left + anchor.width / 2 - left, width - 24));
  return { left, top, side, arrow, maxHeight };
}
