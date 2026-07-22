"use client";

import React, { useState } from "react";

interface Insurance {
  id: string;
  name: string;
  network: string;
  discounts: string;
  renewDate: string;
  status: "active" | "inactive";
  details: string;
}

const MOCK_INSURANCES: Insurance[] = [
  { id: "1", name: "Insurance Name", network: "Network", discounts: "Discounts", renewDate: "12/10/2024", status: "active", details: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s," },
  { id: "2", name: "Insurance Name", network: "Network", discounts: "Discounts", renewDate: "12/10/2024", status: "active", details: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s," }
];

export default function ClinicInsurancePage() {
  const [activeTab, setActiveTab] = useState<"active" | "inactive">("active");
  const [selectedInsurance, setSelectedInsurance] = useState<Insurance | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editingInsurance, setEditingInsurance] = useState<Insurance | null>(null);

  // Filtered insurances
  const displayedInsurances = MOCK_INSURANCES.filter(i => i.status === activeTab);

  const openAddModal = () => {
    setModalMode("add");
    setEditingInsurance(null);
    setIsModalOpen(true);
  };

  const openEditModal = (ins: Insurance, e: React.MouseEvent) => {
    e.stopPropagation();
    setModalMode("edit");
    setEditingInsurance(ins);
    setIsModalOpen(true);
  };

  return (
    <div className="flex h-full w-full font-sans select-none px-5 pb-12 pt-2">
      {/* Left Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pr-8">
        <h1 className="text-[#383F45] font-normal text-[32px] leading-none tracking-[-0.64px] mb-8" style={{ fontFamily: "Outfit, sans-serif" }}>
          Insurance
        </h1>
        
        {/* Top Actions Row */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex gap-2">
            <button 
              className={`px-5 py-1.5 rounded-full text-[13px] font-medium tracking-wide transition-all ${activeTab === 'active' ? 'bg-black text-white' : 'bg-[#D0D5DD] text-[#344054] hover:bg-[#B0B8C4]'}`}
              onClick={() => setActiveTab('active')}
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Active
            </button>
            <button 
              className={`px-5 py-1.5 rounded-full text-[13px] font-medium tracking-wide transition-all ${activeTab === 'inactive' ? 'bg-black text-white' : 'bg-[#D0D5DD] text-[#344054] hover:bg-[#B0B8C4]'}`}
              onClick={() => setActiveTab('inactive')}
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Inactive
            </button>
          </div>
          <button 
            onClick={openAddModal}
            className="px-6 py-2 bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[13px] font-medium rounded-xl shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Add Insurance
          </button>
        </div>

        {/* Insurance List */}
        <div className="flex flex-col gap-4">
          {displayedInsurances.map((ins) => (
            <div 
              key={ins.id}
              onClick={() => setSelectedInsurance(ins)}
              className={`flex items-center justify-between px-6 py-5 rounded-[16px] border cursor-pointer transition-all ${selectedInsurance?.id === ins.id ? 'border-[#EBEEF5] bg-[#EEF2FF]' : 'border-[#EBEEF5] bg-white'} hover:shadow-md`}
            >
              <div className="flex items-center gap-10 w-full">
                <div className="w-10 h-10 rounded-full bg-[#F7F9FC] border border-[#EBEEF5] flex-shrink-0"></div>
                <div className="text-[15px] font-medium text-[#24292E] w-[150px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {ins.name}
                </div>
                <div className="text-[12px] font-medium text-[#676E76] w-[100px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {ins.network}
                </div>
                <div className="text-[12px] font-medium text-[#676E76] w-[100px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {ins.discounts}
                </div>
                <div className="text-[13px] font-normal text-[#24292E] flex-1" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Renew : {ins.renewDate}
                </div>
              </div>
              <button 
                onClick={(e) => openEditModal(ins, e)}
                className="px-6 py-2 bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[13px] font-medium rounded-xl shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all ml-4"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Edit
              </button>
            </div>
          ))}
          {displayedInsurances.length === 0 && (
            <div className="text-center py-10 text-[#838B95] text-sm" style={{ fontFamily: "Outfit, sans-serif" }}>
              No insurances found in this category.
            </div>
          )}
        </div>
      </div>

      {/* Right Details Panel */}
      <div className="w-[380px] shrink-0 h-full">
        <div className="bg-white border border-[#EBEEF5] rounded-[24px] p-8 h-full shadow-sm flex flex-col">
          {selectedInsurance ? (
            <>
              <div className="border border-[#EBEEF5] bg-[#F7F9FC] rounded-[16px] p-6 text-[13px] text-[#3D4B5A] mt-16 leading-relaxed relative font-normal shadow-inner" style={{ fontFamily: "Outfit, sans-serif" }}>
                 {selectedInsurance.details}
              </div>
              
              <div className="mt-auto pt-8">
                <button 
                  className="w-full py-2.5 bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[13px] font-medium rounded-lg shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  View File / Go to file
                </button>
              </div>
            </>
          ) : (
            <div className="text-[#838B95] text-sm mt-32 text-center" style={{ fontFamily: "Outfit, sans-serif" }}>
              Select an insurance to view details
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#24292E]/40 backdrop-blur-sm p-4">
          <div className="bg-[#F7F9FC] rounded-[24px] w-[540px] flex flex-col shadow-2xl overflow-hidden border border-[#EBEEF5]">
            <div className="p-10 pb-6 relative">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-8 right-8 text-[#676E76] hover:text-black transition-colors"
                aria-label="Close"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
              <h2 className="text-[22px] font-medium text-[#24292E] mb-8" style={{ fontFamily: "Outfit, sans-serif" }}>
                {modalMode === 'add' ? 'Insurance Name' : 'Edit Insurance'}
              </h2>

              <div className="flex flex-col gap-5">
                <div>
                  <label className="block text-[13px] font-medium text-[#3D4B5A] mb-2" style={{ fontFamily: "Outfit, sans-serif" }}>Insurance</label>
                  <input type="text" className="w-full h-[48px] border border-[#EBEEF5] rounded-xl px-4 bg-white text-[14px] text-[#24292E] outline-none focus:border-[#5476FC] transition-colors shadow-sm" defaultValue={editingInsurance?.name} />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#3D4B5A] mb-2" style={{ fontFamily: "Outfit, sans-serif" }}>Network</label>
                  <input type="text" className="w-full h-[48px] border border-[#EBEEF5] rounded-xl px-4 bg-white text-[14px] text-[#24292E] outline-none focus:border-[#5476FC] transition-colors shadow-sm" defaultValue={editingInsurance?.network} />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#3D4B5A] mb-2" style={{ fontFamily: "Outfit, sans-serif" }}>Discounts</label>
                  <input type="text" className="w-full h-[48px] border border-[#EBEEF5] rounded-xl px-4 bg-white text-[14px] text-[#24292E] outline-none focus:border-[#5476FC] transition-colors shadow-sm" defaultValue={editingInsurance?.discounts} />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-[#3D4B5A] mb-2" style={{ fontFamily: "Outfit, sans-serif" }}>SPC Contract attach</label>
                  <div className="flex gap-3 items-center">
                    <input type="text" placeholder="Add proof" className="flex-1 h-[48px] border border-[#EBEEF5] rounded-xl px-4 bg-white text-[14px] text-[#24292E] outline-none focus:border-[#5476FC] transition-colors shadow-sm" />
                    <button className="w-[48px] h-[48px] bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] rounded-xl flex items-center justify-center shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all shrink-0">
                      <span className="text-white text-[24px] leading-none mb-1">+</span>
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <button className="px-8 py-2.5 bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[13px] font-medium rounded-xl shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all">
                    Verify
                  </button>
                </div>
              </div>
            </div>

            <div className="px-10 py-8 flex items-center justify-end gap-12 mt-4 rounded-b-[24px]">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2.5 text-[#676E76] text-[14px] font-medium hover:text-black transition-colors"
              >
                Reset
              </button>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-[160px] py-3 bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[14px] font-medium rounded-xl shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
