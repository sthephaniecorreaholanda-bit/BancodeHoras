# Banco de Horas Pro

App client-side de controle de banco de horas com jornada **configurável**.
Tudo é salvo no `localStorage` do navegador — **não há backend**.

## Stack

- React 19 + Vite + TypeScript
- TanStack Query + Wouter (rotas)
- Tailwind CSS + Radix UI
- Persistência: `localStorage` (separada por usuário)
- Auth: SHA-256 via `crypto.subtle` (até 2 usuários, fins de estudo)

## Rodar local

```bash
npm install
npm run dev
```

Abra `http://localhost:5173/Banco-de-horas/`.

## Build de produção (GitHub Pages)

```bash
BASE_PATH=/Banco-de-horas/ npm run build
npm run preview
```

O `BASE_PATH` deve corresponder ao subpath onde o site é servido.
Para domínio próprio ou `user.github.io`, use `BASE_PATH=/`.

## Deploy automático

`.github/workflows/deploy.yml` builda e publica em **GitHub Pages**
a cada push para `main`. Configure uma única vez em
**Settings → Pages → Source: GitHub Actions**.

## Estrutura

```
src/
  App.tsx              # login + roteamento
  components/          # Layout, RecordForm, EvolutionChart, ui/
  pages/               # Painel, RegistrarPonto, Historico, Anual, Configuracoes, Personalizacao
  hooks/               # use-theme, use-toast, use-mobile
  lib/
    api-local.ts       # hooks React Query sobre localStorage
    auth.ts            # registerUser, loginUser, logoutUser (SHA-256)
    calculations.ts    # saldo, summary, evolução, dias faltantes, CSV
    holidays.ts        # feriados BR 2025–2026, isWorkday
    storage.ts         # helpers de localStorage (prefixados por usuário)
    types.ts           # tipos compartilhados
    time.ts            # formatação HH:MM
    utils.ts           # cn() Tailwind
```

## Regras de cálculo

- `WORK_DAY` (Dia Comum): saldo = tempo trabalhado − jornada padrão líquida
- `COMPENSATED_LEAVE` (Folga Compensada): debita `(Saída − Entrada) − Almoço` do dia informado
- `HOLIDAY`: `balance = 0`
- Domingos e feriados são neutros automaticamente (não viram dias "faltantes")
- Ajuste manual entra apenas na soma total, não nos registros

## Limpar dados / esquecer senha

Não há recuperação de senha (sem servidor). Para resetar:
DevTools → Application → Local Storage → apagar chaves `bh:*`.
