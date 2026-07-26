import type { ObjectId } from "mongodb"

/** ☕ One "coffee drop" = everything shown on /coffee for a single day. */
export interface DailyDrop {
  _id?: ObjectId

  /** "2026-07-27" — Africa/Algiers day. Unique index. */
  date: string

  /** ── 1. مسألة اليوم (English statement, LaTeX allowed with $ / $$) ── */
  problem: {
    subject: string          // "Functional Analysis"
    source: string           // "Khenchela 2022"
    difficulty: 1 | 2 | 3
    statement: string        // English + LaTeX
    hint1?: string           // Arabic
    hint2?: string           // Arabic
    solution?: string        // English + LaTeX
  }

  /** ── 2. فكرة اليوم ── */
  idea: {
    text: string             // Arabic, **bold** supported
  }

  /** ── 3. مقولة اليوم ── */
  quote: {
    text: string
    author?: string
  }

  published: boolean
  createdAt: Date
  updatedAt: Date
}

export type DailyDropInput = Omit<DailyDrop, "_id" | "createdAt" | "updatedAt">

export const EMPTY_DROP: DailyDropInput = {
  date: "",
  problem: {
    subject: "",
    source: "",
    difficulty: 2,
    statement: "",
    hint1: "",
    hint2: "",
    solution: "",
  },
  idea: { text: "" },
  quote: { text: "", author: "" },
  published: true,
}

export const DIFFICULTY_LABEL: Record<1 | 2 | 3, string> = {
  1: "★☆☆ easy",
  2: "★★☆ intermediate",
  3: "★★★ hard",
}
