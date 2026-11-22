'use client';
import { useEffect, useRef } from 'react';
import manifest from '@/public/brand/dat/elements/manifest.json';

type ElementName = keyof typeof manifest extends `${infer Name}.webp` ? Name : never;
export function DecoImage({name, className = '', float = false, priority = false}: {name: ElementName; className?: string; float?: boolean; priority?: boolean}) {
  const ref = useRef<HTMLImageElement>(null);
  const file = `${name}.webp` as const;
  const {w, h} = manifest[file];
  useEffect(() => {
    const node = ref.current;
    if (!float || !node) return;
    let visible = false;
    const update = () => { node.style.animationPlayState = visible && !document.hidden ? 'running' : 'paused'; };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); });
    observer.observe(node);
    document.addEventListener('visibilitychange', update);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', update); };
  }, [float]);
  return <img ref={ref} className={`deco ${className}${float ? ' deco-float' : ''}`} width={w} height={h} src={`/brand/dat/elements/${file}`} loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : undefined} decoding="async" alt="" aria-hidden="true" draggable={false} onError={e => { e.currentTarget.hidden = true; }} />;
}
export function HeroArt() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const media = matchMedia('(min-width:768px) and (prefers-reduced-motion:no-preference)');
    let visible = false, frame = 0;
    const draw = () => { frame = 0; el.style.setProperty('--cloud-y', `${window.scrollY * .04}px`); };
    const scroll = () => { if (!frame && visible && media.matches && !document.hidden) frame = requestAnimationFrame(draw); };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; scroll(); });
    observer.observe(el); window.addEventListener('scroll', scroll, {passive:true});
    return () => { observer.disconnect(); cancelAnimationFrame(frame); window.removeEventListener('scroll', scroll); };
  }, []);
  return <div ref={ref} className="hero-art" aria-hidden="true">
    <DecoImage name="dat-bg-sun-dark" className="sun" />
    <DecoImage name="dat-el-ribbon-1" className="ribbon left" /><DecoImage name="dat-el-ribbon-2" className="ribbon right" />
    <DecoImage name="dat-el-cloud-bl" className="cloud left" /><DecoImage name="dat-el-cloud-br" className="cloud right" />
    <DecoImage name="dat-el-podium-flat" className="robot-ground" /><DecoImage name="dat-el-robot" className="hero-robot" float priority />
  </div>;
}
