import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const notificationId = params.id
    const body = await request.json()
    const { is_read } = body

    if (!notificationId) {
      return NextResponse.json({ error: "ID уведомления не указан" }, { status: 400 })
    }

    const { error } = await supabase.from("notifications").update({ is_read }).eq("id", notificationId)

    if (error) {
      console.error("Ошибка обновления уведомления:", error)
      return NextResponse.json({ error: "Ошибка обновления уведомления" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Ошибка API:", error)
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 })
  }
}
