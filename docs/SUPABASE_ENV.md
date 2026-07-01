# Supabase Environment Variables

> ⚠️ **Sicherheitshinweis:** Diese Datei enthielt zuvor die echten Projekt-Keys im
> Klartext (inkl. `service_role`-Key) in einem **öffentlichen** Repo. Diese Keys
> müssen im Supabase Dashboard rotiert werden (Settings → API → "Roll" / "Regenerate").
> Trage die neuen Werte NUR in `.env.local` (gitignored) und in den Hosting-Env-Vars
> (Netlify) ein – niemals in eine committete Datei.

Create a `.env.local` file in the project root with the following variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

## Important Notes

- **NEXT_PUBLIC_SUPABASE_URL**: Public Supabase project URL (safe for client-side)
- **NEXT_PUBLIC_SUPABASE_ANON_KEY**: Anonymous/public key (safe for client-side)  
- **SUPABASE_SERVICE_ROLE_KEY**: Service role secret (NEVER expose to client, only use in API routes)

## Setup

```bash
# Copy this content to .env.local
cp docs/SUPABASE_ENV.md .env.local
# Then edit .env.local to use only the env variables without markdown formatting
```
