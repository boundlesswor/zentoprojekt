-- Исправление функций триггеров для корректного создания уведомлений

-- 1. Исправляем функцию уведомления о новом агентстве
CREATE OR REPLACE FUNCTION notify_agency_submitted() RETURNS TRIGGER AS $$
DECLARE
    admin_user RECORD;
BEGIN
    -- Создаем уведомления для каждого администратора отдельно
    FOR admin_user IN SELECT id FROM users WHERE is_admin = TRUE LOOP
        PERFORM create_notification_safe(
            admin_user.id,
            'agency_submitted',
            'Новое агентство на модерации',
            'Проверьте заявку: ' || NEW.name,
            NEW.id,
            'agency'
        );
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Исправляем функцию уведомления о новом отзыве
CREATE OR REPLACE FUNCTION notify_review_submitted() RETURNS TRIGGER AS $$
DECLARE
    admin_user RECORD;
BEGIN
    -- Создаем уведомления для каждого администратора отдельно
    FOR admin_user IN SELECT id FROM users WHERE is_admin = TRUE LOOP
        PERFORM create_notification_safe(
            admin_user.id,
            'review_submitted',
            'Новый отзыв на модерации',
            'Проверьте отзыв по агентству ID: ' || NEW.agency_id,
            NEW.id,
            'review'
        );
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Исправляем функцию одобрения агентства
CREATE OR REPLACE FUNCTION approve_agency(p_agency_id bigint) RETURNS void AS $$
DECLARE
    v_user_id bigint;
BEGIN
    UPDATE agencies
    SET status = 'approved', approved_at = NOW()
    WHERE id = p_agency_id;

    -- Используем submitted_by вместо created_by
    SELECT submitted_by INTO v_user_id FROM agencies WHERE id = p_agency_id;

    IF v_user_id IS NOT NULL THEN
        PERFORM create_notification_safe(
            v_user_id,
            'agency_approved',
            'Агентство одобрено',
            'Ваше агентство теперь в каталоге и доступно для отзывов',
            p_agency_id,
            'agency'
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 4. Исправляем функцию отклонения агентства
CREATE OR REPLACE FUNCTION reject_agency(p_agency_id bigint, p_reason text) RETURNS void AS $$
DECLARE
    v_user_id bigint;
BEGIN
    UPDATE agencies
    SET status = 'rejected'
    WHERE id = p_agency_id;

    -- Используем submitted_by вместо created_by
    SELECT submitted_by INTO v_user_id FROM agencies WHERE id = p_agency_id;

    IF v_user_id IS NOT NULL THEN
        PERFORM create_notification_safe(
            v_user_id,
            'agency_rejected',
            'Агентство отклонено',
            'Причина: ' || p_reason,
            p_agency_id,
            'agency'
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 5. Проверяем структуру таблицы agencies
SELECT 'Проверка структуры agencies' AS info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'agencies' 
AND column_name IN ('submitted_by', 'created_by', 'status');

-- 6. Проверяем триггеры
SELECT 'Активные триггеры' AS info;
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name LIKE '%notify%';
