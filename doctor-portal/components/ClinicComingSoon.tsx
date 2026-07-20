"use client";

interface ClinicComingSoonProps {
  title: string;
  description?: string;
}

export default function ClinicComingSoon({ title, description }: ClinicComingSoonProps) {
  return (
    <div className="px-10 lg:px-[40px] py-8 max-w-[1600px] mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-transparent p-12 flex flex-col items-center text-center gap-3 max-w-xl mx-auto mt-12">
        <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center text-[#5476FC] mb-2">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-lg font-semibold text-[#24292E]">{title}</h1>
        <p className="text-sm text-gray-400 leading-relaxed">
          {description ?? "This section is coming soon."}
        </p>
      </div>
    </div>
  );
}
