-- =====================================================
-- ПОЛНАЯ НАСТРОЙКА СИСТЕМЫ ZENTO
-- Устраняет дублирование уведомлений и настраивает модерацию
-- =====================================================

-- 1. ОЧИСТКА СТАРЫХ ОБЪЕКТОВ
DROP TRIGGER IF EXISTS notify_agency_submitted_trigger ON agencies;
DROP TRIGGER IF EXISTS notify_review_submitted_trigger ON reviews;
DROP FUNCTION IF EXISTS notify_agency_submitted() CASCADE;
DROP FUNCTION IF EXISTS notify_review_submitted() CASCADE;
DROP FUNCTION IF EXISTS create_notification_safe(INTEGER, VARCHAR, TEXT, INTEGER, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS approve_agency(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS reject_agency(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS approve_review(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS reject_review(INTEGER) CASCADE;
DROP INDEX IF EXISTS idx_notifications_unique;

-- 2. УДАЛЕНИЕ ДУБЛИКАТОВ УВЕДОМЛЕНИЙ
DELETE FROM notifications 
WHERE id NOT IN (
    SELECT MIN(id) 
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

-- 4. ОБНОВЛЕНИЕ СТРУКТУРЫ ТАБЛИЦ
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Убеждаемся, что поле logo_url поддерживает base64
ALTER TABLE agencies ALTER COLUMN logo_url TYPE TEXT;

-- 5. ФУНКЦИЯ БЕЗОПАСНОГО СОЗДАНИЯ УВЕДОМЛЕНИЙ
CREATE OR REPLACE FUNCTION create_notification_safe(
    p_user_id INTEGER,
    p_type VARCHAR(50),
    p_message TEXT,
    p_related_id INTEGER DEFAULT NULL,
    p_entity_type VARCHAR(50) DEFAULT NULL,
    p_entity_id INTEGER DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO notifications (user_id, type, message, related_id, entity_type, entity_id, created_at, is_read)
    VALUES (p_user_id, p_type, p_message, p_related_id, p_entity_type, p_entity_id, NOW(), FALSE)
    ON CONFLICT ON CONSTRAINT idx_notifications_unique DO NOTHING;
EXCEPTION
    WHEN OTHERS THEN
        -- Игнорируем любые ошибки дублирования
        NULL;
END;
$$ LANGUAGE plpgsql;

-- 6. ФУНКЦИИ ТРИГГЕРОВ
CREATE OR REPLACE FUNCTION notify_agency_submitted() RETURNS TRIGGER AS $$
DECLARE
    admin_record RECORD;
BEGIN
    -- Создаем уведомления только для pending агентств
    IF NEW.status = 'pending' THEN
        -- Создаем уведомление для каждого администратора
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
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION notify_review_submitted() RETURNS TRIGGER AS $$
DECLARE
    admin_record RECORD;
    agency_name TEXT;
BEGIN
    -- Создаем уведомления только для pending отзывов
    IF NEW.status = 'pending' THEN
        -- Получаем название агентства
        SELECT name INTO agency_name FROM agencies WHERE id = NEW.agency_id;
        
        -- Создаем уведомление для каждого администратора
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
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. СОЗДАНИЕ ТРИГГЕРОВ
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

-- 8. RPC ФУНКЦИИ ДЛЯ МОДЕРАЦИИ АГЕНТСТВ
CREATE OR REPLACE FUNCTION approve_agency(agency_id INTEGER) RETURNS JSON AS $$
DECLARE
    agency_record RECORD;
    result JSON;
BEGIN
    -- Обновляем статус агентства
    UPDATE agencies 
    SET status = 'approved', updated_at = NOW() 
    WHERE id = agency_id
    RETURNING * INTO agency_record;
    
    IF agency_record IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Agency not found');
    END IF;
    
    -- Создаем уведомление пользователю об одобрении
    IF agency_record.submitted_by IS NOT NULL THEN
        PERFORM create_notification_safe(
            agency_record.submitted_by,
            'agency_approved',
            'Ваше агентство было одобрено и добавлено в каталог',
            agency_record.id,
            'agency',
            agency_record.id
        );
    END IF;
    
    result := json_build_object(
        'success', true,
        'agency_id', agency_record.id,
        'status', agency_record.status
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION reject_agency(agency_id INTEGER) RETURNS JSON AS $$
DECLARE
    agency_record RECORD;
    result JSON;
BEGIN
    -- Обновляем статус агентства
    UPDATE agencies 
    SET status = 'rejected', updated_at = NOW() 
    WHERE id = agency_id
    RETURNING * INTO agency_record;
    
    IF agency_record IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Agency not found');
    END IF;
    
    -- Создаем уведомление пользователю об отклонении
    IF agency_record.submitted_by IS NOT NULL THEN
        PERFORM create_notification_safe(
            agency_record.submitted_by,
            'agency_rejected',
            'Ваше агентство было отклонено',
            agency_record.id,
            'agency',
            agency_record.id
        );
    END IF;
    
    result := json_build_object(
        'success', true,
        'agency_id', agency_record.id,
        'status', agency_record.status
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 9. RPC ФУНКЦИИ ДЛЯ МОДЕРАЦИИ ОТЗЫВОВ
CREATE OR REPLACE FUNCTION approve_review(review_id INTEGER) RETURNS JSON AS $$
DECLARE
    review_record RECORD;
    new_rating NUMERIC;
    reviews_count INTEGER;
    result JSON;
BEGIN
    -- Обновляем статус отзыва
    UPDATE reviews 
    SET status = 'approved', updated_at = NOW() 
    WHERE id = review_id
    RETURNING * INTO review_record;
    
    IF review_record IS NULL THEN
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
        reviews_count = reviews_count,
        updated_at = NOW()
    WHERE id = review_record.agency_id;
    
    -- Создаем уведомление пользователю об одобрении отзыва
    IF review_record.user_id IS NOT NULL THEN
        PERFORM create_notification_safe(
            review_record.user_id,
            'review_approved',
            'Ваш отзыв был одобрен и опубликован',
            review_record.id,
            'review',
            review_record.id
        );
    END IF;
    
    result := json_build_object(
        'success', true,
        'review_id', review_record.id,
        'status', review_record.status,
        'new_rating', new_rating,
        'reviews_count', reviews_count
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION reject_review(review_id INTEGER) RETURNS JSON AS $$
DECLARE
    review_record RECORD;
    result JSON;
BEGIN
    -- Обновляем статус отзыва
    UPDATE reviews 
    SET status = 'rejected', updated_at = NOW() 
    WHERE id = review_id
    RETURNING * INTO review_record;
    
    IF review_record IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Review not found');
    END IF;
    
    -- Создаем уведомление пользователю об отклонении отзыва
    IF review_record.user_id IS NOT NULL THEN
        PERFORM create_notification_safe(
            review_record.user_id,
            'review_rejected',
            'Ваш отзыв был отклонен',
            review_record.id,
            'review',
            review_record.id
        );
    END IF;
    
    result := json_build_object(
        'success', true,
        'review_id', review_record.id,
        'status', review_record.status
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 10. НАЗНАЧЕНИЕ АДМИНИСТРАТОРА
-- Удаляем всех старых администраторов
UPDATE users SET is_admin = FALSE;

-- Назначаем единственного администратора
INSERT INTO users (telegram_id, username, first_name, is_admin, created_at)
VALUES (8159146710, 'avvangarbo', 'AVANGARD', TRUE, NOW())
ON CONFLICT (telegram_id) 
DO UPDATE SET 
    is_admin = TRUE,
    username = EXCLUDED.username,
    first_name = EXCLUDED.first_name;

-- Создаем уникальный индекс для администраторов
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
    -- Подсчитываем объекты
    SELECT COUNT(*) INTO agencies_count FROM agencies;
    SELECT COUNT(*) INTO reviews_count FROM reviews;
    SELECT COUNT(*) INTO notifications_count FROM notifications;
    SELECT COUNT(*) INTO admin_count FROM users WHERE is_admin = TRUE;
    
    -- Проверяем дубликаты
    SELECT COUNT(*) - COUNT(DISTINCT (user_id, type, COALESCE(related_id, 0))) 
    INTO duplicates_count FROM notifications;
    
    -- Выводим результаты
    RAISE NOTICE '=== ДИАГНОСТИКА СИСТЕМЫ ZENTO ===';
    RAISE NOTICE 'Агентств: %', agencies_count;
    RAISE NOTICE 'Отзывов: %', reviews_count;
    RAISE NOTICE 'Уведомлений: %', notifications_count;
    RAISE NOTICE 'Дубликатов уведомлений: %', duplicates_count;
    RAISE NOTICE 'Администраторов: %', admin_count;
    RAISE NOTICE '================================';
    
    IF duplicates_count > 0 THEN
        RAISE NOTICE 'ВНИМАНИЕ: Обнаружены дубликаты уведомлений!';
    ELSE
        RAISE NOTICE 'Дубликаты уведомлений отсутствуют ✓';
    END IF;
    
    IF admin_count = 1 THEN
        RAISE NOTICE 'Администратор назначен корректно ✓';
    ELSE
        RAISE NOTICE 'ВНИМАНИЕ: Некорректное количество администраторов!';
    END IF;
END $$;

-- 12. ФИНАЛЬНАЯ ПРОВЕРКА
SELECT 'Настройка ZENTO завершена успешно!' as status;
