import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic, STIX_Two_Text } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

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
  title: "منصة مواضيع دكتوراه الرياضيات",
  description:
    "أرشيف مواضيع مسابقات الدكتوراه في الرياضيات بالجزائر — مصنفة حسب الجامعة والسنة والتخصص",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={ {
            __html: `try{var t=localStorage.getItem("theme");if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`,
          } }
        />
      </head>
      <body
        className={`${plexArabic.variable} ${stixTwoText.variable} flex min-h-screen flex-col font-sans antialiased`}
      >
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
