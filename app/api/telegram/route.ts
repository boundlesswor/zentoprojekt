import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`

// Генерация 6-значного кода
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Отправка сообщения в Telegram
async function sendTelegramMessage(chatId: number, text: string) {
  try {
    const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: "HTML",
      }),
    })
    return await response.json()
  } catch (error) {
    console.error("Error sending Telegram message:", error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (body.message) {
      const { chat, from, text } = body.message
      const chatId = chat.id
      const userId = from.id
      const username = from.username
      const firstName = from.first_name
      const lastName = from.last_name

      // Команда /start
      if (text === "/start") {
        // Проверяем, есть ли пользователь в базе
        const { data: existingUser } = await supabase.from("users").select("*").eq("telegram_id", userId).single()

        if (!existingUser) {
          // Создаем нового пользователя
          await supabase.from("users").insert({
            telegram_id: userId,
            username: username,
            first_name: firstName,
            last_name: lastName,
            is_admin: false,
          })
        }

        await sendTelegramMessage(
          chatId,
          `🚀 <b>Добро пожаловать в ZENTO!</b>\n\n` +
            `Для получения кода авторизации отправьте команду:\n` +
            `<code>/code</code>\n\n` +
            `Код будет действителен 3 дня.`,
        )
      }

      // Команда /code - генерация кода авторизации
      else if (text === "/code") {
        const code = generateCode()
        const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 дня

        // Сохраняем код в базу
        const { error } = await supabase.from("auth_codes").insert({
          code: code,
          telegram_id: userId,
          expires_at: expiresAt.toISOString(),
        })

        if (error) {
          console.error("Error saving auth code:", error)
          await sendTelegramMessage(chatId, "❌ Ошибка генерации кода. Попробуйте позже.")
        } else {
          await sendTelegramMessage(
            chatId,
            `🔐 <b>Ваш код авторизации:</b>\n\n` +
              `<code>${code}</code>\n\n` +
              `⏰ Код действителен 3 дня\n` +
              `🌐 Введите его на сайте ZENTO для входа`,
          )
        }
      } else {
        await sendTelegramMessage(
          chatId,
          `ℹ️ Доступные команды:\n\n` +
            `<code>/start</code> - начать работу\n` +
            `<code>/code</code> - получить код авторизации`,
        )
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Telegram webhook error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
