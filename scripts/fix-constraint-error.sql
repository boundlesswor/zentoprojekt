-- ИСПРАВЛЕНИЕ ОШИБКИ ON CONFLICT
-- Проблема: отсутствует уникальный индекс для ON CONFLICT в триггерах

-- Проверяем и создаем уникальный индекс для notifications
DROP INDEX IF EXISTS idx_notifications_unique;

-- Создаем правильный уникальный индекс
CREATE UNIQUE INDEX idx_notifications_unique 
ON notifications (user_id, type, COALESCE(related_id::text, ''), COALESCE(entity_type, ''));

-- Пересоздаем функции уведомлений с правильным ON CONFLICT

-- Функция для уведомлений о новых агентствах
CREATE OR REPLACE FUNCTION notify_new_agency() RETURNS TRIGGER AS $$
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
    ON CONFLICT (user_id, type, COALESCE(related_id::text, ''), COALESCE(entity_type, '')) 
    DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Функция для уведомлений о новых отзывах
CREATE OR REPLACE FUNCTION notify_new_review() RETURNS TRIGGER AS $$
BEGIN
    -- Создаем уведомления только для администраторов
    INSERT INTO notifications (user_id, type, title, message, related_id, entity_type)
    SELECT 
        u.telegram_id,
        'review_submitted',
        'Новый отзыв на модерации',
        'Проверьте отзыв по агентству ID: ' || NEW.agency_id,
        NEW.id,
        'review'
    FROM users u 
    WHERE u.is_admin = TRUE
    ON CONFLICT (user_id, type, COALESCE(related_id::text, ''), COALESCE(entity_type, '')) 
    DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Проверяем, что индекс создан
SELECT 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE tablename = 'notifications' 
AND indexname = 'idx_notifications_unique';

-- Диагностика
DO $$
BEGIN
    RAISE NOTICE '✅ Уникальный индекс для notifications создан';
    RAISE NOTICE '✅ Функции уведомлений обновлены';
    RAISE NOTICE '✅ Теперь можно добавлять агентства без ошибок';
END $$;
