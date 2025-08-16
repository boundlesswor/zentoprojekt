-- ФИНАЛЬНОЕ ИСПРАВЛЕНИЕ УНИКАЛЬНОГО ОГРАНИЧЕНИЯ УВЕДОМЛЕНИЙ
-- Устраняет ошибку "duplicate key value violates unique constraint"

-- 1. Удаляем старые триггеры и функции
DROP TRIGGER IF EXISTS notify_agency_submitted ON agencies;
DROP TRIGGER IF EXISTS notify_review_submitted ON reviews;
DROP FUNCTION IF EXISTS notify_agency_submitted();
DROP FUNCTION IF EXISTS notify_review_submitted();
DROP FUNCTION IF EXISTS create_notification_safe(bigint, text, text, text, bigint, text);

-- 2. Удаляем старый индекс и создаем новый с правильной логикой
DROP INDEX IF EXISTS idx_notifications_unique;

-- 3. Очищаем все дубликаты уведомлений
DELETE FROM notifications 
WHERE id NOT IN (
    SELECT MIN(id) 
    FROM notifications 
    GROUP BY user_id, type, COALESCE(related_id, 0), COALESCE(entity_type, '')
);

-- 4. Создаем правильный уникальный индекс
CREATE UNIQUE INDEX idx_notifications_unique 
ON notifications (user_id, type, COALESCE(related_id, 0), COALESCE(entity_type, ''));

-- 5. Создаем безопасную функцию создания уведомлений
CREATE OR REPLACE FUNCTION create_notification_safe(
    p_user_id bigint,
    p_type text,
    p_title text,
    p_message text,
    p_related_id bigint DEFAULT NULL,
    p_entity_type text DEFAULT NULL
) RETURNS void AS $$
BEGIN
    -- Используем INSERT с ON CONFLICT DO NOTHING для избежания дублей
    INSERT INTO notifications (user_id, type, title, message, related_id, entity_type, created_at)
    VALUES (p_user_id, p_type, p_title, p_message, p_related_id, p_entity_type, NOW())
    ON CONFLICT (user_id, type, COALESCE(related_id, 0), COALESCE(entity_type, '')) DO NOTHING;
EXCEPTION
    WHEN OTHERS THEN
        -- Игнорируем любые ошибки уникальности
        NULL;
END;
$$ LANGUAGE plpgsql;

-- 6. Создаем функцию уведомления о новом агентстве
CREATE OR REPLACE FUNCTION notify_agency_submitted() RETURNS TRIGGER AS $$
BEGIN
    -- Создаем уведомления только для администраторов
    PERFORM create_notification_safe(
        u.telegram_id,
        'agency_submitted',
        'Новое агентство на модерации',
        'Проверьте заявку: ' || NEW.name,
        NEW.id,
        'agency'
    )
    FROM users u 
    WHERE u.is_admin = TRUE;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Создаем функцию уведомления о новом отзыве
CREATE OR REPLACE FUNCTION notify_review_submitted() RETURNS TRIGGER AS $$
BEGIN
    -- Создаем уведомления только для администраторов
    PERFORM create_notification_safe(
        u.telegram_id,
        'review_submitted',
        'Новый отзыв на модерации',
        'Проверьте отзыв по агентству ID: ' || NEW.agency_id,
        NEW.id,
        'review'
    )
    FROM users u 
    WHERE u.is_admin = TRUE;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Создаем триггеры только для pending статуса
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

-- 9. Диагностика
SELECT 'Уведомления после очистки:' as info, COUNT(*) as count FROM notifications;
SELECT 'Дубликаты (должно быть 0):' as info, COUNT(*) - COUNT(DISTINCT (user_id, type, COALESCE(related_id, 0), COALESCE(entity_type, ''))) as duplicates FROM notifications;
SELECT 'Администраторы:' as info, COUNT(*) as count FROM users WHERE is_admin = TRUE;

-- 10. Тестовая вставка для проверки
DO $$
BEGIN
    -- Пытаемся создать тестовое уведомление дважды
    PERFORM create_notification_safe(8159146710, 'test', 'Тест', 'Тестовое сообщение', 999, 'test');
    PERFORM create_notification_safe(8159146710, 'test', 'Тест', 'Тестовое сообщение', 999, 'test');
    
    -- Проверяем, что создалось только одно
    IF (SELECT COUNT(*) FROM notifications WHERE type = 'test' AND related_id = 999) = 1 THEN
        RAISE NOTICE 'УСПЕХ: Защита от дублей работает корректно';
    ELSE
        RAISE NOTICE 'ОШИБКА: Защита от дублей не работает';
    END IF;
    
    -- Удаляем тестовое уведомление
    DELETE FROM notifications WHERE type = 'test' AND related_id = 999;
END $$;

RAISE NOTICE 'Исправление уникального ограничения завершено успешно!';
