-- Исправляем функцию одобрения отзыва
-- Записываем agency_id в related_id вместо review_id
CREATE OR REPLACE FUNCTION approve_review(p_review_id BIGINT) RETURNS JSON AS $$
DECLARE
  v_agency_id BIGINT;
  v_user_id BIGINT;
BEGIN
  SELECT agency_id, user_id INTO v_agency_id, v_user_id
  FROM reviews WHERE id = p_review_id;
  
  IF v_agency_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Отзыв не найден');
  END IF;
  
  UPDATE reviews SET status = 'approved' WHERE id = p_review_id;
  
  -- Пересчитываем рейтинг агентства
  UPDATE agencies a
  SET reviews_count = COALESCE((
        SELECT COUNT(*) FROM reviews r
        WHERE r.agency_id = a.id AND r.status = 'approved'
      ), 0),
      rating = COALESCE((
        SELECT ROUND(AVG(r.rating)::numeric, 1) FROM reviews r
        WHERE r.agency_id = a.id AND r.status = 'approved'
      ), 0)
  WHERE a.id = v_agency_id;
  
  -- Записываем agency_id в related_id вместо review_id
  PERFORM create_notification_safe(
    v_user_id,
    'review_approved',
    'Отзыв одобрен',
    'Ваш отзыв был одобрен и опубликован.',
    v_agency_id,  -- agency_id вместо p_review_id
    'agency'      -- entity_type = 'agency'
  );
  
  RETURN json_build_object('success', true, 'message', 'Отзыв одобрен');
END;
$$ LANGUAGE plpgsql;

-- Также исправляем функцию отклонения отзыва
CREATE OR REPLACE FUNCTION reject_review(p_review_id BIGINT, p_reason TEXT DEFAULT 'Не указана') RETURNS JSON AS $$
DECLARE
  v_agency_id BIGINT;
  v_user_id BIGINT;
  v_reason TEXT;
BEGIN
  SELECT agency_id, user_id INTO v_agency_id, v_user_id
  FROM reviews WHERE id = p_review_id;
  
  IF v_agency_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Отзыв не найден');
  END IF;
  
  UPDATE reviews SET status = 'rejected' WHERE id = p_review_id;
  
  v_reason := COALESCE(NULLIF(TRIM(p_reason), ''), 'Не указана');
  
  -- Записываем agency_id в related_id для консистентности
  PERFORM create_notification_safe(
    v_user_id,
    'review_rejected',
    'Отзыв отклонён',
    'Причина: ' || v_reason,
    v_agency_id,  -- agency_id вместо p_review_id
    'agency'      -- entity_type = 'agency'
  );
  
  RETURN json_build_object('success', true, 'message', 'Отзыв отклонён');
END;
$$ LANGUAGE plpgsql;
