"use client";

import { useState, useRef } from "react";
import DoctorLoginButton from "@/components/DoctorLoginButton";

interface CertificationDocumentsFormProps {
  initialDegreeFile?: File | null;
  initialSpecFile?: File | null;
  initialAddFile?: File | null;
  onSubmit: (data: any) => void;
  onGoBack: () => void;
}

export default function CertificationDocumentsForm({
  initialDegreeFile = null,
  initialSpecFile = null,
  initialAddFile = null,
  onSubmit,
  onGoBack,
}: CertificationDocumentsFormProps) {
  const [degreeFile, setDegreeFile] = useState<File | null>(initialDegreeFile);
  const [specFile, setSpecFile] = useState<File | null>(initialSpecFile);
  const [addFile, setAddFile] = useState<File | null>(initialAddFile);
  
  const [formError, setFormError] = useState("");

  const degreeInputRef = useRef<HTMLInputElement>(null);
  const specInputRef = useRef<HTMLInputElement>(null);
  const addInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: (file: File | null) => void
  ) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setFormError("Each document file must be under the 5 MB limit.");
        return;
      }
      setFile(file);
      setFormError("");
    }
  };

  const handleRemoveFile = (
    e: React.MouseEvent,
    setFile: (file: File | null) => void,
    inputRef: React.RefObject<HTMLInputElement | null>
  ) => {
    e.stopPropagation();
    setFile(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Required fields check
    if (!degreeFile) {
      setFormError("Medical Degree Certificate is required.");
      return;
    }
    if (!specFile) {
      setFormError("Specialization Certificate is required.");
      return;
    }

    setFormError("");
    onSubmit({
      degreeFile,
      specFile,
      addFile,
    });
  };

  return (
    <div className="w-full bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(79,70,229,0.04)] border border-indigo-50/40 p-8 md:p-10 font-outfit select-none">
      
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-xl md:text-[1.4rem] font-normal tracking-tight text-gray-800 font-marcellus leading-tight">
          Medical/ Career Information
        </h3>
        <p className="text-gray-400 text-xs md:text-[0.825rem] font-light mt-1">
          Please provide your medical or career information.
        </p>
      </div>

      {/* Form Error Banner */}
      {formError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-6 text-sm text-center animate-fadeIn">
          {formError}
        </div>
      )}

      {/* Informational banner precisely styled as in screenshot */}
      <div className="bg-slate-50 border-t border-b border-gray-100 py-4 px-1 mb-6 text-[0.72rem] text-gray-500 leading-relaxed font-light">
        <p className="font-medium text-gray-600 mb-1">
          Please upload the necessary certificates to verify your qualifications. Ensure that the documents are clear and legible.
        </p>
        <p>Accepted Formats: PDF, JPEG, PNG</p>
        <p>File Size Limit: Maximum file size: 5 MB</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        <div>
          <h4 className="text-sm font-semibold text-gray-700 font-outfit mb-4">
            Required Documents
          </h4>
          
          <div className="space-y-5">
            
            {/* 1. Medical Degree Certificate */}
            <div>
              <div className="text-[0.68rem] text-gray-400 font-light mb-2 ml-1">Medical Degree Certificate*</div>
              <div
                onClick={() => degreeInputRef.current?.click()}
                className="border-2 border-dashed border-[#C5D3FF] bg-[#F4F7FF]/50 hover:bg-[#EBEEFF] rounded-2xl p-7 flex flex-col items-center justify-center cursor-pointer transition-colors duration-150 text-center relative"
              >
                <input
                  type="file"
                  ref={degreeInputRef}
                  onChange={(e) => handleFileChange(e, setDegreeFile)}
                  accept=".pdf, image/jpeg, image/png, image/jpg"
                  className="hidden"
                />
                
                {degreeFile ? (
                  <div className="flex flex-col items-center">
                    <svg className="w-8 h-8 text-[#5476FC] mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-xs font-semibold text-[#5476FC] max-w-[280px] truncate">{degreeFile.name}</span>
                    <button
                      type="button"
                      onClick={(e) => handleRemoveFile(e, setDegreeFile, degreeInputRef)}
                      className="mt-2 text-[0.65rem] font-bold text-red-500 hover:text-red-700 transition-colors uppercase tracking-wider"
                    >
                      Remove File
                    </button>
                  </div>
                ) : (
                  <>
                    <svg className="w-8 h-8 text-[#5476FC] mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="text-xs font-semibold text-[#5476FC] hover:underline">Upload Certificate</span>
                    <span className="text-[0.64rem] text-slate-400 font-light mt-1">
                      Accepted Formats: PDF, JPEG, PNG | File Size Limit: Maximum file size: 5 MB
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* 2. Specialization Certificates */}
            <div>
              <div className="text-[0.68rem] text-gray-400 font-light mb-2 ml-1">Specialization Certificates*</div>
              <div
                onClick={() => specInputRef.current?.click()}
                className="border-2 border-dashed border-[#C5D3FF] bg-[#F4F7FF]/50 hover:bg-[#EBEEFF] rounded-2xl p-7 flex flex-col items-center justify-center cursor-pointer transition-colors duration-150 text-center relative"
              >
                <input
                  type="file"
                  ref={specInputRef}
                  onChange={(e) => handleFileChange(e, setSpecFile)}
                  accept=".pdf, image/jpeg, image/png, image/jpg"
                  className="hidden"
                />
                
                {specFile ? (
                  <div className="flex flex-col items-center">
                    <svg className="w-8 h-8 text-[#5476FC] mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-xs font-semibold text-[#5476FC] max-w-[280px] truncate">{specFile.name}</span>
                    <button
                      type="button"
                      onClick={(e) => handleRemoveFile(e, setSpecFile, specInputRef)}
                      className="mt-2 text-[0.65rem] font-bold text-red-500 hover:text-red-700 transition-colors uppercase tracking-wider"
                    >
                      Remove File
                    </button>
                  </div>
                ) : (
                  <>
                    <svg className="w-8 h-8 text-[#5476FC] mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="text-xs font-semibold text-[#5476FC] hover:underline">Upload Certificate</span>
                    <span className="text-[0.64rem] text-slate-400 font-light mt-1">
                      Accepted Formats: PDF, JPEG, PNG | File Size Limit: Maximum file size: 5 MB
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* 3. Additional Certifications */}
            <div>
              <div className="text-[0.68rem] text-gray-400 font-light mb-2 ml-1">Additional Certifications</div>
              <div
                onClick={() => addInputRef.current?.click()}
                className="border-2 border-dashed border-[#C5D3FF] bg-[#F4F7FF]/50 hover:bg-[#EBEEFF] rounded-2xl p-7 flex flex-col items-center justify-center cursor-pointer transition-colors duration-150 text-center relative"
              >
                <input
                  type="file"
                  ref={addInputRef}
                  onChange={(e) => handleFileChange(e, setAddFile)}
                  accept=".pdf, image/jpeg, image/png, image/jpg"
                  className="hidden"
                />
                
                {addFile ? (
                  <div className="flex flex-col items-center">
                    <svg className="w-8 h-8 text-[#5476FC] mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-xs font-semibold text-[#5476FC] max-w-[280px] truncate">{addFile.name}</span>
                    <button
                      type="button"
                      onClick={(e) => handleRemoveFile(e, setAddFile, addInputRef)}
                      className="mt-2 text-[0.65rem] font-bold text-red-500 hover:text-red-700 transition-colors uppercase tracking-wider"
                    >
                      Remove File
                    </button>
                  </div>
                ) : (
                  <>
                    <svg className="w-8 h-8 text-[#5476FC] mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="text-xs font-semibold text-[#5476FC] hover:underline">Upload Certificate</span>
                    <span className="text-[0.64rem] text-slate-400 font-light mt-1">
                      Accepted Formats: PDF, JPEG, PNG | File Size Limit: Maximum file size: 5 MB
                    </span>
                  </>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* BOTTOM ACTION BUTTONS ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 items-center">
          
          {/* Go Back button */}
          <button
            type="button"
            onClick={onGoBack}
            className="w-full bg-indigo-50 hover:bg-indigo-100 text-[#182A6F] rounded-[0.8rem] font-medium font-outfit text-sm py-4 flex items-center justify-center transition-colors duration-150 cursor-pointer outline-none text-center"
          >
            Go Back
          </button>

          {/* Continue button */}
          <DoctorLoginButton
            type="submit"
            label="Continue"
            className="w-full py-4 text-center justify-center flex"
          />

        </div>

      </form>
    </div>
  );
}
