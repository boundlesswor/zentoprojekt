-- Скрипт для назначения администратора
-- Заменил YOUR_TELEGRAM_ID на реальный Telegram ID пользователя

-- Назначение администратором пользователя с Telegram ID: 8159146710
UPDATE users 
SET is_admin = TRUE 
WHERE telegram_id = 8159146710;

-- Если пользователя еще нет в базе, создайте его:
INSERT INTO users (telegram_id, username, first_name, is_admin) 
VALUES (8159146710, 'admin', 'Admin', TRUE)
ON CONFLICT (telegram_id) DO UPDATE SET is_admin = TRUE;

-- Проверить статус администратора:
SELECT telegram_id, username, first_name, is_admin FROM users WHERE is_admin = TRUE;
