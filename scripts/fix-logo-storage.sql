-- Исправляем поле logo_url для поддержки base64 изображений
ALTER TABLE agencies 
ALTER COLUMN logo_url TYPE TEXT;

-- Проверяем изменения
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'agencies' AND column_name = 'logo_url';

-- Показываем текущие агентства для проверки
SELECT id, name, LENGTH(logo_url) as logo_length, 
       CASE 
         WHEN logo_url LIKE 'data:image%' THEN 'Base64 image'
         WHEN logo_url LIKE 'http%' THEN 'URL'
         ELSE 'Other'
       END as logo_type
FROM agencies;
