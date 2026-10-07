'use client';
import React from 'react';
import {
  BookOpen, Shirt, Camera, Monitor, ShoppingBag, Wrench, Scissors, Calendar,
  Package, Loader2, ChevronDown,
} from 'lucide-react';
import type { ServiceCategoryOption, ServiceOption } from './ServiceRequestPage';

const categoryIcons: Record<string, React.ElementType> = {
  'education': BookOpen,
  'tutoring': BookOpen,
  'cleaning': Shirt,
  'laundry': Shirt,
  'photography': Camera,
  'creative': Camera,
  'technology': Monitor,
  'digital': Monitor,
  'errands': ShoppingBag,
  'assistance': ShoppingBag,
  'repairs': Wrench,
  'trades': Wrench,
  'personal': Scissors,
  'lifestyle': Scissors,
  'events': Calendar,
  'occasions': Calendar,
};

function getIconForCategory(label: string): React.ElementType {
  const lower = label.toLowerCase();
  for (const [key, Icon] of Object.entries(categoryIcons)) {
    if (lower.includes(key)) return Icon;
  }
  return Package;
}

interface Props {
  selectedCategory: ServiceCategoryOption | null;
  selectedService: ServiceOption | null;
  onSelectCategory: (cat: ServiceCategoryOption) => void;
  onSelectService: (svc: ServiceOption) => void;
  categories: ServiceCategoryOption[];
  services: ServiceOption[];
  loadingServices: boolean;
}

export default function ServiceCategorySelector({
  selectedCategory,
  selectedService,
  onSelectCategory,
  onSelectService,
  categories,
  services,
  loadingServices,
}: Props) {
  return (
    <div className="form-section-card">
      {/* Step 1: Category */}
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold flex-shrink-0">
          1
        </div>
        <div>
          <h2 className="text-base font-bold text-foreground">Choose a Category</h2>
          <p className="text-xs text-muted-foreground">Select the type of service you need</p>
        </div>
      </div>

      {categories.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={24} className="animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {categories.map((cat) => {
            const CatIcon = getIconForCategory(cat.label);
            const isSelected = selectedCategory?.id === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 text-center ${
                  isSelected
                    ? 'border-primary bg-navy-50 shadow-sm'
                    : 'border-border bg-background hover:border-primary/40 hover:bg-navy-50/50'
                }`}
              >
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                    isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <CatIcon size={22} />
                </div>
                <p className={`text-xs font-bold leading-tight ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                  {cat.label}
                </p>
              </button>
            );
          })}
        </div>
      )}

      {/* Step 2: Service (shown after category selected) */}
      {selectedCategory && (
        <div className="border-t border-border pt-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold flex-shrink-0">
              2
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Choose a Service</h2>
              <p className="text-xs text-muted-foreground">
                Services under <span className="font-semibold text-primary">{selectedCategory.label}</span>
              </p>
            </div>
          </div>

          {loadingServices ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 size={22} className="animate-spin text-primary" />
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              No services available in this category yet.
            </div>
          ) : (
            <div className="relative">
              <select
                value={selectedService?.id || ''}
                onChange={(e) => {
                  const svc = services.find((s) => s.id === e.target.value);
                  if (svc) onSelectService(svc);
                }}
                className="input-base appearance-none pr-10 w-full"
              >
                <option value="">Select a service...</option>
                {services.map((svc) => (
                  <option key={svc.id} value={svc.id}>
                    {svc.name} — LRD {svc.basePrice.toLocaleString('en-US')}/{svc.unit}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
            </div>
          )}

          {/* Selected service badge */}
          {selectedService && (
            <div className="mt-3 flex items-center gap-2 p-3 bg-primary/5 rounded-xl border border-primary/20">
              <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-primary truncate">{selectedService.name}</p>
                <p className="text-xs text-muted-foreground">
                  LRD {selectedService.basePrice.toLocaleString('en-US')}/{selectedService.unit} ·
                  Platform fee: LRD {selectedService.platformFee.toLocaleString('en-US')} (15%)
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}