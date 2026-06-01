@echo off
cd "c:\Users\financeiro\Desktop\Banco de Horas"
git add .github/workflows/deploy.yml
git commit -m "fix: use official GitHub Pages deploy action"
git push origin master
