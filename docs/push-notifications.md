# Push Notifications

## Current state

- **In-app notifications are active.** Shared-expense and savings-contribution
  events create rows in `public.notifications` via the server-authoritative
  `notify_family()` RPC. Personal expenses never notify the other member.
- **Push notifications are NOT active.** No provider is installed or configured.
  No permission is requested, no token is registered, and no network/credentials
  exist for push. `lib/pushNotifications.ts` returns safe "unsupported / not
  configured" results so the app never implies push is live.

Event flow (only the first two are active today):

```
EVENT  →  IN-APP NOTIFICATION  →  (future) PUSH NOTIFICATION
```

## Future steps

1. **Install & configure the push package** (e.g. `expo-notifications`) only when
   real delivery is being enabled. Do not add it in advance.
2. **Request notification permission at the correct UX point** — a dedicated,
   user-initiated push-onboarding flow. Never on launch, splash, login, Home, or
   expense entry (there are zero automatic dialogs today and this must stay true).
3. **Obtain the native push token** via the provider after permission is granted.
4. **Persist the token securely**: insert into `public.push_tokens` through RLS
   (the client supplies only `push_token` + `platform`; `user_id` is derived from
   `auth.uid()` server-side). Apply `0001_create_push_tokens.sql` first.
5. **Send push from a trusted server/Edge Function**, never from the frontend. A
   server resolves recipients from family membership (mirroring `notify_family`)
   and looks up their active tokens. No frontend secret is ever used to send.
6. **Deactivate invalid/expired tokens**: on 4xx/410 responses, set `is_active =
   false` (server-side) and cull stale rows.

## Security

- **The client cannot send arbitrary push notifications** — delivery is
  server-side only, triggered by real family events.
- **The client cannot choose arbitrary recipients** — recipients derive from
  family membership and RLS; there is no client-supplied "send to user X" input.
- **Push sending must happen server-side** with a server credential (service-role
  or Edge Function env secret) reserved for the backend — never an
  `EXPO_PUBLIC_*` var, never shipped in client code, never committed to Git.
- **Supabase RLS protects stored tokens**: select/insert/update/delete are each
  scoped to `auth.uid()`, and `user_id` cannot be reassigned to another user.
- **Personal expenses never notify the partner** and must continue to not leak
  into any push path.

## Env vars (intended, no values inserted yet)

When push is enabled, the **backend only** will need provider secrets. Intended
names (documented, not yet present and never in the client):

- `EXPO_PUBLIC_*` family — only non-secret public values, if any.
- Server-side (Edge Function / CI) — provider project/token secrets. Not inserted.