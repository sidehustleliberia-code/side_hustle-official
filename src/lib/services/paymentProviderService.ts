export type SupportedPayoutProvider = 'orange_money' | 'mtn_momo' | 'bank_transfer';

export interface PaymentProviderConfig {
  key: SupportedPayoutProvider;
  label: string;
  description: string;
  supportsMobile: boolean;
  testMode: boolean;
}

const providerCatalog: PaymentProviderConfig[] = [
  {
    key: 'orange_money',
    label: 'Orange Money',
    description: 'Orange Money mobile wallet',
    supportsMobile: true,
    testMode: true,
  },
  {
    key: 'mtn_momo',
    label: 'MTN Mobile Money',
    description: 'MTN MoMo wallet',
    supportsMobile: true,
    testMode: true,
  },
  {
    key: 'bank_transfer',
    label: 'Bank Transfer',
    description: 'Bank account transfer',
    supportsMobile: false,
    testMode: true,
  },
];

export const paymentProviderService = {
  listProviders(): PaymentProviderConfig[] {
    return providerCatalog;
  },

  getProvider(key: SupportedPayoutProvider | null | undefined): PaymentProviderConfig | undefined {
    if (!key) return providerCatalog[0];
    return providerCatalog.find((provider) => provider.key === key);
  },

  validateAccount(providerKey: SupportedPayoutProvider, mobileNumber: string): boolean {
    if (!mobileNumber.trim()) return false;
    if (providerKey === 'bank_transfer') {
      return mobileNumber.trim().length >= 8;
    }
    return /^\+?[0-9]{8,15}$/.test(mobileNumber.replace(/\s+/g, ''));
  },

  generateTestReference() {
    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const random = Math.floor(Math.random() * 9000 + 1000);
    return `TEST-${stamp}-${random}`;
  },
};
