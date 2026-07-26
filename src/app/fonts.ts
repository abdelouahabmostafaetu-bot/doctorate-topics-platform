// 🔤 Fonts for DocMath DZ — import in app/layout.tsx and put the variables on <html>.
import { Reem_Kufi, Tajawal, Amiri, Fraunces, Inter } from "next/font/google"

/** Arabic display — headlines, card titles. Geometric, elegant, very legible. */
export const reem = Reem_Kufi({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-reem",
  display: "swap",
})

/** Arabic body — paragraphs, buttons, forms. */
export const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-tajawal",
  display: "swap",
})

/** Arabic quote — Naskh, for مقولة اليوم and the tagline. */
export const amiri = Amiri({
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
  variable: "--font-amiri",
  display: "swap",
})

/** English display — the "editorial" feel. */
export const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
})

/** English UI + math surroundings. */
export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

export const fontVars = [
  reem.variable,
  tajawal.variable,
  amiri.variable,
  fraunces.variable,
  inter.variable,
].join(" ")

/* ----------------------------------------------------------------------------
app/layout.tsx:

  import { fontVars } from "./fonts"
  import "katex/dist/katex.min.css"

  export default function RootLayout({ children }) {
    return (
      <html lang="ar" dir="rtl" className={fontVars}>
        <body>{children}</body>
      </html>
    )
  }
---------------------------------------------------------------------------- */
