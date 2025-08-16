-- Создание bucket для логотипов в Supabase Storage
INSERT INTO storage.buckets (id, name, public) 
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Политика для публичного чтения
CREATE POLICY "Public read access" ON storage.objects 
FOR SELECT USING (bucket_id = 'logos');

-- Политика для загрузки (только аутентифицированные пользователи)
CREATE POLICY "Authenticated upload access" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'logos');
