import { ArrowUpRight, Mail, Facebook } from 'lucide-react';
import { text, type Language } from '@/lib/frontend/i18n';
import { datAssets, datLinks } from '@/lib/frontend/daitech';
import { DatLogo, DatMask } from './dat-logo';
import { Reveal } from './primitives';

export function AboutDaitech({ language, openEcosystem }: { language: Language; openEcosystem: () => void }) {
  const t = text[language];
  const { wide, square } = datAssets;
  return <Reveal className="dat-reveal"><section id="about-daitech" className="dat-about" tabIndex={-1} aria-labelledby="dat-headline">
    <div className="dat-art"><picture>
      <source media="(min-width: 900px)" srcSet={wide.src} width={wide.width} height={wide.height} />
      <img src={square.src} width={square.width} height={square.height} alt={t.datArt} loading="lazy" decoding="async" />
    </picture><div className="dat-copy">
      <p className="dat-kicker">{t.datAbout}</p><h2 id="dat-headline">{t.datHeadline}</h2><p className="dat-body">{t.datBody}</p>
      <div className="dat-actions"><a href={datLinks.facebook} target="_blank" rel="noopener noreferrer">Facebook <ArrowUpRight size={15} /></a><a href={datLinks.email}>Email <Mail size={15} /></a><button onClick={openEcosystem} aria-haspopup="dialog">{t.datEcosystem} <ArrowUpRight size={15} /></button></div>
    </div></div>
  </section></Reveal>;
}
export function FooterBrand({ language }: { language: Language }) {
  const t = text[language];
  return <footer className="dat-footer"><DatMask watermark /><div className="dat-footer-row">
    <div className="dat-credit"><DatLogo size={64} /><div><p className="dat-kicker">{t.datBuilt}</p><strong>{t.clubFullName}</strong></div></div>
    <div className="dat-social"><a href={datLinks.facebook} target="_blank" rel="noopener noreferrer" aria-label={t.openClubFacebook}><Facebook size={19} /></a><a href={datLinks.email} aria-label="Email DAiTech"><Mail size={19} /></a></div>
  </div><p className="dat-copyright">{t.footer}</p></footer>;
}
