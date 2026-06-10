---
name: Auth redirects GitHub Pages
description: Como configurar redirects de auth do Supabase para GitHub Pages com subdiretório.
---

## Regra
Usar `getSiteUrl()` (em `src/lib/supabaseClient.ts`) em qualquer chamada que precise de `emailRedirectTo` ou `redirectTo`. Nunca hardcodar URL.

**Why:** GitHub Pages serve num subdiretório (`/BancodeHoras/`). `window.location.origin` sozinho perde o subpath. `import.meta.env.BASE_URL` é injetado pelo Vite no build com `BASE_PATH=/BancodeHoras/`, então `origin + BASE_URL` dá a URL correta em qualquer ambiente. VITE_SITE_URL sobrepõe tudo quando definido explicitamente.

**How to apply:**
1. Nos calls de signUp: `options: { emailRedirectTo: getSiteUrl() }`
2. Em resetPasswordForEmail: `{ redirectTo: getSiteUrl() }`
3. No Supabase Dashboard → Auth → URL Configuration: definir Site URL e Redirect URLs para `https://sthephaniecorreaholanda-bit.github.io/BancodeHoras` (sem barra final).

## Fluxo PASSWORD_RECOVERY
`useAuth` exporta `isPasswordRecovery: boolean` — true quando Supabase dispara evento `PASSWORD_RECOVERY` (usuário clicou no link do e-mail de reset). `App.tsx` mostra `<TelaRedefinirSenha>` quando isso for true, antes de checar `user`. Após `updateUser({ password })`, sign out automático em 2s.
