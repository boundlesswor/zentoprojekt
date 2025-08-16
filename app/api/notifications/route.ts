import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("user_id")

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Ошибка загрузки уведомлений:", error)
      if (error.message.includes("does not exist") || error.message.includes("schema cache")) {
        return NextResponse.json([])
      }
      return NextResponse.json({ error: "Ошибка загрузки уведомлений" }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error("Ошибка API:", error)
    return NextResponse.json([]) // возвращаем пустой массив вместо ошибки
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, type, title, message, relatedId } = body

    const { data, error } = await supabase
      .from("notifications")
      .insert([
        {
          user_id: userId,
          type,
          title,
          message,
          related_id: relatedId,
          is_read: false,
        },
      ])
      .select()

    if (error) {
      console.error("Ошибка создания уведомления:", error)
      return NextResponse.json({ error: "Ошибка создания уведомления" }, { status: 500 })
    }

    return NextResponse.json({ success: true, notification: data[0] })
  } catch (error) {
    console.error("Ошибка API:", error)
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { notificationId, isRead } = body

    const { error } = await supabase.from("notifications").update({ is_read: isRead }).eq("id", notificationId)

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
