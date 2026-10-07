import React from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, Sparkles, Camera, Monitor, ShoppingBag, Wrench, Heart, PartyPopper } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


const categories = [
  {
    id: 'cat-education',
    icon: BookOpen,
    title: 'Education & Tutoring',
    description: 'Find support for learning, exam preparation, academic subjects, and practical skills.',
    color: 'bg-blue-50',
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-100',
    featured: true,
  },
  {
    id: 'cat-cleaning',
    icon: Sparkles,
    title: 'Cleaning & Laundry',
    description: 'Get help with laundry, ironing, home cleaning, and everyday household tasks.',
    color: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    iconBg: 'bg-emerald-100',
    featured: false,
  },
  {
    id: 'cat-photography',
    icon: Camera,
    title: 'Photography & Creative',
    description: 'Connect with photographers, designers, editors, and creative professionals.',
    color: 'bg-purple-50',
    iconColor: 'text-purple-600',
    iconBg: 'bg-purple-100',
    featured: false,
  },
  {
    id: 'cat-tech',
    icon: Monitor,
    title: 'Technology & Digital',
    description: 'Find people who can help with websites, design, computers, and digital work.',
    color: 'bg-sky-50',
    iconColor: 'text-sky-600',
    iconBg: 'bg-sky-100',
    featured: true,
  },
  {
    id: 'cat-errands',
    icon: ShoppingBag,
    title: 'Errands & Assistance',
    description: 'Get help with everyday tasks, pickups, shopping, and practical assistance.',
    color: 'bg-amber-50',
    iconColor: 'text-amber-600',
    iconBg: 'bg-amber-100',
    featured: false,
  },
  {
    id: 'cat-repairs',
    icon: Wrench,
    title: 'Repairs & Skilled Trades',
    description: 'Find skilled people for repairs, maintenance, construction, and practical work.',
    color: 'bg-orange-50',
    iconColor: 'text-orange-600',
    iconBg: 'bg-orange-100',
    featured: false,
  },
  {
    id: 'cat-personal',
    icon: Heart,
    title: 'Personal & Lifestyle',
    description: 'Discover personal services from beauty, tailoring, styling, and related providers.',
    color: 'bg-rose-50',
    iconColor: 'text-rose-600',
    iconBg: 'bg-rose-100',
    featured: false,
  },
  {
    id: 'cat-events',
    icon: PartyPopper,
    title: 'Events & Occasions',
    description: 'Find people for photography, decoration, catering, entertainment, and event support.',
    color: 'bg-violet-50',
    iconColor: 'text-violet-600',
    iconBg: 'bg-violet-100',
    featured: false,
  },
];

export default function FeaturedServicesSection() {
  return (
    <section id="services" className="py-20 lg:py-28 bg-muted/40">
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-10 xl:px-16">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div className="max-w-xl">
            <p className="section-label mb-3">Explore Services</p>
            <h2 className="text-hero-md font-extrabold text-foreground mb-3">
              What can we help you with?
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              Browse eight service categories. Choose a category, select a specific service, describe your needs, and connect with an eligible provider.
            </p>
          </div>
          <Link
            href="/service-request-order-form"
            className="btn-primary self-start md:self-auto flex-shrink-0"
          >
            Browse All Services
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* Category Grid — asymmetric bento */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories?.map((cat, index) => {
            const Icon = cat?.icon;
            const isWide = index === 0 || index === 3;
            return (
              <Link
                key={cat?.id}
                href="/service-request-order-form"
                className={`group relative rounded-2xl p-6 border border-border bg-card hover:shadow-card-hover transition-all duration-200 hover:-translate-y-1 flex flex-col gap-4 ${
                  isWide ? 'lg:col-span-2' : ''
                }`}
              >
                {/* Icon */}
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${cat?.iconBg}`}>
                  <Icon size={22} className={cat?.iconColor} />
                </div>

                {/* Content */}
                <div className="flex-1">
                  <h3 className="text-base font-bold text-foreground mb-1.5 group-hover:text-primary transition-colors">
                    {cat?.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {cat?.description}
                  </p>
                </div>

                {/* Arrow */}
                <div className="flex items-center gap-1 text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Browse services</span>
                  <ArrowRight size={12} />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Bottom note */}
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Not sure which category fits?{' '}
            <Link href="/service-request-order-form" className="text-primary font-semibold hover:underline">
              Start a request
            </Link>{' '}
            and we'll help you find the right service.
          </p>
        </div>
      </div>
    </section>
  );
}