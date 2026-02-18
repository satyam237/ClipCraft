import Dexie from "dexie";

const DB_NAME = "clipcraft-recordings";
const STORE_CHUNKS = "chunks";
const STORE_SESSIONS = "sessions";

export interface RecordingChunk {
  id?: number;
  sessionId: string;
  index: number;
  blob: Blob;
  timestamp: number;
}

export interface RecordingSession {
  id: string;
  startedAt: number;
  pausedAt: number | null;
  totalPausedMs: number;
}

export class RecordingDatabase extends Dexie {
  chunks!: Dexie.Table<RecordingChunk, number>;
  sessions!: Dexie.Table<RecordingSession, string>;

  constructor() {
    super(DB_NAME);
    this.version(1).stores({
      [STORE_CHUNKS]: "++id, sessionId, index",
      [STORE_SESSIONS]: "id, startedAt",
    });
  }
}

export const recordingDb = new RecordingDatabase();

export async function saveChunk(
  sessionId: string,
  index: number,
  blob: Blob
): Promise<void> {
  await recordingDb.chunks.add({
    sessionId,
    index,
    blob,
    timestamp: Date.now(),
  });
}

export async function getChunksForSession(
  sessionId: string
): Promise<RecordingChunk[]> {
  return recordingDb.chunks
    .where("sessionId")
    .equals(sessionId)
    .sortBy("index");
}

export async function createSession(sessionId: string): Promise<void> {
  await recordingDb.sessions.add({
    id: sessionId,
    startedAt: Date.now(),
    pausedAt: null,
    totalPausedMs: 0,
  });
}

export async function updateSessionPause(
  sessionId: string,
  pausedAt: number | null,
  totalPausedMs: number
): Promise<void> {
  await recordingDb.sessions.update(sessionId, { pausedAt, totalPausedMs });
}

export async function deleteSessionChunks(sessionId: string): Promise<void> {
  await recordingDb.chunks.where("sessionId").equals(sessionId).delete();
  await recordingDb.sessions.delete(sessionId);
}
