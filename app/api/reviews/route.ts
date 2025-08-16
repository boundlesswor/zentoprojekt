import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const agencyId = searchParams.get("agencyId")
    const status = searchParams.get("status") || "approved"

    let query = supabase.from("reviews").select(`
        *,
        agencies!inner(name)
      `)

    // Фильтруем по пользователю если указан
    if (userId) {
      query = query.eq("user_id", userId)
    }

    // Фильтруем по агентству если указано
    if (agencyId) {
      query = query.eq("agency_id", agencyId)
    }

    // Фильтруем по статусу
    if (status) {
      query = query.eq("status", status)
    }

    query = query.order("created_at", { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error("Ошибка загрузки отзывов:", error)
      return NextResponse.json({ error: "Ошибка загрузки отзывов" }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error("Ошибка API:", error)
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { agencyId, userId, firstName, lastName, country, rating, comment } = body

    // Проверяем, не оставлял ли пользователь уже отзыв для этого агентства
    const { data: existingReview } = await supabase
      .from("reviews")
      .select("id")
      .eq("agency_id", agencyId)
      .eq("user_id", userId)
      .maybeSingle()

    if (existingReview) {
      return NextResponse.json({ error: "Вы уже оставили отзыв для этого агентства" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("reviews")
      .insert([
        {
          agency_id: agencyId,
          user_id: userId,
          first_name: firstName,
          last_name: lastName,
          country,
          rating,
          comment,
          status: "pending",
        },
      ])
      .select()

    if (error) {
      console.error("Ошибка создания отзыва:", error)
      return NextResponse.json({ error: "Ошибка создания отзыва" }, { status: 500 })
    }

    return NextResponse.json({ success: true, review: data[0] })
  } catch (error) {
    console.error("Ошибка API:", error)
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 })
  }
}
