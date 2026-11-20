'use client';
import { useState, type CSSProperties } from 'react';
import { datAssets } from '@/lib/frontend/daitech';

export function DatLogo({ size, alt = '' }: { size: number; alt?: string }) {
  const [errors, setErrors] = useState(0);
  const { src, fallback, width, height } = datAssets.mark;
  return <span className="dat-tile" style={{ width: size, height: size }}>
    {errors < 2 ? <img alt={alt} width={width} height={height} src={errors ? fallback : src} onError={() => setErrors(n => n + 1)} /> : <span aria-label={alt || undefined}>DAT</span>}
  </span>;
}
export function DatMask({ watermark = false }: { watermark?: boolean }) {
  return <span aria-hidden="true" className={'dat-mask' + (watermark ? ' dat-watermark' : '')} style={{ '--dat-mask': `url(${datAssets.mask.src})` } as CSSProperties} />;
}
