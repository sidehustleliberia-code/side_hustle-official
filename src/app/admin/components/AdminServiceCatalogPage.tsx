'use client';
import React, { useState, useEffect } from 'react';
import {
  Plus, Edit2, ToggleLeft, ToggleRight, Loader2, Save, X,
  DollarSign, Tag, CheckCircle, XCircle, RefreshCw, ChevronDown, ChevronRight, Layers,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { ServiceCategory } from '@/lib/types/database';
import { serviceItemService } from '@/lib/services/dataService';
import type { AppService } from '@/lib/types/database';
import { toast } from 'sonner';

type TabView = 'categories' | 'services';

interface CategoryEditForm {
  label: string;
  description: string;
  basePrice: string;
  unit: string;
  isActive: boolean;
}

interface ServiceEditForm {
  name: string;
  description: string;
  basePrice: string;
  unit: string;
  isActive: boolean;
  categoryId: string;
}

const EMPTY_CAT_FORM: CategoryEditForm = { label: '', description: '', basePrice: '', unit: 'job', isActive: true };
const EMPTY_SVC_FORM: ServiceEditForm = { name: '', description: '', basePrice: '', unit: 'job', isActive: true, categoryId: '' };

export default function AdminServiceCatalogPage() {
  const [tab, setTab] = useState<TabView>('categories');
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<AppService[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCatId, setExpandedCatId] = useState<string | null>(null);

  // Category editing
  const [editingCatId, setEditingCatId] = useState<string | 'new' | null>(null);
  const [catForm, setCatForm] = useState<CategoryEditForm>(EMPTY_CAT_FORM);

  // Service editing
  const [editingSvcId, setEditingSvcId] = useState<string | 'new' | null>(null);
  const [svcForm, setSvcForm] = useState<ServiceEditForm>(EMPTY_SVC_FORM);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const [catResult, svcResult] = await Promise.all([
        supabase.from('service_categories').select('*').order('sort_order', { ascending: true }),
        supabase.from('services').select('*').order('sort_order', { ascending: true }),
      ]);
      if (catResult.error) toast.error('Failed to load categories: ' + catResult.error.message);
      else setCategories(catResult.data || []);

      if (svcResult.error) {
        // services table may not exist yet — silently ignore
        setServices([]);
      } else {
        setServices((svcResult.data || []).map((row: any) => ({
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
        })));
      }
    } catch {
      toast.error('Failed to load service catalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // ── Category CRUD ──
  const startEditCat = (cat: ServiceCategory) => {
    setEditingCatId(cat.id);
    setCatForm({ label: cat.label, description: cat.description || '', basePrice: String(cat.base_price), unit: cat.unit, isActive: cat.is_active });
  };

  const startNewCat = () => { setEditingCatId('new'); setCatForm(EMPTY_CAT_FORM); };
  const cancelCatEdit = () => { setEditingCatId(null); setCatForm(EMPTY_CAT_FORM); };

  const handleSaveCat = async () => {
    if (!catForm.label.trim()) { toast.error('Category name is required'); return; }
    const price = parseInt(catForm.basePrice, 10);
    if (isNaN(price) || price < 0) { toast.error('Enter a valid base price'); return; }
    setSaving(true);
    try {
      const supabase = createClient();
      const platformFee = Math.round(price * 0.15);
      const payload = { label: catForm.label.trim(), description: catForm.description.trim() || null, base_price: price, platform_fee: platformFee, unit: catForm.unit || 'job', is_active: catForm.isActive };
      if (editingCatId === 'new') {
        const slug = catForm.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const { error } = await supabase.from('service_categories').insert({ ...payload, slug: `${slug}-${Date.now()}`, sort_order: categories.length });
        if (error) { toast.error('Failed to create category: ' + error.message); return; }
        toast.success('Category created');
      } else {
        const { error } = await supabase.from('service_categories').update({ ...payload } as any).eq('id', editingCatId!);
        if (error) { toast.error('Failed to update category: ' + error.message); return; }
        toast.success('Category updated');
      }
      cancelCatEdit();
      await loadData();
    } finally { setSaving(false); }
  };

  const handleToggleCat = async (cat: ServiceCategory) => {
    const supabase = createClient();
    const { error } = await supabase.from('service_categories').update({ is_active: !cat.is_active } as any).eq('id', cat.id);
    if (error) { toast.error('Failed to update: ' + error.message); return; }
    setCategories((prev) => prev.map((c) => c.id === cat.id ? { ...c, is_active: !c.is_active } : c));
    toast.success(`${cat.label} is now ${!cat.is_active ? 'active' : 'inactive'}`);
  };

  // ── Service CRUD ──
  const startEditSvc = (svc: AppService) => {
    setEditingSvcId(svc.id);
    setSvcForm({ name: svc.name, description: svc.description || '', basePrice: String(svc.basePrice), unit: svc.unit, isActive: svc.isActive, categoryId: svc.categoryId });
  };

  const startNewSvc = (categoryId?: string) => {
    setEditingSvcId('new');
    setSvcForm({ ...EMPTY_SVC_FORM, categoryId: categoryId || '' });
    setTab('services');
  };

  const cancelSvcEdit = () => { setEditingSvcId(null); setSvcForm(EMPTY_SVC_FORM); };

  const handleSaveSvc = async () => {
    if (!svcForm.name.trim()) { toast.error('Service name is required'); return; }
    if (!svcForm.categoryId) { toast.error('Please select a category'); return; }
    const price = parseInt(svcForm.basePrice, 10);
    if (isNaN(price) || price < 0) { toast.error('Enter a valid base price'); return; }
    setSaving(true);
    try {
      if (editingSvcId === 'new') {
        const result = await serviceItemService.create({ categoryId: svcForm.categoryId, name: svcForm.name, description: svcForm.description, basePrice: price, unit: svcForm.unit, isActive: svcForm.isActive });
        if (!result) { toast.error('Failed to create service'); return; }
        toast.success('Service created');
      } else {
        const ok = await serviceItemService.update(editingSvcId!, { name: svcForm.name, description: svcForm.description, basePrice: price, unit: svcForm.unit, isActive: svcForm.isActive, categoryId: svcForm.categoryId });
        if (!ok) { toast.error('Failed to update service'); return; }
        toast.success('Service updated');
      }
      cancelSvcEdit();
      await loadData();
    } finally { setSaving(false); }
  };

  const handleToggleSvc = async (svc: AppService) => {
    const ok = await serviceItemService.update(svc.id, { isActive: !svc.isActive });
    if (!ok) { toast.error('Failed to update service'); return; }
    setServices((prev) => prev.map((s) => s.id === svc.id ? { ...s, isActive: !s.isActive } : s));
    toast.success(`${svc.name} is now ${!svc.isActive ? 'active' : 'inactive'}`);
  };

  const getServicesForCategory = (catId: string) => services.filter((s) => s.categoryId === catId);

  return (
    <div className="p-5 lg:p-8 max-w-screen-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">Service Catalog</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage categories, services, pricing, and availability</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadData} className="p-2 rounded-lg hover:bg-muted transition-colors" title="Refresh">
            <RefreshCw size={18} className="text-muted-foreground" />
          </button>
          <button onClick={() => tab === 'categories' ? startNewCat() : startNewSvc()} className="btn-primary flex items-center gap-2 py-2 px-4 text-sm">
            <Plus size={16} /> Add {tab === 'categories' ? 'Category' : 'Service'}
          </button>
        </div>
      </div>

      {/* Pricing note */}
      <div className="bg-navy-50 rounded-2xl p-4 flex items-start gap-3 mb-6">
        <DollarSign size={16} className="text-primary flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-primary">Pricing Model</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Platform fee is automatically calculated as 15% of base price. Provider receives 85%.
            Prices are locked on each booking — future changes do not affect existing orders.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 rounded-xl p-1 mb-6 w-fit">
        <button
          onClick={() => setTab('categories')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'categories' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Layers size={15} /> Categories ({categories.length})
        </button>
        <button
          onClick={() => setTab('services')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'services' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Tag size={15} /> Services ({services.length})
        </button>
      </div>

      {/* Edit Form */}
      {(editingCatId !== null || editingSvcId !== null) && (
        <div className="bg-card rounded-2xl border border-primary/30 shadow-card p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-extrabold text-foreground">
              {editingCatId !== null ? (editingCatId === 'new' ? 'Add New Category' : 'Edit Category') : (editingSvcId === 'new' ? 'Add New Service' : 'Edit Service')}
            </h2>
            <button onClick={editingCatId !== null ? cancelCatEdit : cancelSvcEdit} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <X size={16} className="text-muted-foreground" />
            </button>
          </div>

          {editingCatId !== null ? (
            // Category form
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-foreground">Category Name *</label>
                <input type="text" value={catForm.label} onChange={(e) => setCatForm((f) => ({ ...f, label: e.target.value }))} className="input-base" placeholder="e.g. Technology & Digital" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-foreground">Default Base Price (LRD)</label>
                <input type="number" value={catForm.basePrice} onChange={(e) => setCatForm((f) => ({ ...f, basePrice: e.target.value }))} className="input-base" placeholder="e.g. 1700" min="0" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-foreground">Unit</label>
                <input type="text" value={catForm.unit} onChange={(e) => setCatForm((f) => ({ ...f, unit: e.target.value }))} className="input-base" placeholder="e.g. job, session, hour" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-foreground">Status</label>
                <button onClick={() => setCatForm((f) => ({ ...f, isActive: !f.isActive }))}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${catForm.isActive ? 'border-success bg-green-50 text-success' : 'border-border text-muted-foreground'}`}>
                  {catForm.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  {catForm.isActive ? 'Active' : 'Inactive'}
                </button>
              </div>
              <div className="sm:col-span-2 flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-foreground">Description</label>
                <textarea value={catForm.description} onChange={(e) => setCatForm((f) => ({ ...f, description: e.target.value }))} className="input-base resize-none" rows={2} placeholder="Brief description..." />
              </div>
            </div>
          ) : (
            // Service form
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-foreground">Service Name *</label>
                <input type="text" value={svcForm.name} onChange={(e) => setSvcForm((f) => ({ ...f, name: e.target.value }))} className="input-base" placeholder="e.g. Web Development" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-foreground">Category *</label>
                <select value={svcForm.categoryId} onChange={(e) => setSvcForm((f) => ({ ...f, categoryId: e.target.value }))} className="input-base">
                  <option value="">Select category...</option>
                  {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-foreground">Base Price (LRD) *</label>
                <input type="number" value={svcForm.basePrice} onChange={(e) => setSvcForm((f) => ({ ...f, basePrice: e.target.value }))} className="input-base" placeholder="e.g. 1700" min="0" />
                {svcForm.basePrice && !isNaN(parseInt(svcForm.basePrice)) && (
                  <p className="text-xs text-muted-foreground">
                    Platform: LRD {Math.round(parseInt(svcForm.basePrice) * 0.15).toLocaleString('en-US')} · Provider: LRD {Math.round(parseInt(svcForm.basePrice) * 0.85).toLocaleString('en-US')}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-foreground">Unit</label>
                <input type="text" value={svcForm.unit} onChange={(e) => setSvcForm((f) => ({ ...f, unit: e.target.value }))} className="input-base" placeholder="e.g. job, session, hour" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-foreground">Status</label>
                <button onClick={() => setSvcForm((f) => ({ ...f, isActive: !f.isActive }))}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${svcForm.isActive ? 'border-success bg-green-50 text-success' : 'border-border text-muted-foreground'}`}>
                  {svcForm.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  {svcForm.isActive ? 'Active' : 'Inactive'}
                </button>
              </div>
              <div className="sm:col-span-2 flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-foreground">Description</label>
                <textarea value={svcForm.description} onChange={(e) => setSvcForm((f) => ({ ...f, description: e.target.value }))} className="input-base resize-none" rows={2} placeholder="Brief description..." />
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={editingCatId !== null ? handleSaveCat : handleSaveSvc} disabled={saving} className="btn-primary flex items-center gap-2 py-2.5 px-5">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={editingCatId !== null ? cancelCatEdit : cancelSvcEdit} className="py-2.5 px-5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={32} className="animate-spin text-primary" /></div>
      ) : tab === 'categories' ? (
        // ── CATEGORIES TAB ──
        categories.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-12 text-center">
            <Layers size={32} className="text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No categories configured yet.</p>
            <button onClick={startNewCat} className="btn-primary mt-4 py-2 px-5 text-sm">Add First Category</button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {categories.map((cat) => {
              const catServices = getServicesForCategory(cat.id);
              const isExpanded = expandedCatId === cat.id;
              return (
                <div key={cat.id} className={`bg-card rounded-2xl border shadow-card ${cat.is_active ? 'border-border' : 'border-border opacity-60'}`}>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="text-sm font-extrabold text-foreground">{cat.label}</h3>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${cat.is_active ? 'bg-green-50 text-success' : 'bg-muted text-muted-foreground'}`}>
                            {cat.is_active ? <CheckCircle size={10} /> : <XCircle size={10} />}
                            {cat.is_active ? 'Active' : 'Inactive'}
                          </span>
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            {catServices.length} service{catServices.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        {cat.description && <p className="text-xs text-muted-foreground mb-2">{cat.description}</p>}
                        <div className="flex flex-wrap gap-3">
                          <div className="bg-muted/40 rounded-lg px-3 py-1.5">
                            <p className="text-xs text-muted-foreground">Default Price</p>
                            <p className="text-sm font-extrabold text-foreground">LRD {cat.base_price.toLocaleString('en-US')}</p>
                          </div>
                          <div className="bg-green-50 rounded-lg px-3 py-1.5">
                            <p className="text-xs text-muted-foreground">Platform (15%)</p>
                            <p className="text-sm font-extrabold text-success">LRD {Math.round(cat.base_price * 0.15).toLocaleString('en-US')}</p>
                          </div>
                          <div className="bg-navy-50 rounded-lg px-3 py-1.5">
                            <p className="text-xs text-muted-foreground">Provider (85%)</p>
                            <p className="text-sm font-extrabold text-primary">LRD {Math.round(cat.base_price * 0.85).toLocaleString('en-US')}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => setExpandedCatId(isExpanded ? null : cat.id)} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground" title="View services">
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                        <button onClick={() => handleToggleCat(cat)} className={`p-2 rounded-lg transition-colors ${cat.is_active ? 'hover:bg-amber-50 text-warning' : 'hover:bg-green-50 text-success'}`} title={cat.is_active ? 'Deactivate' : 'Activate'}>
                          {cat.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                        </button>
                        <button onClick={() => startEditCat(cat)} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground" title="Edit">
                          <Edit2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded services list */}
                  {isExpanded && (
                    <div className="border-t border-border px-5 pb-5 pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Services in this category</p>
                        <button onClick={() => startNewSvc(cat.id)} className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                          <Plus size={12} /> Add Service
                        </button>
                      </div>
                      {catServices.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2">No services yet. <button onClick={() => startNewSvc(cat.id)} className="text-primary hover:underline">Add one</button></p>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {catServices.map((svc) => (
                            <div key={svc.id} className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${svc.isActive ? 'border-border bg-background' : 'border-border bg-muted/30 opacity-60'}`}>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-semibold text-foreground truncate">{svc.name}</p>
                                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${svc.isActive ? 'bg-green-50 text-success' : 'bg-muted text-muted-foreground'}`}>
                                    {svc.isActive ? 'Active' : 'Inactive'}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground">LRD {svc.basePrice.toLocaleString('en-US')}/{svc.unit} · Platform: LRD {svc.platformFee.toLocaleString('en-US')}</p>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button onClick={() => handleToggleSvc(svc)} className={`p-1.5 rounded-lg transition-colors ${svc.isActive ? 'hover:bg-amber-50 text-warning' : 'hover:bg-green-50 text-success'}`} title={svc.isActive ? 'Deactivate' : 'Activate'}>
                                  {svc.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                                </button>
                                <button onClick={() => startEditSvc(svc)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground" title="Edit">
                                  <Edit2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : (
        // ── SERVICES TAB ──
        services.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-12 text-center">
            <Tag size={32} className="text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No services configured yet.</p>
            <button onClick={() => startNewSvc()} className="btn-primary mt-4 py-2 px-5 text-sm">Add First Service</button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {categories.map((cat) => {
              const catServices = getServicesForCategory(cat.id);
              if (catServices.length === 0) return null;
              return (
                <div key={cat.id} className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
                  <div className="px-5 py-3 bg-muted/30 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-extrabold text-foreground">{cat.label}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${cat.is_active ? 'bg-green-50 text-success' : 'bg-muted text-muted-foreground'}`}>
                        {cat.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <button onClick={() => startNewSvc(cat.id)} className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                      <Plus size={12} /> Add Service
                    </button>
                  </div>
                  <div className="divide-y divide-border">
                    {catServices.map((svc) => (
                      <div key={svc.id} className={`flex items-center justify-between gap-3 px-5 py-3 ${!svc.isActive ? 'opacity-60' : ''}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-foreground truncate">{svc.name}</p>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${svc.isActive ? 'bg-green-50 text-success' : 'bg-muted text-muted-foreground'}`}>
                              {svc.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            LRD {svc.basePrice.toLocaleString('en-US')}/{svc.unit} ·
                            Platform: LRD {svc.platformFee.toLocaleString('en-US')} ·
                            Provider: LRD {(svc.basePrice - svc.platformFee).toLocaleString('en-US')}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => handleToggleSvc(svc)} className={`p-1.5 rounded-lg transition-colors ${svc.isActive ? 'hover:bg-amber-50 text-warning' : 'hover:bg-green-50 text-success'}`} title={svc.isActive ? 'Deactivate' : 'Activate'}>
                            {svc.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                          </button>
                          <button onClick={() => startEditSvc(svc)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground" title="Edit">
                            <Edit2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
