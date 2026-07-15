# Banco de Horas Pro

App React + Vite + TypeScript de controle de banco de horas com jornada configurável.

## Stack
- React 19 + Vite + TypeScript
- TanStack Query + Wouter (rotas)
- Tailwind CSS + Radix UI
- Supabase (persistência de registros de ponto e auth)

## Como rodar
```bash
npm install
npm run dev
```
Abre em `http://localhost:5000/`.

## Variáveis de ambiente necessárias
- `VITE_SUPABASE_URL` — URL do projeto Supabase
- `VITE_SUPABASE_ANON_KEY` — chave anon pública do Supabase
- `VITE_SITE_URL` (opcional) — URL canônica para redirects de auth em produção

## User preferences
