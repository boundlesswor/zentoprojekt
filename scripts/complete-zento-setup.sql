-- =========================
-- ZENTO: полная настройка с исправлениями
-- =========================

-- 0) Базовая схема
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  username VARCHAR(255),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auth_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(6) NOT NULL,
  telegram_id BIGINT NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agencies (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL,
  country VARCHAR(100) NOT NULL,
  description TEXT,
  logo_url VARCHAR(500),
  rating DECIMAL(2,1) DEFAULT 0,
  reviews_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',
  submitted_by BIGINT REFERENCES users(telegram_id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  agency_id INTEGER REFERENCES agencies(id),
  user_id BIGINT REFERENCES users(telegram_id),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  country VARCHAR(100),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_auth_codes_code ON auth_codes(code);
CREATE INDEX IF NOT EXISTS idx_auth_codes_telegram_id ON auth_codes(telegram_id);
CREATE INDEX IF NOT EXISTS idx_agencies_status ON agencies(status);
CREATE INDEX IF NOT EXISTS idx_reviews_agency_id ON reviews(agency_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);

-- 1) Таблица уведомлений с поддержкой related_id
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(telegram_id),
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  related_id INTEGER,
  entity_type VARCHAR(50),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- Добавляем related_id если его нет
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_id INTEGER;

-- 2) Очистка тестовых данных
DELETE FROM notifications;
DELETE FROM reviews;
DELETE FROM agencies;
DELETE FROM auth_codes WHERE used = TRUE OR expires_at < NOW();

-- Сброс автоинкрементов
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'notifications_id_seq') THEN
    ALTER SEQUENCE notifications_id_seq RESTART WITH 1;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'reviews_id_seq') THEN
    ALTER SEQUENCE reviews_id_seq RESTART WITH 1;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'agencies_id_seq') THEN
    ALTER SEQUENCE agencies_id_seq RESTART WITH 1;
  END IF;
END$$;

-- 3) Назначение администратора
INSERT INTO users (telegram_id, username, first_name, is_admin, created_at)
VALUES (8159146710, 'admin', 'Admin', TRUE, NOW())
ON CONFLICT (telegram_id) DO UPDATE SET is_admin = TRUE;

-- 4) Триггер для уведомлений о новых агентствах
CREATE OR REPLACE FUNCTION notify_agency_submitted()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    INSERT INTO notifications (user_id, type, title, message, related_id, entity_type)
    SELECT u.telegram_id,
           'agency_submitted',
           'Новое агентство на модерации',
           'Проверьте заявку: ' || NEW.name,
           NEW.id,
           'agency'
    FROM users u
    WHERE u.is_admin = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_agency_submitted_notify ON agencies;
CREATE TRIGGER trg_agency_submitted_notify
AFTER INSERT ON agencies
FOR EACH ROW EXECUTE FUNCTION notify_agency_submitted();

-- 5) Процедуры модерации
CREATE OR REPLACE FUNCTION approve_agency(p_agency_id INT)
RETURNS VOID AS $$
DECLARE
  v_submitted_by BIGINT;
  v_name TEXT;
BEGIN
  SELECT submitted_by, name INTO v_submitted_by, v_name
  FROM agencies WHERE id = p_agency_id;

  IF v_submitted_by IS NULL THEN
    RAISE EXCEPTION 'Agency % not found', p_agency_id;
  END IF;

  UPDATE agencies SET status = 'approved' WHERE id = p_agency_id;

  INSERT INTO notifications (user_id, type, title, message, related_id, entity_type)
  VALUES (v_submitted_by, 'agency_approved', 'Агентство одобрено',
          'Ваше агентство "' || v_name || '" одобрено и опубликовано.',
          p_agency_id, 'agency');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION reject_agency(p_agency_id INT, p_reason TEXT)
RETURNS VOID AS $$
DECLARE
  v_submitted_by BIGINT;
  v_name TEXT;
BEGIN
  SELECT submitted_by, name INTO v_submitted_by, v_name
  FROM agencies WHERE id = p_agency_id;

  IF v_submitted_by IS NULL THEN
    RAISE EXCEPTION 'Agency % not found', p_agency_id;
  END IF;

  UPDATE agencies SET status = 'rejected' WHERE id = p_agency_id;

  INSERT INTO notifications (user_id, type, title, message, related_id, entity_type)
  VALUES (v_submitted_by, 'agency_rejected', 'Агентство отклонено',
          COALESCE('Причина: ' || NULLIF(TRIM(p_reason), ''), 'Заявка отклонена без указания причины.')
            || E'\nАгентство: "' || v_name || '"',
          p_agency_id, 'agency');
END;
$$ LANGUAGE plpgsql;

-- 6) Диагностика
SELECT 'Администратор:' as info, telegram_id, username, first_name, is_admin 
FROM users WHERE telegram_id = 8159146710;

SELECT 'Уведомления админа:' as info, COUNT(*) as count
FROM notifications WHERE user_id = 8159146710;

SELECT 'Агентства:' as info, COUNT(*) as count FROM agencies;
SELECT 'Отзывы:' as info, COUNT(*) as count FROM reviews;

-- Готово! Теперь система полностью настроена.
