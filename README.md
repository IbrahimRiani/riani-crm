# Ibra CRM

CRM personal para gestión comercial: leads, pipeline Kanban, actividades, seguimientos y dashboard.

## Stack

- Next.js 16 + React 19 + TypeScript
- Tailwind CSS v4 + componentes propios estilo shadcn + Lucide Icons
- Supabase (PostgreSQL + Auth)
- Zod + React Hook Form, dnd-kit
- Vitest para tests críticos

## Instalación

```bash
npm install
```

## Variables de entorno

Copia `.env.example` a `.env.local` y completa:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # solo servidor, no se usa en V1
```

Dónde obtenerlas: Supabase Dashboard → Project Settings → API.

## Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Crea un usuario en Authentication → Users (login con email/contraseña).
3. Aplica la migración `supabase/migrations/0001_init.sql`:
   - Opción A: Supabase Dashboard → SQL Editor → pega el contenido y ejecútalo.
   - Opción B: `supabase db push` si usas Supabase CLI.
4. Verifica que existen las tablas `leads`, `activities`, `tasks` con RLS activado.

La migración crea tablas, índices, trigger `updated_at` y policies RLS (`auth.uid() = user_id`).
Al eliminar un lead se eliminan en cascada sus actividades y tareas.

## Desarrollo local

```bash
npm run dev     # http://localhost:3000
npm run lint    # eslint
npm run build   # build de producción
npm test        # vitest (validaciones, whatsapp, CSV)
```

> Nota: el entorno actual usa Node 20.11. Supabase JS recomienda Node ≥ 22.
> Funciona con warnings, pero se recomienda actualizar Node a la LTS actual.

## Build

```bash
npm run build
npm start
```

## Deploy en Vercel

1. Sube el repo a GitHub.
2. En Vercel: New Project → importa el repo.
3. Añade las 3 variables de entorno (la `SERVICE_ROLE_KEY` solo si la necesitas en el futuro).
4. Deploy. No se necesita configuración adicional (monolito Next.js, persistencia 100% en Supabase).

## Estructura

```text
src/app/(auth)/login        login
src/app/(dashboard)/        dashboard, leads, leads/[id], pipeline, tasks, settings
src/app/page.tsx            redirección según sesión
src/middleware.ts           refresco de sesión + protección de rutas
src/components/ui          Button, form, badges, card, dialog, states
src/components/leads       formulario, explorer (tabla+filtros+CSV), acciones, timeline
src/components/pipeline    Kanban dnd-kit
src/components/tasks       TaskItem, TaskSection
src/lib/supabase           client (browser), server, middleware, admin
src/lib/actions            server actions: leads, activities, tasks, auth
src/lib/validations        zod: lead, activity, task (+ tests)
src/lib/utils              format (EUR, fechas es-ES), whatsapp, csv
supabase/migrations        SQL + RLS
```

## Decisiones

- Sin Prisma: se usa el cliente Supabase directamente (menos capas, RLS nativo).
- Mutaciones vía Server Actions validadas con Zod en servidor; errores técnicos solo en consola, al usuario mensajes comprensibles.
- `status_change` se registra automáticamente al mover tarjetas en el pipeline y al cambiar estado en la ficha.
- `source = lead_hunter` reservado para la futura app LeadHunter (sin implementar integración).
- WhatsApp solo abre `https://wa.me/NUMERO` (sin Evolution API todavía).
- Sin IA, sin API pública, sin multi-tenant (un `user_id` por fila, preparado para más usuarios).
