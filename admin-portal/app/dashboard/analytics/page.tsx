"use client";

import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";

const ReportCard = ({ title, description, slug }: { title: string, description: string, slug: string }) => {
  const router = useRouter();
  
  return (
    <div 
      onClick={() => router.push(`/dashboard/analytics/${slug}`)}
      className="bg-white rounded-2xl p-6 flex items-start gap-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-slate-50 hover:shadow-md hover:border-blue-100 transition-all cursor-pointer group"
    >
      <div className="w-[52px] h-[52px] rounded-full bg-[#E5EDFF] text-[#6A8BFF] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
        <svg className="w-[22px] h-[22px]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M5 20h14v2H3V4h2v16zM7 13h3v5H7v-5zm5-4h3v9h-3V9zm5-5h3v14h-3V4z"/>
        </svg>
      </div>
      <div className="flex flex-col gap-1.5 pt-1">
        <h3 className="text-[13px] font-black text-[#2f4281] tracking-tight group-hover:text-[#6A8BFF] transition-colors pr-2">
          {title}
        </h3>
        <p className="text-[11px] font-bold text-slate-500 leading-relaxed pr-2">
          {description}
        </p>
      </div>
    </div>
  );
};

export default function AnalyticsPage() {
  return (
    <ProtectedRoute>
      <div className="w-full pb-12 font-sans animate-in fade-in duration-300">
        
        {/* Page Header */}
        <div className="pt-2 mb-8">
          <h1 className="text-[28px] font-black text-[#1e293b] tracking-tight">Generate report</h1>
        </div>

        <div className="space-y-10">
          
          {/* Top Row Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <ReportCard 
              title="Appointment Booking Trends" 
              description="Visualizing appointment patterns to optimize scheduling efficiency and patient care." 
              slug="appointment-booking-trends"
            />
            <ReportCard 
              title="Primary Appointment Reasons" 
              description="Helping identify primary patient concerns for better engagement." 
              slug="primary-appointment-reasons-1"
            />
            <ReportCard 
              title="Appointment Cancellation and Rescheduling" 
              description="Helping identify primary patient concerns for better engagement." 
              slug="appointment-cancellation"
            />
          </div>

          {/* Doctor Activity Section */}
          <div className="space-y-4">
            <h2 className="text-[14px] font-black text-slate-800 tracking-tight ml-1">Doctor Activity</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <ReportCard 
                title="Number of Consultations" 
                description="Visualizing appointment patterns to optimize scheduling efficiency and patient care." 
                slug="number-of-consultations"
              />
              <ReportCard 
                title="Patient Satisfaction Ratings" 
                description="Helping identify primary patient concerns for better engagement." 
                slug="patient-satisfaction-doctor"
              />
              <ReportCard 
                title="Number of Prescriptions Issued" 
                description="Helping identify primary patient concerns for better engagement." 
                slug="number-of-prescriptions"
              />
            </div>
          </div>

          {/* Patient Activity Section */}
          <div className="space-y-4">
            <h2 className="text-[14px] font-black text-slate-800 tracking-tight ml-1">Patient Activity</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <ReportCard 
                title="Number of Appointments" 
                description="Visualizing appointment patterns to optimize scheduling efficiency and patient care." 
                slug="number-of-appointments"
              />
              <ReportCard 
                title="Primary Appointment Reasons" 
                description="Helping identify primary patient concerns for better engagement." 
                slug="primary-appointment-reasons-2"
              />
              <ReportCard 
                title="Patient Satisfaction Ratings" 
                description="Helping identify primary patient concerns for better engagement." 
                slug="patient-satisfaction-patient"
              />
            </div>
          </div>

        </div>
      </div>
    </ProtectedRoute>
  );
}
