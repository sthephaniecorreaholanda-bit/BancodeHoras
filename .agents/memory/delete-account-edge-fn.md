---
name: Delete Account Edge Function
description: Exclusão de conta usa Edge Function Deno; tabela Horas tem CASCADE automático.
---

## Regra
Nunca usar `service_role_key` no frontend. Exclusão de usuário auth exige Edge Function.

**Why:** `supabase.auth.admin.deleteUser()` requer service_role_key que não pode ser exposto no bundle React.

**How to apply:**
- Edge Function em `supabase/functions/delete-account/index.ts`
- Verificar JWT do caller via anonKey client, depois chamar admin.deleteUser() com serviceRoleKey
- Tabela "Horas" tem `user_id REFERENCES auth.users(id) ON DELETE CASCADE` → sem necessidade de deletar registros manualmente
- Settings ficam no localStorage (`bh:settings`, `bh:no-remember`, `bh:session-active`) — limpar client-side após exclusão

## Deploy obrigatório
O usuário precisa fazer deploy da Edge Function no Supabase antes de usar:
```
supabase login
supabase link --project-ref SEU_PROJECT_ID
supabase functions deploy delete-account
```
