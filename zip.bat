@echo off

set "SOURCE_DIR=%~dp0"
set "ZIP_FILE=%SOURCE_DIR%ZipSender.zip"
set "TEMP_DIR=%TEMP%\ZipSender_Temp_%RANDOM%"
set "EXCLUDE=%TEMP%\excl.txt"

echo Creating temporary copy
if exist "%TEMP_DIR%" rmdir /s /q "%TEMP_DIR%"
mkdir "%TEMP_DIR%"

(
echo node_modules
echo _generated
echo exclude.txt
echo ZipSender.zip
echo package-lock.json
echo tmp
) > "%EXCLUDE%"

xcopy "%SOURCE_DIR%*" "%TEMP_DIR%\" /E /I /H /Y /EXCLUDE:%EXCLUDE% >nul 2>&1

echo Creating zip archive
powershell -NoProfile -Command "Compress-Archive -Path '%TEMP_DIR%\*' -DestinationPath '%ZIP_FILE%' -CompressionLevel Optimal -Force"

rmdir /s /q "%TEMP_DIR%"
del /f /q "%EXCLUDE%"

if exist "%ZIP_FILE%" (
    for %%a in ("%ZIP_FILE%") do echo Done! ZipSender.zip created - %%~za bytes
) else (
    echo Failed to create zip
)
