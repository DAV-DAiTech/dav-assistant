const root = '/brand/dat/';
function raster(name: string, width: number, height: number) {
  return { src: `${root}${name}.webp`, fallback: `${root}png-fallback/${name}.png`, width, height };
}
export const datAssets = {
  mark: raster('dat-mark-gradient', 512, 512), blackMark: raster('dat-mark-mono', 512, 512), whiteMark: raster('dat-mark-white', 512, 512),
  lockup: raster('dat-logo-full-gradient', 1024, 1214), blackLockup: raster('dat-logo-full-mono', 1024, 1200), whiteLockup: raster('dat-logo-full-white', 1024, 1200),
  mask: { src: `${root}dat-mark-mono.svg`, viewBox: [0, 0, 1141, 959] }, lockupMask: { src: `${root}dat-logo-full-mono.svg`, viewBox: [0, 0, 1214, 1441] },
  wide: { src: `${root}dat-cover-wide.webp`, width: 2400, height: 900 }, square: { src: `${root}dat-cover-3d.webp`, width: 1400, height: 1400 },
};
export const datLinks = { facebook: 'https://www.facebook.com/profile.php?id=61591989592893', email: 'mailto:daitechclub1@gmail.com' };
