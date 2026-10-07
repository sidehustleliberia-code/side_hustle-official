# SideHustle — Database Schema

## Tables Overview

| Table | Purpose |
|-------|---------|
| `user_profiles` | All users (customers, providers, admins) — linked to `auth.users` |
| `service_categories` | Available service types with pricing |
| `customer_profiles` | Customer-specific data (spending, preferences) |
| `provider_profiles` | Provider-specific data (earnings, payout, availability) |
| `jobs` | Service requests / jobs — core business entity |
| `job_status_history` | Audit trail of all job status changes |
| `payments` | All financial transactions |
| `provider_earnings` | Per-job earnings records for providers |
| `provider_disbursements` | Payout requests from providers |
| `reviews` | Customer reviews of providers |
| `disputes` | Dispute records |
| `notifications` | In-app notifications |
| `proof_of_work` | Photos uploaded by providers on job completion |

## Key Relationships
```
auth.users (1) ──── (1) user_profiles
user_profiles (1) ── (1) customer_profiles
user_profiles (1) ── (1) provider_profiles
user_profiles (1) ── (N) jobs [as customer]
user_profiles (1) ── (N) jobs [as provider]
jobs (1) ──────────── (N) job_status_history
jobs (1) ──────────── (N) payments
jobs (1) ──────────── (1) provider_earnings
jobs (1) ──────────── (N) proof_of_work
jobs (1) ──────────── (1) reviews
jobs (1) ──────────── (N) disputes
user_profiles (1) ── (N) notifications
```

## ENUM Types
- `user_role`: customer, provider, admin
- `job_status`: requested, payment_confirmed, ready_for_assignment, assigned, in_progress, completed, cancelled, disputed
- `payment_channel`: orange_money, mtn_momo, internal
- `payment_status`: pending, processing, completed, failed, refunded
- `payment_type`: customer_payment, provider_disbursement, platform_fee, refund
- `disbursement_status`: pending, processing, completed, failed
- `dispute_status`: open, under_review, resolved, closed
- `provider_status`: pending_verification, active, suspended, inactive
- `user_account_status`: active, suspended, pending_verification

## Migration File
`supabase/migrations/20260913200000_sidehustle_foundation.sql`

## Seed Data (Demo Accounts)
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@sidehustle.lr | Admin@2026 |
| Customer | fatu.kamara@sidehustle.lr | Customer@2026 |
| Customer | abigail.konneh@sidehustle.lr | Customer@2026 |
| Provider | emmanuel.dolo@sidehustle.lr | Provider@2026 |
| Provider | grace.toe@sidehustle.lr | Provider@2026 |
