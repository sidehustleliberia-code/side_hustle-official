# SideHustle — Architecture Overview

## Application Type
Full-stack Next.js 15 application (App Router) with Supabase as the backend.

## Tech Stack
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS v3
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Authentication**: Supabase Auth with role-based access control
- **Styling**: Tailwind CSS with custom design tokens

## Directory Structure
```
src/
├── app/                          # Next.js App Router pages
│   ├── admin/                    # Admin portal (AD-01 to AD-04)
│   ├── active-job/               # Provider active job tracker (P-03)
│   ├── auth/callback/            # Supabase auth callback
│   ├── job-progress/             # Customer job tracker (C-03)
│   ├── provider-dashboard/       # Provider jobs feed (P-02)
│   ├── provider-earnings/        # Provider earnings (P-04)
│   ├── provider-onboarding/      # Provider setup (P-01)
│   ├── service-request-order-form/ # Customer booking (C-01/C-02)
│   ├── unified-authentication-portal/ # Auth (A-00)
│   └── page.tsx                  # Landing page (L-01)
├── components/ui/                # Shared UI components
├── contexts/
│   └── AuthContext.tsx           # Auth state + profile management
├── lib/
│   ├── services/
│   │   ├── dataService.ts        # All Supabase CRUD operations
│   │   └── paymentProviders.ts   # Payment provider architecture
│   ├── supabase/
│   │   ├── client.ts             # Browser Supabase client
│   │   └── server.ts             # Server Supabase client
│   └── types/
│       └── database.ts           # TypeScript types (DB + App)
└── middleware.ts                 # Route protection middleware
```

## User Roles
| Role | Access |
|------|--------|
| `customer` | Service request, job tracking, order history |
| `provider` | Job feed, active job, earnings, onboarding |
| `admin` | Full platform access — all screens |

## Key Architectural Decisions
1. **Auth via Supabase Auth** — email/password with role stored in `user_metadata`
2. **Role stored in two places** — `auth.users.raw_user_meta_data.role` (for RLS) and `user_profiles.role` (for queries)
3. **No frontend-only auth checks** — middleware enforces route protection server-side
4. **Service layer pattern** — all DB operations go through `src/lib/services/dataService.ts`
5. **snake_case ↔ camelCase** — DB uses snake_case, frontend uses camelCase, conversion in service layer
6. **Payment architecture** — clean interface in `paymentProviders.ts`, no real API calls yet
