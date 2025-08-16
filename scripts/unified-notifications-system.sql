-- ФИНАЛЬНОЕ РЕШЕНИЕ ПРОБЛЕМЫ ДУБЛИРОВАНИЯ УВЕДОМЛЕНИЙ
-- Основано на рекомендациях OpenAI

-- ШАГ 1: Очистка всех существующих дублей
DO $$
BEGIN
    RAISE NOTICE 'Удаляем дубликаты уведомлений...';
    
    -- Удаляем дубликаты, оставляя только самые новые
    DELETE FROM notifications 
    WHERE id NOT IN (
        SELECT DISTINCT ON (user_id, type, COALESCE(related_id::text, ''), COALESCE(entity_type, '')) 
               id
        FROM notifications 
        ORDER BY user_id, type, COALESCE(related_id::text, ''), COALESCE(entity_type, ''), created_at DESC
    );
    
    RAISE NOTICE 'Дубликаты удалены';
END $$;

-- ШАГ 2: Создание унифицированной функции для безопасного создания уведомлений
CREATE OR REPLACE FUNCTION create_notification_safe(
    p_user_id BIGINT,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_related_id BIGINT DEFAULT NULL,
    p_entity_type TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    -- Унифицированная вставка с защитой от дублей
    INSERT INTO notifications (user_id, type, title, message, related_id, entity_type, created_at)
    VALUES (p_user_id, p_type, p_title, p_message, p_related_id, p_entity_type, NOW())
    ON CONFLICT (user_id, type, COALESCE(related_id::text, ''), COALESCE(entity_type, '')) 
    DO NOTHING;
    
    RAISE NOTICE 'Уведомление создано: user_id=%, type=%, related_id=%', p_user_id, p_type, p_related_id;
END;
$$ LANGUAGE plpgsql;

-- ШАГ 3: Пересоздание функций уведомлений с унифицированными типами

-- Функция для уведомлений о новых агентствах
CREATE OR REPLACE FUNCTION notify_new_agency() RETURNS TRIGGER AS $$
BEGIN
    -- Создаем уведомления только для администраторов
    -- Используем унифицированный тип "agency_submitted"
    INSERT INTO notifications (user_id, type, title, message, related_id, entity_type)
    SELECT 
        u.telegram_id,
        'agency_submitted',  -- Унифицированный тип
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
    -- Используем унифицированный тип "review_submitted"
    INSERT INTO notifications (user_id, type, title, message, related_id, entity_type)
    SELECT 
        u.telegram_id,
        'review_submitted',  -- Унифицированный тип
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

-- ШАГ 4: Пересоздание триггеров
DROP TRIGGER IF EXISTS trigger_notify_agency_submitted ON agencies;
DROP TRIGGER IF EXISTS trigger_notify_review_submitted ON reviews;

-- Триггер для агентств (срабатывает только при статусе pending)
CREATE TRIGGER trigger_notify_agency_submitted
    AFTER INSERT ON agencies
    FOR EACH ROW
    WHEN (NEW.status = 'pending')
    EXECUTE FUNCTION notify_new_agency();

-- Триггер для отзывов (срабатывает только при статусе pending)
CREATE TRIGGER trigger_notify_review_submitted
    AFTER INSERT ON reviews
    FOR EACH ROW
    WHEN (NEW.status = 'pending')
    EXECUTE FUNCTION notify_new_review();

-- ШАГ 5: Создание RPC функций для модерации с уведомлениями

-- Функция одобрения агентства
CREATE OR REPLACE FUNCTION approve_agency(agency_id BIGINT, admin_id BIGINT)
RETURNS JSON AS $$
DECLARE
    agency_record RECORD;
    result JSON;
BEGIN
    -- Получаем данные агентства
    SELECT * INTO agency_record FROM agencies WHERE id = agency_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Агентство не найдено');
    END IF;
    
    -- Обновляем статус
    UPDATE agencies SET status = 'approved', updated_at = NOW() WHERE id = agency_id;
    
    -- Создаем уведомление пользователю через безопасную функцию
    PERFORM create_notification_safe(
        agency_record.submitted_by,
        'agency_approved',
        'Агентство одобрено',
        'Ваше агентство "' || agency_record.name || '" было одобрено и добавлено в каталог',
        agency_id,
        'agency'
    );
    
    RETURN json_build_object('success', true, 'message', 'Агентство одобрено');
END;
$$ LANGUAGE plpgsql;

-- Функция отклонения агентства
CREATE OR REPLACE FUNCTION reject_agency(agency_id BIGINT, admin_id BIGINT, reason TEXT DEFAULT 'Не указана')
RETURNS JSON AS $$
DECLARE
    agency_record RECORD;
    result JSON;
BEGIN
    -- Получаем данные агентства
    SELECT * INTO agency_record FROM agencies WHERE id = agency_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Агентство не найдено');
    END IF;
    
    -- Обновляем статус
    UPDATE agencies SET status = 'rejected', updated_at = NOW() WHERE id = agency_id;
    
    -- Создаем уведомление пользователю через безопасную функцию
    PERFORM create_notification_safe(
        agency_record.submitted_by,
        'agency_rejected',
        'Агентство отклонено',
        'Ваше агентство "' || agency_record.name || '" было отклонено. Причина: ' || reason,
        agency_id,
        'agency'
    );
    
    RETURN json_build_object('success', true, 'message', 'Агентство отклонено');
END;
$$ LANGUAGE plpgsql;

-- Функция одобрения отзыва
CREATE OR REPLACE FUNCTION approve_review(review_id BIGINT, admin_id BIGINT)
RETURNS JSON AS $$
DECLARE
    review_record RECORD;
    result JSON;
BEGIN
    -- Получаем данные отзыва
    SELECT * INTO review_record FROM reviews WHERE id = review_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Отзыв не найден');
    END IF;
    
    -- Обновляем статус
    UPDATE reviews SET status = 'approved', updated_at = NOW() WHERE id = review_id;
    
    -- Создаем уведомление пользователю через безопасную функцию
    PERFORM create_notification_safe(
        review_record.user_id,
        'review_approved',
        'Отзыв одобрен',
        'Ваш отзыв был одобрен и опубликован',
        review_id,
        'review'
    );
    
    RETURN json_build_object('success', true, 'message', 'Отзыв одобрен');
END;
$$ LANGUAGE plpgsql;

-- Функция отклонения отзыва
CREATE OR REPLACE FUNCTION reject_review(review_id BIGINT, admin_id BIGINT, reason TEXT DEFAULT 'Не указана')
RETURNS JSON AS $$
DECLARE
    review_record RECORD;
    result JSON;
BEGIN
    -- Получаем данные отзыва
    SELECT * INTO review_record FROM reviews WHERE id = review_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Отзыв не найден');
    END IF;
    
    -- Обновляем статус
    UPDATE reviews SET status = 'rejected', updated_at = NOW() WHERE id = review_id;
    
    -- Создаем уведомление пользователю через безопасную функцию
    PERFORM create_notification_safe(
        review_record.user_id,
        'review_rejected',
        'Отзыв отклонен',
        'Ваш отзыв был отклонен. Причина: ' || reason,
        review_id,
        'review'
    );
    
    RETURN json_build_object('success', true, 'message', 'Отзыв отклонен');
END;
$$ LANGUAGE plpgsql;

-- ШАГ 6: Финальная диагностика
DO $$
DECLARE
    duplicate_count INTEGER;
    total_notifications INTEGER;
    admin_count INTEGER;
BEGIN
    -- Проверяем дубликаты
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT user_id, type, COALESCE(related_id::text, ''), COALESCE(entity_type, ''), COUNT(*)
        FROM notifications
        GROUP BY user_id, type, COALESCE(related_id::text, ''), COALESCE(entity_type, '')
        HAVING COUNT(*) > 1
    ) duplicates;
    
    SELECT COUNT(*) INTO total_notifications FROM notifications;
    SELECT COUNT(*) INTO admin_count FROM users WHERE is_admin = TRUE;
    
    RAISE NOTICE '=== ДИАГНОСТИКА СИСТЕМЫ УВЕДОМЛЕНИЙ ===';
    RAISE NOTICE 'Всего уведомлений: %', total_notifications;
    RAISE NOTICE 'Дубликатов найдено: %', duplicate_count;
    RAISE NOTICE 'Администраторов: %', admin_count;
    
    IF duplicate_count = 0 THEN
        RAISE NOTICE '✅ Система уведомлений настроена корректно!';
    ELSE
        RAISE NOTICE '❌ Обнаружены дубликаты, требуется дополнительная настройка';
    END IF;
END $$;

-- Показываем структуру уведомлений
SELECT 
    type,
    entity_type,
    COUNT(*) as count,
    MIN(created_at) as first_created,
    MAX(created_at) as last_created
FROM notifications 
GROUP BY type, entity_type 
ORDER BY type, entity_type;
