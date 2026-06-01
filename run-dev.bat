@echo off
REM Inicia o Vite usando o Node diretamente para evitar bloqueios de execução do PowerShell.
cd /d "%~dp0"
node "%~dp0node_modules\vite\bin\vite.js"
