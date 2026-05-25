"use client";

import Image from "next/image";
import doctorPortalImg from "@/assets/images/doctorportal.jpg";

export default function LandingHeroImage() {
  return (
    <div className="w-full flex justify-center items-center">
      <div className="relative w-full max-h-[82vh] aspect-[4/5] md:aspect-[0.8] rounded-[2.5rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.06)] border-4 border-white/80 group">
        
        {/* Soft Hover Overlay Effect */}
        <div className="absolute inset-0 bg-indigo-900/5 group-hover:bg-indigo-900/0 transition-colors duration-500 z-10" />

        <Image
          src={doctorPortalImg}
          alt="Wellness Doctor Team"
          fill
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover transform group-hover:scale-[1.02] transition-transform duration-[2000ms] ease-out"
        />
      </div>
    </div>
  );
}
