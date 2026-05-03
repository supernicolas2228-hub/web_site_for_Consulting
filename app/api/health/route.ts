import { NextResponse } from "next/server";
import { checkSiteEventStorageHealthy } from "@/lib/site-event-store";

export const dynamic = "force-dynamic";

/** Диагностика деплоя: есть ли возможность писать события в data/ на диске сервера. */
export async function GET() {
  const database = await checkSiteEventStorageHealthy();

  return NextResponse.json({
    ok: true,
    database,
    storageFile: database,
    note: database
      ? undefined
      : "Папка data/ недоступна для записи — проверьте права и рабочий каталог процесса Node.",
  });
}
