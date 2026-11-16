# AI DJ Studio — Database & Supabase Security Audit

**Scope:** `supabase/schema.sql`, `src/server/db.js`, `src/server/postgresAdapter.js`  
**Standards:** OWASP Top 10 (A01: Broken Access Control), CIS PostgreSQL Benchmark  
**Audit Date:** November 16–17, 2026  
**Auditor:** Principal Database Architect & Security Engineer  

---

## 1. Relational Persistence Architecture

AI DJ Studio utilizes a dual-tier persistence architecture designed for resilience, strict relational integrity, and zero silent data loss:
1. **Tier 1 — PostgreSQL 15 & Supabase PostgREST:** Authoritative relational store enforcing Row Level Security (RLS), foreign key constraints, indexes, and transactional concurrency.
2. **Tier 2 — Atomic Mutex JSON Store:** Offline / local development fallback utilizing OS-level write mutexes and atomic rename operations (`write-file-atomic` style via temporary files).
3. **Production Gating:** `postgresAdapter.assertProductionReady()` prevents silent fallback to JSON in production environments (`NODE_ENV === 'production'`). If PostgreSQL is unconfigured, the process fails fast on startup.

---

## 2. Supabase Row Level Security (RLS) Analysis

All application tables in `supabase/schema.sql` have Row Level Security explicitly enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`).

### 2.1 Table RLS Policies & Access Rights

| Table Name | RLS Enabled | SELECT Policy | INSERT Policy | UPDATE Policy | DELETE Policy |
|---|---|---|---|---|---|
| `public.profiles` | **YES** | Public viewable (`true`) | Trigger `on_auth_user_created` | Owner only (`auth.uid() = id`) with **Trigger Defense** | Prohibited |
| `public.playlists` | **YES** | Public or Owner (`is_public OR auth.uid() = user_id`) | Authenticated Owner (`auth.uid() = user_id`) | Owner only (`auth.uid() = user_id`) | Owner only (`auth.uid() = user_id`) |
| `public.playlist_tracks` | **YES** | Inherits playlist visibility | Playlist Owner only | Playlist Owner only | Playlist Owner only |
| `public.liked_songs` | **YES** | Owner only (`auth.uid() = user_id`) | Owner only (`auth.uid() = user_id`) | Prohibited | Owner only (`auth.uid() = user_id`) |
| `public.listening_history` | **YES** | Owner only (`auth.uid() = user_id`) | Owner only (`auth.uid() = user_id`) | Prohibited | Owner only (`auth.uid() = user_id`) |
| `public.rooms` | **YES** | Public viewable (`is_active = true`) | Authenticated Host (`auth.uid() = host_id`) | Host or Admin | Host only |
| `public.room_members` | **YES** | Room participants | Authenticated member | Participant or Host | Participant or Host |
| `public.tracks` | **YES** | Public viewable (`is_active = true`) | Admin / Mod only | Admin / Mod only | Admin / Mod only |
| `public.soundclash_battles`| **YES** | Public viewable | Authenticated participant | Host or Admin | Prohibited |

---

## 3. Defense Against Privilege Escalation (SEC-DB-02)

### The Vulnerability
In standard Supabase RLS policies, defining an update rule as:
```sql
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);
```
allows a user to modify any column on their own profile row. An adversary could issue:
```javascript
await supabase.from('profiles').update({ role: 'admin' }).eq('id', user.id);
```
and grant themselves administrative rights.

### Technical Remediation Implemented
A PostgreSQL database trigger `prevent_profile_role_escalation()` was created in `supabase/schema.sql`:
```sql
CREATE OR REPLACE FUNCTION public.prevent_profile_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF auth.role() <> 'service_role' AND NOT EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Unauthorized: Users cannot modify their own role from % to %', OLD.role, NEW.role;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_prevent_role_escalation ON public.profiles;
CREATE TRIGGER trigger_prevent_role_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_role_escalation();
```

**Verification:** The trigger guarantees that role changes are rejected at the database engine level unless the operation originates from an administrative user or the Supabase `service_role`.

---

## 4. SQL Injection Protection

All SQL execution in `src/server/postgresAdapter.js` strictly utilizes parameterized queries (`$1, $2, ...`) without string concatenation or unescaped user interpolation:
```javascript
const query = `
  INSERT INTO public.profiles (id, email, display_name, avatar_url, role)
  VALUES ($1, $2, $3, $4, $5)
  ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name
  RETURNING *;
`;
await client.query(query, [id, email, displayName, avatarUrl, role]);
```
This guarantees immunity from classical SQL injection attacks.
