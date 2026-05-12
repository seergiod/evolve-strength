# Plan de transformación — GymPililas

Es un cambio muy grande. Lo divido en **5 fases**, cada una desplegable y verificable antes de pasar a la siguiente. Esto evita romper la app entera de golpe (hoy todo se basa en `localStorage` con username, sin `auth.uid()`).

---

## Fase 1 — Auth real con Supabase (base de todo)

Sin esto, las RLS de las nuevas tablas (rutinas, amistades, chats, quedadas) no pueden ser seguras.

- Migrar `src/lib/session.ts` (username local) → `src/lib/auth.tsx` (ya existe pero no se usa) como única fuente de verdad.
- Página `/login` y `/signup` con:
  - Email + contraseña.
  - Validación en tiempo real con **zod**: ≥8 chars, 1 mayúscula, 1 número.
  - Toasts de error con `sonner` (ya instalado).
  - Google opcional vía `supabase--configure_social_auth` (te pregunto antes).
- Migración SQL:
  - Cambiar `profiles.id` para que sea FK a `auth.users(id)` con trigger `handle_new_user` que crea perfil al registrarse.
  - Reescribir todas las RLS existentes (`exercises`, `profiles`, `workouts`, etc.) para usar `auth.uid()` en lugar de `true`.
- Ruta protegida `_authenticated/*` con `beforeLoad` redirect a `/login`.
- Email de confirmación: scaffold del template HTML profesional (botón "Volver a la App" → URL de producción `https://gympililas.lovable.app`).

⚠️ **Los datos de usuarios actuales basados en username local se pierden** (no había contraseñas, no se pueden migrar). Confirmaste que vale.

---

## Fase 2 — Rediseño "Premium Dark"

- `src/styles.css`: nueva paleta oklch
  - `--background`: pitch black (`oklch(0.08 0 0)`)
  - `--primary`: cian neón (`oklch(0.85 0.18 200)`)
  - `--accent`: violeta neón (`oklch(0.65 0.25 295)`)
  - Tokens nuevos: `--glass-bg`, `--glass-border`, `--shadow-neon-cyan`, `--shadow-neon-violet`, `--gradient-neon`.
- Clases utilitarias en `styles.css`: `.glass`, `.glass-strong`, `.neon-border`, `.neon-glow-cyan`, `.neon-glow-violet`.
- Layout edge-to-edge: quitar `container mx-auto max-w-*` en `__root.tsx` y `dashboard.tsx` → `w-full` con padding interno responsive.
- Animaciones: instalar **framer-motion**, wrapper `<MotionFade>` y `<MotionSlideUp>` aplicado a Cards principales (Feed, Ranking, AICoach, Profile).
- Refactor de Card, Button, Input para usar los nuevos tokens (sin tocar la API de shadcn).

---

## Fase 3 — Rutinas + Perfil público

**Tabla `routines`** + **`routine_days`** + **`routine_exercises`**:

```text
routines (id, user_id→profiles, name, description, is_public, created_at)
routine_days (id, routine_id, day_of_week 0-6, label)
routine_exercises (id, routine_day_id, exercise_name, muscle_group, sets, reps, weight, order_index)
```

RLS:
- Dueño: CRUD completo.
- Público: SELECT si `is_public = true` o si hay amistad aceptada.

Componentes:
- `RoutineManager.tsx`: crear rutina, añadir días, añadir ejercicios. Tablas limpias con shadcn `Table`.
- `RoutineView.tsx`: visualización read-only para perfiles ajenos.
- Modificar `ProfilePage.tsx` para aceptar `?userId=...`:
  - Si es propio: vista completa.
  - Si es ajeno: oculta `body_weight`, `height`, `age`, email; muestra rutinas públicas + calendario público.
  - **Vista pública** segura mediante view `profiles_public` con `security_invoker=on` que excluye campos privados.

---

## Fase 4 — Amigos + Chat realtime

**Tablas**:

```text
friendships (id, requester_id, addressee_id, status: pending|accepted|blocked, created_at, accepted_at)
  UNIQUE(requester_id, addressee_id)

messages (id, sender_id, recipient_id, content, read_at, created_at)
```

Función `are_friends(a uuid, b uuid)` SECURITY DEFINER → evita recursión en RLS.

RLS:
- `friendships`: ver/crear si eres requester o addressee. Aceptar solo addressee.
- `messages`: SELECT/INSERT solo si `are_friends(sender, recipient)`.

UI:
- `FriendsPanel.tsx`: buscar usuarios, enviar/aceptar/rechazar solicitudes.
- `ChatPanel.tsx` (sidebar derecha o ruta `/chat`): lista de conversaciones + ventana activa.
- Realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE messages` + canal `postgres_changes` filtrado por `recipient_id=eq.{me}`.

---

## Fase 5 — Quedadas en TrainingCalendar

**Tabla `meetups`**:

```text
meetups (id, host_id, title, scheduled_at, duration_minutes, location, recurrence: none|weekly, recurrence_until, created_at)
meetup_participants (meetup_id, user_id, status: invited|accepted|declined)
```

RLS:
- Host: CRUD.
- Amigos (vía `are_friends`): SELECT + UPDATE de su propio `meetup_participants`.

Lógica de "Repetir semanalmente": al crear con `recurrence='weekly'` + lista de días + fecha tope, una **edge function** o trigger inserta las N ocurrencias hijas (`parent_meetup_id`).

UI en `TrainingCalendar.tsx`:
- Click en día → modal "Crear quedada" (hora, duración, repetir L-D, hasta fecha).
- Badge en cada día con quedadas propias (cian) y de amigos (violeta).
- Click en quedada → detalle + aceptar/declinar.

---

## Detalles técnicos transversales

- Sin librerías nuevas salvo **framer-motion** (la pides explícitamente). `zod` y `sonner` ya están.
- TanStack Start: rutas nuevas bajo `src/routes/_authenticated/` (rutinas, chat, perfil/$id, amigos).
- Todas las queries Supabase desde el navegador con `@/integrations/supabase/client` (RLS aplica). Operaciones que requieran lógica server (recurrencia de quedadas, búsqueda de usuarios sin exponer emails) → `createServerFn` con `requireSupabaseAuth`.
- `supabase.ts/types.ts` se regenera solo tras cada migración.

---

## Cómo procedemos

Cada fase es una entrega separada. Tras aprobar este plan:

1. Arranco **Fase 1** (auth real + migración de RLS + email template).
2. Verificas que login/signup/recovery funcionan.
3. Sigo con Fase 2, etc.

Si prefieres condensar fases o saltar alguna (p. ej. dejar el chat para luego), dímelo en la respuesta y ajusto.

**Pregunta rápida antes de Fase 1:** ¿Quieres Google sign-in junto con email/password, o solo email/password?