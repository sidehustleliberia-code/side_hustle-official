/**
 * SideHustle Payment Service Architecture
 *
 * This module defines the payment provider interface and placeholder
 * implementations for Orange Money and MTN MoMo.
 *
 * IMPORTANT: No real API calls are made here. This is a clean architecture
 * placeholder so a payment developer can integrate the actual providers
 * without touching the rest of the application.
 *
 * To integrate a real provider:
 * 1. Implement the PaymentProvider interface below
 * 2. Replace the placeholder in OrangeMoneyProvider or MtnMomoProvider
 * 3. Add the provider credentials to .env
 * 4. Wire the provider into createPaymentProvider()
 */

// ============================================================
// Payment Provider Interface
// ============================================================

export interface PaymentInitiateRequest {
  /** Internal job reference (e.g. SH-20260913-001) */
  jobRef: string;
  /** Amount in LRD (Liberian Dollars) */
  amount: number;
  /** Customer mobile number in E.164 format */
  mobileNumber: string;
  /** Optional description shown to customer */
  description?: string;
}

export interface PaymentInitiateResponse {
  success: boolean;
  /** Provider-assigned transaction reference */
  providerRef: string | null;
  /** Human-readable status message */
  message: string;
  /** Raw provider response for logging */
  rawResponse?: Record<string, unknown>;
}

export interface PaymentStatusRequest {
  /** Provider-assigned transaction reference */
  providerRef: string;
}

export interface PaymentStatusResponse {
  success: boolean;
  status: 'pending' | 'completed' | 'failed';
  message: string;
  rawResponse?: Record<string, unknown>;
}

export interface PaymentProvider {
  name: string;
  initiatePayment(req: PaymentInitiateRequest): Promise<PaymentInitiateResponse>;
  checkStatus(req: PaymentStatusRequest): Promise<PaymentStatusResponse>;
}

// ============================================================
// Orange Money Placeholder
// ============================================================

/**
 * Orange Money Liberia payment provider.
 *
 * Integration notes (for payment developer):
 * - API docs: Contact Orange Money Liberia for merchant API access
 * - Credentials needed: ORANGE_MONEY_API_KEY, ORANGE_MONEY_MERCHANT_ID
 * - Flow: Initiate → Customer receives USSD prompt → Webhook confirms
 * - Webhook endpoint: POST /api/webhooks/orange-money
 */
class OrangeMoneyProvider implements PaymentProvider {
  name = 'Orange Money';

  async initiatePayment(req: PaymentInitiateRequest): Promise<PaymentInitiateResponse> {
    // TODO: Replace with real Orange Money API call
    // Example:
    // const response = await fetch('https://api.orange.com/orange-money-webpay/lr/v1/webpayment', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${process.env.ORANGE_MONEY_API_KEY}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     merchant_key: process.env.ORANGE_MONEY_MERCHANT_ID,
    //     currency: 'LRD',
    //     order_id: req.jobRef,
    //     amount: req.amount,
    //     return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/payment/callback`,
    //     cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/payment/cancel`,
    //     notif_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/orange-money`,
    //     lang: 'en',
    //     reference: req.jobRef,
    //   }),
    // });

    console.warn('[OrangeMoneyProvider] Placeholder — no real API call made');
    return {
      success: true,
      providerRef: `OM-PLACEHOLDER-${Date.now()}`,
      message: 'Payment initiated (placeholder)',
    };
  }

  async checkStatus(req: PaymentStatusRequest): Promise<PaymentStatusResponse> {
    // TODO: Replace with real status check
    console.warn('[OrangeMoneyProvider] Status check placeholder');
    return {
      success: true,
      status: 'completed',
      message: 'Status check placeholder',
    };
  }
}

// ============================================================
// MTN MoMo Placeholder
// ============================================================

/**
 * MTN Mobile Money (Lonestar Cell) payment provider.
 *
 * Integration notes (for payment developer):
 * - API docs: MTN MoMo API (https://momodeveloper.mtn.com/)
 * - Credentials needed: MTN_MOMO_API_USER, MTN_MOMO_API_KEY, MTN_MOMO_SUBSCRIPTION_KEY
 * - Flow: Create API user → Get access token → Request to pay → Poll for status
 * - Webhook endpoint: POST /api/webhooks/mtn-momo
 */
class MtnMomoProvider implements PaymentProvider {
  name = 'MTN MoMo';

  async initiatePayment(req: PaymentInitiateRequest): Promise<PaymentInitiateResponse> {
    // TODO: Replace with real MTN MoMo API call
    // Step 1: Get access token
    // const tokenResponse = await fetch('https://sandbox.momodeveloper.mtn.com/collection/token/', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Basic ${Buffer.from(`${process.env.MTN_MOMO_API_USER}:${process.env.MTN_MOMO_API_KEY}`).toString('base64')}`,
    //     'Ocp-Apim-Subscription-Key': process.env.MTN_MOMO_SUBSCRIPTION_KEY!,
    //   },
    // });
    // const { access_token } = await tokenResponse.json();
    //
    // Step 2: Request to pay
    // const referenceId = crypto.randomUUID();
    // await fetch('https://sandbox.momodeveloper.mtn.com/collection/v1_0/requesttopay', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${access_token}`,
    //     'X-Reference-Id': referenceId,
    //     'X-Target-Environment': 'sandbox',
    //     'Ocp-Apim-Subscription-Key': process.env.MTN_MOMO_SUBSCRIPTION_KEY!,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     amount: String(req.amount),
    //     currency: 'LRD',
    //     externalId: req.jobRef,
    //     payer: { partyIdType: 'MSISDN', partyId: req.mobileNumber.replace('+', '') },
    //     payerMessage: req.description || `SideHustle Job ${req.jobRef}`,
    //     payeeNote: req.jobRef,
    //   }),
    // });

    console.warn('[MtnMomoProvider] Placeholder — no real API call made');
    return {
      success: true,
      providerRef: `MTN-PLACEHOLDER-${Date.now()}`,
      message: 'Payment initiated (placeholder)',
    };
  }

  async checkStatus(req: PaymentStatusRequest): Promise<PaymentStatusResponse> {
    // TODO: Replace with real status check
    console.warn('[MtnMomoProvider] Status check placeholder');
    return {
      success: true,
      status: 'completed',
      message: 'Status check placeholder',
    };
  }
}

// ============================================================
// Factory
// ============================================================

export type PaymentChannelKey = 'orange_money' | 'mtn_momo';

export function createPaymentProvider(channel: PaymentChannelKey): PaymentProvider {
  switch (channel) {
    case 'orange_money':
      return new OrangeMoneyProvider();
    case 'mtn_momo':
      return new MtnMomoProvider();
    default:
      throw new Error(`Unknown payment channel: ${channel}`);
  }
}

// ============================================================
// Webhook handler types (for future implementation)
// ============================================================

export interface OrangeMoneyWebhookPayload {
  status: string;
  txnid: string;
  reference: string;
  amount: string;
  currency: string;
}

export interface MtnMomoWebhookPayload {
  referenceId: string;
  status: 'SUCCESSFUL' | 'FAILED' | 'PENDING';
  financialTransactionId: string;
  amount: string;
  currency: string;
}
