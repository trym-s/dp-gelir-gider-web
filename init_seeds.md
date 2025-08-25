```sh

-- role tables
-- 'roles' tablosu için kimlik eklemeyi AÇ
SET IDENTITY_INSERT roles ON;
GO

-- 1. Admin rolünü oluştur (ID=1)
-- Rolün zaten var olup olmadığını kontrol et, varsa ekleme
IF NOT EXISTS (SELECT 1 FROM roles WHERE id = 1)
BEGIN
    INSERT INTO roles (id, name) VALUES (1, 'admin');
END
GO

-- 'roles' tablosu için kimlik eklemeyi KAPAT
SET IDENTITY_INSERT roles OFF;
GO

-- 'permissions' tablosu için kimlik eklemeyi AÇ
SET IDENTITY_INSERT permissions ON;
GO

-- 2. Örnek izinleri oluştur
-- İzinlerin zaten var olup olmadığını kontrol et
IF NOT EXISTS (SELECT 1 FROM permissions WHERE id = 1)
BEGIN
    INSERT INTO permissions (id, name, description) VALUES (1, 'income:create', 'Gelir kaydı oluşturma');
END
IF NOT EXISTS (SELECT 1 FROM permissions WHERE id = 2)
BEGIN
    INSERT INTO permissions (id, name, description) VALUES (2, 'income:read', 'Gelir kayıtlarını okuma');
END
IF NOT EXISTS (SELECT 1 FROM permissions WHERE id = 3)
BEGIN
    INSERT INTO permissions (id, name, description) VALUES (3, 'income:update', 'Gelir kayıtlarını güncelleme');
END
GO

-- 'permissions' tablosu için kimlik eklemeyi KAPAT
SET IDENTITY_INSERT permissions OFF;
GO

-- 3. İzinleri admin rolüne ata
-- İlişkilerin zaten var olup olmadığını kontrol et
IF NOT EXISTS (SELECT 1 FROM role_permissions WHERE role_id = 1 AND permission_id = 1)
BEGIN
    INSERT INTO role_permissions (role_id, permission_id) VALUES (1, 1);
END
IF NOT EXISTS (SELECT 1 FROM role_permissions WHERE role_id = 1 AND permission_id = 2)
BEGIN
    INSERT INTO role_permissions (role_id, permission_id) VALUES (1, 2);
END
IF NOT EXISTS (SELECT 1 FROM role_permissions WHERE role_id = 1 AND permission_id = 3)
BEGIN
    INSERT INTO role_permissions (role_id, permission_id) VALUES (1, 3);
END
GO


-- Structures
-- 1. ADIM: Bölgeleri ekle
INSERT INTO dbo.region (name)
SELECT value FROM (VALUES ('Teknopark'), ('DP Merkez'), ('Genel'), ('Dubai')) AS V(value)
WHERE NOT EXISTS (SELECT 1 FROM dbo.region WHERE name = V.value);

-- 2. ADIM: Her bölge için "Genel" Ödeme Türü ekle
INSERT INTO dbo.payment_type (name, region_id)
SELECT 'Genel', r.id FROM dbo.region r
WHERE r.name IN ('Teknopark', 'DP Merkez', 'Genel', 'Dubai')
  AND NOT EXISTS (SELECT 1 FROM dbo.payment_type pt WHERE pt.name = 'Genel' AND pt.region_id = r.id);

-- 3. ADIM: Her "Genel" ödeme türü için "SLA" Hesap Adı ekle
INSERT INTO dbo.account_name (name, payment_type_id)
SELECT 'SLA', pt.id FROM dbo.payment_type pt
JOIN dbo.region r ON pt.region_id = r.id
WHERE r.name IN ('Teknopark', 'DP Merkez', 'Genel', 'Dubai') AND pt.name = 'Genel'
  AND NOT EXISTS (SELECT 1 FROM dbo.account_name an WHERE an.name = 'SLA' AND an.payment_type_id = pt.id);

-- 4. ADIM: Her "SLA" hesabı için "DBA" Bütçe Kalemi ekle
INSERT INTO dbo.budget_item (name, account_name_id)
SELECT 'DBA', an.id FROM dbo.account_name an
JOIN dbo.payment_type pt ON an.payment_type_id = pt.id
JOIN dbo.region r ON pt.region_id = r.id
WHERE r.name IN ('Teknopark', 'DP Merkez', 'Genel', 'Dubai') AND pt.name = 'Genel' AND an.name = 'SLA'
  AND NOT EXISTS (SELECT 1 FROM dbo.budget_item bi WHERE bi.name = 'DBA' AND bi.account_name_id = an.id);

-- 5. ADIM: Her "SLA" hesabı için "BI" Bütçe Kalemi ekle
INSERT INTO dbo.budget_item (name, account_name_id)
SELECT 'BI', an.id FROM dbo.account_name an
JOIN dbo.payment_type pt ON an.payment_type_id = pt.id
JOIN dbo.region r ON pt.region_id = r.id
WHERE r.name IN ('Teknopark', 'DP Merkez', 'Genel', 'Dubai') AND pt.name = 'Genel' AND an.name = 'SLA'
  AND NOT EXISTS (SELECT 1 FROM dbo.budget_item bi WHERE bi.name = 'BI' AND bi.account_name_id = an.id);



-- Bankalar
INSERT INTO bank (name) VALUES
('TFKB'),
('QNB'),
('Ziraat Bankası'),
('Yapı Kredi'),
('Vakıfbank'),
('TEB'),
('Akbank'),
('İş Bankası');
('Wio Bank');
GO
```
