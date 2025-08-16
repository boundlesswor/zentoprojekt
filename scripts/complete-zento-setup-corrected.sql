-- ===================================================================
-- ПОЛНАЯ НАСТРОЙКА СИСТЕМЫ ZENTO БЕЗ ДУБЛИРОВАНИЯ УВЕДОМЛЕНИЙ
-- ===================================================================

-- 1. ОЧИСТКА СТАРЫХ ОБЪЕКТОВ
DROP TRIGGER IF EXISTS notify_agency_submitted_trigger ON agencies;
DROP TRIGGER IF EXISTS notify_review_submitted_trigger ON reviews;
DROP FUNCTION IF EXISTS notify_agency_submitted();
DROP FUNCTION IF EXISTS notify_review_submitted();
DROP FUNCTION IF EXISTS create_notification_safe(integer, text, text, integer, text);
DROP FUNCTION IF EXISTS approve_agency(integer);
DROP FUNCTION IF EXISTS reject_agency(integer);
DROP FUNCTION IF EXISTS approve_review(integer);
DROP FUNCTION IF EXISTS reject_review(integer);
DROP INDEX IF EXISTS idx_notifications_unique;

-- 2. УДАЛЕНИЕ ДУБЛИКАТОВ УВЕДОМЛЕНИЙ
DELETE FROM notifications 
WHERE id NOT IN (
    SELECT MAX(id) 
    FROM notifications 
    GROUP BY user_id, type, COALESCE(related_id, 0), COALESCE(entity_type, ''), COALESCE(entity_id, 0)
);

-- 3. СОЗДАНИЕ УНИКАЛЬНОГО ИНДЕКСА
CREATE UNIQUE INDEX idx_notifications_unique ON notifications (
    user_id, 
    type, 
    COALESCE(related_id, 0), 
    COALESCE(entity_type, ''), 
    COALESCE(entity_id, 0)
);

-- 4. ФУНКЦИЯ БЕЗОПАСНОГО СОЗДАНИЯ УВЕДОМЛЕНИЙ
CREATE OR REPLACE FUNCTION create_notification_safe(
    p_user_id INTEGER,
    p_type TEXT,
    p_message TEXT,
    p_related_id INTEGER DEFAULT NULL,
    p_entity_type TEXT DEFAULT NULL,
    p_entity_id INTEGER DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO notifications (user_id, type, message, related_id, entity_type, entity_id, created_at, is_read)
    VALUES (p_user_id, p_type, p_message, p_related_id, p_entity_type, p_entity_id, NOW(), FALSE)
    ON CONFLICT (user_id, type, COALESCE(related_id, 0), COALESCE(entity_type, ''), COALESCE(entity_id, 0)) 
    DO NOTHING;
EXCEPTION
    WHEN OTHERS THEN
        -- Игнорируем ошибки дублирования
        NULL;
END;
$$ LANGUAGE plpgsql;

-- 5. ФУНКЦИИ ТРИГГЕРОВ ДЛЯ УВЕДОМЛЕНИЙ
CREATE OR REPLACE FUNCTION notify_agency_submitted() RETURNS TRIGGER AS $$
DECLARE
    admin_record RECORD;
BEGIN
    -- Создаем уведомления для всех администраторов
    FOR admin_record IN SELECT id FROM users WHERE is_admin = TRUE LOOP
        PERFORM create_notification_safe(
            admin_record.id,
            'agency_submitted',
            'Проверьте заявку: ' || NEW.name,
            NEW.id,
            'agency',
            NEW.id
        );
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION notify_review_submitted() RETURNS TRIGGER AS $$
DECLARE
    admin_record RECORD;
BEGIN
    -- Создаем уведомления для всех администраторов
    FOR admin_record IN SELECT id FROM users WHERE is_admin = TRUE LOOP
        PERFORM create_notification_safe(
            admin_record.id,
            'review_submitted',
            'Проверьте отзыв по агентству ID: ' || NEW.agency_id,
            NEW.id,
            'review',
            NEW.id
        );
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. СОЗДАНИЕ ТРИГГЕРОВ
CREATE TRIGGER notify_agency_submitted_trigger
    AFTER INSERT ON agencies
    FOR EACH ROW
    WHEN (NEW.status = 'pending')
    EXECUTE FUNCTION notify_agency_submitted();

CREATE TRIGGER notify_review_submitted_trigger
    AFTER INSERT ON reviews
    FOR EACH ROW
    WHEN (NEW.status = 'pending')
    EXECUTE FUNCTION notify_review_submitted();

-- 7. RPC ФУНКЦИИ ДЛЯ МОДЕРАЦИИ АГЕНТСТВ
CREATE OR REPLACE FUNCTION approve_agency(agency_id INTEGER)
RETURNS JSON AS $$
DECLARE
    agency_record RECORD;
    result JSON;
BEGIN
    -- Обновляем статус агентства
    UPDATE agencies 
    SET status = 'approved' 
    WHERE id = agency_id
    RETURNING * INTO agency_record;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Agency not found');
    END IF;
    
    -- Создаем уведомление пользователю об одобрении
    PERFORM create_notification_safe(
        agency_record.submitted_by,
        'agency_approved',
        'Ваше агентство было одобрено и добавлено в каталог',
        agency_record.id,
        'agency',
        agency_record.id
    );
    
    result := json_build_object(
        'success', true,
        'message', 'Agency approved successfully',
        'agency', row_to_json(agency_record)
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION reject_agency(agency_id INTEGER)
RETURNS JSON AS $$
DECLARE
    agency_record RECORD;
    result JSON;
BEGIN
    -- Обновляем статус агентства
    UPDATE agencies 
    SET status = 'rejected' 
    WHERE id = agency_id
    RETURNING * INTO agency_record;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Agency not found');
    END IF;
    
    -- Создаем уведомление пользователю об отклонении
    PERFORM create_notification_safe(
        agency_record.submitted_by,
        'agency_rejected',
        'Ваше агентство было отклонено',
        agency_record.id,
        'agency',
        agency_record.id
    );
    
    result := json_build_object(
        'success', true,
        'message', 'Agency rejected successfully',
        'agency', row_to_json(agency_record)
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 8. RPC ФУНКЦИИ ДЛЯ МОДЕРАЦИИ ОТЗЫВОВ
CREATE OR REPLACE FUNCTION approve_review(review_id INTEGER)
RETURNS JSON AS $$
DECLARE
    review_record RECORD;
    new_rating NUMERIC;
    reviews_count INTEGER;
    result JSON;
BEGIN
    -- Обновляем статус отзыва
    UPDATE reviews 
    SET status = 'approved' 
    WHERE id = review_id
    RETURNING * INTO review_record;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Review not found');
    END IF;
    
    -- Пересчитываем рейтинг агентства
    SELECT 
        COALESCE(AVG(rating), 0),
        COUNT(*)
    INTO new_rating, reviews_count
    FROM reviews 
    WHERE agency_id = review_record.agency_id AND status = 'approved';
    
    -- Обновляем рейтинг агентства
    UPDATE agencies 
    SET 
        rating = new_rating,
        reviews_count = reviews_count
    WHERE id = review_record.agency_id;
    
    -- Создаем уведомление пользователю об одобрении отзыва
    PERFORM create_notification_safe(
        review_record.user_id,
        'review_approved',
        'Ваш отзыв был одобрен и опубликован',
        review_record.id,
        'review',
        review_record.id
    );
    
    result := json_build_object(
        'success', true,
        'message', 'Review approved successfully',
        'review', row_to_json(review_record),
        'new_rating', new_rating,
        'reviews_count', reviews_count
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION reject_review(review_id INTEGER)
RETURNS JSON AS $$
DECLARE
    review_record RECORD;
    result JSON;
BEGIN
    -- Обновляем статус отзыва
    UPDATE reviews 
    SET status = 'rejected' 
    WHERE id = review_id
    RETURNING * INTO review_record;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Review not found');
    END IF;
    
    -- Создаем уведомление пользователю об отклонении отзыва
    PERFORM create_notification_safe(
        review_record.user_id,
        'review_rejected',
        'Ваш отзыв был отклонен',
        review_record.id,
        'review',
        review_record.id
    );
    
    result := json_build_object(
        'success', true,
        'message', 'Review rejected successfully',
        'review', row_to_json(review_record)
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 9. НАЗНАЧЕНИЕ АДМИНИСТРАТОРА
INSERT INTO users (telegram_id, username, first_name, is_admin)
VALUES (8159146710, 'avvangarbo', 'AVANGARD', TRUE)
ON CONFLICT (telegram_id) 
DO UPDATE SET 
    is_admin = TRUE,
    username = EXCLUDED.username,
    first_name = EXCLUDED.first_name;

-- 10. СОЗДАНИЕ УНИКАЛЬНОГО ИНДЕКСА ДЛЯ АДМИНИСТРАТОРОВ
CREATE UNIQUE INDEX IF NOT EXISTS idx_single_admin ON users (is_admin) WHERE is_admin = TRUE;

-- 11. ДИАГНОСТИКА СИСТЕМЫ
DO $$
DECLARE
    agencies_count INTEGER;
    reviews_count INTEGER;
    notifications_count INTEGER;
    duplicates_count INTEGER;
    admin_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO agencies_count FROM agencies;
    SELECT COUNT(*) INTO reviews_count FROM reviews;
    SELECT COUNT(*) INTO notifications_count FROM notifications;
    SELECT COUNT(*) INTO admin_count FROM users WHERE is_admin = TRUE;
    
    -- Проверка дубликатов
    SELECT COUNT(*) - COUNT(DISTINCT (user_id, type, COALESCE(related_id, 0), COALESCE(entity_type, ''), COALESCE(entity_id, 0)))
    INTO duplicates_count
    FROM notifications;
    
    RAISE NOTICE '=== ДИАГНОСТИКА СИСТЕМЫ ZENTO ===';
    RAISE NOTICE 'Агентств в системе: %', agencies_count;
    RAISE NOTICE 'Отзывов в системе: %', reviews_count;
    RAISE NOTICE 'Уведомлений в системе: %', notifications_count;
    RAISE NOTICE 'Администраторов: %', admin_count;
    RAISE NOTICE 'Дубликатов уведомлений: %', duplicates_count;
    
    IF duplicates_count = 0 THEN
        RAISE NOTICE '✅ Система настроена корректно, дублирование устранено';
    ELSE
        RAISE NOTICE '❌ Обнаружены дубликаты уведомлений';
    END IF;
END;
$$;

-- 12. ФИНАЛЬНАЯ ПРОВЕРКА
SELECT 
    'Триггеры созданы' as status,
    COUNT(*) as trigger_count
FROM information_schema.triggers 
WHERE trigger_name IN ('notify_agency_submitted_trigger', 'notify_review_submitted_trigger');

SELECT 
    'Функции созданы' as status,
    COUNT(*) as function_count
FROM information_schema.routines 
WHERE routine_name IN ('create_notification_safe', 'approve_agency', 'reject_agency', 'approve_review', 'reject_review');

RAISE NOTICE '=== НАСТРОЙКА ЗАВЕРШЕНА ===';
RAISE NOTICE 'Система ZENTO готова к работе без дублирования уведомлений';
