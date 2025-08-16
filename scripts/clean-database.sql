-- Очистка базы данных от тестовых данных
DELETE FROM notifications;
DELETE FROM reviews;
DELETE FROM agencies;
DELETE FROM auth_codes WHERE used = true OR expires_at < NOW();

-- Сброс счетчиков ID
ALTER SEQUENCE notifications_id_seq RESTART WITH 1;
ALTER SEQUENCE reviews_id_seq RESTART WITH 1;
ALTER SEQUENCE agencies_id_seq RESTART WITH 1;

-- Убеждаемся что админ остается в системе
INSERT INTO users (telegram_id, username, first_name, is_admin, created_at) 
VALUES (8159146710, 'admin', 'Admin', true, NOW())
ON CONFLICT (telegram_id) DO UPDATE SET is_admin = true;
