-- Исправление прав администратора для пользователя
-- Обновляем статус администратора для вашего Telegram ID

UPDATE users 
SET is_admin = TRUE 
WHERE telegram_id = 8159146710;

-- Проверяем результат
SELECT 
    telegram_id,
    username,
    first_name,
    is_admin,
    created_at
FROM users 
WHERE telegram_id = 8159146710;

-- Показываем всех администраторов
SELECT 
    telegram_id,
    username,
    first_name,
    is_admin
FROM users 
WHERE is_admin = TRUE;
