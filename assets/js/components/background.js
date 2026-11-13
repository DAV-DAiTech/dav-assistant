import { $, prefersReducedMotion } from "../lib/dom.js";

export function initBackground() {
  const bg = $(".bg");
  if (!bg || prefersReducedMotion() || !matchMedia("(pointer: fine)").matches) return;
  let raf = 0;
  window.addEventListener("pointermove", (e) => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      bg.style.setProperty("--px", ((e.clientX / innerWidth) * 2 - 1).toFixed(3));
      bg.style.setProperty("--py", ((e.clientY / innerHeight) * 2 - 1).toFixed(3));
    });
  }, { passive: true });
}
