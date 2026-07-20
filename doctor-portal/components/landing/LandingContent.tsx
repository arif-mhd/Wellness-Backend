"use client";

import Image from "next/image";
import Link from "next/link";
import logoImg from "@/assets/images/wellness_logo.png";
import DoctorLoginButton from "@/components/DoctorLoginButton";

export default function LandingContent() {
  return (
    <div className="w-full flex justify-center items-center">
      <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(79,70,229,0.06)] border border-indigo-50/50 p-8 md:p-12 w-full max-w-[760px] flex flex-col justify-between min-h-[550px] relative overflow-hidden backdrop-blur-sm">
        
        {/* Top Decorative Glow */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-200/20 blur-2xl rounded-full" />
        
        <div>
          {/* Wellness Central Logo */}
          <div className="flex items-center mb-8 select-none">
            <Image
              src={logoImg}
              alt="Wellness Central"
              width={160}
              height={50}
              className="object-contain hover:opacity-90 transition-opacity"
              priority
            />
          </div>

          {/* Headline */}
          <h1 className="text-3xl md:text-[2.2rem] font-normal tracking-tight text-gray-800 leading-tight mb-4 font-marcellus">
            Personalized Care, <span className="inline-block bg-gradient-to-r from-[#8AA0FF] to-[#5476FC] bg-clip-text text-transparent font-semibold">Anytime</span>, Anywhere
          </h1>

          {/* Description */}
          <p className="text-gray-600 text-sm md:text-[0.95rem] leading-relaxed mb-4 font-marcellus">
            Discover a holistic approach to health with tailored wellness plans, 
            expert guidance, and a supportive community
            <br />
            <span className="inline-block bg-gradient-to-r from-[#8AA0FF] to-[#5476FC] bg-clip-text text-transparent font-normal">—right at your fingertips.</span>
          </p>

          {/* Secondary smaller text */}
          <p className="text-gray-500 text-[0.75rem] md:text-[0.8rem] leading-relaxed mb-8 font-outfit">
            Join us today and experience a seamless path to better health. From fitness routines and 
            mindfulness practices to nutrition tips, our wellness center app is designed to help you 
            achieve your goals at your own pace.
          </p>
        </div>

        {/* Actions & Footer */}
        <div>
          <div className="flex flex-col sm:flex-row gap-4 mb-10">
            {/* Clinic/Doctor Login Button */}
            <DoctorLoginButton label="Clinic/Doctor Login" />

            {/* Register Your Clinic Button */}
            <Link
              href="/auth/signup"
              className="bg-indigo-50 hover:bg-indigo-100 text-[#182A6F] px-8 py-3.5 rounded-[0.8rem] font-medium font-outfit text-sm flex items-center justify-center transition-all hover:translate-y-[-1px] active:translate-y-[0px] duration-150"
            >
              Register Your Clinic
            </Link>
          </div>

          {/* Footer links */}
          <div className="flex gap-2 text-[0.75rem] text-gray-400 font-light border-t border-gray-100 pt-5">
            <a href="#" className="hover:text-indigo-600 transition-colors">Privacy Policy</a>
            <span>|</span>
            <a href="#" className="hover:text-indigo-600 transition-colors">Terms of Use</a>
          </div>
        </div>

      </div>
    </div>
  );
}
