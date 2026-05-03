import { constants as fsConstants } from "node:fs";
import { mkdir, appendFile, readFile, access } from "node:fs/promises";
import path from "node:path";

/** События для аналитики и лидов: без Postgres/SQLite — только файл на том же сервере, где крутится Node. */

export type StoredEventRecord = {
  id: number;
  event: string;
  data: string | null;
  createdAt: Date;
};

type JsonlRow = {
  event: string;
  data: string | null;
  createdAt: string;
};

const DATA_DIR = path.join(process.cwd(), "data");
const PRIMARY_STORE = path.join(DATA_DIR, "site-events.jsonl");
/** Старый запасной лог (если когда-то падала запись в БД) — читаем только для исторических строк */
const LEGACY_FALLBACK_LOG = path.join(process.cwd(), ".event-fallback.log");

const DEFAULT_READ_TAIL = 25_000;

async function ensureDataDir(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
}

export async function appendSiteEvent(event: string, data: string | null, createdAt: Date): Promise<void> {
  await ensureDataDir();
  const row: JsonlRow = {
    event,
    data,
    createdAt: createdAt.toISOString(),
  };
  await appendFile(PRIMARY_STORE, `${JSON.stringify(row)}\n`, "utf8");
}

async function readJsonlTail(filePath: string, maxLines: number): Promise<JsonlRow[]> {
  try {
    const raw = await readFile(filePath, "utf8");
    if (!raw.trim()) return [];
    const lines = raw
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(-maxLines);
    const out: JsonlRow[] = [];
    for (const line of lines) {
      try {
        const p = JSON.parse(line) as JsonlRow;
        if (typeof p.event === "string" && typeof p.createdAt === "string") {
          out.push({
            event: p.event,
            data: typeof p.data === "string" ? p.data : p.data == null ? null : JSON.stringify(p.data),
            createdAt: p.createdAt,
          });
        }
      } catch {
        /* skip malformed */
      }
    }
    return out;
  } catch {
    return [];
  }
}

/** Проверка: каталог data доступен на запись */
export async function checkSiteEventStorageHealthy(): Promise<boolean> {
  try {
    await ensureDataDir();
    await access(DATA_DIR, fsConstants.R_OK | fsConstants.W_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * События с указанной даты (UTC сравнение по Date).
 * Объединяет `data/site-events.jsonl` и легаси `.event-fallback.log`.
 */
export async function readSiteEventsSince(
  since: Date,
  options?: { maxLinesEach?: number },
): Promise<StoredEventRecord[]> {
  const max = options?.maxLinesEach ?? DEFAULT_READ_TAIL;
  const [primary, legacy] = await Promise.all([
    readJsonlTail(PRIMARY_STORE, max),
    readJsonlTail(LEGACY_FALLBACK_LOG, max),
  ]);
  const raw = [...legacy, ...primary];
  const asRecords: Omit<StoredEventRecord, "id">[] = [];
  for (const row of raw) {
    let createdAt: Date;
    try {
      createdAt = new Date(row.createdAt);
      if (Number.isNaN(createdAt.getTime())) continue;
    } catch {
      continue;
    }
    if (createdAt < since) continue;
    asRecords.push({
      event: row.event,
      data: row.data,
      createdAt,
    });
  }
  asRecords.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  return asRecords.map((e, i) => ({
    id: i + 1,
    event: e.event,
    data: e.data,
    createdAt: e.createdAt,
  }));
}
