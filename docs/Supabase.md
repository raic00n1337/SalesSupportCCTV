## Cursor Prompt: Supabase Auth + Projekt-Speicher + Admin UI (Video-System-Konfigurator)

Kontext:
Wir bauen den „Video-System-Konfigurator“ (Next.js App Router, React UI).  
Ziel ist: **Sales-Logins + Speicherung von Projekten** und eine **Admin UI zur Datenpflege** (Pflicht).

Wichtig:
- Kein SSR einführen, sofern nicht bereits genutzt.
- Das bestehende Konfigurator-UI soll funktional möglichst unangetastet bleiben, aber neue Seiten/Flows sind erlaubt.
- Keine echten Hersteller-SKUs/Preise/ESO-Nummern erfinden. Dummy-Daten bleiben, Admin pflegt später echte Daten in UI.
- Supabase Service Role Key darf niemals im Browser landen; nur in serverseitigen API Routes.

### Supabase ENV (verwende Platzhalter)
Public Key:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2cnpvcXRybHhidWtwcHV5enBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5ODUzNzIsImV4cCI6MjA4MzU2MTM3Mn0.-5I-WB9tMo7Bq7Umi-tlVSkqYqvmkBkM10cPDGyf_SQ 
Service Role Secret:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2cnpvcXRybHhidWtwcHV5enBjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzk4NTM3MiwiZXhwIjoyMDgzNTYxMzcyfQ.tb2D1-Td-2nLQc1mrARKfo6M4M7gAtKGPtHm-OxQJMw
Project URL: https://lvrzoqtrlxbukppuyzpc.supabase.co

---

## Deliverables

### 1) Supabase Client Konfiguration
- lib/supabaseClient.ts (anon/public client)
- lib/supabaseServer.ts (service role client, NUR in API routes)

### 2) Auth + Hooks
- AuthContext + useAuth Hook
- Funktionen:
  - signIn(email, password)
  - signUp(email, password)
  - signOut()
  - resetPassword(email)
- Route Guard:
  - App-Bereich nur für eingeloggte Nutzer
  - Admin-Bereich nur für Admins

### 3) Auth Seiten (UI im bestehenden Stil)
- /login
- /register
- /reset-password

### 4) Projekte speichern (Sales Users)
Implementiere Seiten:
- /projects (Liste „Meine Projekte“)
- /projects/new (Projekt anlegen)
- /projects/[id] (Projekt bearbeiten: Standorte + Konfiguration)
Speichere:
- Projekt-Headerdaten
- Standorte + Auswahlparameter
- Optional: Quotes als Snapshot (berechnete Stückliste)

### 5) Admin UI (Pflicht)
Admin-Routen:
- /admin/login (oder gleiche Auth, aber admin gate)
- /admin/products
- /admin/rules
- /admin/tier-defaults
- /admin/manufacturers
Optional:
- /admin/bhe-times
- /admin/service-rules

Admin kann:
- Produkte pflegen (inkl. ESO-Artikelnummer, UVP, tags, active)
- Regeln pflegen (JSON + priority + scope)
- Defaults pflegen
- Hersteller pflegen
- CSV Import/Export (Products + Tier Defaults mindestens)

### 6) SQL Schema + RLS Policies (Pflicht)
Erstelle ein SQL Skript, das Tabellen + Policies anlegt:

Auth/Roles:
- profiles (id references auth.users)
- admin_users (user_id references auth.users)

Sales Data (user-owned):
- projects (owner_id = auth.uid())
- sites (belongs to projects)
- site_selections (or JSON fields in sites)
- quotes, quote_lines (belongs to projects)

Catalog (admin managed):
- manufacturers
- products (manufacturer, category, sku unique, eso_number, uvp_cents, tags[], is_active)
- tier_defaults (tier, manufacturer, category -> product sku)
- rules (rule_json jsonb, priority, scope tier/manufacturer, active)

RLS:
- Sales users can CRUD only their own projects/sites/quotes
- Admins can CRUD catalog tables
- Profile creation must work on signup without RLS blocking:
  - either a DB trigger or server-side insert using service role in a protected API route

### 7) TypeScript DB Types
- Ensure TS types match DB structure
- Use @supabase/supabase-js and generated Database type pattern

---

## Output requirements
- Provide code changes with clear file structure
- Do not leak secrets into client code
- Keep public configurator UI intact; add new pages for auth/projects/admin

Use best practices and established npm packages only.
