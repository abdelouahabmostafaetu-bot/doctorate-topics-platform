import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic, STIX_Two_Text } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { PwaProvider } from "@/components/pwa/pwa-provider";

const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

// خط القراءة الرياضية — نفس عائلة خط ملفات PDF، متناسق مع خط KaTeX
const stixTwoText = STIX_Two_Text({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-math",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.docmathdz.dev"),
  title: {
    default: "مواضيع مسابقات دكتوراه الرياضيات في الجزائر | DocMath DZ",
    template: "%s | DocMath DZ",
  },
  description:
    "أرشيف مجاني لمواضيع مسابقات الالتحاق بالدكتوراه في الرياضيات بالجزائر — نصوص التمارين كاملة بعرض رياضي واضح، مصنفة حسب الجامعة والسنة والتخصص، مع بحث متقدم.",
  keywords: [
    "مواضيع دكتوراه الرياضيات",
    "مسابقة دكتوراه الجزائر",
    "دكتوراه LMD رياضيات",
    "مواضيع مسابقات الدكتوراه",
    "concours doctorat mathématiques Algérie",
    "sujets concours doctorat maths",
    "doctorat LMD mathématiques",
  ],
  openGraph: {
    type: "website",
    locale: "ar_DZ",
    url: "https://www.docmathdz.dev",
    siteName: "DocMath DZ",
    title: "مواضيع مسابقات دكتوراه الرياضيات في الجزائر",
    description:
      "أرشيف مجاني لمواضيع مسابقات الدكتوراه في الرياضيات — كل الجامعات والسنوات والتخصصات",
  },
  twitter: {
    card: "summary_large_image",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DocMath DZ",
  },
  robots: {
    index: true,
    follow: true,
  },
};

// لون شريط النظام في التطبيق المثبّت — يتبع الوضع الفاتح/الداكن
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("theme");if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`,
          }}
        />
      </head>
      <body
        className={`${plexArabic.variable} ${stixTwoText.variable} flex min-h-screen flex-col font-sans antialiased`}
      >
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <PwaProvider />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
