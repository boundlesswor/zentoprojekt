export default function CheckAdminPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-white mb-6">Проверка прав администратора</h1>

        <div className="space-y-4">
          <p className="text-white/80">1. Выполните SQL скрипт в Supabase</p>
          <p className="text-white/80">2. Выйдите из аккаунта (кнопка выхода в правом верхнем углу)</p>
          <p className="text-white/80">3. Войдите заново через Telegram бот</p>
          <p className="text-white/80">4. Проверьте доступ к модерации</p>
        </div>

        <div className="mt-6 p-4 bg-yellow-500/20 rounded-lg">
          <p className="text-yellow-200 text-sm">
            Права администратора обновляются только после повторного входа в систему
          </p>
        </div>
      </div>
    </div>
  )
}
