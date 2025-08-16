-- Очистка старых уведомлений для чистого тестирования
-- Выполните этот скрипт в Supabase SQL Editor

-- Удаляем все старые уведомления
DELETE FROM notifications;

-- Сбрасываем автоинкремент ID (начнется с 1)
ALTER SEQUENCE notifications_id_seq RESTART WITH 1;

-- Проверяем результат
SELECT COUNT(*) as total_notifications FROM notifications;

-- Показываем структуру таблицы для проверки
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'notifications' 
ORDER BY ordinal_position;
