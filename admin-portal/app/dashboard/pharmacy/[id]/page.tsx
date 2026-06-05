"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";

// Common detail row component
const DetailRow = ({ label, value, valueClass = "text-slate-800 font-bold", labelClass = "text-slate-400 font-bold" }: { label: string, value: React.ReactNode, valueClass?: string, labelClass?: string }) => (
  <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between py-1">
    <span className={`text-[11px] ${labelClass}`}>{label}</span>
    <span className={`text-[11px] ${valueClass}`}>{value}</span>
  </div>
);

export default function PharmacyProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [activeTab, setActiveTab] = useState<"about" | "stock">("about");
  
  // State for documents list
  const [documents, setDocuments] = useState([
    { id: 1, name: "Med_certificate.pdf" },
    { id: 2, name: "Med_certificate.pdf" },
    { id: 3, name: "Med_certificate.pdf" },
    { id: 4, name: "Med_certificate.pdf" },
    { id: 5, name: "Proposal_draft.doc" },
  ]);

  const addDocument = () => {
    // Mock adding a document
    const newDoc = { id: Date.now(), name: `New_Document_${documents.length + 1}.pdf` };
    setDocuments([...documents, newDoc]);
  };

  const removeDocument = (idToRemove: number) => {
    setDocuments(documents.filter(doc => doc.id !== idToRemove));
  };

  // Mocking pharmacy data
  const pharmacy = {
    id: Number(id),
    name: "CVS Pharmacy",
    email: "john@example.com",
    avatar: "/doctor-avatar.png", // reusing avatar
    tradeLicense: "TD 0000 1111 2222",
    healthAuthorityLicense: "HA 7777 6666 8900",
    owner: "John Doe",
    manager: "Jane Doe",
    pharmacistLicense: "PL 6754 3456 8986",
    location: "1234 Al Zahra Streetm",
    contactNumber: "+971 50 123 4567",
    isVerified: true
  };

  // Mock stock data
  const stockItems = [
    { id: 1, name: "Paracetamol 500 mg", batch: "BATCH-PAR-001", quantity: 1500, expiry: "15 May 2020", price: "AED 5.00", reorderLevel: 100, status: "In Stock" },
    { id: 2, name: "Ibuprofen 200 mg", batch: "BATCH-IBU-002", quantity: 90, expiry: "15 May 2020", price: "AED 5.00", reorderLevel: 100, status: "Low Stock" },
    { id: 3, name: "Aldactone 500mg", batch: "BATCH-PAR-001", quantity: 1500, expiry: "15 May 2020", price: "AED 5.00", reorderLevel: 100, status: "In Stock" },
    { id: 4, name: "Alpertine 500mg", batch: "BATCH-PAR-001", quantity: 1500, expiry: "15 May 2020", price: "AED 5.00", reorderLevel: 100, status: "In Stock" },
    { id: 5, name: "Alphadrol", batch: "BATCH-PAR-001", quantity: 1500, expiry: "15 May 2020", price: "AED 5.00", reorderLevel: 100, status: "In Stock" },
    { id: 6, name: "Alpha Chymar 250ml", batch: "BATCH-PAR-001", quantity: 1500, expiry: "15 May 2020", price: "AED 5.00", reorderLevel: 100, status: "In Stock" },
    { id: 7, name: "Alpha Chymar 250ml", batch: "BATCH-PAR-001", quantity: 1500, expiry: "15 May 2020", price: "AED 5.00", reorderLevel: 100, status: "In Stock" },
    { id: 8, name: "Alphacaine 100mg", batch: "BATCH-PAR-001", quantity: 1500, expiry: "15 May 2020", price: "AED 5.00", reorderLevel: 100, status: "In Stock" },
    { id: 9, name: "Alphafilcon", batch: "BATCH-PAR-001", quantity: 1500, expiry: "15 May 2020", price: "AED 5.00", reorderLevel: 100, status: "In Stock" },
    { id: 10, name: "Alphacetylmethadol 65..", batch: "BATCH-PAR-001", quantity: 1500, expiry: "15 May 2020", price: "AED 5.00", reorderLevel: 100, status: "In Stock" },
    { id: 11, name: "Alphaderm 100mg", batch: "BATCH-PAR-001", quantity: 1500, expiry: "15 May 2020", price: "AED 5.00", reorderLevel: 100, status: "In Stock" },
  ];

  const DoubleCaret = () => (
    <div className="flex flex-col items-center gap-[0.5px] opacity-80 ml-1.5 shrink-0">
      <svg className="w-2.5 h-2.5 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 15l7-7 7 7" /></svg>
      <svg className="w-2.5 h-2.5 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M19 9l-7 7-7-7" /></svg>
    </div>
  );

  return (
    <ProtectedRoute>
      <div className="w-full pb-12 font-sans animate-in fade-in duration-300">
        <div className="flex flex-col gap-8">
          
          {/* Top Bar Navigation */}
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push("/dashboard/pharmacy")}
              className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-50 transition shadow-sm border border-slate-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-[26px] font-black text-[#1e293b] tracking-tight">Pharmacy Details</h1>
          </div>

          {/* Main Header Card */}
          <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="w-[4.5rem] h-[4.5rem] rounded-2xl overflow-hidden border border-slate-100 flex-shrink-0 bg-white p-1">
                <img src={pharmacy.avatar} alt={pharmacy.name} className="w-full h-full object-cover rounded-xl" />
              </div>
              <div className="flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-[20px] font-black text-slate-800">{pharmacy.name}</h2>
                  {pharmacy.isVerified && (
                    <div className="flex items-center gap-1.5 text-teal-400">
                      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-[12px] font-bold">Verified by Malaffi</span>
                    </div>
                  )}
                </div>
                <p className="text-[13px] font-semibold text-slate-500">{pharmacy.email}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <button className="px-8 py-3.5 bg-[#E5EDFF] hover:bg-[#dbe6ff] text-[#6A8BFF] text-[13px] font-bold rounded-2xl transition active:scale-95">
                Edit
              </button>
              <button className="px-8 py-3.5 bg-[#E5EDFF] hover:bg-[#dbe6ff] text-[#6A8BFF] text-[13px] font-bold rounded-2xl transition active:scale-95">
                Deactivate Pharmacy
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-4">
            <div className="flex bg-white rounded-full shadow-sm border border-slate-100 p-1">
              <button 
                onClick={() => setActiveTab("about")} 
                className={`px-8 py-3 rounded-full text-[13px] font-bold transition-all ${
                  activeTab === 'about' 
                    ? 'bg-[#1E293B] text-white shadow-md' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                About
              </button>
              <button 
                onClick={() => setActiveTab("stock")} 
                className={`px-8 py-3 rounded-full text-[13px] font-bold transition-all ${
                  activeTab === 'stock' 
                    ? 'bg-[#1E293B] text-white shadow-md' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Stock Overview
              </button>
            </div>
            
            <button className="w-11 h-11 bg-white rounded-full flex items-center justify-center text-slate-400 hover:text-slate-800 shadow-sm border border-slate-100 transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>

          {/* Tab Contents */}
          <div className="mt-2">
            
            {/* ABOUT TAB */}
            {activeTab === "about" && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                
                {/* Details Column */}
                <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-50 relative">
                  <h3 className="text-[16px] font-black text-slate-800 mb-8">Details</h3>
                  
                  {/* Floating Avatar (Owner/Manager placeholder based on mockup) */}
                  <div className="absolute top-[30%] right-[30%] translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-[1rem] bg-slate-200 border-4 border-white shadow-lg overflow-hidden z-10 hidden sm:block">
                    <img src="/doctor-avatar.png" alt="Owner" className="w-full h-full object-cover" />
                  </div>

                  <div className="space-y-6">
                    <DetailRow label="Trade License" value={pharmacy.tradeLicense} />
                    <DetailRow label="Health Authority License" value={pharmacy.healthAuthorityLicense} />
                    <DetailRow label="Owner" value={pharmacy.owner} />
                    <DetailRow label="Manager" value={pharmacy.manager} />
                    <DetailRow label="Pharmacist License" value={pharmacy.pharmacistLicense} />
                    <DetailRow label="Location" value={pharmacy.location} />
                    <DetailRow label="Contact Number" value={pharmacy.contactNumber} />
                    <DetailRow 
                      label="Email ID" 
                      value={pharmacy.email} 
                      valueClass="text-[#6A8BFF] font-bold" 
                    />
                  </div>
                </div>

                {/* Documents Column */}
                <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-50 self-start">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-[16px] font-black text-slate-800">Documents</h3>
                    <button 
                      onClick={addDocument}
                      className="bg-[#6A8BFF] hover:bg-[#5a7ae6] text-white text-[12px] font-bold px-5 py-2.5 rounded-full flex items-center gap-2 transition duration-200 shadow-md shadow-blue-200/60 active:scale-95"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Documents
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {documents.map((doc) => (
                      <div key={doc.id} className="bg-[#f8fafd] border border-slate-100 rounded-xl p-4 flex items-center justify-between animate-in fade-in duration-300">
                        <span className="text-[13px] font-bold text-[#6A8BFF] underline decoration-[#6A8BFF]/30 underline-offset-4">{doc.name}</span>
                        <button 
                          onClick={() => removeDocument(doc.id)}
                          className="text-[12px] font-bold text-red-400 hover:text-red-600 transition"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    {documents.length === 0 && (
                      <div className="text-center py-10 text-slate-400 text-sm font-semibold border-2 border-dashed border-slate-100 rounded-xl">
                        No documents added yet.
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* STOCK OVERVIEW TAB */}
            {activeTab === "stock" && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col gap-6">
                
                {/* Filters Row */}
                <div className="flex items-center gap-8 text-[13px] font-bold text-[#64748B] select-none pl-2 flex-wrap">
                  <span className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition">Medicine Name <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg></span>
                  <span className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition">Batch No. <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg></span>
                  <span className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition">Expiry Date <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg></span>
                  <span className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition">Reorder Level <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg></span>
                  <span className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition">Stock Status <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg></span>
                  
                  <div className="ml-auto flex items-center justify-end">
                    <button aria-label="Filter" className="text-slate-500 hover:text-slate-800 transition">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M10 18h4" /></svg>
                    </button>
                  </div>
                </div>

                {/* Stock Table */}
                <div className="bg-white rounded-[2rem] shadow-sm border border-slate-50 p-7 min-h-[600px] flex flex-col justify-between">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-[12px] font-bold text-slate-800 tracking-wider">
                          <th className="pb-4 pt-1 font-bold pl-2">
                            Medicine Name
                          </th>
                          <th className="pb-4 pt-1 font-bold">
                            Batch No.
                          </th>
                          <th className="pb-4 pt-1 font-bold">
                            <div className="flex items-center gap-2 cursor-pointer hover:text-slate-600">
                              Quantity Available <DoubleCaret />
                            </div>
                          </th>
                          <th className="pb-4 pt-1 font-bold">
                            <div className="flex items-center gap-2 cursor-pointer hover:text-slate-600">
                              Expiry Date <DoubleCaret />
                            </div>
                          </th>
                          <th className="pb-4 pt-1 font-bold">
                            <div className="flex items-center gap-2 cursor-pointer hover:text-slate-600">
                              Price (per unit) <DoubleCaret />
                            </div>
                          </th>
                          <th className="pb-4 pt-1 font-bold">
                            <div className="flex items-center gap-2 cursor-pointer hover:text-slate-600">
                              Reorder Level <DoubleCaret />
                            </div>
                          </th>
                          <th className="pb-4 pt-1 font-bold">
                            <div className="flex items-center gap-2 cursor-pointer hover:text-slate-600">
                              Stock Status <DoubleCaret />
                            </div>
                          </th>
                          <th className="pb-4 pt-1"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {stockItems.map((item, index) => (
                          <tr
                            key={item.id}
                            className="group transition-colors duration-200 border-b border-slate-50 last:border-0 hover:bg-slate-50/50"
                          >
                            <td className="py-5 px-2 text-[13px] font-bold text-slate-800">
                              {item.name}
                            </td>
                            <td className="py-5 text-[12px] font-semibold text-slate-400">
                              {item.batch}
                            </td>
                            <td className="py-5 text-[13px] font-medium text-slate-500 pl-4">
                              {item.quantity}
                            </td>
                            <td className="py-5 text-[13px] font-medium text-slate-500">
                              {item.expiry}
                            </td>
                            <td className="py-5 text-[13px] font-medium text-slate-500 pl-4">
                              {item.price}
                            </td>
                            <td className="py-5 text-[13px] font-medium text-slate-500 pl-6">
                              {item.reorderLevel}
                            </td>
                            <td className="py-5 text-[13px] font-bold pl-4">
                              <span className={item.status === "In Stock" ? "text-[#6A8BFF]" : "text-red-400"}>
                                {item.status}
                              </span>
                            </td>
                            <td className="py-5 pr-4 text-right min-w-[120px]">
                              {/* Only show View Details on hover or on the first item to match mockup */}
                              <div className={`transition-opacity duration-200 ${index === 0 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                <button className="bg-[#6A8BFF] hover:bg-[#5a7ae6] text-white text-[11px] font-bold px-6 py-2.5 rounded-full shadow-md shadow-blue-200/50">
                                  View Details
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Controls */}
                  <div className="flex items-center justify-center gap-1 mt-6 select-none border-t border-slate-50 pt-5">
                    <button 
                      className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition"
                      aria-label="Previous page"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                      <button 
                        key={num}
                        className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center transition-all ${
                          num === 1 
                            ? "bg-[#6A8BFF] text-white shadow-md shadow-blue-100" 
                            : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                    <button 
                      className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition"
                      aria-label="Next page"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7-7 7-7" />
                      </svg>
                    </button>
                  </div>
                </div>

              </div>
            )}
            
          </div>

        </div>
      </div>
    </ProtectedRoute>
  );
}
