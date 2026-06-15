"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import Session from "supertokens-web-js/recipe/session";
import VideoFeed from "@/components/video-call/VideoFeed";
import ChatTranscript from "@/components/video-call/ChatTranscript";
import IntakePlan from "@/components/video-call/IntakePlan";
import AddMedicines from "@/components/video-call/AddMedicines";
import AddLabs from "@/components/video-call/AddLabs";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface Doctor {
  id: string;
  fullName: string;
  email: string;
  rating: number;
  avatarUrl: string | null;
  specialty: string;
  isOnline?: boolean;
  fees?: string | null;
  added?: boolean;
}

export default function VideoCallsPage() {
  const searchParams = useSearchParams();
  const appointmentId = searchParams.get("appointmentId") ?? "";

  const [showSpecialistModal, setShowSpecialistModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showInvitationModal, setShowInvitationModal] = useState(false);
  const [specialistJoined, setSpecialistJoined] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);

  // Real doctor list from API
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);

  // Invite/accept status
  const [inviteStatus, setInviteStatus] = useState<"idle" | "sending" | "waiting" | "accepted" | "declined">("idle");
  const [specialistInfo, setSpecialistInfo] = useState<{ name: string; avatar: string | null; fees: string | null } | null>(null);

  // Ref to the VideoFeed so we can send data messages through it
  const videoFeedRef = useRef<{ sendData: (payload: string) => void } | null>(null);

  useEffect(() => { setMounted(true); return () => setMounted(false); }, []);

  // Fetch available doctors from backend when specialist modal opens
  const fetchAvailableDoctors = useCallback(async () => {
    if (!appointmentId) return;
    setDoctorsLoading(true);
    try {
      const token = await Session.getAccessToken();
      const res = await fetch(`${API_URL}/api/appointments/${appointmentId}/available-doctors`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const { doctors: list } = await res.json();
        setDoctors((list ?? []).map((d: any) => ({ ...d, added: false })));
      }
    } catch (e) {
      console.error("fetchAvailableDoctors error:", e);
    } finally {
      setDoctorsLoading(false);
    }
  }, [appointmentId]);

  // Open specialist modal and load doctors
  const openSpecialistModal = () => {
    setShowSpecialistModal(true);
    fetchAvailableDoctors();
  };

  // 1. Right-side Specialist Drawer Content
  const specialistModalContent = showSpecialistModal && mounted ? createPortal(
    <div className="fixed inset-0 w-screen h-screen z-[999999] flex justify-end items-start p-6 pointer-events-none font-outfit">
      {/* Backdrop spanning the full screen at all times */}
      <div
        className="fixed inset-0 w-screen h-screen bg-slate-900/40 backdrop-blur-xs pointer-events-auto transition-opacity duration-300"
        onClick={() => setShowSpecialistModal(false)}
      />

      {/* Specialist Popup Card - floating top-right unconstrained */}
      <div className="bg-white w-full max-w-[400px] rounded-3xl p-7 shadow-2xl relative border border-slate-100 flex flex-col gap-5 pointer-events-auto transition-all duration-300 max-h-[85vh] overflow-y-auto mt-16 md:mt-20 animate-[slideInSpecialist_0.3s_ease-out]">
        
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes slideInSpecialist {
            from { transform: translateX(30px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
        `}} />

        {/* Close button */}
        <button
          onClick={() => setShowSpecialistModal(false)}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-1.5 rounded-full transition-colors"
          title="Close popup"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Available Specialists Title */}
        <div className="flex flex-col gap-3">
          <span className="text-[#24292E] font-medium text-[13.5px] select-none tracking-tight pt-1">
            Available Specialists
          </span>

          {doctorsLoading ? (
            <div className="text-center text-[11px] text-slate-400 py-6">Loading available doctors...</div>
          ) : doctors.length === 0 && !appointmentId ? (
            <div className="text-center text-[11px] text-slate-400 py-6">Open from a video call to see available doctors.</div>
          ) : doctors.length === 0 ? (
            <div className="text-center text-[11px] text-slate-400 py-6">No doctors currently available.</div>
          ) : null}

          {/* Doctors List */}
          <div className="flex flex-col gap-2">
            {doctors.slice(0, 3).map((doc, idx) => (
              <div key={doc.id} className="w-full">
                <div className="flex flex-col py-2.5 w-full bg-white gap-2.5">
                  <div className="flex items-center justify-between gap-3 w-full">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Avatar Container with Active Green Indicator */}
                      <div className="relative w-10 h-10 shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={doc.avatarUrl ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(doc.fullName)}&background=5476FC&color=fff`}
                          alt={doc.fullName}
                          className="w-10 h-10 rounded-full object-cover border border-slate-100"
                        />
                        {doc.isOnline && (
                          <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] border-2 border-white absolute bottom-0 right-0 shadow-sm" />
                        )}
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-[#383F45] text-xs font-semibold truncate">
                          {doc.fullName}
                        </span>
                        <span className="text-[#838B95] text-[10px] font-normal truncate leading-tight mt-0.5">
                          {doc.specialty}
                        </span>
                        {/* Stars Rating */}
                        <div className="flex items-center gap-0.5 mt-0.5">
                          {[...Array(Math.min(doc.rating, 5))].map((_, i) => (
                            <svg key={i} width="10" height="10" viewBox="0 0 24 24" className="fill-[#5476FC] stroke-[#5476FC]">
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Add Specialist Pill Button */}
                    <button
                      onClick={() => handleOpenApproval(doc)}
                      className="h-7 px-5 rounded-full text-[10.5px] font-semibold transition-all shadow-sm shrink-0 border border-[#EBEEF5] bg-white text-[#383F45] hover:bg-[#F5F6FA]"
                    >
                      Add
                    </button>
                  </div>

                  {doc.fees && (
                    <div className="mt-2 pt-2 border-t border-[#EBEEF5] flex flex-col gap-1.5">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-[#676E76] font-normal">This provider is available now</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-[#676E76] font-normal">Consultation Fee</span>
                        <span className="text-[#5476FC] font-semibold">AED {doc.fees}</span>
                      </div>
                    </div>
                  )}
                </div>
                {/* Horizontal divider below recent supports */}
                {idx < Math.min(doctors.length, 3) - 1 && <div className="w-full h-[1px] bg-[#F1F3F7] mt-1.5" />}
              </div>
            ))}
          </div>
        </div>

        {/* All Doctors Section */}
        {doctors.length > 3 && (
          <div className="flex flex-col gap-4 border-t border-[#F1F3F7] pt-4">
            <span className="text-[#24292E] font-medium text-[13.5px] select-none tracking-tight">
              All Available Doctors
            </span>

            {/* Search bar inside specialist menu */}
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Doctor's Name or Speciality"
                className="w-full h-11 pl-10 pr-4 rounded-full bg-[#F5F6FA] text-xs font-normal text-[#383F45] placeholder-[#838B95] outline-none focus:ring-1 focus:ring-[#5476FC]/20 focus:bg-white transition-all"
              />
              <div className="absolute inset-y-0 left-3.5 flex items-center text-[#838B95] pointer-events-none">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
            </div>

            {/* List of All Doctors */}
            <div className="flex flex-col gap-1">
              {filteredAllDoctors.length === 0 ? (
                <div className="text-center text-[11px] font-semibold text-slate-400 py-4">
                  No doctors found matching &ldquo;{searchQuery}&rdquo;
                </div>
              ) : (
                filteredAllDoctors.slice(3).map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between gap-3 w-full py-2.5 hover:bg-[#F5F6FA]/30 rounded-xl transition-all px-2"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={doc.avatarUrl ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(doc.fullName)}&background=5476FC&color=fff`}
                        alt={doc.fullName}
                        className="w-8 h-8 rounded-full object-cover border border-slate-100 shrink-0"
                      />
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-[#383F45] text-xs font-semibold truncate">{doc.fullName}</span>
                        <span className="text-[#838B95] text-[10px] font-normal truncate leading-tight mt-0.5">{doc.specialty}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleOpenApproval(doc)}
                      className="h-7 px-5 rounded-full text-[10.5px] font-semibold transition-all shadow-sm shrink-0 border border-[#EBEEF5] bg-white text-[#383F45] hover:bg-[#F5F6FA]"
                    >
                      Add
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  ) : null;

  // 2. Central Add Specialist Approval Modal Content
  const approvalModalContent = showApprovalModal && selectedDoctor && mounted ? createPortal(
    <div className="fixed inset-0 w-screen h-screen z-[999999] flex items-center justify-center p-4 pointer-events-none font-outfit">
      {/* Backdrop */}
      <div
        className="fixed inset-0 w-screen h-screen bg-slate-900/40 backdrop-blur-xs pointer-events-auto transition-opacity duration-300"
        onClick={() => setShowApprovalModal(false)}
      />

      {/* Center Modal Card */}
      <div className="bg-white w-full max-w-[680px] rounded-3xl py-6 px-9 md:py-7 md:px-10 shadow-2xl relative border border-slate-100 flex flex-col gap-4 pointer-events-auto transition-all duration-300 animate-[zoomInApproval_0.25s_ease-out] select-none">
        
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes zoomInApproval {
            from { transform: scale(0.95); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
        `}} />

        {/* Close button */}
        <button
          onClick={() => setShowApprovalModal(false)}
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-50 transition-colors"
          title="Close modal"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Header Titles */}
        <div className="flex flex-col gap-1 items-center text-center">
          <h3 className="text-[#24292E] font-marcellus font-medium text-[22px] tracking-tight pt-1">
            Add Specialist
          </h3>
          <span className="text-[#838B95] text-xs font-normal">
            Add this provider to the consultation.
          </span>
        </div>

        {/* Doctor Row Info */}
        <div className="flex items-center justify-between gap-4 w-full py-1">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="relative w-11 h-11 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedDoctor.avatarUrl ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedDoctor.fullName)}&background=5476FC&color=fff`}
                alt={selectedDoctor.fullName}
                className="w-11 h-11 rounded-full object-cover border border-slate-100"
              />
              {selectedDoctor.isOnline && (
                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] border-2 border-white absolute bottom-0 right-0 shadow-sm" />
              )}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[#383F45] text-xs font-semibold truncate">{selectedDoctor.fullName}</span>
              <span className="text-[#838B95] text-[10px] font-normal truncate mt-0.5">{selectedDoctor.email}</span>
              <div className="flex items-center gap-0.5 mt-0.5">
                {[...Array(Math.min(selectedDoctor.rating, 5))].map((_, i) => (
                  <svg key={i} width="10" height="10" viewBox="0 0 24 24" className="fill-[#5476FC] stroke-[#5476FC]">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                ))}
              </div>
            </div>
          </div>
          <button
            onClick={() => alert("Viewing Profile in New Tab...")}
            className="h-9 px-5 rounded-full bg-[#E8F1FF] text-[#5476FC] hover:bg-[#D9E7FF] text-[11px] font-semibold transition-all shrink-0 border-none flex items-center justify-center"
          >
            View Profile in New Tab
          </button>
        </div>

        {/* Divider under doctor info row */}
        <div className="w-full h-[1px] bg-[#F1F3F7]" />

        {/* Detailed Breakdown */}
        <div className="flex flex-col gap-2.5 py-0.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-[#676E76] font-normal">Consultation Fee</span>
            <span className="text-[#383F45] font-semibold">{selectedDoctor.fees ? `AED ${selectedDoctor.fees}` : "AED 200.00"}</span>
          </div>
          <div className="w-full h-[1px] bg-[#F1F3F7]" />
          <div className="flex justify-between items-center text-xs">
            <span className="text-[#676E76] font-normal">Specialty</span>
            <span className="text-[#383F45] font-semibold">{selectedDoctor.specialty ?? "General"}</span>
          </div>
          <div className="w-full h-[1px] bg-[#F1F3F7]" />
          <div className="flex justify-between items-center text-xs">
            <span className="text-[#676E76] font-normal">Insurance Eligibility of Patient</span>
            <span className="text-[#5476FC] font-semibold">Eligible</span>
          </div>
          <div className="w-full h-[1px] bg-[#F1F3F7]" />
        </div>

        {/* Warning Note */}
        <p className="text-[#E84949] text-[10.5px] font-normal leading-relaxed mt-0.5">
          Important: Please consult with the patient before adding this specialist and inform them about insurance eligibility and payment options, if applicable.
        </p>

        {/* Center/Right Align Request Approval Button */}
        <div className="flex justify-end pt-1">
          <button
            onClick={handleRequestApproval}
            disabled={inviteStatus === "sending"}
            className="h-10 px-8 rounded-lg bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-xs font-bold shadow-[0_2.5px_8px_rgba(84,118,252,0.25)] hover:shadow-[0_4px_12px_rgba(84,118,252,0.35)] active:scale-98 transition-all select-none flex items-center justify-center disabled:opacity-60"
          >
            {inviteStatus === "sending" ? "Sending..." : "Request Patient Approval"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  // 3. Specialist Added Successfully Modal Content
  const successModalContent = showSuccessModal && selectedDoctor && mounted ? createPortal(
    <div className="fixed inset-0 w-screen h-screen z-[999999] flex items-center justify-center p-4 pointer-events-none font-outfit">
      {/* Backdrop */}
      <div
        className="fixed inset-0 w-screen h-screen bg-slate-900/40 backdrop-blur-xs pointer-events-auto transition-opacity duration-300"
        onClick={() => setShowSuccessModal(false)}
      />

      {/* Center Modal Card - highly compact max-w-[340px] with overflow-hidden to clip docked button */}
      <div className="bg-white w-full max-w-[340px] rounded-3xl shadow-2xl relative border border-slate-100 flex flex-col pointer-events-auto transition-all duration-300 animate-[zoomInSuccess_0.25s_ease-out] select-none">
        
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes zoomInSuccess {
            from {
              transform: scale(0.95);
              opacity: 0;
            }
            to {
              transform: scale(1);
              opacity: 1;
            }
          }
        `}} />

        {/* Padded Content Block */}
        <div className="pt-7 px-8 pb-7 flex flex-col gap-4 items-center w-full">
          {/* Close button */}
          <button
            onClick={() => setShowSuccessModal(false)}
            className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-50 transition-colors"
            title="Close modal"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* Success Title */}
          <div className="flex flex-col gap-1 items-center text-center">
            <h3 className="text-[#24292E] font-marcellus font-medium text-[20px] tracking-tight leading-tight pt-2">
              Specialist Added<br />Successfully
            </h3>
          </div>

          {/* Doctor Row Info */}
          <div className="flex flex-col items-center text-center gap-1.5 py-1">
            {/* Avatar with Active Green Indicator */}
            <div className="relative w-12 h-12 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedDoctor.avatar}
                alt={selectedDoctor.name}
                className="w-12 h-12 rounded-full object-cover border border-slate-100"
              />
              {selectedDoctor.isOnline && (
                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] border-2 border-white absolute bottom-0 right-0 shadow-sm" />
              )}
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[#383F45] text-xs font-semibold">
                {selectedDoctor.name}
              </span>
              <span className="text-[#838B95] text-[10px] font-normal mt-0.5">
                {selectedDoctor.email}
              </span>
              {/* Stars */}
              <div className="flex items-center gap-0.5 mt-1">
                {[...Array(selectedDoctor.rating)].map((_, i) => (
                  <svg
                    key={i}
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    className="fill-[#5476FC] stroke-[#5476FC]"
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                ))}
              </div>
            </div>
          </div>

          {/* Connect Now — opens invitation modal on specialist's end */}
          <button
            onClick={() => {
              setShowSuccessModal(false);
              setShowInvitationModal(true);
            }}
            className="w-full h-11 rounded-xl bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-xs font-bold shadow-[0_2px_8px_rgba(84,118,252,0.3)] hover:from-[#7990FF] hover:to-[#3B5BFC] hover:shadow-[0_4px_12px_rgba(84,118,252,0.4)] active:scale-[0.98] transition-all select-none flex items-center justify-center"
          >
            Connect Now
          </button>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  // 4. New Consultation Invitation Modal (simulates what specialist sees on their dashboard)
  const invitationModalContent = showInvitationModal && selectedDoctor && mounted ? createPortal(
    <div className="fixed inset-0 w-screen h-screen z-[999999] flex items-end justify-end p-6 pointer-events-none font-outfit">
      {/* Semi-transparent backdrop */}
      <div
        className="fixed inset-0 w-screen h-screen bg-slate-900/30 backdrop-blur-[2px] pointer-events-auto"
        onClick={() => setShowInvitationModal(false)}
      />

      {/* Invitation Card — bottom-right corner like a notification */}
      <div className="bg-white w-full max-w-[380px] rounded-2xl shadow-2xl border border-slate-100 flex flex-col pointer-events-auto animate-[slideInCard_0.3s_ease-out] select-none relative">
        
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes slideInCard {
            from { opacity: 0; transform: translateY(20px) scale(0.97); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}} />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#F1F3F7]">
          <h3 className="text-[#24292E] font-semibold text-[15px] tracking-tight">
            New Consultation Invitation!
          </h3>
          <button
            onClick={() => setShowInvitationModal(false)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-50 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 flex flex-col gap-4">
          {/* Subtitle */}
          <p className="text-[#676E76] text-[11.5px] font-normal leading-relaxed">
            You have been invited to join a consultation call with{" "}
            <span className="font-semibold text-[#383F45]">{selectedDoctor.name}</span>
          </p>

          {/* Provider Details */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-semibold text-[#676E76] uppercase tracking-wide">Provider Details</span>
            <div className="flex items-center gap-2.5">
              <div className="relative shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selectedDoctor.avatar} alt={selectedDoctor.name} className="w-9 h-9 rounded-full object-cover border border-slate-100" />
                {selectedDoctor.isOnline && <span className="w-2 h-2 rounded-full bg-[#10B981] border-2 border-white absolute bottom-0 right-0" />}
              </div>
              <div className="flex flex-col">
                <span className="text-[#383F45] text-xs font-semibold">{selectedDoctor.name}</span>
                <span className="text-[#838B95] text-[10px] font-normal">{selectedDoctor.email}</span>
              </div>
            </div>
          </div>

          {/* Patient Details */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-semibold text-[#676E76] uppercase tracking-wide">Patient Details</span>
            <div className="flex items-center gap-2.5">
              <div className="relative shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&h=200&q=80"
                  alt="Kathryn Murphy"
                  className="w-9 h-9 rounded-full object-cover border border-slate-100"
                />
                <span className="w-2 h-2 rounded-full bg-[#10B981] border-2 border-white absolute bottom-0 right-0" />
              </div>
              <div className="flex flex-col">
                <span className="text-[#383F45] text-xs font-semibold">Kathryn Murphy</span>
                <span className="text-[#838B95] text-[10px] font-normal">yelena@example.com</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-5 pb-5 pt-1 flex items-center gap-3">
          {/* Decline */}
          <button
            onClick={() => setShowInvitationModal(false)}
            className="flex-1 h-11 rounded-xl bg-[#FF3B30] hover:bg-[#E02D22] text-white text-xs font-bold shadow-sm transition-all active:scale-[0.98] select-none"
          >
            Decline
          </button>
          {/* Join Consultation */}
          <button
            onClick={() => {
              setShowInvitationModal(false);
              setSpecialistJoined(true);
            }}
            className="flex-1 h-11 rounded-xl bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] hover:from-[#7990FF] hover:to-[#3B5BFC] text-white text-xs font-bold shadow-[0_2px_8px_rgba(84,118,252,0.3)] transition-all active:scale-[0.98] select-none flex items-center justify-center gap-2"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            Join Consultation
          </button>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className="w-full bg-slate-50 p-6 flex flex-col gap-6 select-none font-outfit">
      {/* ── Patient Consultation Header row ─────────────────────────────────── */}
      <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#EBEEF5] pb-5">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-slate-800 text-lg font-bold tracking-tight">
              [Internal] Calling - Albert Flores
            </h1>
            {/* pulsing live calling indicator */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 border border-red-100 rounded-full text-red-500 text-[10px] font-bold shadow-sm select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span>00:30</span>
            </div>
          </div>
          <span className="text-[#676E76] text-xs font-semibold">
            June 12th, 2022 | 11:00 AM
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => alert("EHR view requested")}
            className="h-10 px-5 rounded-lg border border-[#EBEEF5] bg-white text-[#383F45] text-xs font-bold hover:bg-[#F5F6FA] active:scale-98 transition-all shadow-sm"
          >
            View Detailed EHR
          </button>
          <button
            onClick={openSpecialistModal}
            className="h-10 px-5 rounded-lg bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-xs font-bold shadow-[0_2.5px_8px_rgba(84,118,252,0.25)] hover:shadow-[0_4px_12px_rgba(84,118,252,0.35)] active:scale-98 transition-all"
          >
            Add Specialist
          </button>
        </div>
      </div>

      {/* Render the Portals connected directly under the document body root */}
      {specialistModalContent}
      {approvalModalContent}
      {successModalContent}
      {invitationModalContent}

      {/* ── Two-Column Main Layout Grid ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
        {/* Left Column (col-span-5) - Video Feed & Live Chat */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Invite status banner */}
          {inviteStatus === "waiting" && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-100 rounded-xl text-blue-700 text-xs font-semibold animate-pulse">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Waiting for patient approval...
            </div>
          )}
          {inviteStatus === "accepted" && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border border-green-100 rounded-xl text-green-700 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Patient approved! Specialist is joining...
            </div>
          )}
          {inviteStatus === "declined" && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Patient declined the specialist invite.
            </div>
          )}
          <VideoFeed
            specialistJoined={specialistJoined}
            specialist={selectedDoctor ? { name: selectedDoctor.fullName, avatar: selectedDoctor.avatarUrl ?? "" } : null}
            onDataMessage={handleDataMessage}
          />
          <ChatTranscript />
        </div>

        {/* Right Column (col-span-7) - Embedded entirely in a solid grey card box */}
        <div className="lg:col-span-7 bg-[#F5F6FA] border border-[#EBEEF5] rounded-3xl p-6 flex flex-col gap-5 shadow-[0_2px_12px_rgba(0,0,0,0.01)]">
          <IntakePlan />

          {/* Medicines & Labs Unified Card - Renders in pure white on top of the grey wrapper */}
          <div className="w-full bg-white rounded-2xl p-6 border border-[#EBEEF5] shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col md:flex-row gap-0">
            <div className="flex-1 min-w-0 p-2">
              <AddMedicines />
            </div>

            {/* Vertical Divider (visible on desktop) */}
            <div className="hidden md:block w-[1px] bg-[#EBEEF5] self-stretch shrink-0 mx-2" />

            <div className="flex-1 min-w-0 p-2">
              <AddLabs />
            </div>
          </div>

          {/* Footer EMR actions */}
          <div className="w-full flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => alert("EMR intake cancelled")}
              className="h-10 px-6 rounded-full bg-white border border-[#EBEEF5] text-slate-700 text-xs font-bold hover:bg-slate-50 shadow-sm active:scale-98 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => alert("EMR entries saved successfully!")}
              className="h-10 px-6 rounded-xl bg-[#5476FC] hover:bg-[#3B5BFC] text-white text-xs font-bold shadow-[0_2px_8px_rgba(84,118,252,0.25)] hover:scale-[1.01] active:scale-99 transition-all"
            >
              Save EMR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
