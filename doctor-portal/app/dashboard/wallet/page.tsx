"use client";

import React, { useState, useMemo, useRef } from "react";

interface EmirateRate {
  id: string;
  name: string;
  fee: number;
}

interface Transaction {
  id: string;
  name: string;
  age: number;
  email: string;
  avatar: string;
  diagnosis: string;
  preview: string;
  date: string;
  earnings: number;
  category: "Dr's share" | "Appointments" | "Diagnostics/ Commissions" | "Canceled";
}

export default function WalletPage() {
  // Rates per Emirate state
  const [rates, setRates] = useState<EmirateRate[]>([
    { id: "emirate-1", name: "Abu Dhabi Fee", fee: 200.00 },
    { id: "emirate-2", name: "Dubai Fee", fee: 200.00 },
    { id: "emirate-3", name: "Sharjah Fee", fee: 200.00 },
    { id: "emirate-4", name: "Ajman Fee", fee: 200.00 }
  ]);

  // Modal State (controls which modal overlay is active: null | "edit-fee" | "withdraw-funds")
  const [activeModal, setActiveModal] = useState<null | "edit-fee" | "withdraw-funds">(null);

  // Edit fee modal input states
  const [modalFees, setModalFees] = useState({
    "Abu Dhabi": "200.00",
    "Dubai": "200.00",
    "Sharjah": "200.00",
    "Ajman": "200.00",
    "Umm Al-Quwain": "200.00",
    "Ras Al Khaimah": "200.00",
    "Fujairah": "200.00"
  });

  // Edit fee modal OTP State
  const [feeOtp, setFeeOtp] = useState<string[]>(Array(6).fill(""));
  const [feeOtpSent, setFeeOtpSent] = useState(false);
  const [feeOtpSuccessMsg, setFeeOtpSuccessMsg] = useState("");
  const feeOtpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Withdraw Modal inputs
  const [withdrawAmount, setWithdrawAmount] = useState("150");
  const [withdrawOtpSent, setWithdrawOtpSent] = useState(false);
  const [withdrawOtp, setWithdrawOtp] = useState<string[]>(Array(6).fill(""));
  const withdrawOtpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Withdraw timer state
  const [withdrawTimer, setWithdrawTimer] = useState(85);

  // Countdown timer effect for withdrawal OTP
  React.useEffect(() => {
    let interval: any;
    if (withdrawOtpSent && withdrawTimer > 0) {
      interval = setInterval(() => {
        setWithdrawTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [withdrawOtpSent, withdrawTimer]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Filter tab state
  const [activeTab, setActiveTab] = useState<"ALL" | "Dr's share" | "Appointments" | "Diagnostics/ Commissions" | "Canceled">("ALL");
  const [selectedTimeframe, setSelectedTimeframe] = useState<"Today" | "This Week" | "This Month">("Today");

  // Show Success toast/alerts
  const [successToast, setSuccessToast] = useState<{ show: boolean; message: string }>({ show: false, message: "" });

  // Transactions list matching Figma specs
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: "t-1",
      name: "Arlene McCoy",
      age: 32,
      email: "yelena@example.com",
      avatar: "https://api.builder.io/api/v1/image/assets/TEMP/2fc70c27396226e96d788f42ab8214ce8f948ab5?width=72",
      diagnosis: "Cough",
      preview: "I’ve had a fever for three days with chills, body aches, and fatigue.",
      date: "1 Feb, 2020, 11:40 PM",
      earnings: 110.00,
      category: "Dr's share"
    },
    {
      id: "t-2",
      name: "Cameron Williamson",
      age: 32,
      email: "yelena@example.com",
      avatar: "https://api.builder.io/api/v1/image/assets/TEMP/b68921b9bb9ab8729018822005356cd9a7bdb3d5?width=72",
      diagnosis: "Asthma",
      preview: "I’ve had a fever for three days with chills, body aches, and fatigue.",
      date: "22 Oct, 2020, 11:40 PM",
      earnings: 110.00,
      category: "Appointments"
    },
    {
      id: "t-3",
      name: "Courtney Henry",
      age: 32,
      email: "yelena@example.com",
      avatar: "https://api.builder.io/api/v1/image/assets/TEMP/05a901293de2a84f45dff39e0efa33b0984e765e?width=72",
      diagnosis: "Cough",
      preview: "I’ve had a fever for three days with chills, body aches, and fatigue.",
      date: "8 Sep, 2020, 11:40 PM",
      earnings: 110.00,
      category: "Diagnostics/ Commissions"
    },
    {
      id: "t-4",
      name: "Bessie Cooper",
      age: 32,
      email: "yelena@example.com",
      avatar: "https://api.builder.io/api/v1/image/assets/TEMP/b4cc7594fc29dd53530bda4ab8cd965eebd0526d?width=72",
      diagnosis: "Fever",
      preview: "I’ve had a fever for three days with chills, body aches, and fatigue.",
      date: "22 Oct, 2020, 11:40 PM",
      earnings: 110.00,
      category: "Appointments"
    },
    {
      id: "t-5",
      name: "Bessie Cooper",
      age: 32,
      email: "yelena@example.com",
      avatar: "https://api.builder.io/api/v1/image/assets/TEMP/a6e1aefad7124efd79b13f8c10e84778817f96f0?width=72",
      diagnosis: "Fever",
      preview: "I’ve had a fever for three days with chills, body aches, and fatigue.",
      date: "22 Oct, 2020, 11:40 PM",
      earnings: 110.00,
      category: "Canceled"
    },
    {
      id: "t-6",
      name: "Bessie Cooper",
      age: 32,
      email: "yelena@example.com",
      avatar: "https://api.builder.io/api/v1/image/assets/TEMP/70edbe32982956e0679a8ff727695d9b1777fc72?width=72",
      diagnosis: "Fever",
      preview: "I’ve had a fever for three days with chills, body aches, and fatigue.",
      date: "22 Oct, 2020, 11:40 PM",
      earnings: 110.00,
      category: "Dr's share"
    },
    {
      id: "t-7",
      name: "Bessie Cooper",
      age: 32,
      email: "yelena@example.com",
      avatar: "https://api.builder.io/api/v1/image/assets/TEMP/849e04b65fc61409106af3d69a42e91596c64bd2?width=72",
      diagnosis: "Fever",
      preview: "I’ve had a fever for three days with chills, body aches, and fatigue.",
      date: "22 Oct, 2020, 11:40 PM",
      earnings: 110.00,
      category: "Diagnostics/ Commissions"
    },
    {
      id: "t-8",
      name: "Bessie Cooper",
      age: 32,
      email: "yelena@example.com",
      avatar: "https://api.builder.io/api/v1/image/assets/TEMP/9095e778a7eba1729febd7b2a1d7026c11d62d63?width=72",
      diagnosis: "Fever",
      preview: "I’ve had a fever for three days with chills, body aches, and fatigue.",
      date: "22 Oct, 2020, 11:40 PM",
      earnings: 110.00,
      category: "Appointments"
    },
    {
      id: "t-9",
      name: "Bessie Cooper",
      age: 32,
      email: "yelena@example.com",
      avatar: "https://api.builder.io/api/v1/image/assets/TEMP/5c080405a4cfd0cc48c023c7e3ca5054f6c0c807?width=72",
      diagnosis: "Fever",
      preview: "I’ve had a fever for three days with chills, body aches, and fatigue.",
      date: "22 Oct, 2020, 11:40 PM",
      earnings: 110.00,
      category: "Dr's share"
    },
    {
      id: "t-10",
      name: "Bessie Cooper",
      age: 32,
      email: "yelena@example.com",
      avatar: "https://api.builder.io/api/v1/image/assets/TEMP/5c080405a4cfd0cc48c023c7e3ca5054f6c0c807?width=72",
      diagnosis: "Fever",
      preview: "I’ve had a fever for three days with chills, body aches, and fatigue.",
      date: "22 Oct, 2020, 11:40 PM",
      earnings: 110.00,
      category: "Appointments"
    }
  ]);

  // Filter transactions dynamically based on active tab
  const filteredTransactions = useMemo(() => {
    if (activeTab === "ALL") return transactions;
    return transactions.filter(t => t.category === activeTab);
  }, [transactions, activeTab]);

  // Handle Send OTP click (for Fee edit)
  const handleSendFeeOtp = () => {
    setFeeOtpSent(true);
    setFeeOtpSuccessMsg("OTP code sent to +971 ••••••982");
    setTimeout(() => setFeeOtpSuccessMsg(""), 4000);
  };

  // OTP inputs autofocus navigation helper (for Fee edit)
  const handleFeeOtpChange = (index: number, val: string) => {
    if (/[^0-9]/.test(val)) return;
    const newOtp = [...feeOtp];
    newOtp[index] = val;
    setFeeOtp(newOtp);

    if (val && index < 5) {
      feeOtpRefs.current[index + 1]?.focus();
    }
  };

  // Backspace key navigation helper (for Fee edit)
  const handleFeeOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !feeOtp[index] && index > 0) {
      feeOtpRefs.current[index - 1]?.focus();
    }
  };

  // Transitions from Edit Fee modal to Withdraw Funds modal on click
  const handleSendForApproval = () => {
    // Save rates
    setRates([
      { id: "emirate-1", name: "Abu Dhabi Fee", fee: parseFloat(modalFees["Abu Dhabi"]) || 200 },
      { id: "emirate-2", name: "Dubai Fee", fee: parseFloat(modalFees["Dubai"]) || 200 },
      { id: "emirate-3", name: "Sharjah Fee", fee: parseFloat(modalFees["Sharjah"]) || 200 },
      { id: "emirate-4", name: "Ajman Fee", fee: parseFloat(modalFees["Ajman"]) || 200 }
    ]);
    
    // Reset OTP states
    setFeeOtp(Array(6).fill(""));
    setFeeOtpSent(false);

    // Open Withdraw Fund modal
    setActiveModal("withdraw-funds");
  };

  // Handle Withdraw OTP change
  const handleWithdrawOtpChange = (index: number, val: string) => {
    if (/[^0-9]/.test(val)) return;
    const newOtp = [...withdrawOtp];
    newOtp[index] = val;
    setWithdrawOtp(newOtp);

    if (val && index < 5) {
      withdrawOtpRefs.current[index + 1]?.focus();
    }
  };

  // Handle Withdraw OTP key down
  const handleWithdrawOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !withdrawOtp[index] && index > 0) {
      withdrawOtpRefs.current[index - 1]?.focus();
    }
  };

  // Submit withdrawal request and close modal
  const handleConfirmWithdrawal = () => {
    setActiveModal(null);
    setWithdrawOtpSent(false);
    setWithdrawOtp(Array(6).fill(""));
    
    setSuccessToast({
      show: true,
      message: `Withdrawal request of AED ${withdrawAmount} submitted successfully!`
    });
    setTimeout(() => setSuccessToast({ show: false, message: "" }), 4000);
  };

  return (
    <div className="w-full min-h-full px-6 xl:px-[40px] py-8 font-outfit select-none bg-[#F7F9FC]">
      <div className="flex flex-col gap-8">
        
        {/* Title */}
        <h1 className="text-[#383F45] font-normal text-[32px] leading-none tracking-[-0.64px]">
          Payments
        </h1>

        {/* SECTION 1: Consultation Rates per Emirate */}
        <div className="flex flex-col gap-4">
          <h2 className="text-[#24292E] font-medium text-[16px] leading-tight tracking-[-0.32px]">
            Consultation Rates per Emirate
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {rates.map((rate) => (
              <div key={rate.id} className="bg-white border border-[#EBEEF5] p-6 rounded-[12px] shadow-sm flex flex-col gap-4 relative justify-between min-h-[140px] transition-all hover:shadow-md">
                <div className="flex justify-between items-start gap-2">
                  <span className="text-[#676E76] text-[12px] leading-tight tracking-[-0.24px]">
                    {rate.name}
                  </span>
                  <button
                    onClick={() => setActiveModal("edit-fee")}
                    className="py-1 px-3 rounded-[12px] bg-[#E0E7FF] text-[#182A6F] font-semibold text-[11px] hover:opacity-90 transition-opacity"
                  >
                    Edit
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[#24292E] font-medium text-[22px] leading-tight tracking-[-0.44px]">
                    AED {rate.fee.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 2: Earnings */}
        <div className="flex flex-col gap-4 mt-2">
          <div className="flex justify-between items-center">
            <h2 className="text-[#24292E] font-medium text-[16px] leading-tight tracking-[-0.32px]">
              Earnings
            </h2>
            <button
              onClick={() => setActiveModal("edit-fee")}
              className="px-4 py-2 text-white font-medium text-[13px] rounded-[12px] bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] shadow-sm hover:opacity-90 transition-opacity"
            >
              Withdraw Now
            </button>
          </div>

          {/* Success Toast */}
          {successToast.show && (
            <div className="w-full bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-[8px] text-[13px] flex items-center gap-2 animate-pulse select-none">
              <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} stroke="currentColor" d="M5 13l4 4L19 7" />
              </svg>
              <span>{successToast.message}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Card 1 */}
            <div className="bg-white border border-[#EBEEF5] p-6 rounded-[12px] shadow-sm flex flex-col gap-4 hover:shadow-md transition-all">
              <span className="text-[#676E76] text-[12px] tracking-[-0.24px]">
                Your Total Earnings
              </span>
              <div className="flex flex-col gap-1">
                <span className="text-[#24292E] font-medium text-[22px] tracking-[-0.44px]">
                  AED 6,000.00
                </span>
                <span className="text-[12px] font-medium tracking-[-0.24px]">
                  <span className="text-[#179353]">60%</span>{" "}
                  <span className="text-[#707070]">Total Earnings AED 10,000.00</span>
                </span>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-white border border-[#EBEEF5] p-6 rounded-[12px] shadow-sm flex flex-col gap-4 hover:shadow-md transition-all">
              <span className="text-[#676E76] text-[12px] tracking-[-0.24px]">
                Your Total Insurance Earnings
              </span>
              <div className="flex flex-col gap-1">
                <span className="text-[#24292E] font-medium text-[22px] tracking-[-0.44px]">
                  AED 60,000.00
                </span>
                <span className="text-[12px] font-medium tracking-[-0.24px]">
                  <span className="text-[#179353]">60%</span>{" "}
                  <span className="text-[#707070]">Total Earnings AED 100,000.00</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: History */}
        <div className="flex flex-col gap-6 mt-4">
          <h2 className="text-[#24292E] font-medium text-[16px] leading-tight tracking-[-0.32px]">
            History
          </h2>

          {/* Filtering tabs */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-2">
            <div className="flex flex-wrap items-center gap-2">
              {(["ALL", "Dr's share", "Appointments", "Diagnostics/ Commissions", "Canceled"] as const).map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-full text-[14px] font-normal transition-all ${
                      isActive
                        ? "bg-[#2E344E] text-white"
                        : "bg-white text-[#222530] border border-gray-100 shadow-sm hover:bg-gray-100"
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            {/* Timeframe select */}
            <div className="flex items-center gap-2 border border-gray-200 rounded-[8px] bg-white px-3 py-1.5 text-xs text-[#707070] cursor-pointer hover:border-gray-300">
              <span>{selectedTimeframe}</span>
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} stroke="currentColor" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Columns & List */}
          <div className="bg-white border border-[#EBEEF5] rounded-[12px] shadow-sm flex flex-col p-6 overflow-x-auto min-w-[700px]">
            
            {/* Table Header */}
            <div className="flex justify-between items-center py-2 px-2 border-b border-[#EBEEF5] text-[#24292E] text-[14px] font-medium select-none">
              <span className="w-[200px]">Name</span>
              <span className="w-[250px]">Diagnosis</span>
              <span className="w-[200px]">Date and Time</span>
              <span className="w-[100px] text-right">Earnings</span>
            </div>

            {/* Table Rows */}
            <div className="flex flex-col mt-2 divide-y divide-[#EBEEF5]/60">
              {filteredTransactions.map((tx) => (
                <div key={tx.id} className="flex justify-between items-center py-3.5 px-2 hover:bg-[#F8F9FD] rounded-lg transition-colors">
                  
                  {/* Name and avatar column */}
                  <div className="w-[200px] flex items-center gap-3">
                    <img
                      src={tx.avatar}
                      alt={tx.name}
                      className="w-9 h-9 rounded-full object-cover border border-gray-100"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://api.builder.io/api/v1/image/assets/TEMP/2fc70c27396226e96d788f42ab8214ce8f948ab5?width=72";
                      }}
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-[#24292E] font-medium text-[14px] leading-tight truncate">
                        {tx.name}, {tx.age} y/o
                      </span>
                      <span className="text-[#9EA5AD] text-[12px] truncate">
                        {tx.email}
                      </span>
                    </div>
                  </div>

                  {/* Diagnosis Tag column */}
                  <div className="w-[250px] flex items-center gap-2 min-w-0 pr-4">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#E2EAFE] text-[#213159] font-normal text-[11px] select-none">
                      {tx.diagnosis}
                    </span>
                    <span className="text-[#676E76] text-[12px] truncate leading-tight flex-1">
                      {tx.preview}
                    </span>
                  </div>

                  {/* Date and Time column */}
                  <span className="w-[200px] text-[#676E76] text-[12px] font-normal">
                    {tx.date}
                  </span>

                  {/* Earnings column */}
                  <span className="w-[100px] text-right text-[#24292E] font-semibold text-[13px]">
                    AED {tx.earnings.toFixed(2)}
                  </span>

                </div>
              ))}
              
              {filteredTransactions.length === 0 && (
                <div className="py-8 text-center text-[#9EA5AD] text-sm">
                  No transaction records found for this category.
                </div>
              )}
            </div>
          </div>

          {/* Pagination */}
          <div className="flex justify-between items-center py-3 px-6 rounded-[26px] bg-[#F7F9FF] border border-[#EBEEF5] text-xs text-[#707070]">
            <button className="text-gray-400 hover:text-[#5476FC] transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} stroke="currentColor" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-[#8AA0FF] text-white flex items-center justify-center font-medium">1</span>
              <span className="cursor-pointer hover:text-[#5476FC] transition-colors">2</span>
              <span className="cursor-pointer hover:text-[#5476FC] transition-colors">3</span>
              <span className="cursor-pointer hover:text-[#5476FC] transition-colors">4</span>
              <span className="cursor-pointer hover:text-[#5476FC] transition-colors">5</span>
              <span className="cursor-pointer hover:text-[#5476FC] transition-colors">6</span>
              <span className="cursor-pointer hover:text-[#5476FC] transition-colors">7</span>
            </div>
            <button className="text-gray-400 hover:text-[#5476FC] transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} stroke="currentColor" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

        </div>
      </div>

      {/* EDIT CONSULTATION FEE POPUP / MODAL */}
      {activeModal === "edit-fee" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto py-10 px-4 transition-opacity">
          <div className="bg-white border border-[#EBEEF5] w-full max-w-[624px] rounded-[12px] p-8 shadow-2xl flex flex-col gap-6 relative max-h-[90vh] overflow-y-auto">
            
            {/* Header with Title & Close button */}
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="text-[#24292E] font-serif text-[22px] tracking-[-0.66px]">
                Edit Consultation fee
              </h3>
              <button 
                onClick={() => {
                  setActiveModal(null);
                  setFeeOtpSent(false);
                  setFeeOtp(Array(6).fill(""));
                }}
                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 10.1627L3.40265 15.7603C3.24983 15.9129 3.05776 15.9911 2.82642 15.9948C2.59526 15.9983 2.39969 15.9201 2.23971 15.7603C2.0799 15.6003 2 15.4065 2 15.1788C2 14.9512 2.0799 14.7573 2.23971 14.5974L7.83733 9L2.23971 3.40265C2.08707 3.24983 2.00892 3.05776 2.00524 2.82642C2.00175 2.59526 2.0799 2.39969 2.23971 2.23971C2.39969 2.0799 2.59352 2 2.82118 2C3.04884 2 3.24266 2.0799 3.40265 2.23971L9 7.83733L14.5974 2.23971C14.7502 2.08707 14.9422 2.00892 15.1736 2.00524C15.4047 2.00175 15.6003 2.0799 15.7603 2.23971C15.9201 2.39969 16 2.59352 16 2.82118C16 3.04884 15.9201 3.24266 15.7603 3.40265L10.1627 9L15.7603 14.5974C15.9129 14.7502 15.9911 14.9422 15.9948 15.1736C15.9983 15.4047 15.9201 15.6003 15.7603 15.7603C15.6003 15.9201 15.4065 16 15.1788 16C14.9512 16 14.7573 15.9201 14.5974 15.7603L9 10.1627Z" fill="#596066"/>
                </svg>
              </button>
            </div>

            {/* Current Fee Subtitle */}
            <div className="text-[12px] font-normal leading-relaxed text-[#24292E]">
              Current Fee: <span className="text-[#5476FC] font-semibold">AED</span> <span className="font-semibold">200.00</span>
            </div>

            {/* Warning Message text info */}
            <div className="text-[12px] leading-relaxed text-[#24292E] bg-red-50/50 p-4 border border-red-100 rounded-lg">
              <span>
                Enter the new consultation fee for this emirate. To ensure security, a One-Time Password (OTP) will be sent to your registered phone number or email for verification. 
              </span>
              <p className="mt-2 text-[#EB5757] font-medium">
                You can update the consultation fee once every 30 days. Any fee changes will take effect immediately after OTP verification.
              </p>
            </div>

            {/* Emirates consultation fee grids */}
            <div className="flex gap-6 mt-2">
              
              {/* Left Side: Emirates labels column */}
              <div className="flex-1 flex flex-col gap-2">
                <span className="text-[#24292E] text-[12px] font-medium px-1">
                  Emirate
                </span>
                
                {(["Abu Dhabi", "Dubai", "Sharjah", "Ajman", "Umm Al-Quwain", "Ras Al Khaimah", "Fujairah"] as const).map((em) => (
                  <div key={em} className="h-[54px] flex items-center px-4 rounded-[12px] bg-[#F5F6FA] text-[#213159] text-[15px] font-normal border border-transparent">
                    {em}
                  </div>
                ))}
              </div>

              {/* Right Side: Consultation Fee inputs column */}
              <div className="flex-1 flex flex-col gap-2">
                <span className="text-[#24292E] text-[12px] font-medium px-1">
                  Consultation Fee*
                </span>

                {(["Abu Dhabi", "Dubai", "Sharjah", "Ajman", "Umm Al-Quwain", "Ras Al Khaimah", "Fujairah"] as const).map((em) => (
                  <div key={em} className="h-[54px] flex items-center px-4 rounded-[12px] bg-[#F5F6FA] border border-[#EBEEF5] text-[#213159] focus-within:border-[#8AA0FF] transition-colors gap-2">
                    <span className="text-[#213159] text-[14px]">AED</span>
                    <div className="w-[1px] h-4 bg-[#EBEEF5]" />
                    <input
                      type="number"
                      value={modalFees[em]}
                      onChange={(e) => setModalFees({ ...modalFees, [em]: e.target.value })}
                      placeholder="Consultation Fee"
                      className="bg-transparent border-none outline-none w-full text-[14px] text-[#213159] placeholder-[#9EA5AD] font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                ))}
              </div>

            </div>

            {/* Send OTP Section */}
            <div className="flex flex-col gap-3 mt-2">
              <span className="text-[#24292E] text-[12px] leading-relaxed">
                After entering the new consultation fee, click "Send OTP" to verify and confirm the updated fee. You will receive a one-time password (OTP) for verification.
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSendFeeOtp}
                  className="px-4 py-2 rounded-[12px] bg-[#E0E7FF] text-[#182A6F] font-semibold text-[13px] hover:opacity-90 transition-opacity"
                >
                  Send OTP
                </button>
                {feeOtpSuccessMsg && (
                  <span className="text-[12px] text-emerald-600 font-medium animate-pulse">
                    {feeOtpSuccessMsg}
                  </span>
                )}
              </div>
              <div className="w-full h-[1px] bg-[#EBEEF5] mt-1" />
            </div>

            {/* Verify OTP digits row */}
            <div className="flex flex-col gap-2">
              <span className="text-[#24292E] text-[12px] px-1">
                Verify OTP
              </span>
              <div className="flex gap-3 justify-between">
                {Array(6).fill(0).map((_, i) => (
                  <input
                    key={i}
                    type="text"
                    maxLength={1}
                    value={feeOtp[i]}
                    ref={(el) => { feeOtpRefs.current[i] = el; }}
                    onChange={(e) => handleFeeOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleFeeOtpKeyDown(i, e)}
                    disabled={!feeOtpSent}
                    className={`w-full h-[58px] text-center rounded-[12px] text-lg font-bold outline-none border transition-colors ${
                      feeOtpSent 
                        ? "bg-[#F5F6FA] border-[#EBEEF5] focus:border-[#8AA0FF] text-[#213159]" 
                        : "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="w-full h-[1px] bg-[#EBEEF5] mt-1" />

            {/* Modal Actions */}
            <div className="flex gap-4 mt-2">
              <button
                type="button"
                onClick={() => {
                  setActiveModal(null);
                  setFeeOtpSent(false);
                  setFeeOtp(Array(6).fill(""));
                }}
                className="flex-1 py-3.5 rounded-[12px] bg-[#E0E7FF] text-[#182A6F] font-semibold text-[15px] text-center hover:opacity-90 transition-opacity"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendForApproval}
                disabled={feeOtp.some(digit => !digit)}
                className={`flex-1 py-3.5 rounded-[12px] font-semibold text-[15px] text-center transition-all ${
                  feeOtp.every(digit => digit)
                    ? "bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white hover:opacity-95 shadow-md cursor-pointer"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
              >
                Send for Approval
              </button>
            </div>

          </div>
        </div>
      )}

      {/* WITHDRAW FUNDS POPUP / MODAL */}
      {activeModal === "withdraw-funds" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto py-10 px-4 transition-opacity">
          <div className="bg-white border border-[#EBEEF5] w-full max-w-[624px] rounded-[12px] p-8 shadow-2xl flex flex-col gap-6 relative max-h-[90vh] overflow-y-auto">
            
            {/* Header: Title & Close Button */}
            <div className="flex justify-between items-start border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-[#24292E] font-serif text-[22px] tracking-[-0.66px]">
                  {withdrawOtpSent ? "Verify OTP" : "Withdraw Funds"}
                </h3>
                
                {/* Conditionally show balance or withdraw amount details */}
                {!withdrawOtpSent ? (
                  <div className="text-[12px] font-normal leading-relaxed text-[#24292E] mt-1">
                    Balance in wallet : <span className="text-[#5476FC] font-semibold">AED</span> <span className="font-semibold">2400.00</span>
                  </div>
                ) : (
                  <div className="text-[12px] font-normal leading-relaxed text-[#24292E] mt-1">
                    Withdraw Amount : <span className="text-[#5476FC] font-semibold">AED</span> <span className="font-semibold">{parseFloat(withdrawAmount || "0").toFixed(2)}</span>
                  </div>
                )}
              </div>
              
              <button 
                onClick={() => {
                  setActiveModal(null);
                  setWithdrawOtpSent(false);
                  setWithdrawOtp(Array(6).fill(""));
                }}
                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 10.1627L3.40265 15.7603C3.24983 15.9129 3.05776 15.9911 2.82642 15.9948C2.59526 15.9983 2.39969 15.9201 2.23971 15.7603C2.0799 15.6003 2 15.4065 2 15.1788C2 14.9512 2.0799 14.7573 2.23971 14.5974L7.83733 9L2.23971 3.40265C2.08707 3.24983 2.00892 3.05776 2.00524 2.82642C2.00175 2.59526 2.0799 2.39969 2.23971 2.23971C2.39969 2.0799 2.59352 2 2.82118 2C3.04884 2 3.24266 2.0799 3.40265 2.23971L9 7.83733L14.5974 2.23971C14.7502 2.08707 14.9422 2.00892 15.1736 2.00524C15.4047 2.00175 15.6003 2.0799 15.7603 2.23971C15.9201 2.39969 16 2.59352 16 2.82118C16 3.04884 15.9201 3.24266 15.7603 3.40265L10.1627 9L15.7603 14.5974C15.9129 14.7502 15.9911 14.9422 15.9948 15.1736C15.9983 15.4047 15.9201 15.6003 15.7603 15.7603C15.6003 15.9201 15.4065 16 15.1788 16C14.9512 16 14.7573 15.9201 14.5974 15.7603L9 10.1627Z" fill="#596066"/>
                </svg>
              </button>
            </div>

            {/* Conditionally show Guidelines or Receiver Account Details */}
            {!withdrawOtpSent ? (
              <>
                <div className="text-[12px] leading-relaxed text-[#24292E] bg-red-50/50 p-4 border border-red-100 rounded-lg">
                  <span>
                    Review your balance and enter the amount you wish to withdraw. Please ensure your bank account details are accurate. Follow the guidelines below for a smooth withdrawal process
                  </span>
                  <p className="mt-2 text-[#EB5757] font-medium">
                    Minimum withdrawal amount is ₹500. Withdrawals can take up to 3-5 business days to process.
                  </p>
                </div>

                <div className="flex gap-6 mt-2">
                  <div className="flex-1 flex flex-col gap-2">
                    <span className="text-[#24292E] text-[12px] font-medium px-1">
                      Withdraw Amount (AED)
                    </span>
                    <div className="h-[64px] flex items-center px-4 rounded-[12px] bg-[#F5F6FA] border border-[#EBEEF5] focus-within:border-[#8AA0FF] transition-colors">
                      <input
                        type="number"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        placeholder="Enter amount"
                        className="bg-transparent border-none outline-none w-full text-[16px] text-[#213159] placeholder-[#9EA5AD] font-semibold"
                      />
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col gap-2">
                    <span className="text-[#24292E] text-[12px] font-medium px-1">
                      Receiver Account Details
                    </span>
                    
                    <div className="h-[64px] flex items-center justify-between p-3 rounded-[12px] border border-[#EBEEF5] bg-white gap-2">
                      <img 
                        src="https://api.builder.io/api/v1/image/assets/TEMP/fed1a238a975bbbf86c5944d566774f67d7af750?width=86" 
                        alt="ABC Bank Logo"
                        className="w-10 h-9 object-contain" 
                      />
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-[#24292E] text-[11px] font-medium truncate">
                          ABC BANK *******2345
                        </span>
                        <span className="text-[#676E76] text-[9px]">
                          Primary Account
                        </span>
                      </div>
                      <button
                        type="button"
                        className="text-[#24292E] font-medium text-[12px] hover:opacity-85"
                      >
                        Change
                      </button>
                    </div>
                  </div>
                </div>

                <div className="w-full h-[1px] bg-[#EBEEF5] mt-2" />
                <span className="text-[#24292E] text-[12px] leading-relaxed">
                  Confirm your withdrawal by requesting a One-Time Password (OTP) sent to your registered credentials.
                </span>
              </>
            ) : (
              <>
                {/* Receiver Account Details Card in OTP verification view */}
                <div className="flex flex-col gap-2">
                  <span className="text-[#24292E] text-[12px] font-medium px-1">
                    Receiver Account Details
                  </span>
                  <div className="h-[64px] flex items-center p-3 rounded-[12px] border border-[#EBEEF5] bg-white gap-3 w-full">
                    <img 
                      src="https://api.builder.io/api/v1/image/assets/TEMP/fed1a238a975bbbf86c5944d566774f67d7af750?width=86" 
                      alt="ABC Bank Logo"
                      className="w-10 h-9 object-contain" 
                    />
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-[#24292E] text-[12px] font-normal truncate">
                        ABC BANK *******2345
                      </span>
                      <span className="text-[#676E76] text-[10px]">
                        Primary Account
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <span className="text-[#24292E] text-[12px] px-1">
                    Enter OTP (Sent to <span className="text-[#5476FC]">mail@example.com</span>)
                  </span>
                  
                  <div className="flex gap-3 justify-between">
                    {Array(6).fill(0).map((_, i) => (
                      <input
                        key={i}
                        type="text"
                        maxLength={1}
                        value={withdrawOtp[i]}
                        ref={(el) => { withdrawOtpRefs.current[i] = el; }}
                        onChange={(e) => handleWithdrawOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleWithdrawOtpKeyDown(i, e)}
                        className="w-full h-[58px] text-center rounded-[12px] text-lg font-bold outline-none border bg-[#F5F6FA] border-[#EBEEF5] focus:border-[#8AA0FF] text-[#213159]"
                      />
                    ))}
                  </div>

                  <div className="flex justify-between items-center text-[12px] px-1">
                    <span className="text-[#2F2F2F] font-normal">
                      Try again in {formatTimer(withdrawTimer)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setWithdrawTimer(85)}
                      className="text-[#5B7BFC] font-semibold hover:opacity-85"
                    >
                      Resend OTP
                    </button>
                  </div>
                </div>
              </>
            )}

            <div className="w-full h-[1px] bg-[#EBEEF5] mt-1" />

            {/* Footer Buttons */}
            <div className="flex gap-4 mt-2">
              <button
                type="button"
                onClick={() => {
                  setActiveModal(null);
                  setWithdrawOtpSent(false);
                  setWithdrawOtp(Array(6).fill(""));
                }}
                className="flex-1 py-3.5 rounded-[12px] bg-[#E0E7FF] text-[#182A6F] font-semibold text-[15px] text-center hover:opacity-90 transition-opacity"
              >
                Cancel
              </button>
              
              {withdrawOtpSent ? (
                <button
                  type="button"
                  onClick={handleConfirmWithdrawal}
                  disabled={withdrawOtp.some(digit => !digit)}
                  className={`flex-1 py-3.5 rounded-[12px] font-semibold text-[15px] text-center transition-all ${
                    withdrawOtp.every(digit => digit)
                      ? "bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white hover:opacity-95 shadow-md cursor-pointer"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  Withdraw Funds
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setWithdrawOtpSent(true);
                    setWithdrawTimer(85);
                  }}
                  className="flex-1 py-3.5 rounded-[12px] bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white font-semibold text-[15px] text-center hover:opacity-95 shadow-md"
                >
                  Send OTP
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
