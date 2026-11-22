'use client';
import { useState, type CSSProperties } from 'react';
import { datAssets } from '@/lib/frontend/daitech';

type Tone = 'gradient' | 'mono' | 'white';
const images = {
  mark: { gradient: datAssets.mark, mono: datAssets.blackMark, white: datAssets.whiteMark },
  full: { gradient: datAssets.lockup, mono: datAssets.blackLockup, white: datAssets.whiteLockup },
};
function LogoProbe({ asset, alt }: { asset: typeof datAssets.mark; alt: string }) {
  const [errors, setErrors] = useState(0);
  return errors < 2 ? <img alt={alt} width={asset.width} height={asset.height} src={errors ? asset.fallback : asset.src} onError={() => setErrors(n => n + 1)} /> : <span>{'DAiTech'}</span>;
}
export function DatLogo({ size, alt = '', variant = 'mark', tone = 'gradient' }: { size: number; alt?: string; variant?: keyof typeof images; tone?: Tone }) {
  const asset = images[variant][tone];
  return <span className="dat-tile" data-tone={tone} style={{ width: size, height: size }}>
    {tone === 'mono' ? <><span className="logo-light"><LogoProbe key={asset.src} asset={asset} alt={alt} /></span><span className="logo-dark"><LogoProbe key={variant} asset={images[variant].white} alt={alt} /></span></> : <LogoProbe key={asset.src} asset={asset} alt={alt} />}
  </span>;
}
export function DatMask({ watermark = false }: { watermark?: boolean }) {
  return <span aria-hidden="true" className={'dat-mask' + (watermark ? ' dat-watermark' : '')} style={{ '--dat-mask': `url(${datAssets.mask.src})` } as CSSProperties} />;
}
