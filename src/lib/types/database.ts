// ============================================================
// SideHustle — Database TypeScript Types
// Mirrors the Supabase schema exactly (snake_case)
// ============================================================

export type UserRole = 'customer' | 'provider' | 'admin';
export type JobStatus =
  | 'requested' |'payment_confirmed' |'ready_for_assignment' |'assigned' |'in_progress' |'awaiting_customer_confirmation' |'completed' |'cancelled' |'disputed';
export type PaymentChannel = 'orange_money' | 'mtn_momo' | 'internal';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
export type PaymentType =
  | 'customer_payment' |'provider_disbursement' |'platform_fee' |'refund';
export type DisbursementStatus = 'pending' | 'under_review' | 'approved' | 'processing' | 'completed' | 'rejected' | 'failed';
export type DisputeStatus = 'open' | 'under_review' | 'resolved' | 'closed';
export type ProviderStatus = 'pending_verification' | 'active' | 'suspended' | 'inactive';
export type UserAccountStatus = 'active' | 'suspended' | 'pending_verification';
export type NotificationType =
  | 'job_created' |'job_assigned' |'job_started' |'job_completed' |'payment_confirmed' |'disbursement_processed' |'dispute_raised' |'provider_joined' |'system' |'new_job_match' |'job_offer' |'availability_changed';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  account_status: UserAccountStatus;
  is_verified: boolean;
  area: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServiceCategory {
  id: string;
  slug: string;
  label: string;
  description: string | null;
  base_price: number;
  platform_fee: number;
  unit: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface CustomerProfile {
  id: string;
  user_id: string;
  preferred_area: string | null;
  total_jobs: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

export interface ProviderProfile {
  id: string;
  user_id: string;
  service_category_id: string | null;
  service_area: string | null;
  payout_provider: PaymentChannel | null;
  payout_mobile: string | null;
  payout_mobile_verified: boolean;
  is_available: boolean;
  provider_status: ProviderStatus;
  rating: number;
  total_jobs: number;
  total_earned: number;
  current_balance: number;
  escrow_balance: number;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  ref: string;
  customer_id: string;
  provider_id: string | null;
  service_category_id: string | null;
  service_label: string;
  address: string;
  area: string;
  landmark: string | null;
  scheduled_date: string;
  scheduled_time: string;
  notes: string | null;
  quantity: number;
  gross_amount: number;
  platform_fee: number;
  net_payout: number;
  job_status: JobStatus;
  payment_channel: PaymentChannel | null;
  payment_mobile: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  provider_completed_at: string | null;
  provider_completed_by: string | null;
  customer_confirmed_at: string | null;
  customer_confirmed_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  customer?: UserProfile;
  provider?: UserProfile;
  service_category?: ServiceCategory;
}

export interface JobStatusHistory {
  id: string;
  job_id: string;
  from_status: JobStatus | null;
  to_status: JobStatus;
  changed_by: string | null;
  note: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  ref: string;
  job_id: string;
  payer_id: string | null;
  payment_type: PaymentType;
  channel: PaymentChannel;
  mobile_number: string | null;
  amount: number;
  platform_fee: number;
  net_amount: number;
  payment_status: PaymentStatus;
  provider_ref: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  job?: Job;
  payer?: UserProfile;
}

export interface ProviderEarning {
  id: string;
  provider_id: string;
  job_id: string;
  gross_amount: number;
  platform_fee: number;
  net_amount: number;
  is_in_escrow: boolean;
  released_at: string | null;
  created_at: string;
  // Joined
  job?: Job;
}

export interface ProviderDisbursement {
  id: string;
  ref: string;
  provider_id: string;
  amount: number;
  channel: PaymentChannel;
  mobile_number: string;
  disbursement_status: DisbursementStatus;
  provider_ref: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  job_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface Dispute {
  id: string;
  job_id: string;
  raised_by: string;
  reason: string;
  description: string | null;
  dispute_status: DisputeStatus;
  resolved_by: string | null;
  resolution_note: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  notification_type: NotificationType;
  title: string;
  body: string;
  job_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface ProofOfWork {
  id: string;
  job_id: string;
  provider_id: string;
  storage_path: string;
  public_url: string | null;
  file_name: string | null;
  file_size: number | null;
  created_at: string;
}

// ============================================================
// Application-level (camelCase) types for frontend use
// ============================================================

export interface AppUser {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: UserRole;
  accountStatus: UserAccountStatus;
  isVerified: boolean;
  area: string | null;
  createdAt: string;
}

export interface AppJob {
  id: string;
  ref: string;
  customerId: string;
  providerId: string | null;
  serviceLabel: string;
  address: string;
  area: string;
  landmark: string | null;
  scheduledDate: string;
  scheduledTime: string;
  notes: string | null;
  quantity: number;
  grossAmount: number;
  platformFee: number;
  netPayout: number;
  jobStatus: JobStatus;
  paymentChannel: PaymentChannel | null;
  startedAt: string | null;
  completedAt: string | null;
  providerCompletedAt: string | null;
  providerCompletedBy: string | null;
  customerConfirmedAt: string | null;
  customerConfirmedBy: string | null;
  createdAt: string;
  customer?: AppUser;
  provider?: AppUser;
}

export interface AppProviderProfile {
  id: string;
  userId: string;
  serviceArea: string | null;
  payoutProvider: PaymentChannel | null;
  payoutMobile: string | null;
  payoutMobileVerified: boolean;
  isAvailable: boolean;
  providerStatus: ProviderStatus;
  rating: number;
  totalJobs: number;
  totalEarned: number;
  currentBalance: number;
  escrowBalance: number;
  bio?: string | null;
  serviceCategoryId?: string | null;
  // New: registered services and skills
  services?: AppService[];
  skills?: string[];
}

export interface AppEarning {
  id: string;
  providerId: string;
  jobId: string;
  grossAmount: number;
  platformFee: number;
  netAmount: number;
  isInEscrow: boolean;
  releasedAt: string | null;
  createdAt: string;
  job?: AppJob;
}

export interface AppDisbursement {
  id: string;
  ref: string;
  providerId: string;
  providerName?: string | null;
  providerEmail?: string | null;
  providerPhone?: string | null;
  amount: number;
  channel: PaymentChannel;
  mobileNumber: string;
  disbursementStatus: DisbursementStatus;
  providerRef: string | null;
  notes: string | null;
  updatedAt: string | null;
  createdAt: string;
}

export interface AppPayment {
  id: string;
  ref: string;
  jobId: string;
  jobRef: string;
  payerId: string | null;
  paymentType: PaymentType;
  channel: PaymentChannel;
  mobileNumber: string | null;
  amount: number;
  platformFee: number;
  netAmount: number;
  paymentStatus: PaymentStatus;
  notes: string | null;
  createdAt: string;
  party?: string;
}

export interface AppDispute {
  id: string;
  jobId: string;
  jobRef?: string;
  raisedBy: string;
  raisedByName?: string;
  raisedByRole: 'customer' | 'provider';
  reason: string;
  description: string | null;
  disputeStatus: DisputeStatus;
  resolvedBy: string | null;
  resolutionNote: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// New: Service Catalog Types
// ============================================================

export interface Service {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  base_price: number;
  platform_fee: number;
  unit: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // Joined
  category?: ServiceCategory;
}

export interface ProviderServiceRecord {
  id: string;
  provider_id: string;
  service_id: string;
  created_at: string;
  service?: Service;
}

export interface ProviderSkill {
  id: string;
  provider_id: string;
  skill_name: string;
  created_at: string;
}

export interface AppService {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  basePrice: number;
  platformFee: number;
  unit: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  category?: ServiceCategory;
}
