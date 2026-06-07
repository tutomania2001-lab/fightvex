import type { Metadata } from "next";
import { Geist, Geist_Mono, Oswald } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { AgeGate } from "@/components/site/AgeGate";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { FlareBackdrop } from "@/components/site/FlareBackdrop";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const oswald = Oswald({ variable: "--font-oswald", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
// Brunson — display/title font.
const brunson = localFont({ src: "./fonts/Brunson.ttf", variable: "--font-brunson", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://fightvex.com"),
  title: {
    default: "FightVex — AI UFC & MMA Betting Tools, Fight Simulator & Odds",
    template: "%s · FightVex",
  },
  description:
    "Free AI UFC & MMA betting tools: a backtested fight simulator (validated on 10,000+ real fights, with picks anchored in Bitcoin before each event), real odds with value signals, fighter stats and matchup analysis. 21+. Not betting advice.",
  keywords: [
    "UFC betting tools", "MMA betting tools", "UFC fight simulator", "MMA fight simulator",
    "UFC fight predictor", "who will win UFC", "UFC odds", "MMA odds comparison",
    "UFC value calculator", "expected value UFC betting", "fighter stats", "UFC matchup analysis",
    "MMA analytics", "fight night betting", "UFC picks",
  ],
  applicationName: "FightVex",
  authors: [{ name: "FightVex" }],
  creator: "FightVex",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "FightVex",
    url: "https://fightvex.com",
    title: "FightVex — AI UFC & MMA Betting Tools & Fight Simulator",
    description:
      "Backtested AI fight simulations (validated on 10,000+ real fights, picks Bitcoin-timestamped before each event), real odds with value signals, and deep fighter analytics. 21+.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "FightVex — AI UFC & MMA betting intelligence" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "FightVex — AI UFC & MMA Betting Tools",
    description: "Backtested AI fight simulator, real odds + value signals, deep fighter analytics. Picks Bitcoin-verified pre-fight. 21+.",
    images: ["/og.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  // Search-engine ownership verification. Set GOOGLE_SITE_VERIFICATION /
  // BING_SITE_VERIFICATION in Vercel env (from Search Console's "HTML tag"
  // method) to emit the meta tag; unset = no tag, so this is always safe.
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    ...(process.env.BING_SITE_VERIFICATION ? { other: { "msvalidate.01": process.env.BING_SITE_VERIFICATION } } : {}),
  },
  // /favicon.ico is provided (cache-busted) by the app/favicon.ico convention.
  // The PNG icons carry a ?v= query so browsers drop the previously-cached ones.
  icons: {
    icon: [
      { url: "/favicon-16x16.png?v=4", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png?v=4", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png?v=4",
    other: [
      { rel: "manifest", url: "/site.webmanifest" },
    ],
  },
};

// Site-wide structured data so Google understands the brand + site (eligible for
// the knowledge panel / sitelinks). Page-specific schema (Athlete, SportsEvent,
// WebApplication, FAQ, Breadcrumbs) is injected by the individual pages.
const SITE_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://fightvex.com/#organization",
      name: "FightVex",
      url: "https://fightvex.com",
      logo: "https://fightvex.com/og.png",
      description:
        "AI UFC & MMA betting intelligence — a transparent fight simulator, real odds with value signals, and deep fighter analytics.",
    },
    {
      "@type": "WebSite",
      "@id": "https://fightvex.com/#website",
      url: "https://fightvex.com",
      name: "FightVex",
      description: "AI UFC & MMA betting tools, fight simulator and odds analysis.",
      publisher: { "@id": "https://fightvex.com/#organization" },
      inLanguage: "en",
    },
  ],
};

// Runs before first paint: hides `.reveal` elements (no flash), then reveals
// them as they scroll into view — including content added by client navigations.
// No-JS / reduced-motion users keep everything visible.
const REVEAL_SCRIPT = `(function(){try{
var m=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)');if(m&&m.matches)return;
document.documentElement.classList.add('reveal-ready');
var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('reveal-in');io.unobserve(e.target);}});},{rootMargin:'0px 0px -8% 0px',threshold:0.06});
function scan(){var els=document.querySelectorAll('.reveal:not(.reveal-in)');for(var i=0;i<els.length;i++)io.observe(els[i]);}
function start(){scan();new MutationObserver(scan).observe(document.body,{childList:true,subtree:true});}
if(document.readyState!=='loading')start();else document.addEventListener('DOMContentLoaded',start);
}catch(e){}})();`;

// Runs before first paint: applies the saved light/dark theme so there's no
// flash of the wrong theme. Defaults to dark (the brand default).
const THEME_SCRIPT = `(function(){try{if(localStorage.getItem('theme')==='light')document.documentElement.classList.add('light');}catch(e){}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} ${oswald.variable} ${brunson.variable}`}>
      <body className="antialiased">
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SITE_LD) }} />
        <script dangerouslySetInnerHTML={{ __html: REVEAL_SCRIPT }} />
        <FlareBackdrop />
        <AuthProvider>
          <AgeGate />
          <Navbar />
          <main className="min-h-screen">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
