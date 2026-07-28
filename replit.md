# Banco de Horas Pro

App React + Vite + TypeScript de controle de banco de horas com jornada configurável.

## Stack
- React 19 + Vite + TypeScript
- TanStack Query + Wouter (rotas)
- Tailwind CSS + Radix UI
- Supabase (persistência de registros de ponto, férias e auth)

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

## Banco de dados (Supabase)
Aplicar as migrations em `supabase/migrations/` no painel do Supabase:
- `001_rls_setup.sql` — RLS na tabela `Horas`
- `002_ferias_e_nota.sql` — coluna `note` na tabela `Horas` + tabela `Ferias` com RLS

## Funcionalidades principais
- Registrar ponto (entrada/saída/observação), feriados e folgas compensadas
- Histórico mensal com busca por observação (pesquisa global por palavra-chave)
- Relatórios e visão anual do banco de horas
- **Gestão de Férias** — cadastrar, editar e excluir períodos; dashboard no Painel; bloqueio de registro durante férias
- Configurações de jornada padrão + ajustes manuais de crédito/débito
- **Resetar Dados** — apaga todos os registros/ajustes/férias, mantendo conta e configurações
- Exportar CSV, personalização visual (tema e cor de destaque)

## Estrutura src/
```
src/
  App.tsx              # login + roteamento
  components/          # Layout (nav + sidebar), RecordForm, EvolutionChart, ui/
  pages/               # Painel, RegistrarPonto, Historico, Ferias, Relatorios, Anual, Configuracoes, Personalizacao
  hooks/               # use-auth, use-theme, use-toast, use-mobile
  lib/
    api-local.ts       # todos os hooks React Query (registros, ajustes, férias, configurações)
    auth.ts            # registerUser, loginUser, logoutUser
    calculations.ts    # saldo, resumo, evolução, dias faltantes, CSV
    holidays.ts        # feriados BR 2025–2026, isWorkday
    storage.ts         # helpers de localStorage
    supabaseClient.ts  # cliente Supabase + getSiteUrl()
    types.ts           # tipos compartilhados (TimeRecord, VacationPeriod, Settings, …)
    time.ts            # formatação HH:MM
    utils.ts           # cn() Tailwind
```

## User preferences
