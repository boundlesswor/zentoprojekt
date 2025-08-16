import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const agencyId = params.id
    const url = new URL(request.url)
    const userTelegramId = url.searchParams.get("user_id")

    console.log("=== API DEBUG ===")
    console.log("Agency ID:", agencyId)
    console.log("User Telegram ID:", userTelegramId)

    if (!agencyId) {
      return NextResponse.json({ error: "ID агентства не указан" }, { status: 400 })
    }

    const { data: agency, error } = await supabase.from("agencies").select("*").eq("id", agencyId).maybeSingle()

    console.log("Agency query result:", { agency, error })

    if (error) {
      console.error("Ошибка загрузки агентства:", error)
      return NextResponse.json({ error: "Ошибка загрузки агентства" }, { status: 500 })
    }

    if (!agency) {
      console.log("Agency not found")
      return NextResponse.json({ error: "Агентство не найдено" }, { status: 404 })
    }

    if (agency.status !== "approved" && userTelegramId) {
      const { data: user } = await supabase
        .from("users")
        .select("is_admin")
        .eq("telegram_id", userTelegramId)
        .maybeSingle()

      console.log("User query result:", user)

      // Если пользователь не админ и не владелец агентства, показываем только approved
      if (!user?.is_admin && agency.submitted_by !== Number.parseInt(userTelegramId)) {
        console.log("Access denied: not admin and not owner")
        return NextResponse.json({ error: "Агентство не найдено" }, { status: 404 })
      }
    }

    const { data: reviewStats } = await supabase
      .from("reviews")
      .select("rating")
      .eq("agency_id", agencyId)
      .eq("status", "approved")

    let calculatedRating = 0
    let reviewsCount = 0

    if (reviewStats && reviewStats.length > 0) {
      reviewsCount = reviewStats.length
      const totalRating = reviewStats.reduce((sum, review) => sum + review.rating, 0)
      calculatedRating = Math.round((totalRating / reviewsCount) * 10) / 10 // Округляем до 1 знака после запятой
    }

    // Обновляем агентство с актуальным рейтингом
    const updatedAgency = {
      ...agency,
      rating: calculatedRating,
      reviews_count: reviewsCount,
    }

    console.log("Access granted, returning agency with calculated rating:", {
      rating: calculatedRating,
      reviews_count: reviewsCount,
    })
    return NextResponse.json(updatedAgency)
  } catch (error) {
    console.error("Ошибка API:", error)
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 })
  }
}
