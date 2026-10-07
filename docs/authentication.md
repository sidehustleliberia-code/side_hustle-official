# SideHustle — Authentication

## Provider
Supabase Auth (email/password)

## Roles
Roles are stored in `auth.users.raw_user_meta_data.role` and mirrored to `user_profiles.role`.

| Role | Value | Post-login redirect |
|------|-------|---------------------|
| Customer | `customer` | `/service-request-order-form` |
| Provider | `provider` | `/provider-dashboard` |
| Admin | `admin` | `/admin` |

## Sign Up Flow
1. User fills RegisterForm with role selection
2. `signUp()` called with `metadata.role` passed to Supabase
3. Supabase creates `auth.users` record
4. Database trigger `on_auth_user_created` fires → creates `user_profiles` row
5. Trigger also creates `customer_profiles` or `provider_profiles` based on role
6. User is redirected to appropriate screen

## Sign In Flow
1. User fills LoginForm
2. `signIn()` called with email/password
3. Supabase returns session with `user_metadata.role`
4. AuthContext stores user + profile
5. Role-based redirect happens

## Route Protection
`src/middleware.ts` protects routes server-side:
- `/admin/*` — requires `admin` role
- `/provider-dashboard`, `/active-job`, `/provider-earnings`, `/provider-onboarding` — requires auth
- `/service-request-order-form`, `/job-progress` — requires auth

## RLS Policies
All tables have Row Level Security enabled. Key patterns:
- `user_profiles`: users can only read/write their own row; admins have full access
- `jobs`: customers see own jobs; providers see available + assigned jobs; admins see all
- `payments`: users see own payments; admins see all
- `provider_earnings/disbursements`: providers see own; admins see all

## Admin Role Assignment
Assumption: Admin accounts are created directly in the database or via Supabase Dashboard.
The `is_admin()` function checks `auth.users.raw_user_meta_data->>'role' = 'admin'`.
