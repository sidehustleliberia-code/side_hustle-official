'use client';

import { createClient } from '@/lib/supabase/client';
import type {
  AppJob,
  AppUser,
  AppProviderProfile,
  AppEarning,
  AppDisbursement,
  DisbursementStatus,
  JobStatus,
  PaymentChannel,
  ServiceCategory,
  AppPayment,
  AppService,
} from '@/lib/types/database';

// ============================================================
// Helper: schema error detection
// ============================================================
function isSchemaError(error: any): boolean {
  if (!error) return false;
  if (error.code && typeof error.code === 'string') {
    const cls = error.code.substring(0, 2);
    if (cls === '42' || cls === '08') return true;
    if (cls === '23') return false;
  }
  if (error.message) {
    const patterns = [
      /relation.*does not exist/i,
      /column.*does not exist/i,
      /function.*does not exist/i,
      /syntax error/i,
      /type.*does not exist/i,
    ];
    return patterns.some((p) => p.test(error.message));
  }
  return false;
}

// ============================================================
// Row → App type converters (snake_case → camelCase)
// ============================================================
function toAppUser(row: any): AppUser {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    phone: row.phone,
    avatarUrl: row.avatar_url,
    role: row.role,
    accountStatus: row.account_status,
    isVerified: row.is_verified,
    area: row.area,
    createdAt: row.created_at,
  };
}

function toAppJob(row: any): AppJob {
  return {
    id: row.id,
    ref: row.ref,
    customerId: row.customer_id,
    providerId: row.provider_id,
    serviceLabel: row.service_label,
    address: row.address,
    area: row.area,
    landmark: row.landmark,
    scheduledDate: row.scheduled_date,
    scheduledTime: row.scheduled_time,
    notes: row.notes,
    quantity: row.quantity,
    grossAmount: row.gross_amount,
    platformFee: row.platform_fee,
    netPayout: row.net_payout,
    jobStatus: row.job_status,
    paymentChannel: row.payment_channel,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    providerCompletedAt: row.provider_completed_at ?? null,
    providerCompletedBy: row.provider_completed_by ?? null,
    customerConfirmedAt: row.customer_confirmed_at ?? null,
    customerConfirmedBy: row.customer_confirmed_by ?? null,
    createdAt: row.created_at,
    customer: row.customer ? toAppUser(row.customer) : undefined,
    provider: row.provider ? toAppUser(row.provider) : undefined,
  };
}

function toAppProviderProfile(row: any): AppProviderProfile {
  return {
    id: row.id,
    userId: row.user_id,
    serviceArea: row.service_area,
    payoutProvider: row.payout_provider,
    payoutMobile: row.payout_mobile,
    payoutMobileVerified: row.payout_mobile_verified,
    isAvailable: row.is_available,
    providerStatus: row.provider_status,
    rating: row.rating,
    totalJobs: row.total_jobs,
    totalEarned: row.total_earned,
    currentBalance: row.current_balance,
    escrowBalance: row.escrow_balance,
    bio: row.bio ?? null,
    serviceCategoryId: row.service_category_id ?? null,
  };
}

function toAppEarning(row: any): AppEarning {
  return {
    id: row.id,
    providerId: row.provider_id,
    jobId: row.job_id,
    grossAmount: row.gross_amount,
    platformFee: row.platform_fee,
    netAmount: row.net_amount,
    isInEscrow: row.is_in_escrow,
    releasedAt: row.released_at,
    createdAt: row.created_at,
    job: row.jobs ? toAppJob(row.jobs) : undefined,
  };
}

function toAppDisbursement(row: any): AppDisbursement {
  return {
    id: row.id,
    ref: row.ref,
    providerId: row.provider_id,
    providerName: row.user_profiles?.full_name ?? row.provider_name ?? null,
    providerEmail: row.user_profiles?.email ?? row.provider_email ?? null,
    providerPhone: row.user_profiles?.phone ?? row.provider_phone ?? null,
    amount: row.amount,
    channel: row.channel,
    mobileNumber: row.mobile_number,
    disbursementStatus: row.disbursement_status,
    providerRef: row.provider_ref,
    notes: row.notes ?? null,
    updatedAt: row.updated_at ?? null,
    createdAt: row.created_at,
  };
}

function toAppPayment(row: any): AppPayment {
  return {
    id: row.id,
    ref: row.ref,
    jobId: row.job_id,
    jobRef: row.jobs?.ref ?? '',
    payerId: row.payer_id,
    paymentType: row.payment_type,
    channel: row.channel,
    mobileNumber: row.mobile_number,
    amount: row.amount,
    platformFee: row.platform_fee,
    netAmount: row.net_amount,
    paymentStatus: row.payment_status,
    notes: row.notes,
    createdAt: row.created_at,
    party: row.user_profiles?.full_name ?? undefined,
  };
}

function toAppService(row: any): AppService {
  return {
    id: row.id,
    categoryId: row.category_id,
    name: row.name,
    description: row.description,
    basePrice: row.base_price,
    platformFee: row.platform_fee,
    unit: row.unit,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    category: row.service_categories ? row.service_categories : undefined,
  };
}

// ============================================================
// Service Categories
// ============================================================
export const categoryService = {
  async getAll(): Promise<ServiceCategory[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('service_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) {
        if (isSchemaError(error)) throw error;
        return [];
      }
      return data || [];
    } catch (err: any) {
      if (isSchemaError(err)) throw err;
      return [];
    }
  },

  async getAllAdmin(): Promise<ServiceCategory[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('service_categories')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) {
        if (isSchemaError(error)) throw error;
        return [];
      }
      return data || [];
    } catch (err: any) {
      if (isSchemaError(err)) throw err;
      return [];
    }
  },
};

// ============================================================
// Services (specific services under categories)
// ============================================================
export const serviceItemService = {
  /** Get all active services for a specific category */
  async getByCategory(categoryId: string): Promise<AppService[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('category_id', categoryId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) {
        if (isSchemaError(error)) throw error;
        return [];
      }
      return (data || []).map(toAppService);
    } catch (err: any) {
      if (isSchemaError(err)) throw err;
      return [];
    }
  },

  /** Get all services (admin) */
  async getAll(): Promise<AppService[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*, service_categories(*)')
        .order('sort_order', { ascending: true });
      if (error) {
        if (isSchemaError(error)) throw error;
        return [];
      }
      return (data || []).map(toAppService);
    } catch (err: any) {
      if (isSchemaError(err)) throw err;
      return [];
    }
  },

  /** Get all active services grouped by category */
  async getAllGrouped(): Promise<{ category: ServiceCategory; services: AppService[] }[]> {
    const supabase = createClient();
    try {
      const [catResult, svcResult] = await Promise.all([
        supabase.from('service_categories').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('services').select('*').eq('is_active', true).order('sort_order'),
      ]);
      if (catResult.error || svcResult.error) return [];
      const cats: ServiceCategory[] = catResult.data || [];
      const svcs: AppService[] = (svcResult.data || []).map(toAppService);
      return cats.map((cat) => ({
        category: cat,
        services: svcs.filter((s) => s.categoryId === cat.id),
      }));
    } catch {
      return [];
    }
  },

  /** Create a new service */
  async create(payload: {
    categoryId: string;
    name: string;
    description?: string;
    basePrice: number;
    unit: string;
    isActive: boolean;
  }): Promise<AppService | null> {
    const supabase = createClient();
    try {
      const platformFee = Math.round(payload.basePrice * 0.15);
      const { data, error } = await supabase
        .from('services')
        .insert({
          category_id: payload.categoryId,
          name: payload.name.trim(),
          description: payload.description?.trim() || null,
          base_price: payload.basePrice,
          platform_fee: platformFee,
          unit: payload.unit || 'job',
          is_active: payload.isActive,
        })
        .select('*')
        .single();
      if (error) return null;
      return toAppService(data);
    } catch {
      return null;
    }
  },

  /** Update a service */
  async update(id: string, payload: Partial<{
    name: string;
    description: string;
    basePrice: number;
    unit: string;
    isActive: boolean;
    categoryId: string;
  }>): Promise<boolean> {
    const supabase = createClient();
    try {
      const updates: any = {};
      if (payload.name !== undefined) updates.name = payload.name.trim();
      if (payload.description !== undefined) updates.description = payload.description.trim() || null;
      if (payload.basePrice !== undefined) {
        updates.base_price = payload.basePrice;
        updates.platform_fee = Math.round(payload.basePrice * 0.15);
      }
      if (payload.unit !== undefined) updates.unit = payload.unit;
      if (payload.isActive !== undefined) updates.is_active = payload.isActive;
      if (payload.categoryId !== undefined) updates.category_id = payload.categoryId;
      updates.updated_at = new Date().toISOString();

      const { error } = await supabase.from('services').update(updates).eq('id', id);
      return !error;
    } catch {
      return false;
    }
  },
};

// ============================================================
// Provider Services (many-to-many)
// ============================================================
export const providerServicesService = {
  /** Get all service IDs registered by a provider */
  async getProviderServiceIds(providerId: string): Promise<string[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('provider_services')
        .select('service_id')
        .eq('provider_id', providerId);
      if (error) return [];
      return (data || []).map((r: any) => r.service_id);
    } catch {
      return [];
    }
  },

  /** Get full service objects for a provider */
  async getProviderServices(providerId: string): Promise<AppService[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('provider_services')
        .select('service_id, services(*)')
        .eq('provider_id', providerId);
      if (error) return [];
      return (data || [])
        .filter((r: any) => r.services)
        .map((r: any) => toAppService(r.services));
    } catch {
      return [];
    }
  },

  /** Replace provider's service registrations */
  async setProviderServices(providerId: string, serviceIds: string[]): Promise<boolean> {
    const supabase = createClient();
    try {
      // Delete existing
      await supabase.from('provider_services').delete().eq('provider_id', providerId);
      if (serviceIds.length === 0) return true;
      // Insert new
      const rows = serviceIds.map((sid) => ({ provider_id: providerId, service_id: sid }));
      const { error } = await supabase.from('provider_services').insert(rows);
      return !error;
    } catch {
      return false;
    }
  },
};

// ============================================================
// Provider Skills
// ============================================================
export const providerSkillsService = {
  async getProviderSkills(providerId: string): Promise<string[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('provider_skills')
        .select('skill_name')
        .eq('provider_id', providerId);
      if (error) return [];
      return (data || []).map((r: any) => r.skill_name);
    } catch {
      return [];
    }
  },

  async setProviderSkills(providerId: string, skills: string[]): Promise<boolean> {
    const supabase = createClient();
    try {
      await supabase.from('provider_skills').delete().eq('provider_id', providerId);
      if (skills.length === 0) return true;
      const rows = skills.map((s) => ({ provider_id: providerId, skill_name: s.trim() }));
      const { error } = await supabase.from('provider_skills').insert(rows);
      return !error;
    } catch {
      return false;
    }
  },
};

// ============================================================
// Jobs Service
// ============================================================
export const jobService = {
  /** Customer: create a new job/service request */
  async createJob(payload: {
    serviceCategoryId: string;
    serviceId?: string;
    serviceLabel: string;
    address: string;
    area: string;
    landmark?: string;
    scheduledDate: string;
    scheduledTime: string;
    notes?: string;
    quantity: number;
    grossAmount: number;
    platformFee: number;
    netPayout: number;
    paymentChannel: PaymentChannel;
    paymentMobile: string;
  }): Promise<AppJob | null> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    try {
      const { data, error } = await supabase
        .from('jobs')
        .insert({
          customer_id: user.id,
          service_category_id: payload.serviceCategoryId,
          service_id: payload.serviceId || null,
          service_label: payload.serviceLabel,
          address: payload.address,
          area: payload.area,
          landmark: payload.landmark || null,
          scheduled_date: payload.scheduledDate,
          scheduled_time: payload.scheduledTime,
          notes: payload.notes || null,
          quantity: payload.quantity,
          gross_amount: payload.grossAmount,
          platform_fee: payload.platformFee,
          net_payout: payload.netPayout,
          job_status: 'requested',
          payment_channel: payload.paymentChannel,
          payment_mobile: payload.paymentMobile,
        })
        .select('*')
        .single();

      if (error) {
        if (isSchemaError(error)) throw error;
        return null;
      }
      return toAppJob(data);
    } catch (err: any) {
      if (isSchemaError(err)) throw err;
      return null;
    }
  },

  /** Customer: get their own jobs */
  async getCustomerJobs(customerId: string): Promise<AppJob[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select(`*, provider:provider_id(id, full_name, phone, area, is_verified, rating, role, email, account_status, avatar_url, created_at, updated_at)`)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) {
        if (isSchemaError(error)) throw error;
        return [];
      }
      return (data || []).map((row: any) => ({
        ...toAppJob(row),
        provider: row.provider ? toAppUser(row.provider) : undefined,
      }));
    } catch (err: any) {
      if (isSchemaError(err)) throw err;
      return [];
    }
  },

  /** Customer: get a single job by ID */
  async getJobById(jobId: string): Promise<AppJob | null> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select(`*, customer:customer_id(id, full_name, phone, area, is_verified, role, email, account_status, avatar_url, created_at, updated_at), provider:provider_id(id, full_name, phone, area, is_verified, rating, role, email, account_status, avatar_url, created_at, updated_at)`)
        .eq('id', jobId)
        .maybeSingle();

      if (error) {
        if (isSchemaError(error)) throw error;
        return null;
      }
      if (!data) return null;
      return toAppJob(data);
    } catch (err: any) {
      if (isSchemaError(err)) throw err;
      return null;
    }
  },

  /** Provider: get available jobs — uses RPC for service-based matching */
  async getAvailableJobs(): Promise<AppJob[]> {
    const supabase = createClient();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Use the service-matching RPC
      const { data, error } = await supabase.rpc('get_available_jobs_for_provider', {
        p_provider_id: user.id,
      });

      if (error) {
        // Fallback to direct query if RPC not available yet
        if (isSchemaError(error)) {
          const { data: fallback, error: fallbackErr } = await supabase
            .from('jobs')
            .select('*')
            .eq('job_status', 'ready_for_assignment')
            .order('created_at', { ascending: false });
          if (fallbackErr) return [];
          return (fallback || []).map(toAppJob);
        }
        return [];
      }
      return (data || []).map((row: any) => ({
        id: row.id,
        ref: row.ref,
        customerId: row.customer_id,
        providerId: row.provider_id,
        serviceLabel: row.service_label,
        address: row.address,
        area: row.area,
        landmark: row.landmark,
        scheduledDate: row.scheduled_date,
        scheduledTime: row.scheduled_time,
        notes: row.notes,
        quantity: row.quantity,
        grossAmount: row.gross_amount,
        platformFee: row.platform_fee,
        netPayout: row.net_payout,
        jobStatus: row.job_status as JobStatus,
        paymentChannel: row.payment_channel as PaymentChannel,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        providerCompletedAt: row.provider_completed_at ?? null,
        providerCompletedBy: row.provider_completed_by ?? null,
        customerConfirmedAt: row.customer_confirmed_at ?? null,
        customerConfirmedBy: row.customer_confirmed_by ?? null,
        createdAt: row.created_at,
      }));
    } catch (err: any) {
      if (isSchemaError(err)) throw err;
      return [];
    }
  },

  /** Provider: get their active/assigned job */
  async getProviderActiveJob(providerId: string): Promise<AppJob | null> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select(`*, customer:customer_id(id, full_name, phone, area, is_verified, role, email, account_status, avatar_url, created_at, updated_at)`)
        .eq('provider_id', providerId)
        .in('job_status', ['assigned', 'in_progress', 'awaiting_customer_confirmation'])
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        if (isSchemaError(error)) throw error;
        return null;
      }
      if (!data) return null;
      return toAppJob(data);
    } catch (err: any) {
      if (isSchemaError(err)) throw err;
      return null;
    }
  },

  /** Provider: accept a job — uses atomic RPC to prevent race conditions */
  async acceptJob(jobId: string, providerId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient();
    try {
      // Use the accept_job RPC which holds a row-level lock (FOR UPDATE SKIP LOCKED)
      // This prevents two providers from simultaneously accepting the same job.
      const { data, error } = await supabase.rpc('accept_job', {
        p_job_id: jobId,
        p_provider_id: providerId,
      });

      if (error) {
        if (isSchemaError(error)) throw error;
        console.error('acceptJob RPC error:', error.message);
        return { success: false, error: error.message };
      }

      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        console.warn('acceptJob failed:', result.error);
        return { success: false, error: result.error };
      }
      return { success: true };
    } catch (err: any) {
      if (isSchemaError(err)) throw err;
      return { success: false, error: err.message };
    }
  },

  /** Provider: update job status */
  async updateJobStatus(jobId: string, newStatus: JobStatus): Promise<boolean> {
    const supabase = createClient();
    const updates: Record<string, any> = { job_status: newStatus };
    if (newStatus === 'in_progress') updates.started_at = new Date().toISOString();
    if (newStatus === 'completed') updates.completed_at = new Date().toISOString();

    try {
      const { error } = await supabase.from('jobs').update(updates).eq('id', jobId);
      if (error) {
        if (isSchemaError(error)) throw error;
        return false;
      }
      return true;
    } catch (err: any) {
      if (isSchemaError(err)) throw err;
      return false;
    }
  },

  /** Provider: mark job complete → awaiting_customer_confirmation (two-party flow) */
  async providerMarkComplete(jobId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase.rpc('provider_mark_complete', { p_job_id: jobId });
      if (error) {
        if (isSchemaError(error)) throw error;
        return { success: false, error: error.message };
      }
      const result = data as { success: boolean; error?: string };
      return result;
    } catch (err: any) {
      if (isSchemaError(err)) throw err;
      return { success: false, error: err.message };
    }
  },

  /** Customer: confirm job completion → completed */
  async customerConfirmCompletion(jobId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient();
    try {
      const { data: disputeData, error: disputeError } = await supabase
        .from('disputes')
        .select('id')
        .eq('job_id', jobId)
        .in('dispute_status', ['open', 'under_review'])
        .limit(1);

      if (disputeError) {
        if (isSchemaError(disputeError)) throw disputeError;
        return { success: false, error: disputeError.message };
      }

      if ((disputeData || []).length > 0) {
        return {
          success: false,
          error: 'This job is still under dispute, so funds remain in escrow until the dispute is resolved.',
        };
      }

      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select('gross_amount, platform_fee, net_payout')
        .eq('id', jobId)
        .maybeSingle();

      if (jobError) {
        if (isSchemaError(jobError)) throw jobError;
        return { success: false, error: jobError.message };
      }

      if (jobData && Math.abs(Number(jobData.net_payout) - (Number(jobData.gross_amount) - Number(jobData.platform_fee))) > 0.01) {
        return {
          success: false,
          error: 'Provider payout does not match the required 15% platform fee calculation.',
        };
      }

      const { data, error } = await supabase.rpc('customer_confirm_completion', { p_job_id: jobId });
      if (error) {
        if (isSchemaError(error)) throw error;
        return { success: false, error: error.message };
      }
      const result = data as { success: boolean; error?: string };
      return result;
    } catch (err: any) {
      if (isSchemaError(err)) throw err;
      return { success: false, error: err.message };
    }
  },

  /** Admin: get all jobs with filters */
  async getAllJobs(filters?: {
    status?: string;
    search?: string;
  }): Promise<AppJob[]> {
    const supabase = createClient();
    try {
      let query = supabase
        .from('jobs')
        .select(`*, customer:customer_id(id, full_name, phone, area, role, email, account_status, avatar_url, created_at, updated_at, is_verified), provider:provider_id(id, full_name, phone, area, role, email, account_status, avatar_url, created_at, updated_at, is_verified)`)
        .order('created_at', { ascending: false });

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('job_status', filters.status as JobStatus);
      }

      const { data, error } = await query;
      if (error) {
        if (isSchemaError(error)) throw error;
        return [];
      }

      let jobs = (data || []).map(toAppJob);

      if (filters?.search) {
        const s = filters.search.toLowerCase();
        jobs = jobs.filter(
          (j) =>
            j.ref.toLowerCase().includes(s) ||
            j.serviceLabel.toLowerCase().includes(s) ||
            j.area.toLowerCase().includes(s) ||
            j.customer?.fullName?.toLowerCase().includes(s) ||
            j.provider?.fullName?.toLowerCase().includes(s)
        );
      }

      return jobs;
    } catch (err: any) {
      if (isSchemaError(err)) throw err;
      return [];
    }
  },

  /** Admin: assign provider to job */
  async assignProvider(jobId: string, providerId: string): Promise<boolean> {
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ provider_id: providerId, job_status: 'assigned' })
        .eq('id', jobId);

      if (error) {
        if (isSchemaError(error)) throw error;
        return false;
      }
      return true;
    } catch (err: any) {
      if (isSchemaError(err)) throw err;
      return false;
    }
  },

  /** Customer cancels an order before assignment */
  async cancelJob(jobId: string, reason: string): Promise<boolean> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    try {
      const { data: jobRow, error: fetchError } = await supabase
        .from('jobs')
        .select('id, job_status, gross_amount, customer_id')
        .eq('id', jobId)
        .maybeSingle();

      if (fetchError || !jobRow) return false;

      const preAssignment = ['requested', 'payment_confirmed', 'ready_for_assignment'].includes(jobRow.job_status);

      const { error: updateError } = await supabase
        .from('jobs')
        .update({
          job_status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: user.id,
          cancellation_reason: reason,
        })
        .eq('id', jobId);

      if (updateError) {
        if (isSchemaError(updateError)) throw updateError;
        return false;
      }

      await supabase.from('job_cancellations').insert({
        job_id: jobId,
        cancelled_by: user.id,
        cancelled_by_role: 'customer',
        reason,
        refund_issued: preAssignment,
        refund_amount: preAssignment ? jobRow.gross_amount : 0,
      });

      if (preAssignment) {
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const rand = Math.floor(Math.random() * 9000) + 1000;
        await supabase.from('payments').insert({
          ref: `REF-${dateStr}-${rand}`,
          job_id: jobId,
          payer_id: user.id,
          payment_type: 'refund',
          channel: 'internal',
          amount: jobRow.gross_amount,
          platform_fee: 0,
          net_amount: jobRow.gross_amount,
          payment_status: 'pending',
          notes: `Refund for cancelled order — ${reason}`,
        });
      }

      return true;
    } catch (err: any) {
      if (isSchemaError(err)) throw err;
      return false;
    }
  },

  /** Provider declines an accepted job */
  async declineJob(jobId: string, reason: string): Promise<boolean> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    try {
      const { error: updateError } = await supabase
        .from('jobs')
        .update({
          job_status: 'ready_for_assignment',
          provider_id: null,
        })
        .eq('id', jobId)
        .eq('provider_id', user.id);

      if (updateError) {
        if (isSchemaError(updateError)) throw updateError;
        return false;
      }

      await supabase.from('job_cancellations').insert({
        job_id: jobId,
        cancelled_by: user.id,
        cancelled_by_role: 'provider',
        reason,
        refund_issued: false,
        refund_amount: 0,
      });

      return true;
    } catch (err: any) {
      if (isSchemaError(err)) throw err;
      return false;
    }
  },
};

// ============================================================
// Payment Service (placeholder — no real API calls)
// ============================================================
export const paymentService = {
  /**
   * Initiate a payment for a job.
   * NOTE: This is a placeholder. Real Orange Money / MTN MoMo API
   * integration should be implemented here by a payment developer.
   * The function simulates success and updates job status to
   * 'payment_confirmed' → 'ready_for_assignment'.
   */
  async initiatePayment(payload: {
    jobId: string;
    channel: PaymentChannel;
    mobileNumber: string;
    amount: number;
    platformFee: number;
    netAmount: number;
  }): Promise<{ success: boolean; ref: string | null }> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Generate a payment reference
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(Math.random() * 9000) + 1000;
    const paymentRef = `TXN-${dateStr}-${rand}`;

    try {
      // 1. Create payment record
      const { error: paymentError } = await supabase.from('payments').insert({
        ref: paymentRef,
        job_id: payload.jobId,
        payer_id: user.id,
        payment_type: 'customer_payment',
        channel: payload.channel,
        mobile_number: payload.mobileNumber,
        amount: payload.amount,
        platform_fee: payload.platformFee,
        net_amount: payload.netAmount,
        payment_status: 'completed', // Simulated success
      });

      if (paymentError) {
        if (isSchemaError(paymentError)) throw paymentError;
        return { success: false, ref: null };
      }

      // 2. Advance job status: requested → payment_confirmed → ready_for_assignment
      const { error: statusError } = await supabase
        .from('jobs')
        .update({ job_status: 'ready_for_assignment' })
        .eq('id', payload.jobId)
        .eq('customer_id', user.id);

      if (statusError) {
        if (isSchemaError(statusError)) throw statusError;
        // Payment was recorded but job status update failed — still return success
        // so the customer sees their order, but log the issue
        console.error('Job status update failed after payment:', statusError);
        return { success: false, ref: null };
      }

      return { success: true, ref: paymentRef };
    } catch (err: any) {
      if (isSchemaError(err)) throw err;
      return { success: false, ref: null };
    }
  },
};

// ============================================================
// Provider Service
// ============================================================
export const providerService = {
  async getProfile(userId: string): Promise<AppProviderProfile | null> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('provider_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        if (isSchemaError(error)) throw error;
        return null;
      }
      if (!data) return null;
      return toAppProviderProfile(data);
    } catch (err: any) {
      if (isSchemaError(err)) throw err;
      return null;
    }
  },

  async updateProfile(
    userId: string,
    updates: Partial<{
      serviceArea: string;
      payoutProvider: PaymentChannel;
      payoutMobile: string;
      payoutMobileVerified: boolean;
      isAvailable: boolean;
      bio: string;
      serviceCategoryId: string;
    }>
  ): Promise<boolean> {
    const supabase = createClient();
    const dbUpdates: Record<string, any> = {};
    if (updates.serviceArea !== undefined) dbUpdates.service_area = updates.serviceArea;
    if (updates.payoutProvider !== undefined) dbUpdates.payout_provider = updates.payoutProvider;
    if (updates.payoutMobile !== undefined) dbUpdates.payout_mobile = updates.payoutMobile;
    if (updates.payoutMobileVerified !== undefined)
      dbUpdates.payout_mobile_verified = updates.payoutMobileVerified;
    if (updates.isAvailable !== undefined) dbUpdates.is_available = updates.isAvailable;
    if (updates.bio !== undefined) dbUpdates.bio = updates.bio;
    if (updates.serviceCategoryId !== undefined)
      dbUpdates.service_category_id = updates.serviceCategoryId;

    try {
      const { error } = await supabase
        .from('provider_profiles')
        .update(dbUpdates)
        .eq('user_id', userId);

      if (error) {
        if (isSchemaError(error)) throw error;
        return false;
      }
      return true;
    } catch (err: any) {
      if (isSchemaError(err)) throw err;
      return false;
    }
  },

  async getEarnings(providerId: string): Promise<AppEarning[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('provider_earnings')
        .select('*, jobs(id, ref, service_label, scheduled_date, gross_amount, platform_fee, net_payout, job_status, customer_id, provider_id, area, address, scheduled_time, notes, quantity, payment_channel, started_at, completed_at, created_at, updated_at, landmark, payment_mobile, cancelled_at)')
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false });

      if (error) {
        if (isSchemaError(error)) throw error;
        return [];
      }
      return (data || []).map(toAppEarning);
    } catch (err: any) {
      if (isSchemaError(err)) throw err;
      return [];
    }
  },

  async getDisbursements(providerId: string): Promise<AppDisbursement[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('provider_disbursements')
        .select('*')
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false });

      if (error) {
        if (isSchemaError(error)) throw error;
        return [];
      }
      return (data || []).map(toAppDisbursement);
    } catch (err: any) {
      if (isSchemaError(err)) throw err;
      return [];
    }
  },

  async requestDisbursement(payload: {
    providerId: string;
    amount: number;
    channel: PaymentChannel;
    mobileNumber: string;
  }): Promise<boolean> {
    const supabase = createClient();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(Math.random() * 9000) + 1000;
    const ref = `DIS-${dateStr}-${rand}`;

    try {
      const [profileResult, pendingResult] = await Promise.all([
        supabase
          .from('provider_profiles')
          .select('current_balance')
          .eq('user_id', payload.providerId)
          .maybeSingle(),
        supabase
          .from('provider_disbursements')
          .select('amount')
          .eq('provider_id', payload.providerId)
          .in('disbursement_status', ['pending', 'under_review', 'approved', 'processing']),
      ]);

      if (profileResult.error || !profileResult.data) return false;

      const currentBalance = Number(profileResult.data.current_balance ?? 0);
      const pendingWithdrawalTotal = (pendingResult.data || []).reduce(
        (sum: number, row: any) => sum + Number(row.amount || 0),
        0
      );
      const availableBalance = Math.max(currentBalance - pendingWithdrawalTotal, 0);

      if (payload.amount <= 0 || payload.amount > availableBalance) {
        return false;
      }

      const { error } = await supabase.from('provider_disbursements').insert({
        ref,
        provider_id: payload.providerId,
        amount: payload.amount,
        channel: payload.channel,
        mobile_number: payload.mobileNumber,
        disbursement_status: 'pending',
        notes: 'Test-mode withdrawal request: pending review before processing.',
      });

      if (error) {
        if (isSchemaError(error)) throw error;
        return false;
      }
      return true;
    } catch (err: any) {
      if (isSchemaError(err)) throw err;
      return false;
    }
  },

  async getWalletSummary(providerId: string): Promise<{
    availableBalance: number;
    pendingWithdrawals: number;
    totalEarnings: number;
    totalWithdrawn: number;
  }> {
    const supabase = createClient();
    try {
      const [profileResult, pendingResult, completedResult] = await Promise.all([
        supabase
          .from('provider_profiles')
          .select('current_balance, total_earned')
          .eq('user_id', providerId)
          .maybeSingle(),
        supabase
          .from('provider_disbursements')
          .select('amount')
          .eq('provider_id', providerId)
          .in('disbursement_status', ['pending', 'under_review', 'approved', 'processing']),
        supabase
          .from('provider_disbursements')
          .select('amount')
          .eq('provider_id', providerId)
          .eq('disbursement_status', 'completed'),
      ]);

      if (profileResult.error || !profileResult.data) {
        return { availableBalance: 0, pendingWithdrawals: 0, totalEarnings: 0, totalWithdrawn: 0 };
      }

      const availableBalance = Number(profileResult.data.current_balance ?? 0);
      const totalEarnings = Number(profileResult.data.total_earned ?? 0);
      const pendingWithdrawals = (pendingResult.data || []).reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0);
      const totalWithdrawn = (completedResult.data || []).reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0);

      return { availableBalance, pendingWithdrawals, totalEarnings, totalWithdrawn };
    } catch {
      return { availableBalance: 0, pendingWithdrawals: 0, totalEarnings: 0, totalWithdrawn: 0 };
    }
  },

  /** Admin: get all providers */
  async getAllProviders(): Promise<(AppUser & { providerProfile?: AppProviderProfile })[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*, provider_profiles(*)')
        .eq('role', 'provider')
        .order('created_at', { ascending: false });

      if (error) {
        if (isSchemaError(error)) throw error;
        return [];
      }
      return (data || []).map((row: any) => ({
        ...toAppUser(row),
        providerProfile: row.provider_profiles ? toAppProviderProfile(row.provider_profiles) : undefined,
      }));
    } catch (err: any) {
      if (isSchemaError(err)) throw err;
      return [];
    }
  },
};

// ============================================================
// User / Admin Service
// ============================================================
export const userService = {
  async getProfile(userId: string): Promise<AppUser | null> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        if (isSchemaError(error)) throw error;
        return null;
      }
      if (!data) return null;
      return toAppUser(data);
    } catch (err: any) {
      if (isSchemaError(err)) throw err;
      return null;
    }
  },

  /** Admin: get all users */
  async getAllUsers(filters?: {
    role?: string;
    status?: string;
    search?: string;
  }): Promise<(AppUser & { providerProfile?: AppProviderProfile })[]> {
    const supabase = createClient();
    try {
      let query = supabase
        .from('user_profiles')
        .select('*, provider_profiles(*)')
        .neq('role', 'admin')
        .order('created_at', { ascending: false });

      if (filters?.role && filters.role !== 'all') {
        query = query.eq('role', filters.role);
      }
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('account_status', filters.status);
      }

      const { data, error } = await query;
      if (error) {
        if (isSchemaError(error)) throw error;
        return [];
      }

      let users = (data || []).map((row: any) => ({
        ...toAppUser(row),
        providerProfile: row.provider_profiles ? toAppProviderProfile(row.provider_profiles) : undefined,
      }));

      if (filters?.search) {
        const s = filters.search.toLowerCase();
        users = users.filter(
          (u) =>
            u.fullName.toLowerCase().includes(s) ||
            u.email.toLowerCase().includes(s) ||
            u.phone?.includes(s) ||
            u.area?.toLowerCase().includes(s)
        );
      }

      return users;
    } catch (err: any) {
      if (isSchemaError(err)) throw err;
      return [];
    }
  },

  /** Admin: update user account status */
  async updateUserStatus(
    userId: string,
    status: 'active' | 'suspended'
  ): Promise<boolean> {
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ account_status: status })
        .eq('id', userId);

      if (error) {
        if (isSchemaError(error)) throw error;
        return false;
      }
      return true;
    } catch (err: any) {
      if (isSchemaError(err)) throw err;
      return false;
    }
  },

  /** Admin: verify a user */
  async verifyUser(userId: string): Promise<boolean> {
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_verified: true, account_status: 'active' })
        .eq('id', userId);

      if (error) {
        if (isSchemaError(error)) throw error;
        return false;
      }

      // Also activate provider profile if applicable
      await supabase
        .from('provider_profiles')
        .update({ provider_status: 'active' })
        .eq('user_id', userId);

      return true;
    } catch (err: any) {
      if (isSchemaError(err)) throw err;
      return false;
    }
  },
};

// ============================================================
// Admin Analytics Service
// ============================================================
export const adminService = {
  async getKPIs(): Promise<{
    totalJobsToday: number;
    totalRevenue: number;
    activeProviders: number;
    openDisputes: number;
    pendingPayments: number;
    completedJobsToday: number;
    totalCustomers: number;
    totalProviders: number;
  }> {
    const supabase = createClient();
    const today = new Date().toISOString().slice(0, 10);

    const [jobsToday, revenue, providers, disputes, pending, completedToday, customers, totalProviders] =
      await Promise.all([
        supabase
          .from('jobs')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', `${today}T00:00:00`),
        supabase
          .from('payments')
          .select('amount')
          .eq('payment_type', 'customer_payment')
          .eq('payment_status', 'completed'),
        supabase
          .from('provider_profiles')
          .select('*', { count: 'exact', head: true })
          .eq('provider_status', 'active'),
        supabase
          .from('disputes')
          .select('*', { count: 'exact', head: true })
          .in('dispute_status', ['open', 'under_review']),
        supabase
          .from('payments')
          .select('*', { count: 'exact', head: true })
          .eq('payment_status', 'pending'),
        supabase
          .from('jobs')
          .select('*', { count: 'exact', head: true })
          .eq('job_status', 'completed')
          .gte('completed_at', `${today}T00:00:00`),
        supabase
          .from('user_profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'customer'),
        supabase
          .from('user_profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'provider'),
      ]);

    // Surface any RLS/auth errors so the UI can show a diagnostic message
    const firstError = [jobsToday, revenue, providers, disputes, pending, completedToday, customers, totalProviders]
      .find((r) => r.error);
    if (firstError?.error) {
      throw new Error(firstError.error.message || 'Admin query failed — check RLS policies and admin role.');
    }

    const totalRevenue = (revenue.data || []).reduce((s: number, r: any) => s + r.amount, 0);

    return {
      totalJobsToday: jobsToday.count || 0,
      totalRevenue,
      activeProviders: providers.count || 0,
      openDisputes: disputes.count || 0,
      pendingPayments: pending.count || 0,
      completedJobsToday: completedToday.count || 0,
      totalCustomers: customers.count || 0,
      totalProviders: totalProviders.count || 0,
    };
  },

  /**
   * Get a breakdown of financial metrics for the Admin Dashboard.
   * Uses the payments table as the single source of truth.
   *
   * Definitions:
   *   grossTransactionValue  — sum of amount on completed customer_payment rows
   *   platformRevenue        — sum of platform_fee on completed customer_payment rows (15%)
   *   providerShare          — sum of net_amount on completed customer_payment rows (85%)
   *   pendingHeld            — sum of amount on pending/processing customer_payment rows
   *   disbursed              — sum of amount on completed provider_disbursement rows
   *
   * No joins to jobs or job_status_history — each payment row is counted exactly once.
   */
  async getFinancialSummary(): Promise<{
    grossTransactionValue: number;
    platformRevenue: number;
    providerShare: number;
    pendingHeld: number;
    disbursed: number;
  }> {
    const supabase = createClient();
    try {
      const [completedPayments, pendingPayments, disbursements] = await Promise.all([
        // Completed customer payments — source for gross, platform fee, provider share
        supabase
          .from('payments')
          .select('amount, platform_fee, net_amount')
          .eq('payment_type', 'customer_payment')
          .eq('payment_status', 'completed'),
        // Pending/processing customer payments — held funds
        supabase
          .from('payments')
          .select('amount')
          .eq('payment_type', 'customer_payment')
          .in('payment_status', ['pending', 'processing']),
        // Completed provider disbursements
        supabase
          .from('provider_disbursements')
          .select('amount')
          .eq('disbursement_status', 'completed'),
      ]);

      const grossTransactionValue = (completedPayments.data || []).reduce(
        (s: number, r: any) => s + (r.amount || 0), 0
      );
      const platformRevenue = (completedPayments.data || []).reduce(
        (s: number, r: any) => s + (r.platform_fee || 0), 0
      );
      const providerShare = (completedPayments.data || []).reduce(
        (s: number, r: any) => s + (r.net_amount || 0), 0
      );
      const pendingHeld = (pendingPayments.data || []).reduce(
        (s: number, r: any) => s + (r.amount || 0), 0
      );
      const disbursed = (disbursements.data || []).reduce(
        (s: number, r: any) => s + (r.amount || 0), 0
      );

      return { grossTransactionValue, platformRevenue, providerShare, pendingHeld, disbursed };
    } catch {
      return { grossTransactionValue: 0, platformRevenue: 0, providerShare: 0, pendingHeld: 0, disbursed: 0 };
    }
  },

  async getWithdrawalRequests(filters?: {
    status?: string;
    search?: string;
  }): Promise<AppDisbursement[]> {
    const supabase = createClient();
    try {
      let query = supabase
        .from('provider_disbursements')
        .select('*, user_profiles!provider_disbursements_provider_id_fkey(full_name, email, phone)')
        .order('created_at', { ascending: false });

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('disbursement_status', filters.status as DisbursementStatus);
      }

      const { data, error } = await query;
      if (error) {
        if (isSchemaError(error)) throw error;
        return [];
      }

      let items = (data || []).map(toAppDisbursement);
      if (filters?.search) {
        const s = filters.search.toLowerCase();
        items = items.filter(
          (item) =>
            item.ref.toLowerCase().includes(s) ||
            item.mobileNumber.toLowerCase().includes(s) ||
            item.providerId.toLowerCase().includes(s)
        );
      }
      return items;
    } catch (err: any) {
      if (isSchemaError(err)) throw err;
      return [];
    }
  },

  async updateWithdrawalStatus(
    disbursementId: string,
    status: DisbursementStatus,
    note?: string
  ): Promise<boolean> {
    const supabase = createClient();
    try {
      const { data: existing, error: fetchError } = await supabase
        .from('provider_disbursements')
        .select('disbursement_status')
        .eq('id', disbursementId)
        .maybeSingle();

      if (fetchError || !existing) {
        if (fetchError && isSchemaError(fetchError)) throw fetchError;
        return false;
      }

      const allowedTransitions: Record<DisbursementStatus, DisbursementStatus[]> = {
        pending: ['under_review', 'rejected'],
        under_review: ['approved', 'rejected'],
        approved: ['processing'],
        processing: ['completed', 'failed'],
        completed: [],
        rejected: [],
        failed: [],
      };

      if (!allowedTransitions[existing.disbursement_status as DisbursementStatus]?.includes(status)) {
        return false;
      }

      const updates: Record<string, any> = {
        disbursement_status: status,
        updated_at: new Date().toISOString(),
      };

      if (note !== undefined) updates.notes = note;

      const { error } = await supabase
        .from('provider_disbursements')
        .update(updates)
        .eq('id', disbursementId);

      if (error) {
        if (isSchemaError(error)) throw error;
        return false;
      }
      return true;
    } catch (err: any) {
      if (isSchemaError(err)) throw err;
      return false;
    }
  },

  async approveWithdrawal(disbursementId: string, note = 'Withdrawal approved for processing.'): Promise<boolean> {
    return this.updateWithdrawalStatus(disbursementId, 'approved', note);
  },

  async rejectWithdrawal(disbursementId: string, note = 'Withdrawal rejected by admin review.'): Promise<boolean> {
    return this.updateWithdrawalStatus(disbursementId, 'rejected', note);
  },

  async processWithdrawal(disbursementId: string, note = 'Withdrawal is being processed through the payout provider.'): Promise<boolean> {
    return this.updateWithdrawalStatus(disbursementId, 'processing', note);
  },

  async completeWithdrawal(disbursementId: string, note = 'Withdrawal completed successfully.'): Promise<boolean> {
    return this.updateWithdrawalStatus(disbursementId, 'completed', note);
  },

  async failWithdrawal(disbursementId: string, reason = 'Withdrawal failed during payout processing.'): Promise<boolean> {
    return this.updateWithdrawalStatus(disbursementId, 'failed', reason);
  },

  async getAllPayments(filters?: {
    type?: string;
    status?: string;
    search?: string;
  }): Promise<AppPayment[]> {
    const supabase = createClient();
    try {
      let query = supabase
        .from('payments')
        .select('*, jobs(ref), user_profiles!payments_payer_id_fkey(full_name)')
        .order('created_at', { ascending: false });

      if (filters?.type && filters.type !== 'all') {
        query = query.eq('payment_type', filters.type);
      }
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('payment_status', filters.status);
      }

      const { data, error } = await query;
      if (error) {
        if (isSchemaError(error)) throw error;
        return [];
      }

      let payments = (data || []).map(toAppPayment);

      if (filters?.search) {
        const s = filters.search.toLowerCase();
        payments = payments.filter(
          (p) =>
            p.ref.toLowerCase().includes(s) ||
            p.jobRef.toLowerCase().includes(s) ||
            p.party?.toLowerCase().includes(s)
        );
      }

      return payments;
    } catch (err: any) {
      if (isSchemaError(err)) throw err;
      return [];
    }
  },

  async approvePayment(paymentId: string): Promise<boolean> {
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from('payments')
        .update({ payment_status: 'processing' })
        .eq('id', paymentId);

      if (error) {
        if (isSchemaError(error)) throw error;
        return false;
      }
      return true;
    } catch (err: any) {
      if (isSchemaError(err)) throw err;
      return false;
    }
  },
};

// ============================================================
// Proof of Work Service
// ============================================================
export const proofOfWorkService = {
  /** Upload a photo to Supabase Storage and record in proof_of_work table */
  async uploadPhoto(
    jobId: string,
    providerId: string,
    file: File
  ): Promise<{ publicUrl: string; id: string; storagePath: string } | null> {
    const supabase = createClient();
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const storagePath = `${providerId}/${jobId}/${fileName}`;

    try {
      // 1. Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('proof-of-work')
        .upload(storagePath, file, { upsert: false });

      if (uploadError) {
        if (isSchemaError(uploadError)) throw uploadError;
        return null;
      }

      // 2. Get public URL
      const { data: urlData } = supabase.storage
        .from('proof-of-work')
        .getPublicUrl(storagePath);

      const publicUrl = urlData.publicUrl;

      // 3. Record in proof_of_work table
      const { data, error: dbError } = await supabase
        .from('proof_of_work')
        .insert({
          job_id: jobId,
          provider_id: providerId,
          storage_path: storagePath,
          public_url: publicUrl,
          file_name: file.name,
          file_size: file.size,
        })
        .select('id')
        .single();

      if (dbError) {
        if (isSchemaError(dbError)) throw dbError;
        return null;
      }

      return { publicUrl, id: data.id, storagePath };
    } catch (err: any) {
      if (isSchemaError(err)) throw err;
      return null;
    }
  },

  /** Delete a proof photo from storage and DB */
  async deletePhoto(proofId: string, storagePath: string): Promise<boolean> {
    const supabase = createClient();
    try {
      await supabase.storage.from('proof-of-work').remove([storagePath]);
      const { error } = await supabase
        .from('proof_of_work')
        .delete()
        .eq('id', proofId);
      if (error) return false;
      return true;
    } catch {
      return false;
    }
  },

  /** Get all proof photos for a job */
  async getJobPhotos(jobId: string): Promise<{ id: string; publicUrl: string; storagePath: string; fileName: string | null }[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('proof_of_work')
        .select('id, public_url, storage_path, file_name')
        .eq('job_id', jobId)
        .order('created_at', { ascending: true });

      if (error) return [];
      return (data || []).map((r: any) => ({
        id: r.id,
        publicUrl: r.public_url,
        storagePath: r.storage_path,
        fileName: r.file_name,
      }));
    } catch {
      return [];
    }
  },
};

// ============================================================
// Reviews Service
// ============================================================
export const reviewService = {
  /** Submit a review */
  async submitReview(payload: {
    jobId: string;
    reviewerId: string;
    revieweeId: string;
    rating: number;
    comment?: string;
  }): Promise<boolean> {
    const supabase = createClient();
    try {
      const { error } = await supabase.from('reviews').insert({
        job_id: payload.jobId,
        reviewer_id: payload.reviewerId,
        reviewee_id: payload.revieweeId,
        rating: payload.rating,
        comment: payload.comment || null,
      });
      if (error) {
        if (isSchemaError(error)) throw error;
        return false;
      }
      // Update provider rating average
      await reviewService.refreshProviderRating(payload.revieweeId);
      return true;
    } catch (err: any) {
      if (isSchemaError(err)) throw err;
      return false;
    }
  },

  /** Check if a review exists for a job by a reviewer */
  async getReviewForJob(jobId: string, reviewerId: string): Promise<{ rating: number; comment: string | null } | null> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('rating, comment')
        .eq('job_id', jobId)
        .eq('reviewer_id', reviewerId)
        .maybeSingle();
      if (error) return null;
      return data || null;
    } catch {
      return null;
    }
  },

  /** Get average rating for a user */
  async getAverageRating(userId: string): Promise<{ average: number; count: number }> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('rating')
        .eq('reviewee_id', userId);
      if (error || !data || data.length === 0) return { average: 0, count: 0 };
      const avg = data.reduce((s: number, r: any) => s + r.rating, 0) / data.length;
      return { average: Math.round(avg * 10) / 10, count: data.length };
    } catch {
      return { average: 0, count: 0 };
    }
  },

  /** Refresh provider_profiles.rating from reviews table */
  async refreshProviderRating(userId: string): Promise<void> {
    const supabase = createClient();
    try {
      const { data } = await supabase
        .from('reviews')
        .select('rating')
        .eq('reviewee_id', userId);
      if (!data || data.length === 0) return;
      const avg = data.reduce((s: number, r: any) => s + r.rating, 0) / data.length;
      await supabase
        .from('provider_profiles')
        .update({ rating: Math.round(avg * 100) / 100 })
        .eq('user_id', userId);
    } catch {
      // silently fail
    }
  },
};

// ============================================================
// Customer Service
// ============================================================
export const customerService = {
  /**
   * Get or create a customer profile for the authenticated user.
   * Returns null if the user is not authenticated.
   * NOTE: totalSpent is calculated directly from the payments table
   * (payer_id + payment_type=customer_payment + payment_status=completed)
   * to avoid stale denormalized counters and duplicate-counting from joins.
   */
  async getOrCreateProfile(userId: string): Promise<{ id: string; totalJobs: number; totalSpent: number; preferredArea: string | null } | null> {
    const supabase = createClient();
    try {
      // Ensure the customer_profiles row exists
      const { data, error } = await supabase
        .from('customer_profiles')
        .select('id, total_jobs, preferred_area')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) return null;

      let profileId: string;
      let totalJobs: number;
      let preferredArea: string | null;

      if (data) {
        profileId = data.id;
        totalJobs = data.total_jobs;
        preferredArea = data.preferred_area;
      } else {
        // Create profile if it doesn't exist (first-time customer)
        const { data: created, error: createError } = await supabase
          .from('customer_profiles')
          .insert({ user_id: userId })
          .select('id, total_jobs, preferred_area')
          .single();

        if (createError) return null;
        profileId = created.id;
        totalJobs = created.total_jobs;
        preferredArea = created.preferred_area;
      }

      // Calculate totalSpent directly from the payments table.
      // Only count: payment_type=customer_payment AND payment_status=completed
      // AND payer_id=userId. This avoids stale counters and join-based duplication.
      const { data: paymentRows, error: paymentError } = await supabase
        .from('payments').select('amount').eq('payer_id', userId).eq('payment_type', 'customer_payment').eq('payment_status', 'completed');

      const totalSpent = paymentError
        ? 0
        : (paymentRows || []).reduce((sum: number, row: any) => sum + (row.amount || 0), 0);

      return {
        id: profileId,
        totalJobs,
        totalSpent,
        preferredArea,
      };
    } catch {
      return null;
    }
  },

  /**
   * Check if a customer has any order history.
   * Used to determine first-time vs returning customer routing.
   */
  async hasOrderHistory(userId: string): Promise<boolean> {
    const supabase = createClient();
    try {
      const { count, error } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', userId);

      if (error) return false;
      return (count || 0) > 0;
    } catch {
      return false;
    }
  },

  /**
   * Get all jobs for a customer with provider info and payment details.
   * Used by the Customer Dashboard.
   */
  async getCustomerOrders(userId: string): Promise<AppJob[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          provider:provider_id(id, full_name, phone, area, is_verified, role, email, account_status, avatar_url, created_at, updated_at)
        `)
        .eq('customer_id', userId)
        .order('created_at', { ascending: false });

      if (error) return [];
      return (data || []).map((row: any) => ({
        ...toAppJob(row),
        provider: row.provider ? toAppUser(row.provider) : undefined,
      }));
    } catch {
      return [];
    }
  },

  /**
   * Get payment records for a customer's orders.
   * Only returns customer_payment type records to avoid showing
   * provider_disbursement or platform_fee rows in the customer view.
   */
  async getCustomerPayments(userId: string): Promise<AppPayment[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*, jobs(ref)')
        .eq('payer_id', userId)
        .eq('payment_type', 'customer_payment')
        .order('created_at', { ascending: false });

      if (error) return [];
      return (data || []).map(toAppPayment);
    } catch {
      return [];
    }
  },
};

// ============================================================
// Dispute Service
// ============================================================
export const disputeService = {
  /** File a new dispute for a job, optionally uploading photo evidence */
  async fileDispute(payload: {
    jobId: string;
    raisedByRole: 'customer' | 'provider';
    reason: string;
    description?: string;
    evidenceFiles?: File[];
  }): Promise<boolean> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    try {
      // Insert the dispute record
      const { data: disputeRow, error } = await supabase
        .from('disputes')
        .insert({
          job_id: payload.jobId,
          raised_by: user.id,
          raised_by_role: payload.raisedByRole,
          reason: payload.reason,
          description: payload.description || null,
          dispute_status: 'open',
        })
        .select('id')
        .single();

      if (error) {
        if (isSchemaError(error)) throw error;
        return false;
      }

      // Upload evidence photos if provided
      if (disputeRow && payload.evidenceFiles && payload.evidenceFiles.length > 0) {
        for (const file of payload.evidenceFiles) {
          const ext = file.name.split('.').pop() || 'jpg';
          const path = `${user.id}/${disputeRow.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from('dispute-evidence')
            .upload(path, file, { upsert: false });

          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from('dispute-evidence')
              .getPublicUrl(path);

            if (urlData?.publicUrl) {
              await supabase.from('dispute_evidence').insert({
                dispute_id: disputeRow.id,
                uploaded_by: user.id,
                public_url: urlData.publicUrl,
                file_name: file.name,
              });
            }
          }
        }
      }

      // Update job status to 'disputed' so both dashboards reflect it
      await supabase
        .from('jobs')
        .update({ job_status: 'disputed' })
        .eq('id', payload.jobId);

      return true;
    } catch (err: any) {
      if (isSchemaError(err)) throw err;
      return false;
    }
  },

  /** Get evidence photos for a dispute */
  async getDisputeEvidence(disputeId: string): Promise<{ id: string; publicUrl: string; fileName: string | null }[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('dispute_evidence')
        .select('id, public_url, file_name')
        .eq('dispute_id', disputeId)
        .order('created_at', { ascending: true });

      if (error) {
        if (isSchemaError(error)) throw error;
        return [];
      }
      return (data || []).map((row: any) => ({
        id: row.id,
        publicUrl: row.public_url,
        fileName: row.file_name,
      }));
    } catch (err: any) {
      if (isSchemaError(err)) throw err;
      return [];
    }
  },

  /** Admin: get all disputes with optional status filter */
  async getAllDisputes(status?: import('@/lib/types/database').DisputeStatus): Promise<import('@/lib/types/database').AppDispute[]> {
    const supabase = createClient();
    try {
      let query = supabase
        .from('disputes')
        .select(`
          *,
          raised_by_user:raised_by(id, full_name, role),
          job:job_id(id, ref)
        `)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('dispute_status', status);
      }

      const { data, error } = await query;
      if (error) {
        if (isSchemaError(error)) throw error;
        return [];
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        jobId: row.job_id,
        jobRef: row.job?.ref ?? undefined,
        raisedBy: row.raised_by,
        raisedByName: row.raised_by_user?.full_name ?? undefined,
        raisedByRole: row.raised_by_role,
        reason: row.reason,
        description: row.description,
        disputeStatus: row.dispute_status,
        resolvedBy: row.resolved_by,
        resolutionNote: row.resolution_note,
        resolvedAt: row.resolved_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (err: any) {
      if (isSchemaError(err)) throw err;
      return [];
    }
  },

  /** Admin: update dispute status and optionally add resolution note */
  async updateDisputeStatus(
    disputeId: string,
    newStatus: import('@/lib/types/database').DisputeStatus,
    resolutionNote?: string
  ): Promise<boolean> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const updates: Record<string, any> = { dispute_status: newStatus };
    if (resolutionNote) updates.resolution_note = resolutionNote;
    if (newStatus === 'resolved' || newStatus === 'closed') {
      updates.resolved_by = user?.id ?? null;
      updates.resolved_at = new Date().toISOString();
    }

    try {
      const { error } = await supabase
        .from('disputes')
        .update(updates)
        .eq('id', disputeId);

      if (error) {
        if (isSchemaError(error)) throw error;
        return false;
      }
      return true;
    } catch (err: any) {
      if (isSchemaError(err)) throw err;
      return false;
    }
  },
};

