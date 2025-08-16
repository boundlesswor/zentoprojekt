-- ИСПРАВЛЕНИЕ ОШИБКИ УНИКАЛЬНОГО ОГРАНИЧЕНИЯ УВЕДОМЛЕНИЙ

-- ШАГ 1: Удаляем старый индекс если существует
DROP INDEX IF EXISTS idx_notifications_unique;

-- ШАГ 2: Очищаем существующие дубликаты
DELETE FROM notifications 
WHERE id NOT IN (
    SELECT DISTINCT ON (user_id, type, COALESCE(related_id::text, ''), COALESCE(entity_type, '')) 
           id
    FROM notifications 
    ORDER BY user_id, type, COALESCE(related_id::text, ''), COALESCE(entity_type, ''), created_at DESC
);

-- ШАГ 3: Создаем правильный уникальный индекс
CREATE UNIQUE INDEX idx_notifications_unique 
ON notifications (user_id, type, COALESCE(related_id::text, ''), COALESCE(entity_type, ''));

-- ШАГ 4: Пересоздаем функции триггеров с правильной логикой

-- Функция для агентств
CREATE OR REPLACE FUNCTION notify_new_agency() RETURNS TRIGGER AS $$
BEGIN
    -- Используем безопасную вставку с ON CONFLICT
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

-- Функция для отзывов
CREATE OR REPLACE FUNCTION notify_new_review() RETURNS TRIGGER AS $$
BEGIN
    -- Используем безопасную вставку с ON CONFLICT
    INSERT INTO notifications (user_id, type, title, message, related_id, entity_type, created_at)
    SELECT 
        u.telegram_id,
        'review_submitted',
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

-- ШАГ 5: Пересоздаем триггеры
DROP TRIGGER IF EXISTS trigger_notify_agency_submitted ON agencies;
DROP TRIGGER IF EXISTS trigger_notify_review_submitted ON reviews;

CREATE TRIGGER trigger_notify_agency_submitted
    AFTER INSERT ON agencies
    FOR EACH ROW
    WHEN (NEW.status = 'pending')
    EXECUTE FUNCTION notify_new_agency();

CREATE TRIGGER trigger_notify_review_submitted
    AFTER INSERT ON reviews
    FOR EACH ROW
    WHEN (NEW.status = 'pending')
    EXECUTE FUNCTION notify_new_review();

-- ШАГ 6: Проверка
DO $$
DECLARE
    index_exists BOOLEAN;
    duplicate_count INTEGER;
BEGIN
    -- Проверяем существование индекса
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_notifications_unique'
    ) INTO index_exists;
    
    -- Проверяем дубликаты
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT user_id, type, COALESCE(related_id::text, ''), COALESCE(entity_type, ''), COUNT(*)
        FROM notifications
        GROUP BY user_id, type, COALESCE(related_id::text, ''), COALESCE(entity_type, '')
        HAVING COUNT(*) > 1
    ) duplicates;
    
    RAISE NOTICE '=== ПРОВЕРКА ИСПРАВЛЕНИЙ ===';
    RAISE NOTICE 'Уникальный индекс создан: %', index_exists;
    RAISE NOTICE 'Дубликатов найдено: %', duplicate_count;
    
    IF index_exists AND duplicate_count = 0 THEN
        RAISE NOTICE '✅ Проблема с уникальным ограничением исправлена!';
    ELSE
        RAISE NOTICE '❌ Требуется дополнительная настройка';
    END IF;
END $$;
</sql>
