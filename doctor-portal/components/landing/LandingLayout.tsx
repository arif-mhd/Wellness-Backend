"use client";

interface LandingLayoutProps {
  heroImage: React.ReactNode;
  content: React.ReactNode;
}

export default function LandingLayout({ heroImage, content }: LandingLayoutProps) {
  return (
    <div className="relative min-h-screen bg-gradient-to-tr from-slate-50 via-white to-indigo-50/30 flex items-center justify-center py-6 px-4 md:px-6 overflow-hidden">
      
      {/* Soft Background Blurs */}
      <div className="absolute -bottom-24 -left-24 w-[400px] h-[400px] bg-purple-200/30 rounded-full blur-[120px] pointer-events-none select-none" />
      <div className="absolute -top-24 -right-24 w-[350px] h-[350px] bg-blue-200/20 rounded-full blur-[100px] pointer-events-none select-none" />
      <div className="absolute top-[40%] left-[30%] w-[250px] h-[250px] bg-indigo-200/10 rounded-full blur-[90px] pointer-events-none select-none" />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-[1380px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 items-center">
        
        {/* Left Side: Hero Image */}
        <div className="w-full flex justify-center order-2 md:order-1">
          {heroImage}
        </div>

        {/* Right Side: content card */}
        <div className="w-full flex justify-center order-1 md:order-2">
          {content}
        </div>

      </div>
    </div>
  );
}
