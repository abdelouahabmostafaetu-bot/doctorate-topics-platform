import { Redis } from "@upstash/redis";

const TTL_SECONDS = 15 * 60;

type StreamMeta = {
  ownerId: string;
  done: boolean;
  error?: string;
};

let redis: Redis | null | undefined;

function getRedis() {
  if (redis !== undefined) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  redis = url && token ? new Redis({ url, token }) : null;
  return redis;
}

function chunksKey(streamId: string) {
  return `mathora:assistant:stream:${streamId}:chunks`;
}

function metaKey(streamId: string) {
  return `mathora:assistant:stream:${streamId}:meta`;
}

export function isStreamStoreEnabled() {
  return Boolean(getRedis());
}

export async function createStoredStream(streamId: string, ownerId: string) {
  const client = getRedis();
  if (!client) return;
  await client.del(chunksKey(streamId));
  await client.set<StreamMeta>(
    metaKey(streamId),
    { ownerId, done: false },
    { ex: TTL_SECONDS },
  );
}

export async function appendStoredStreamChunk(streamId: string, chunk: string) {
  const client = getRedis();
  if (!client || !chunk) return;
  await client.rpush(chunksKey(streamId), chunk);
  await client.expire(chunksKey(streamId), TTL_SECONDS);
}

export async function finishStoredStream(
  streamId: string,
  error?: string,
) {
  const client = getRedis();
  if (!client) return;
  const current = await client.get<StreamMeta>(metaKey(streamId));
  if (!current) return;
  await client.set<StreamMeta>(
    metaKey(streamId),
    { ...current, done: true, ...(error ? { error } : {}) },
    { ex: TTL_SECONDS },
  );
}

export async function readStoredStream(streamId: string, ownerId: string) {
  const client = getRedis();
  if (!client) return null;
  const meta = await client.get<StreamMeta>(metaKey(streamId));
  if (!meta || meta.ownerId !== ownerId) return null;
  const chunks = await client.lrange<string>(chunksKey(streamId), 0, -1);
  return {
    text: chunks.join(""),
    done: meta.done,
    error: meta.error ?? null,
  };
}