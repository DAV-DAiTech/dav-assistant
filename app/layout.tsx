import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/plus-jakarta-sans";
import "./design-tokens.css";
import "./dav.css";

export const metadata: Metadata = {
  title: "DAV Assistant — Hỏi mọi điều về Học viện Ngoại giao",
  description:
    "Trợ lý AI thử nghiệm của CLB DAItech, Học viện Ngoại giao. Khám phá tuyển sinh, ngành học, học bổng và cuộc sống sinh viên. Bản trải nghiệm giao diện.",
  icons: { icon: "/assets/img/dav-logo.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#070e20" },
    { media: "(prefers-color-scheme: light)", color: "#f4f7fd" },
  ],
};

// Runs before paint to avoid a light flash when restoring a dark theme.
const themeScript = `(function(){try{var t=localStorage.getItem('dav.theme.v4')||'dark';document.documentElement.dataset.theme=t==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):(t==='light'?'light':'dark')}catch(e){document.documentElement.dataset.theme='dark'}})()`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
