-- Проверяем статус администратора для пользователя
SELECT telegram_id, username, first_name, is_admin 
FROM users 
WHERE telegram_id = 8159146710;

-- Если пользователь не найден или не является админом, исправляем
INSERT INTO users (telegram_id, username, first_name, is_admin) 
VALUES (8159146710, 'admin', 'Admin', true)
ON CONFLICT (telegram_id) 
DO UPDATE SET is_admin = true;

-- Проверяем все уведомления для этого пользователя
SELECT * FROM notifications WHERE user_id = 8159146710 ORDER BY created_at DESC;
