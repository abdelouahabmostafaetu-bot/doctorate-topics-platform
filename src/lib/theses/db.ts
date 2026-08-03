import { MongoClient, type Collection } from "mongodb";
import type { Degree } from "./repos";

export type ThesisDoc = {
  _id: string;
  repo: string;
  uniFr: string;
  uniAr: string;
  uniSlug: string;
  wilaya: string;
  oaiId: string;
  setSpecs: string[];
  title: string;
  abstract: string;
  authors: string[];
  supervisors: string[];
  keywords: string[];
  year: number | null;
  degree: Degree;
  degreeAr: string;
  branch: string;
  branchAr: string;
  lang: "ar" | "fr" | "en";
  landingUrl: string;
  st: string;
  status: "ok" | "review" | "rejected";
  reason?: string;
  datestamp: string;
  updatedAt: Date;
};

export type RepoStateDoc = {
  _id: string;
  lastRunAt: Date;
  lastOkAt?: Date;
  found: number;
  saved: number;
  rejected: number;
  review: number;
  error?: string;
};

let clientPromise: Promise<MongoClient> | null = null;

function client(): Promise<MongoClient> {
  if (!clientPromise) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is missing");
    clientPromise = new MongoClient(url, { maxPoolSize: 5 }).connect();
  }
  return clientPromise;
}

export async function thesesCol(): Promise<Collection<ThesisDoc>> {
  const c = await client();
  return c.db().collection<ThesisDoc>("theses");
}

export async function repoStateCol(): Promise<Collection<RepoStateDoc>> {
  const c = await client();
  return c.db().collection<RepoStateDoc>("theses_repos");
}

export async function ensureIndexes(): Promise<void> {
  const col = await thesesCol();
  await col.createIndex({ st: 1 });
  await col.createIndex({ status: 1, year: -1 });
  await col.createIndex({ uniSlug: 1, status: 1 });
  await col.createIndex({ degree: 1, status: 1 });
  await col.createIndex({ branch: 1, status: 1 });
  await col.createIndex({ year: -1 });
}
