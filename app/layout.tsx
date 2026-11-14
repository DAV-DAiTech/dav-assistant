import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/plus-jakarta-sans";
import "./design-tokens.css";
import "./dav.css";
import "./ombre.css";

const title = "DAV Assistant — CLB AI & Công nghệ Học viện Ngoại giao – DAiTech";
const description = "Trợ lý AI song ngữ do CLB AI & Công nghệ Học viện Ngoại giao – DAiTech phát triển. Khám phá tuyển sinh, học phí, học bổng và cuộc sống sinh viên.";
export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, locale: "vi_VN", alternateLocale: "en_US", type: "website" },
  twitter: { card: "summary", title, description },
  icons: { icon: "/assets/img/dav-logo.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FFFFFF",
};

// Runs before paint to avoid a light flash when restoring a dark theme.
const themeScript = `(function(){try{var t=localStorage.getItem('dav.theme.v4')||'light';document.documentElement.dataset.theme=t==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):(t==='dark'?'dark':'light')}catch(e){document.documentElement.dataset.theme='light'}})()`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" data-theme="light" data-ombre="blue-white" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
