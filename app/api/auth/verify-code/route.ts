import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Важно для Vercel/Next:
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Берём URL
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

// На сервере лучше сервис-ключ (если задан), иначе падаем на anon:
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || ""
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

// Никогда не светим service key в браузере — здесь он остаётся только на сервере.
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE || ANON_KEY)

function maskKey(k?: string) {
  if (!k) return "missing"
  return k === SERVICE_ROLE ? "service-role-present" : "anon-key-present"
}

async function handle(req: Request) {
  try {
    // Тело запроса (для POST), не падаем на GET
    const body = await req.json().catch(() => ({}) as any)
    const code: string | undefined = body?.code?.toString()

    // Что видит рантайм (безопасный пробник)
    const envProbe = {
      url: SUPABASE_URL ? SUPABASE_URL.slice(0, 30) + "..." : "missing",
      key: maskKey(SERVICE_ROLE || ANON_KEY),
      usingServiceRole: Boolean(SERVICE_ROLE),
    }

    // Последние 10 записей (для быстрой диагностики)
    const { data: latest, error: latestErr } = await supabase
      .from("auth_codes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10)

    // Режим просмотра: GET/POST ?peek=1 — просто показать снимок БД/окружения
    const u = new URL(req.url)
    if (u.searchParams.get("peek") === "1") {
      return NextResponse.json({
        ok: true,
        envProbe,
        sampleCount: latest?.length ?? 0,
        latest,
        latestErr,
        hint: "POST сюда с { code } для проверки конкретного кода",
      })
    }

    // Без кода — ошибка
    if (!code) {
      return NextResponse.json(
        {
          ok: false,
          error: "NO_CODE",
          envProbe,
          sampleCount: latest?.length ?? 0,
        },
        { status: 400 },
      )
    }

    // 1) Точное совпадение + used=false
    let found: any = null
    let directErr: any = null

    const { data, error } = await supabase
      .from("auth_codes")
      .select("*")
      .eq("code", code.trim())
      .eq("used", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    found = data ?? null
    directErr = error ?? null

    // 2) Фоллбек: без учёта регистра (и всё ещё used=false)
    if (!found) {
      const { data: ilike, error: ilikeErr } = await supabase
        .from("auth_codes")
        .select("*")
        .eq("used", false)
        .ilike("code", code.trim())
        .order("created_at", { ascending: false })
        .limit(1)

      if (ilike && ilike.length > 0) found = ilike[0]
      if (ilikeErr) directErr = ilikeErr
    }

    if (!found) {
      return NextResponse.json(
        {
          ok: false,
          error: "CODE_NOT_FOUND",
          envProbe,
          searched: code,
          sampleCount: latest?.length ?? 0,
          latest,
          directErr,
        },
        { status: 400 },
      )
    }

    // Срок действия (предположим, поле timestamptz)
    if (found.expires_at && new Date(found.expires_at) <= new Date()) {
      return NextResponse.json({ ok: false, error: "CODE_EXPIRED", found }, { status: 400 })
    }

    // Отметить использованным
    const { error: updErr } = await supabase.from("auth_codes").update({ used: true }).eq("id", found.id)

    if (updErr) {
      return NextResponse.json({ ok: false, error: "UPDATE_FAILED", detail: updErr.message, found }, { status: 500 })
    }

    // Получаем данные пользователя
    let { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("telegram_id", found.telegram_id)
      .maybeSingle()

    // Если пользователь не найден, создаем его автоматически
    if (!user) {
      const { data: inserted, error: insErr } = await supabase
        .from("users")
        .insert({
          telegram_id: found.telegram_id,
          username: null,
          first_name: null,
          last_name: null,
          is_admin: false,
        })
        .select("*")
        .single()

      if (insErr) {
        return NextResponse.json({ ok: false, error: "USER_CREATE_FAILED", detail: insErr.message }, { status: 500 })
      }
      user = inserted
    }

    return NextResponse.json({
      ok: true,
      success: true,
      user: {
        id: user.id,
        telegram_id: user.telegram_id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        is_admin: user.is_admin,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "INTERNAL", detail: e?.message ?? String(e) }, { status: 500 })
  }
}

export async function GET(req: Request) {
  return handle(req)
}
export async function POST(req: Request) {
  return handle(req)
}
