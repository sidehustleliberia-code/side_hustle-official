'use client';
import React from 'react';
import { MapPin, Calendar, Clock, FileText, Plus, Minus, User, Phone } from 'lucide-react';
import type { OrderFormData } from './ServiceRequestPage';

const monroviaAreas = [
  'Paynesville',
  'Sinkor',
  'Congo Town',
  'Mamba Point',
  'Oldest Congo Town',
  'Red Light Area',
  'Duala Market Area',
  'New Kru Town',
  'Logan Town',
  'Clara Town',
];

const timeSlots = [
  '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM',
  '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM',
  '05:00 PM', '06:00 PM',
];

interface Props {
  formData: OrderFormData;
  onChange: (updates: Partial<OrderFormData>) => void;
}

export default function OrderDetailsForm({ formData, onChange }: Props) {
  const today = new Date();
  const minDate = today.toISOString().split('T')[0];
  const maxDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return (
    <>
      {/* Section 2: Customer Info */}
      <div className="form-section-card">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold flex-shrink-0">
            2
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Your Information</h2>
            <p className="text-xs text-muted-foreground">So the provider knows who to contact</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* Full Name */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="customerName" className="text-sm font-semibold text-foreground">
              Full Name
            </label>
            <div className="relative">
              <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                id="customerName"
                type="text"
                placeholder="e.g. Fatu Kamara"
                className="input-base pl-10"
                value={formData.customerName}
                onChange={(e) => onChange({ customerName: e.target.value })}
              />
            </div>
          </div>

          {/* Phone Number */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="customerPhone" className="text-sm font-semibold text-foreground">
              Phone Number
            </label>
            <div className="relative">
              <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                id="customerPhone"
                type="tel"
                placeholder="e.g. +231 770 000 000"
                className="input-base pl-10"
                value={formData.customerPhone}
                onChange={(e) => onChange({ customerPhone: e.target.value })}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Location */}
      <div className="form-section-card">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold flex-shrink-0">
            3
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Service Location</h2>
            <p className="text-xs text-muted-foreground">Where should the provider come?</p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {/* Street Address */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="address" className="text-sm font-semibold text-foreground">
              Street Address
            </label>
            <div className="relative">
              <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                id="address"
                type="text"
                placeholder="e.g. 14 Tubman Boulevard"
                className="input-base pl-10"
                value={formData.address}
                onChange={(e) => onChange({ address: e.target.value })}
              />
            </div>
          </div>

          {/* Area + Landmark */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="area" className="text-sm font-semibold text-foreground">
                Area / Neighborhood
              </label>
              <select
                id="area"
                className="input-base"
                value={formData.area}
                onChange={(e) => onChange({ area: e.target.value })}
              >
                <option value="">Select area</option>
                {monroviaAreas.map((area) => (
                  <option key={`area-${area}`} value={area}>{area}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="landmark" className="text-sm font-semibold text-foreground">
                Nearby Landmark
              </label>
              <p className="text-xs text-muted-foreground -mt-0.5">Helps providers find you faster</p>
              <input
                id="landmark"
                type="text"
                placeholder="e.g. Near Paynesville Market"
                className="input-base"
                value={formData.landmark}
                onChange={(e) => onChange({ landmark: e.target.value })}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section 4: Schedule */}
      <div className="form-section-card">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold flex-shrink-0">
            4
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Preferred Schedule</h2>
            <p className="text-xs text-muted-foreground">When would you like the service?</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* Date */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="date" className="text-sm font-semibold text-foreground">
              Preferred Date
            </label>
            <div className="relative">
              <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                id="date"
                type="date"
                min={minDate}
                max={maxDate}
                className="input-base pl-10 date-input-custom"
                value={formData.date}
                onChange={(e) => onChange({ date: e.target.value })}
              />
            </div>
          </div>

          {/* Time */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="time" className="text-sm font-semibold text-foreground">
              Preferred Time
            </label>
            <div className="relative">
              <Clock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <select
                id="time"
                className="input-base pl-10"
                value={formData.time}
                onChange={(e) => onChange({ time: e.target.value })}
              >
                <option value="">Select time slot</option>
                {timeSlots.map((slot) => (
                  <option key={`time-${slot}`} value={slot}>{slot}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Quantity (for laundry) */}
        {formData.category && (
          <div className="mt-4 flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-foreground">
              Quantity ({formData.category.unit})
            </label>
            <p className="text-xs text-muted-foreground -mt-0.5">
              How many {formData.category.unit.replace('per ', '')}s do you need?
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onChange({ quantity: Math.max(1, formData.quantity - 1) })}
                className="w-10 h-10 rounded-xl border-2 border-border flex items-center justify-center hover:border-primary hover:bg-navy-50 transition-all"
                aria-label="Decrease quantity"
              >
                <Minus size={16} className="text-muted-foreground" />
              </button>
              <span className="text-xl font-bold text-foreground tabular-nums w-8 text-center">
                {formData.quantity}
              </span>
              <button
                type="button"
                onClick={() => onChange({ quantity: Math.min(10, formData.quantity + 1) })}
                className="w-10 h-10 rounded-xl border-2 border-border flex items-center justify-center hover:border-primary hover:bg-navy-50 transition-all"
                aria-label="Increase quantity"
              >
                <Plus size={16} className="text-muted-foreground" />
              </button>
              <span className="text-sm text-muted-foreground font-medium">
                × LRD {formData.category.basePrice} = LRD {(formData.category.basePrice * formData.quantity).toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Section 5: Notes */}
      <div className="form-section-card">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold flex-shrink-0">
            5
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Special Instructions</h2>
            <p className="text-xs text-muted-foreground">Any details the provider should know</p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="notes" className="text-sm font-semibold text-foreground">
            Job Notes
            <span className="text-muted-foreground font-normal ml-1">(optional)</span>
          </label>
          <p className="text-xs text-muted-foreground -mt-0.5">
            E.g. &quot;Delicate fabrics, hand wash only&quot; or &quot;Gate is on the left side&quot;
          </p>
          <div className="relative">
            <FileText size={16} className="absolute left-3.5 top-3.5 text-muted-foreground" />
            <textarea
              id="notes"
              placeholder="Add any special instructions, access details, or service preferences..."
              rows={4}
              className="input-base pl-10 resize-none"
              value={formData.notes}
              onChange={(e) => onChange({ notes: e.target.value })}
              maxLength={400}
            />
          </div>
          <p className="text-xs text-muted-foreground text-right">
            {formData.notes.length}/400 characters
          </p>
        </div>
      </div>
    </>
  );
}