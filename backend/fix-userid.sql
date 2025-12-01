-- Script để fix UserId cho Files và Contents đã tạo trước đó
-- Chạy script này trong SQL Server Management Studio

USE WebAppDb;
GO

-- Fix Files: Update UserId từ CreatedBy nếu UserId là NULL
UPDATE Files
SET UserId = CreatedBy
WHERE UserId IS NULL 
  AND CreatedBy IS NOT NULL 
  AND CreatedBy != '';
GO

-- Fix Contents: Update UserId từ CreatedBy nếu UserId là NULL
UPDATE Contents
SET UserId = CreatedBy
WHERE UserId IS NULL 
  AND CreatedBy IS NOT NULL 
  AND CreatedBy != '';
GO

-- Kiểm tra kết quả
SELECT 
    'Files' AS TableName,
    COUNT(*) AS TotalRecords,
    SUM(CASE WHEN UserId IS NULL THEN 1 ELSE 0 END) AS RecordsWithNullUserId,
    SUM(CASE WHEN UserId IS NOT NULL THEN 1 ELSE 0 END) AS RecordsWithUserId
FROM Files
UNION ALL
SELECT 
    'Contents' AS TableName,
    COUNT(*) AS TotalRecords,
    SUM(CASE WHEN UserId IS NULL THEN 1 ELSE 0 END) AS RecordsWithNullUserId,
    SUM(CASE WHEN UserId IS NOT NULL THEN 1 ELSE 0 END) AS RecordsWithUserId
FROM Contents;
GO



