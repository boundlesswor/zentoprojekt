import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

function dataUrlToBuffer(dataUrl: string) {
  const base64 = dataUrl.split(",")[1] || ""
  return Buffer.from(base64, "base64")
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, type, country, fullDescription, logoUrl, submittedBy } = body

    console.log("Получена заявка на добавление агентства:", { name, type, country, submittedBy })

    const processedLogoUrl = logoUrl || "/abstract-agency-logo.png"

    const validatedData = {
      name: name?.slice(0, 255) || "",
      type: type?.slice(0, 100) || "",
      country: country?.slice(0, 100) || "",
      description: fullDescription?.slice(0, 2000) || "",
      logo_url: processedLogoUrl,
      status: "pending",
      submitted_by: submittedBy,
      rating: 0,
      reviews_count: 0,
    }

    const { data, error } = await supabase.from("agencies").insert([validatedData]).select()

    if (error) {
      console.error("Ошибка сохранения агентства:", error)
      return NextResponse.json(
        {
          error: `Ошибка сохранения агентства: ${error.message}`,
        },
        { status: 500 },
      )
    }

    console.log("Агентство успешно сохранено:", data)
    return NextResponse.json({ success: true, agency: data[0] })
  } catch (error) {
    console.error("Ошибка API:", error)
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const submittedBy = searchParams.get("submitted_by")

    console.log("GET запрос агентств:", { status, submittedBy })

    let query = supabase.from("agencies").select(`
        *,
        reviews(rating, status)
      `)

    if (submittedBy) {
      query = query.eq("submitted_by", Number.parseInt(submittedBy))
    }

    if (status) {
      query = query.eq("status", status)
    } else if (!submittedBy) {
      query = query.eq("status", "approved")
    }

    query = query.order("created_at", { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error("Ошибка загрузки агентств:", error)
      return NextResponse.json({ error: "Ошибка загрузки агентств" }, { status: 500 })
    }

    const agenciesWithRating = (data || []).map((agency: any) => {
      const approvedReviews = (agency.reviews || []).filter((review: any) => review.status === "approved")
      const reviewsCount = approvedReviews.length
      const averageRating =
        reviewsCount > 0
          ? Number(
              (approvedReviews.reduce((sum: number, review: any) => sum + review.rating, 0) / reviewsCount).toFixed(1),
            )
          : 0

      return {
        ...agency,
        rating: averageRating,
        reviews_count: reviewsCount,
        reviews: undefined,
      }
    })

    console.log("Загружено агентств с динамическим рейтингом:", agenciesWithRating.length)
    return NextResponse.json(agenciesWithRating)
  } catch (error) {
    console.error("Ошибка API:", error)
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 })
  }
}
