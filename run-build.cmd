@echo off
setlocal
set "NODE_DIR=%~dp0node-portable\node-v24.16.0-win-x64"
set "PATH=%NODE_DIR%;%PATH%"
"%NODE_DIR%\npm.cmd" run build
