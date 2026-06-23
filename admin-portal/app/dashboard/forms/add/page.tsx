"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";

type FieldType = 'text' | 'email' | 'phone' | 'address' | 'date' | 'time' | 'number' | 'dropdown' | 'radio' | 'checkbox' | 'textarea' | 'heading' | 'appointment' | 'photo' | 'signature';

interface Option { id: string; value: string; }
interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder: string;
  required: boolean;
  subLabel: string;
  options: Option[];
}

const ELEMENT_TYPES: { type: FieldType; label: string; icon: React.ReactNode }[] = [
  { type: 'heading', label: 'Heading', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg> },
  { type: 'text', label: 'Name', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg> },
  { type: 'email', label: 'Email', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg> },
  { type: 'phone', label: 'Phone', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg> },
  { type: 'address', label: 'Address', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg> },
  { type: 'date', label: 'Date Picker', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg> },
  { type: 'appointment', label: 'Appointment', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg> },
  { type: 'photo', label: 'Take Photo', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg> },
  { type: 'signature', label: 'Signature', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg> },
  { type: 'radio', label: 'Radio-Button', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" strokeWidth={2}/><circle cx="12" cy="12" r="4" fill="currentColor"/></svg> },
  { type: 'checkbox', label: 'Checkbox', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={2}/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4"/></svg> },
  { type: 'dropdown', label: 'Dropdown', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg> },
  { type: 'number', label: 'Number', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"/></svg> },
  { type: 'time', label: 'Time', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> },
  { type: 'textarea', label: 'Long Text', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7"/></svg> },
];

const defaultPlaceholders: Partial<Record<FieldType, string>> = {
  text: 'Enter name',
  email: 'Enter email address',
  phone: 'Enter phone number',
  address: 'Enter address',
  number: 'Enter a number',
  textarea: 'Enter detailed response',
  heading: 'Section Heading',
};

function FieldPreview({ field, onChange }: { field: FormField; onChange: (updates: Partial<FormField>) => void }) {
  const base = "w-full bg-[#f8fafd] rounded-xl px-4 py-3 text-[13px] font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#6A8BFF]/40 transition border border-slate-100";

  switch (field.type) {
    case 'heading':
      return (
        <input
          value={field.label}
          onChange={e => onChange({ label: e.target.value })}
          className="text-[18px] font-medium text-slate-800 bg-transparent border-b-2 border-[#6A8BFF]/30 focus:outline-none focus:border-[#6A8BFF] w-full pb-1 transition"
          placeholder="Section Heading"
        />
      );
    case 'date':
      return <input type="date" className={base} />;
    case 'time':
      return <input type="time" className={base} />;
    case 'number':
      return <input type="number" placeholder={field.placeholder} className={base} />;
    case 'phone':
      return <input type="tel" placeholder={field.placeholder} className={base} />;
    case 'email':
      return <input type="email" placeholder={field.placeholder} className={base} />;
    case 'textarea':
      return <textarea placeholder={field.placeholder} rows={3} className={`${base} resize-none`} />;
    case 'dropdown':
      return (
        <div className="relative">
          <select className={`${base} appearance-none pr-10`}>
            <option value="">Please select options</option>
            {field.options.map(opt => <option key={opt.id}>{opt.value}</option>)}
          </select>
          <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7"/></svg>
          </div>
        </div>
      );
    case 'radio':
      return (
        <div className="bg-[#f8fafd] rounded-xl p-4 border border-slate-100 space-y-3">
          {field.options.map((opt, idx) => (
            <label key={opt.id} className="flex items-center gap-3 cursor-pointer group">
              <input type="radio" name={field.id} className="w-4 h-4 accent-[#6A8BFF]" />
              <span className="text-[13px] font-medium text-slate-700">{opt.value || `Option ${idx + 1}`}</span>
            </label>
          ))}
        </div>
      );
    case 'checkbox':
      return (
        <div className="bg-[#f8fafd] rounded-xl p-4 border border-slate-100 space-y-3">
          {field.options.map((opt, idx) => (
            <label key={opt.id} className="flex items-center gap-3 cursor-pointer group">
              <input type="checkbox" className="w-4 h-4 accent-[#6A8BFF] rounded" />
              <span className="text-[13px] font-medium text-slate-700">{opt.value || `Option ${idx + 1}`}</span>
            </label>
          ))}
        </div>
      );
    case 'appointment':
      return (
        <div className="bg-[#f8fafd] rounded-xl p-4 border border-slate-100">
          <div className="grid grid-cols-2 gap-3">
            <input type="date" className={base} />
            <input type="time" className={base} />
          </div>
        </div>
      );
    case 'photo':
      return (
        <div className="border-2 border-dashed border-[#c7d5ff] bg-[#f4f7ff] rounded-xl p-6 flex flex-col items-center gap-2 text-[#6A8BFF] cursor-pointer hover:bg-[#edf1ff] transition">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          <span className="text-[12px] font-semibold">Click to take / upload photo</span>
        </div>
      );
    case 'signature':
      return (
        <div className="border-2 border-dashed border-[#c7d5ff] bg-[#f4f7ff] rounded-xl p-6 flex flex-col items-center gap-2 text-[#6A8BFF] cursor-pointer hover:bg-[#edf1ff] transition">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
          <span className="text-[12px] font-semibold">Click to add signature</span>
        </div>
      );
    default:
      return <input type="text" placeholder={field.placeholder} className={base} />;
  }
}

function makeId() { return Math.random().toString(36).substr(2, 9); }

function makeField(type: FieldType): FormField {
  const elem = ELEMENT_TYPES.find(e => e.type === type)!;
  const hasOptions = type === 'radio' || type === 'checkbox' || type === 'dropdown';
  return {
    id: makeId(),
    type,
    label: type === 'heading' ? 'Section Heading' : `${elem.label} Question`,
    placeholder: defaultPlaceholders[type] || `Enter ${elem.label.toLowerCase()}`,
    required: false,
    subLabel: '',
    options: hasOptions ? [{ id: makeId(), value: 'Option 1' }, { id: makeId(), value: 'Option 2' }] : [],
  };
}

export default function AddFormPage() {
  const router = useRouter();
  const [formTitle, setFormTitle] = useState('');
  const [fields, setFields] = useState<FormField[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'General' | 'AllOptions' | 'Advanced'>('General');

  const active = fields.find(f => f.id === activeId);

  const updateActive = (updates: Partial<FormField>) =>
    setFields(fs => fs.map(f => f.id === activeId ? { ...f, ...updates } : f));

  const addField = (type: FieldType) => {
    const f = makeField(type);
    setFields(fs => [...fs, f]);
    setActiveId(f.id);
  };

  const removeField = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFields(fs => fs.filter(f => f.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const duplicateField = () => {
    if (!active) return;
    const copy = { ...active, id: makeId() };
    setFields(fs => {
      const idx = fs.findIndex(f => f.id === activeId);
      const next = [...fs];
      next.splice(idx + 1, 0, copy);
      return next;
    });
    setActiveId(copy.id);
  };

  const addOption = () => {
    if (!active) return;
    updateActive({ options: [...active.options, { id: makeId(), value: `Option ${active.options.length + 1}` }] });
  };

  const removeOption = (optId: string) => {
    if (!active) return;
    updateActive({ options: active.options.filter(o => o.id !== optId) });
  };

  const updateOption = (optId: string, value: string) => {
    if (!active) return;
    updateActive({ options: active.options.map(o => o.id === optId ? { ...o, value } : o) });
  };

  const isFullWidth = (type: FieldType) =>
    ['radio', 'checkbox', 'textarea', 'photo', 'signature', 'appointment', 'address'].includes(type);

  return (
    <ProtectedRoute>
      <div className="w-full pb-12 font-sans animate-in fade-in duration-300 flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push('/dashboard/forms')} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-400 hover:text-slate-800 transition shadow-sm border border-slate-100">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7"/></svg>
          </button>
          <input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Untitled Form" className="text-[24px] font-medium text-[#1e293b] tracking-tight bg-transparent focus:outline-none border-b-2 border-transparent focus:border-[#6A8BFF]/30 transition" />
        </div>

        <div className="flex gap-7 items-start min-h-[800px]">
          {/* Elements Sidebar */}
          <div className="w-[260px] bg-white rounded-[1.5rem] p-5 shadow-sm border border-slate-50 flex-shrink-0 sticky top-4">
            <h2 className="text-[14px] font-medium text-slate-800 mb-4">Form elements</h2>
            <div className="space-y-0.5 overflow-y-auto max-h-[700px]">
              {ELEMENT_TYPES.map(el => (
                <div key={el.type} onClick={() => addField(el.type)} className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer hover:bg-[#f0f4ff] text-slate-600 hover:text-[#6A8BFF] transition-colors group">
                  <div className="w-5 h-5 flex items-center justify-center text-[#6A8BFF]">{el.icon}</div>
                  <span className="text-[12.5px] font-semibold">{el.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 bg-white rounded-[2rem] p-8 shadow-sm border border-slate-50 flex flex-col min-h-[800px]">
            <div className="mb-8">
              <input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Form Title" className="w-full bg-[#f8fafd] border-none rounded-2xl px-6 py-4 text-[15px] font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6A8BFF]/50 transition" />
            </div>

            {fields.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4"/></svg>
                <span className="text-[13px] font-semibold">Click any element on the left to add it here</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {fields.map(field => {
                  const isActive = activeId === field.id;
                  const full = isFullWidth(field.type);
                  return (
                    <div key={field.id} onClick={() => setActiveId(field.id)}
                      className={`relative rounded-2xl p-4 cursor-pointer transition-all duration-200 ${full ? 'md:col-span-2' : ''} ${isActive ? 'border-2 border-[#6A8BFF] bg-white shadow-md pb-8' : 'border-2 border-transparent hover:border-slate-100 bg-white'}`}
                    >
                      {field.type !== 'heading' && (
                        <div className="flex items-center gap-1.5 mb-2">
                          <input value={field.label} onClick={e => e.stopPropagation()} onChange={e => { setActiveId(field.id); setFields(fs => fs.map(f => f.id === field.id ? { ...f, label: e.target.value } : f)); }}
                            className="text-[11.5px] font-semibold text-slate-800 bg-transparent focus:outline-none focus:border-b focus:border-[#6A8BFF] w-full"
                          />
                          {field.required && <span className="text-red-500 text-[11px] font-medium">*</span>}
                        </div>
                      )}
                      {field.subLabel && <p className="text-[10px] text-slate-400 -mt-1 mb-2 px-0.5">{field.subLabel}</p>}
                      <FieldPreview field={field} onChange={updates => setFields(fs => fs.map(f => f.id === field.id ? { ...f, ...updates } : f))} />
                      {isActive && (
                        <div className="absolute -bottom-4 right-5 flex items-center gap-1.5 bg-white rounded-full shadow-md px-2 py-1.5 border border-slate-100 z-10">
                          <button onClick={(e) => removeField(field.id, e)} className="w-7 h-7 rounded-full bg-red-400 text-white flex items-center justify-center hover:bg-red-500 transition">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                          </button>
                          <div className="w-5 h-5 text-[#6A8BFF] opacity-40 cursor-grab">
                            <svg fill="currentColor" viewBox="0 0 24 24"><circle cx="8" cy="6" r="1.5"/><circle cx="16" cy="6" r="1.5"/><circle cx="8" cy="12" r="1.5"/><circle cx="16" cy="12" r="1.5"/><circle cx="8" cy="18" r="1.5"/><circle cx="16" cy="18" r="1.5"/></svg>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {fields.length > 0 && (
              <div className="mt-8 border-t border-slate-100 pt-6">
                <button className="w-full py-3.5 border-2 border-dashed border-[#dce5fe] text-[#6A8BFF] text-[13px] font-semibold rounded-2xl hover:bg-[#f4f7ff] transition">
                  + Add New Page
                </button>
              </div>
            )}

            <div className="mt-6 flex items-center gap-5 border-t border-slate-50 pt-6">
              <button onClick={() => router.push('/dashboard/forms')} className="flex-1 py-3.5 bg-[#E5EDFF] hover:bg-[#dbe6ff] text-[#6A8BFF] text-[13px] font-semibold rounded-2xl transition">Cancel</button>
              <button onClick={() => router.push('/dashboard/forms')} className="flex-1 py-3.5 bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] hover:from-[#7A90FF] hover:to-[#4466FC] text-white text-[13px] font-semibold rounded-xl transition shadow-[0_4px_10px_rgba(84,118,252,0.2)]">Save Changes</button>
            </div>
          </div>

          {/* Properties Panel */}
          <div className="w-[310px] bg-white rounded-[1.5rem] p-6 shadow-sm border border-slate-50 flex-shrink-0 sticky top-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[15px] font-medium text-slate-800">Properties</h2>
              <button onClick={() => setActiveId(null)} className="w-6 h-6 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400 transition border border-slate-100">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            {active ? (
              <>
                <div className="flex gap-1.5 mb-6">
                  {(['General', 'AllOptions', 'Advanced'] as const).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3.5 py-1.5 rounded-full text-[11.5px] font-semibold transition-colors ${activeTab === tab ? 'bg-[#1E293B] text-white' : 'bg-[#f1f5f9] text-slate-500 hover:text-slate-800'}`}>
                      {tab === 'AllOptions' ? 'All Options' : tab}
                    </button>
                  ))}
                </div>

                <div className="space-y-5">
                  {active.type !== 'heading' && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">Field Label</label>
                      <input value={active.label} onChange={e => updateActive({ label: e.target.value })} className="w-full bg-[#f8fafd] rounded-xl px-4 py-3 text-[13px] font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#6A8BFF]/30 border border-slate-100" />
                    </div>
                  )}

                  {!['radio', 'checkbox', 'dropdown', 'photo', 'signature', 'date', 'time', 'appointment', 'heading'].includes(active.type) && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">Placeholder</label>
                      <input value={active.placeholder} onChange={e => updateActive({ placeholder: e.target.value })} className="w-full bg-[#f8fafd] rounded-xl px-4 py-3 text-[13px] font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#6A8BFF]/30 border border-slate-100" />
                    </div>
                  )}

                  {active.type !== 'heading' && (
                    <>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">Label alignment</label>
                        <div className="flex gap-2">
                          {['RIGHT', 'LEFT', 'TOP'].map(align => (
                            <button key={align} className={`flex-1 py-1.5 rounded-full text-[11px] font-semibold transition ${align === 'RIGHT' ? 'bg-[#6A8BFF] text-white' : 'bg-[#f1f5f9] text-slate-500 hover:bg-[#e2e8f0]'}`}>{align}</button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-semibold text-slate-700">Required</label>
                        <div onClick={() => updateActive({ required: !active.required })} className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${active.required ? 'bg-[#6A8BFF]' : 'bg-slate-300'}`}>
                          <div className={`absolute top-[2.5px] w-3.5 h-3.5 bg-white rounded-full shadow transition-all ${active.required ? 'left-5' : 'left-0.5'}`}></div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">Sub-label</label>
                        <input value={active.subLabel} onChange={e => updateActive({ subLabel: e.target.value })} placeholder="Short description below field" className="w-full bg-[#f8fafd] rounded-xl px-4 py-3 text-[13px] font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#6A8BFF]/30 border border-slate-100" />
                      </div>
                    </>
                  )}

                  {['radio', 'checkbox', 'dropdown'].includes(active.type) && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[11px] font-semibold text-slate-700">Options</label>
                        <button onClick={addOption} className="text-[11px] text-[#6A8BFF] font-semibold hover:underline">+ Add</button>
                      </div>
                      <div className="space-y-2">
                        {active.options.map((opt, idx) => (
                          <div key={opt.id} className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-400 font-semibold w-4">{idx + 1}.</span>
                            <input value={opt.value} onChange={e => updateOption(opt.id, e.target.value)} className="flex-1 bg-[#f8fafd] rounded-lg px-3 py-2 text-[12px] font-medium text-slate-700 focus:outline-none border border-slate-100 focus:ring-1 focus:ring-[#6A8BFF]/30" />
                            <button onClick={() => removeOption(opt.id)} className="text-slate-300 hover:text-red-400 transition">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-100">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-2">Duplicate field</label>
                    <button onClick={duplicateField} className="px-5 py-2 bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] hover:from-[#7A90FF] hover:to-[#4466FC] text-white text-[12px] font-semibold rounded-xl shadow-[0_4px_10px_rgba(84,118,252,0.2)] transition active:scale-95">
                      Duplicate field
                    </button>
                    <p className="text-[10px] text-slate-400 mt-1.5">Duplicate with all saved settings</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center text-slate-400 text-[13px] mt-12 space-y-2">
                <svg className="w-10 h-10 mx-auto text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5"/></svg>
                <p className="font-semibold">Select a field to edit its properties</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
