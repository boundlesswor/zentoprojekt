import { type NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "Файл не предоставлен" }, { status: 400 })
    }

    const timestamp = Math.round(Date.now() / 1000)
    const apiSecret = process.env.CLOUDINARY_API_SECRET!

    // Параметры в алфавитном порядке, разделенные &, затем API secret
    const stringToSign = `timestamp=${timestamp}&${apiSecret}`
    const signature = crypto.createHash("sha1").update(stringToSign).digest("hex")

    const cloudinaryFormData = new FormData()
    cloudinaryFormData.append("file", file)
    cloudinaryFormData.append("api_key", process.env.CLOUDINARY_API_KEY!)
    cloudinaryFormData.append("timestamp", timestamp.toString())
    cloudinaryFormData.append("signature", signature)

    const response = await fetch(`https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: "POST",
      body: cloudinaryFormData,
    })

    const result = await response.json()

    if (!response.ok) {
      console.error("Cloudinary error details:", result)
      throw new Error(`Cloudinary API error: ${response.status} - ${result.error?.message || "Unknown error"}`)
    }

    return NextResponse.json({
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
    })
  } catch (error) {
    console.error("Cloudinary upload error:", error)
    return NextResponse.json({ error: "Ошибка загрузки изображения" }, { status: 500 })
  }
}
