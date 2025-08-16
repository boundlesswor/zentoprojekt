import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  return handleModeration(request, params)
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  return handleModeration(request, params)
}

async function handleModeration(request: NextRequest, params: { id: string }) {
  try {
    console.log("Входящие параметры:", { params, paramsId: params?.id })

    if (!params || !params.id) {
      console.error("Отсутствуют параметры запроса")
      return NextResponse.json({ error: "Отсутствуют параметры запроса" }, { status: 400 })
    }

    const reviewId = Number.parseInt(params.id)

    let body
    try {
      body = await request.json()
    } catch (jsonError) {
      console.error("Ошибка парсинга JSON:", jsonError)
      return NextResponse.json({ error: "Неверный формат данных" }, { status: 400 })
    }

    const { action, reason } = body || {}

    console.log("Модерация отзыва:", { reviewId, action, reason, body })

    if (!reviewId || isNaN(reviewId)) {
      return NextResponse.json({ error: "Неверный ID отзыва" }, { status: 400 })
    }

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Неверное действие" }, { status: 400 })
    }

    // Получаем отзыв для проверки существования
    const { data: review, error: reviewError } = await supabase
      .from("reviews")
      .select("*")
      .eq("id", reviewId)
      .maybeSingle()

    console.log("Результат запроса отзыва:", { review, reviewError })

    if (reviewError) {
      console.error("Ошибка получения отзыва:", reviewError)
      return NextResponse.json({ error: "Ошибка получения отзыва" }, { status: 500 })
    }

    if (!review) {
      console.log("Отзыв не найден для ID:", reviewId)
      return NextResponse.json({ error: "Отзыв не найден" }, { status: 404 })
    }

    if (!review || typeof review !== "object" || !review.id || !review.user_id) {
      console.error("Отзыв имеет неполные данные:", { review, reviewId: review?.id, userId: review?.user_id })
      return NextResponse.json({ error: "Неполные данные отзыва" }, { status: 500 })
    }

    if (action === "approve") {
      // Прямое обновление статуса отзыва на approved
      const { error: updateError } = await supabase.from("reviews").update({ status: "approved" }).eq("id", reviewId)

      if (updateError) {
        console.error("Ошибка одобрения отзыва:", updateError)
        return NextResponse.json({ error: "Ошибка одобрения отзыва" }, { status: 500 })
      }

      if (review.user_id && typeof review.user_id === "number") {
        const { error: notificationError } = await supabase.from("notifications").insert({
          user_id: review.user_id,
          type: "review_approved",
          title: "Отзыв одобрен",
          message: `Ваш отзыв был одобрен и опубликован`,
          related_id: reviewId,
          entity_type: "review",
        })

        if (notificationError) {
          console.error("Ошибка создания уведомления:", notificationError)
        }
      }
    } else {
      // Прямое обновление статуса отзыва на rejected
      const { error: updateError } = await supabase
        .from("reviews")
        .update({
          status: "rejected",
          rejection_reason: reason || "Не указана",
        })
        .eq("id", reviewId)

      if (updateError) {
        console.error("Ошибка отклонения отзыва:", updateError)
        return NextResponse.json({ error: "Ошибка отклонения отзыва" }, { status: 500 })
      }

      if (review.user_id && typeof review.user_id === "number") {
        const { error: notificationError } = await supabase.from("notifications").insert({
          user_id: review.user_id,
          type: "review_rejected",
          title: "Отзыв отклонен",
          message: `Ваш отзыв был отклонен. Причина: ${reason || "Не указана"}`,
          related_id: reviewId,
          entity_type: "review",
        })

        if (notificationError) {
          console.error("Ошибка создания уведомления:", notificationError)
        }
      }
    }

    console.log(`Отзыв ${reviewId} ${action === "approve" ? "одобрен" : "отклонен"}`)

    return NextResponse.json({
      success: true,
      message: `Отзыв ${action === "approve" ? "одобрен" : "отклонен"}`,
    })
  } catch (error) {
    console.error("Ошибка API модерации отзывов:", error)
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 })
  }
}
