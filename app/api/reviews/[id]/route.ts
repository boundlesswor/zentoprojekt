import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const reviewId = Number.parseInt(params.id)
    const { searchParams } = new URL(request.url)
    const userTelegramId = searchParams.get("user_id")

    console.log("API отзыва по ID:", { reviewId, userTelegramId })

    if (!reviewId || !userTelegramId) {
      console.log("Неверные параметры:", { reviewId, userTelegramId })
      return NextResponse.json({ error: "Неверные параметры" }, { status: 400 })
    }

    // Проверяем права администратора
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("is_admin")
      .eq("telegram_id", Number.parseInt(userTelegramId))
      .maybeSingle()

    console.log("Проверка пользователя:", { user, userError })

    if (userError || !user?.is_admin) {
      console.log("Нет прав администратора")
      return NextResponse.json({ error: "Нет прав доступа" }, { status: 403 })
    }

    // Получаем отзыв
    const { data: review, error: reviewError } = await supabase
      .from("reviews")
      .select("*")
      .eq("id", reviewId)
      .maybeSingle()

    console.log("Результат поиска отзыва:", { review, reviewError })

    if (reviewError || !review) {
      console.log("Отзыв не найден")
      return NextResponse.json({ error: "Отзыв не найден" }, { status: 404 })
    }

    // Получаем агентство
    const { data: agency } = await supabase.from("agencies").select("name").eq("id", review.agency_id).maybeSingle()

    console.log("Результат:", { review, agency })

    return NextResponse.json({ review, agency })
  } catch (error) {
    console.error("Ошибка получения отзыва:", error)
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 })
  }
}
