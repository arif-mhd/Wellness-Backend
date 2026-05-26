"use client";

interface StepItem {
  id: number;
  label: string;
}

interface ProfileCompletionSidebarProps {
  currentStep?: number;
}

export default function ProfileCompletionSidebar({
  currentStep = 1,
}: ProfileCompletionSidebarProps) {
  const steps: StepItem[] = [
    { id: 1, label: "Personal Information" },
    { id: 2, label: "Medical Specialization" },
    { id: 3, label: "Certification Documents" },
    { id: 4, label: "Set Availability" },
    { id: 5, label: "Payment Settings" },
  ];

  return (
    <div className="w-full bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(79,70,229,0.04)] border border-indigo-50/40 p-8 md:p-10 flex flex-col justify-between min-h-[500px] h-full font-outfit">
      <div>
        {/* Sidebar Header */}
        <h2 className="text-2xl md:text-[1.65rem] font-normal tracking-tight text-gray-800 font-marcellus leading-tight mb-4">
          Complete your profile information
        </h2>
        
        {/* Sidebar Description */}
        <p className="text-gray-500 text-xs md:text-[0.825rem] leading-relaxed mb-10 font-light font-outfit">
          This help us personalize your experience and provide the best services tailored to your needs.
        </p>

        {/* Stepper Progress */}
        <div className="flex flex-col relative select-none">
          {steps.map((step, idx) => {
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            
            return (
              <div key={step.id} className="flex items-start group relative pb-8 last:pb-0">
                {/* Vertical Connector Line */}
                {idx < steps.length - 1 && (
                  <div
                    className={`absolute left-4 top-9 bottom-0 w-[2px] -ml-[1px] transition-colors duration-300 ${
                      isCompleted ? "bg-[#5476FC]" : "bg-gray-200"
                    }`}
                  />
                )}

                {/* Step Circle */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold z-10 transition-all duration-300 ${
                    isActive
                      ? "bg-gradient-to-r from-[#8AA0FF] to-[#5476FC] text-white shadow-md shadow-blue-500/20 scale-110"
                      : isCompleted
                      ? "bg-[#5476FC] text-white"
                      : "bg-[#F0F2FA] text-gray-400"
                  }`}
                >
                  {isCompleted ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    step.id
                  )}
                </div>

                {/* Step Content */}
                <div className="ml-4 pt-1.5">
                  <h3
                    className={`text-xs md:text-[0.825rem] tracking-wide transition-colors duration-300 ${
                      isActive
                        ? "text-gray-800 font-semibold"
                        : "text-gray-400 font-normal"
                    }`}
                  >
                    {step.label}
                  </h3>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
