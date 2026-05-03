import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { SitePreloader } from "@/components/SitePreloader";
import { SmoothScroll } from "@/components/SmoothScroll";
import { site } from "@/config/content";
import { getMetadataBase } from "@/config/site";
import { fontManrope, fontUnbounded } from "@/lib/fonts";
import { themeInitInlineScript } from "@/lib/theme";

const canonicalSiteUrl = getMetadataBase().href.replace(/\/$/, "");

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: site.metaTitle,
  description: site.metaDescription,
  /** Явный основной язык документа — меньше шансов, что переводчик решит «это английский». */
  alternates: {
    canonical: "/",
    languages: {
      "ru-RU": "/",
    },
  },
  openGraph: {
    title: site.metaTitle,
    description: site.metaDescription,
    locale: "ru_RU",
    type: "website",
    url: canonicalSiteUrl,
    images: [
      {
        url: "/images/kirill-hero-strategist.png",
        width: 1200,
        height: 630,
        alt: site.metaTitle,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: site.metaTitle,
    description: site.metaDescription,
  },
  /**
   * Просьба к Chrome / Google не предлагать автоперевод (ломает кириллицу и даёт «арабские» подмены).
   * Плюс class="notranslate" и translate="no" на html/body/#site-root.
   */
  other: {
    google: "notranslate",
    googlebot: "notranslate",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "32x32", type: "image/x-icon" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  /** Во встроенных браузерах (Telegram и др.) вьюпорт корректнее подстраивается под клавиатуру. */
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "rgb(245 250 246)" },
    { media: "(prefers-color-scheme: dark)", color: "rgb(6 10 8)" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const base = getMetadataBase();
  const publicUrl = base.href.replace(/\/$/, "");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.metaTitle,
    description: site.metaDescription,
    inLanguage: "ru-RU",
    url: publicUrl,
  };

  const deployRef = process.env.NEXT_PUBLIC_DEPLOY_REF?.trim() ?? "";
  const gitSha = process.env.NEXT_PUBLIC_GIT_SHA?.trim() ?? "";

  return (
    <html
      lang="ru"
      translate="no"
      dir="ltr"
      className={`notranslate ${fontManrope.variable} ${fontUnbounded.variable}`}
      suppressHydrationWarning
      data-deploy-ref={deployRef || undefined}
      data-git-sha={gitSha || undefined}
    >
      <body
        translate="no"
        className="notranslate min-h-screen min-h-dvh font-body text-[15px] leading-[1.68] tracking-[-0.01em] antialiased [font-feature-settings:'kern'_1,'liga'_1] md:text-[16px] md:leading-[1.72]"
      >
        <SitePreloader />
        <div
          id="site-root"
          className="site-root notranslate min-h-screen min-h-dvh"
          translate="no"
          lang="ru"
          dir="ltr"
        >
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
          <SmoothScroll />
          <Script
            id="theme-init"
            strategy="beforeInteractive"
            dangerouslySetInnerHTML={{ __html: themeInitInlineScript() }}
          />
          <Script
            id="lock-locale"
            strategy="beforeInteractive"
            dangerouslySetInnerHTML={{
              __html: `(function(){try{var d=document.documentElement;d.setAttribute('lang','ru');d.setAttribute('translate','no');d.setAttribute('dir','ltr');d.classList.add('notranslate');}catch(e){}})();`,
            }}
          />
          <Script
            id="preloader-failsafe"
            strategy="beforeInteractive"
            dangerouslySetInnerHTML={{
              __html: `(function(){var ms=4500;setTimeout(function(){try{document.documentElement.classList.remove('site-preloader-active');var p=document.querySelector('[data-site-preloader="true"]');if(p){p.setAttribute('hidden','hidden');p.style.setProperty('display','none','important');p.style.setProperty('visibility','hidden','important');p.style.setProperty('pointer-events','none','important');p.style.setProperty('opacity','0','important');}}catch(e){}},ms);})();`,
            }}
          />
          {children}
        </div>
      </body>
    </html>
  );
}
