@echo off
title Remidos em Cristo - Projecao e Transmissao
color 0E

echo ========================================================================
echo    Iniciando Remidos Projecao e Transmissao (Nova Alianca)...
echo ========================================================================
echo.

REM Verifica se o banco de dados da Biblia ja esta configurado
if not exist "data\bible.db" (
    echo [1/2] Configurando banco de dados da Biblia Sagrada offline...
    python setup_bible.py
) else (
    echo [1/2] Biblia offline pronta.
)

echo [2/2] Abrindo servidor e painel de controle...
echo.
python launcher.py

pause
