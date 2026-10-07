'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';
import ServiceCategorySelector from './ServiceCategorySelector';
import OrderDetailsForm from './OrderDetailsForm';
import PricingSummaryPanel from './PricingSummaryPanel';
import PaymentModal from './PaymentModal';
import { ArrowLeft, Bell, User, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { categoryService, serviceItemService } from '@/lib/services/dataService';
import type { ServiceCategory, AppService } from '@/lib/types/database';

export type ServiceCategoryOption = {
  id: string;
  label: string;
  basePrice: number;
  platformFee: number;
  unit: string;
};

export type ServiceOption = {
  id: string;
  categoryId: string;
  name: string;
  basePrice: number;
  platformFee: number;
  unit: string;
};

export type OrderFormData = {
  category: ServiceCategoryOption | null;
  service: ServiceOption | null;
  address: string;
  area: string;
  landmark: string;
  date: string;
  time: string;
  notes: string;
  quantity: number;
  customerName: string;
  customerPhone: string;
};

const initialFormData: OrderFormData = {
  category: null,
  service: null,
  address: '',
  area: '',
  landmark: '',
  date: '',
  time: '',
  notes: '',
  quantity: 1,
  customerName: '',
  customerPhone: '',
};

export default function ServiceRequestPage() {
  const { profile } = useAuth();
  const [formData, setFormData] = useState<OrderFormData>(initialFormData);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const [jobRef, setJobRef] = useState('');
  const [jobId, setJobId] = useState('');
  const [categories, setCategories] = useState<ServiceCategoryOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingServices, setLoadingServices] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData((prev) => ({
        ...prev,
        customerName: prev.customerName || profile.fullName || '',
        customerPhone: prev.customerPhone || profile.phone || '',
      }));
    }
  }, [profile]);

  useEffect(() => {
    categoryService.getAll().then((cats: ServiceCategory[]) => {
      setCategories(
        cats.map((c) => ({
          id: c.id,
          label: c.label,
          basePrice: c.base_price,
          platformFee: c.platform_fee,
          unit: c.unit,
        }))
      );
      setLoadingCategories(false);
    });
  }, []);

  // When category changes, load services for that category
  useEffect(() => {
    if (!formData.category) {
      setServices([]);
      return;
    }
    setLoadingServices(true);
    serviceItemService.getByCategory(formData.category.id).then((svcs: AppService[]) => {
      setServices(
        svcs.map((s) => ({
          id: s.id,
          categoryId: s.categoryId,
          name: s.name,
          basePrice: s.basePrice,
          platformFee: s.platformFee,
          unit: s.unit,
        }))
      );
      setLoadingServices(false);
    });
  }, [formData.category?.id]);

  const handleCategorySelect = (cat: ServiceCategoryOption) => {
    setFormData((prev) => ({
      ...prev,
      category: cat,
      service: null, // Clear service when category changes
      quantity: 1,
    }));
  };

  const handleOrderComplete = (ref: string, id: string) => {
    setJobRef(ref);
    setJobId(id);
    setOrderSubmitted(true);
    setShowPaymentModal(false);
  };

  if (orderSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-card rounded-3xl border border-border shadow-card p-8 text-center flex flex-col gap-6">
          <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto">
            <span className="text-4xl">✅</span>
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-foreground mb-2">Order Placed!</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your service request has been received. A provider will be assigned once your payment is confirmed.
            </p>
          </div>
          <div className="bg-muted/60 rounded-xl p-4 text-left">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Job Reference</p>
            <p className="text-lg font-extrabold text-primary tabular-nums">{jobRef}</p>
          </div>
          <div className="flex flex-col gap-3">
            <Link href={`/job-progress?jobId=${jobId}`} className="btn-primary w-full py-3.5 text-center">
              Track My Order
            </Link>
            <Link href="/customer-dashboard" className="btn-outline w-full py-3 text-center">
              My Dashboard
            </Link>
            <button
              onClick={() => {
                setFormData(initialFormData);
                setOrderSubmitted(false);
                setJobRef('');
                setJobId('');
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              Book Another Service
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Nav */}
      <header className="sticky top-0 z-40 bg-card border-b border-border shadow-nav">
        <div className="max-w-screen-2xl mx-auto px-4 lg:px-10 xl:px-16 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 rounded-lg hover:bg-muted transition-colors" aria-label="Back to home">
              <ArrowLeft size={20} className="text-muted-foreground" />
            </Link>
            <div className="h-5 w-px bg-border" />
            <Link href="/" className="flex items-center gap-2">
              <AppLogo size={28} />
              <span className="font-extrabold text-base text-primary hidden sm:block">SideHustle</span>
            </Link>
          </div>

          <h1 className="text-base font-bold text-foreground">Book a Service</h1>

          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg hover:bg-muted transition-colors relative" aria-label="Notifications">
              <Bell size={20} className="text-muted-foreground" />
            </button>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center" title={profile?.fullName || 'User'}>
              <User size={16} className="text-primary-foreground" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-screen-2xl mx-auto px-4 lg:px-10 xl:px-16 py-6 lg:py-10">
        {loadingCategories ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-6 lg:gap-8 items-start">
            {/* Left — Form */}
            <div className="lg:col-span-2 flex flex-col gap-0">
              <ServiceCategorySelector
                selectedCategory={formData.category}
                selectedService={formData.service}
                onSelectCategory={handleCategorySelect}
                onSelectService={(svc) => setFormData((prev) => ({ ...prev, service: svc, quantity: 1 }))}
                categories={categories}
                services={services}
                loadingServices={loadingServices}
              />
              <OrderDetailsForm
                formData={formData}
                onChange={(updates) => setFormData((prev) => ({ ...prev, ...updates }))}
              />
            </div>

            {/* Right — Summary */}
            <div className="lg:sticky lg:top-24">
              <PricingSummaryPanel
                formData={formData}
                onProceedToPayment={() => setShowPaymentModal(true)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Mobile sticky bottom bar */}
      {!loadingCategories && (
        <div className="lg:hidden sticky-bottom-bar">
          <PricingSummaryPanel
            formData={formData}
            onProceedToPayment={() => setShowPaymentModal(true)}
            compact
          />
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          formData={formData}
          onClose={() => setShowPaymentModal(false)}
          onComplete={handleOrderComplete}
        />
      )}
    </div>
  );
}