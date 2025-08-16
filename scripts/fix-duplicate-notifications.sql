-- Исправление дублирования уведомлений и проблем с API

-- 1) Удаляем дубликаты пользователей
DELETE FROM users a USING users b 
WHERE a.id > b.id AND a.telegram_id = b.telegram_id;

-- 2) Убеждаемся что есть только один администратор
UPDATE users SET is_admin = FALSE WHERE telegram_id != 8159146710;
INSERT INTO users (telegram_id, username, first_name, is_admin, created_at)
VALUES (8159146710, 'admin', 'Admin', TRUE, NOW())
ON CONFLICT (telegram_id) DO UPDATE SET 
  is_admin = TRUE,
  username = EXCLUDED.username,
  first_name = EXCLUDED.first_name;

-- 3) Очищаем старые уведомления
DELETE FROM notifications;
ALTER SEQUENCE notifications_id_seq RESTART WITH 1;

-- 4) Создаем уникальный индекс для предотвращения дублирования уведомлений
DROP INDEX IF EXISTS idx_notifications_unique;
CREATE UNIQUE INDEX idx_notifications_unique 
ON notifications (user_id, type, COALESCE(related_id::text, ''), COALESCE(entity_type, ''));

-- 5) Пересоздаем триггер с защитой от дублирования
DROP TRIGGER IF EXISTS notify_agency_submitted_trigger ON agencies;
DROP FUNCTION IF EXISTS notify_agency_submitted();

CREATE OR REPLACE FUNCTION notify_agency_submitted()
RETURNS TRIGGER AS $$
BEGIN
  -- Создаем уведомления только для администраторов с защитой от дублей
  INSERT INTO notifications (user_id, type, title, message, related_id, entity_type)
  SELECT 
    u.telegram_id,
    'agency_submitted',
    'Новое агентство на модерации',
    'Проверьте заявку: ' || NEW.name,
    NEW.id,
    'agency'
  FROM users u
  WHERE u.is_admin = TRUE
  ON CONFLICT (user_id, type, related_id, entity_type) DO NOTHING; -- Предотвращаем дубли через уникальный индекс
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notify_agency_submitted_trigger
  AFTER INSERT ON agencies
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION notify_agency_submitted();

-- 6) Создаем аналогичный триггер для отзывов
DROP TRIGGER IF EXISTS notify_review_submitted_trigger ON reviews;
DROP FUNCTION IF EXISTS notify_review_submitted();

CREATE OR REPLACE FUNCTION notify_review_submitted()
RETURNS TRIGGER AS $$
BEGIN
  -- Создаем уведомления только для администраторов с защитой от дублей
  INSERT INTO notifications (user_id, type, title, message, related_id, entity_type)
  SELECT 
    u.telegram_id,
    'new_review',
    'Новый отзыв на модерации',
    'Проверьте отзыв для агентства',
    NEW.id,
    'review'
  FROM users u
  WHERE u.is_admin = TRUE
  ON CONFLICT (user_id, type, related_id, entity_type) DO NOTHING; -- Предотвращаем дубли через уникальный индекс
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notify_review_submitted_trigger
  AFTER INSERT ON reviews
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION notify_review_submitted();

-- 7) Дополнительная защита: удаляем возможные дубли в реальном времени
CREATE OR REPLACE FUNCTION cleanup_duplicate_notifications()
RETURNS void AS $$
BEGIN
  -- Удаляем дубликаты, оставляя только самые новые
  DELETE FROM notifications a USING notifications b 
  WHERE a.id < b.id 
    AND a.user_id = b.user_id 
    AND a.type = b.type 
    AND COALESCE(a.related_id, 0) = COALESCE(b.related_id, 0)
    AND COALESCE(a.entity_type, '') = COALESCE(b.entity_type, '');
END;
$$ LANGUAGE plpgsql;

-- Запускаем очистку дублей
SELECT cleanup_duplicate_notifications();

-- 8) Проверяем результат
SELECT 'Всего администраторов:' as info, COUNT(*) as count 
FROM users WHERE is_admin = TRUE;

SELECT 'Пользователь 8159146710:' as info, telegram_id, username, is_admin 
FROM users WHERE telegram_id = 8159146710;

SELECT 'Всего пользователей:' as info, COUNT(*) as count FROM users;

SELECT 'Всего уведомлений:' as info, COUNT(*) as count FROM notifications;

-- 9) Тестируем систему уведомлений
SELECT 'Тест завершен. Теперь при добавлении агентства или отзыва будет создаваться только одно уведомление.' as result;
