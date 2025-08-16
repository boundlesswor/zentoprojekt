-- Исправление схемы уведомлений для ZENTO
-- Добавляет поле related_id если его нет

-- Добавляем поле related_id в таблицу notifications (если его нет)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'related_id'
    ) THEN
        ALTER TABLE notifications ADD COLUMN related_id INTEGER;
        RAISE NOTICE 'Добавлено поле related_id в таблицу notifications';
    ELSE
        RAISE NOTICE 'Поле related_id уже существует в таблице notifications';
    END IF;
END $$;

-- Создаем индекс для оптимизации поиска по related_id
CREATE INDEX IF NOT EXISTS idx_notifications_related_id ON notifications(related_id);

-- Проверяем результат
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'notifications' 
ORDER BY ordinal_position;
