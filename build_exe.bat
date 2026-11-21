@echo off
title Compilando Executavel Remidos Projecao
color 0B

echo ========================================================================
echo    Compilando Executavel Standalone (PyInstaller)
echo    Remidos em Cristo - Nova Alianca
echo ========================================================================
echo.

pyinstaller --name "RemidosProjecao" ^
    --onedir ^
    --windowed ^
    --noconfirm ^
    --add-data "data;data" ^
    --add-data "static;static" ^
    --add-data "templates;templates" ^
    launcher.py

echo.
echo ========================================================================
echo Compilacao finalizada! O executavel esta na pasta: dist\RemidosProjecao\RemidosProjecao.exe
echo ========================================================================
pause
