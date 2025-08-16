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
    console.log("API модерации вызван с params:", params)

    const agencyId = params.id
    console.log("Agency ID:", agencyId)

    const body = await request.json()
    console.log("Request body:", body)

    const { action, reason } = body

    if (!agencyId) {
      return NextResponse.json({ error: "ID агентства не указан" }, { status: 400 })
    }

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Неверное действие" }, { status: 400 })
    }

    if (action === "approve") {
      console.log("Одобряем агентство:", agencyId)

      const { data: agency } = await supabase.from("agencies").select("name, submitted_by").eq("id", agencyId).single()

      const { error } = await supabase.from("agencies").update({ status: "approved" }).eq("id", agencyId)

      if (error) {
        console.error("Ошибка одобрения агентства:", error)
        return NextResponse.json({ error: "Ошибка одобрения агентства" }, { status: 500 })
      }

      if (agency?.submitted_by) {
        await supabase.from("notifications").insert({
          user_id: agency.submitted_by,
          type: "agency_approved",
          title: "Агентство одобрено",
          message: `Ваше агентство "${agency.name}" было одобрено и добавлено в каталог`,
          related_id: agencyId,
          entity_type: "agency",
        })
      }
    } else {
      console.log("Отклоняем агентство:", agencyId, "с причиной:", reason)

      const { data: agency } = await supabase.from("agencies").select("name, submitted_by").eq("id", agencyId).single()

      const { error } = await supabase.from("agencies").update({ status: "rejected" }).eq("id", agencyId)

      if (error) {
        console.error("Ошибка отклонения агентства:", error)
        return NextResponse.json({ error: "Ошибка отклонения агентства" }, { status: 500 })
      }

      if (agency?.submitted_by) {
        await supabase.from("notifications").insert({
          user_id: agency.submitted_by,
          type: "agency_rejected",
          title: "Агентство отклонено",
          message: `Ваше агентство "${agency.name}" было отклонено. Причина: ${reason || "Не указана"}`,
          related_id: agencyId,
          entity_type: "agency",
        })
      }
    }

    const { data: updatedAgency } = await supabase.from("agencies").select("*").eq("id", agencyId).maybeSingle()

    console.log("Модерация завершена успешно")

    return NextResponse.json({
      success: true,
      message: `Агентство ${action === "approve" ? "одобрено" : "отклонено"}`,
      agency: updatedAgency,
    })
  } catch (error) {
    console.error("Ошибка API модерации:", error)
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 })
  }
}
