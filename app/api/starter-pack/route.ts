import { NextResponse } from "next/server";
import { appendSiteEvent } from "@/lib/site-event-store";

/** GET в адресной строке не отправляет анкету — иначе Chrome показывает «405 / недоступно». */
export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      message:
        'Эндпоинт для отправки анкеты с главной страницы (POST из формы). Открыть URL в вкладке — не отправляет анкету; заполните модалку на сайте и нажмите «Отправить».',
    },
    {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

type LeadPayload = {
  projectStage?: string;
  formatInterest?: string;
  businessModel?: string;
  mainTask?: string;
  timeline?: string;
  telegram?: string;
  source?: string;
  submittedAt?: string;
  planId?: string;
  planLabel?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as LeadPayload;
    const telegramRaw = String(body.telegram ?? "").trim();
    /** Убираем ведущие @ — текст на русском/английском/с точками сохраняем как есть (UTF-8) */
    const telegram = telegramRaw.replace(/^@+/, "");
    if (!telegram) {
      return NextResponse.json({ ok: false, error: "telegram_required" }, { status: 400 });
    }

    const payload = {
      projectStage: String(body.projectStage ?? ""),
      formatInterest: String(body.formatInterest ?? ""),
      businessModel: String(body.businessModel ?? ""),
      mainTask: String(body.mainTask ?? ""),
      timeline: String(body.timeline ?? ""),
      telegram,
      source: String(body.source ?? "unknown"),
      submittedAt: String(body.submittedAt ?? new Date().toISOString()),
      planId: String(body.planId ?? "").trim(),
      planLabel: String(body.planLabel ?? "").trim(),
    };

    await appendSiteEvent("starter_pack_survey_submit", JSON.stringify(payload), new Date());

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/starter-pack]", err);
    return NextResponse.json({ ok: false, error: "save_failed" }, { status: 500 });
  }
}
