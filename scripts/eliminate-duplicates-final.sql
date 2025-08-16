-- ФИНАЛЬНОЕ УСТРАНЕНИЕ ДУБЛИРОВАНИЯ УВЕДОМЛЕНИЙ
-- Выполните этот скрипт в Supabase SQL Editor

-- 1. Удаляем все существующие дубликаты
DELETE FROM notifications 
WHERE id NOT IN (
    SELECT MIN(id) 
    FROM notifications 
    GROUP BY user_id, type, related_id, entity_type
);

-- 2. Удаляем старые триггеры и функции
DROP TRIGGER IF EXISTS notify_agency_submitted ON agencies;
DROP TRIGGER IF EXISTS notify_review_submitted ON reviews;
DROP FUNCTION IF EXISTS notify_agency_submitted();
DROP FUNCTION IF EXISTS notify_review_submitted();

-- 3. Удаляем старый индекс
DROP INDEX IF EXISTS idx_notifications_unique;

-- 4. Создаем строгий уникальный индекс
CREATE UNIQUE INDEX idx_notifications_no_duplicates 
ON notifications (user_id, type, COALESCE(related_id::text, ''), COALESCE(entity_type, ''));

-- 5. Создаем функцию для безопасного создания уведомлений
CREATE OR REPLACE FUNCTION create_notification_safe(
    p_user_id BIGINT,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_related_id INTEGER DEFAULT NULL,
    p_entity_type TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO notifications (user_id, type, title, message, related_id, entity_type, created_at)
    VALUES (p_user_id, p_type, p_title, p_message, p_related_id, p_entity_type, NOW())
    ON CONFLICT (user_id, type, COALESCE(related_id::text, ''), COALESCE(entity_type, '')) 
    DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- 6. Создаем функцию уведомлений для агентств
CREATE OR REPLACE FUNCTION notify_agency_submitted() RETURNS TRIGGER AS $$
BEGIN
    -- Создаем уведомления только для администраторов
    INSERT INTO notifications (user_id, type, title, message, related_id, entity_type, created_at)
    SELECT 
        u.telegram_id,
        'agency_submitted',
        'Новое агентство на модерации',
        'Проверьте заявку: ' || NEW.name,
        NEW.id,
        'agency',
        NOW()
    FROM users u 
    WHERE u.is_admin = TRUE
    ON CONFLICT (user_id, type, COALESCE(related_id::text, ''), COALESCE(entity_type, '')) 
    DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Создаем функцию уведомлений для отзывов
CREATE OR REPLACE FUNCTION notify_review_submitted() RETURNS TRIGGER AS $$
BEGIN
    -- Создаем уведомления только для администраторов
    INSERT INTO notifications (user_id, type, title, message, related_id, entity_type, created_at)
    SELECT 
        u.telegram_id,
        'new_review',
        'Новый отзыв на модерации',
        'Проверьте отзыв по агентству ID: ' || NEW.agency_id,
        NEW.id,
        'review',
        NOW()
    FROM users u 
    WHERE u.is_admin = TRUE
    ON CONFLICT (user_id, type, COALESCE(related_id::text, ''), COALESCE(entity_type, '')) 
    DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Создаем триггеры
CREATE TRIGGER notify_agency_submitted
    AFTER INSERT ON agencies
    FOR EACH ROW
    WHEN (NEW.status = 'pending')
    EXECUTE FUNCTION notify_agency_submitted();

CREATE TRIGGER notify_review_submitted
    AFTER INSERT ON reviews
    FOR EACH ROW
    WHEN (NEW.status = 'pending')
    EXECUTE FUNCTION notify_review_submitted();

-- 9. Проверяем результат
SELECT 'Дубликаты удалены, уникальный индекс создан, триггеры обновлены' as status;

-- 10. Показываем текущие уведомления
SELECT 
    type,
    COUNT(*) as count,
    COUNT(DISTINCT (user_id, type, related_id, entity_type)) as unique_count
FROM notifications 
GROUP BY type
ORDER BY type;
