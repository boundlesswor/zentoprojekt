-- Исправление дублирования уведомлений и создание системы модерации отзывов

-- 1. Удаляем дубликаты уведомлений
DELETE FROM notifications 
WHERE id NOT IN (
  SELECT MIN(id) 
  FROM notifications 
  GROUP BY user_id, type, related_id, created_at::date
);

-- 2. Создаем уникальный индекс для предотвращения дублей
DROP INDEX IF EXISTS idx_notifications_unique;
CREATE UNIQUE INDEX idx_notifications_unique 
ON notifications (user_id, type, COALESCE(related_id::text, ''), created_at::date);

-- 3. Пересоздаем триггер для агентств с защитой от дублей
DROP TRIGGER IF EXISTS trigger_notify_agency_submitted ON agencies;
DROP FUNCTION IF EXISTS notify_agency_submitted();

CREATE OR REPLACE FUNCTION notify_agency_submitted()
RETURNS TRIGGER AS $$
BEGIN
  -- Создаем уведомления только для администраторов
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
  ON CONFLICT (user_id, type, COALESCE(related_id::text, ''), created_at::date) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_agency_submitted
  AFTER INSERT ON agencies
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION notify_agency_submitted();

-- 4. Создаем триггер для отзывов с защитой от дублей
DROP TRIGGER IF EXISTS trigger_notify_review_submitted ON reviews;
DROP FUNCTION IF EXISTS notify_review_submitted();

CREATE OR REPLACE FUNCTION notify_review_submitted()
RETURNS TRIGGER AS $$
BEGIN
  -- Создаем уведомления только для администраторов
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
  ON CONFLICT (user_id, type, COALESCE(related_id::text, ''), created_at::date) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_review_submitted
  AFTER INSERT ON reviews
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION notify_review_submitted();

-- 5. Создаем RPC функции для модерации отзывов
CREATE OR REPLACE FUNCTION approve_review(p_review_id INTEGER)
RETURNS VOID AS $$
BEGIN
  -- Обновляем статус отзыва
  UPDATE reviews 
  SET status = 'approved', updated_at = NOW()
  WHERE id = p_review_id;
  
  -- Создаем уведомление автору отзыва
  INSERT INTO notifications (user_id, type, title, message, related_id, entity_type)
  SELECT 
    r.user_id,
    'review_approved',
    'Отзыв одобрен',
    'Ваш отзыв прошел модерацию и опубликован',
    r.id,
    'review'
  FROM reviews r
  WHERE r.id = p_review_id
  ON CONFLICT (user_id, type, COALESCE(related_id::text, ''), created_at::date) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION reject_review(p_review_id INTEGER, p_reason TEXT DEFAULT 'Не указана')
RETURNS VOID AS $$
BEGIN
  -- Обновляем статус отзыва
  UPDATE reviews 
  SET status = 'rejected', updated_at = NOW()
  WHERE id = p_review_id;
  
  -- Создаем уведомление автору отзыва с причиной
  INSERT INTO notifications (user_id, type, title, message, related_id, entity_type)
  SELECT 
    r.user_id,
    'review_rejected',
    'Отзыв отклонен',
    'Ваш отзыв отклонен. Причина: ' || p_reason,
    r.id,
    'review'
  FROM reviews r
  WHERE r.id = p_review_id
  ON CONFLICT (user_id, type, COALESCE(related_id::text, ''), created_at::date) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- 6. Проверяем результат
SELECT 'Система модерации отзывов настроена успешно!' as status;
