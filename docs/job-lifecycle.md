# SideHustle — Job Lifecycle

## States
```
requested
  → payment_confirmed
    → ready_for_assignment
      → assigned
        → in_progress
          → completed
          → disputed
      → cancelled
  → cancelled
```

## State Descriptions

| State | Trigger | Who |
|-------|---------|-----|
| `requested` | Customer submits order form | System (on job creation) |
| `payment_confirmed` | Payment processed successfully | System (paymentService) |
| `ready_for_assignment` | Payment confirmed | System (auto-advance) |
| `assigned` | Provider accepts job OR admin assigns | Provider / Admin |
| `in_progress` | Provider taps "Start Job" | Provider |
| `completed` | Provider taps "Mark as Completed" | Provider |
| `cancelled` | Customer or admin cancels | Customer / Admin |
| `disputed` | Customer or provider raises dispute | Customer / Provider |

## Status History
Every status change is automatically logged to `job_status_history` via the `log_job_status_change` database trigger. This provides a full audit trail.

## Database as Source of Truth
- Job status is ONLY updated via `jobService.updateJobStatus()` in `src/lib/services/dataService.ts`
- Frontend state is derived from the database — no local state overrides
- The `job_status_history` table records every transition with timestamp

## Assumptions
1. Payment confirmation automatically advances job to `ready_for_assignment` (no manual admin step needed)
2. Providers can only have one active job at a time (enforced by UI, not DB constraint — future improvement)
3. Job completion does not require customer confirmation in this phase (provider marks complete → payout queued)
4. Disputes are raised manually — no automatic dispute detection

## Key Functions
- `jobService.createJob()` — creates job in `requested` state
- `paymentService.initiatePayment()` — processes payment, advances to `ready_for_assignment`
- `jobService.acceptJob()` — provider accepts, advances to `assigned`
- `jobService.updateJobStatus('in_progress')` — provider starts job
- `jobService.updateJobStatus('completed')` — provider completes job
- `jobService.assignProvider()` — admin manually assigns provider
