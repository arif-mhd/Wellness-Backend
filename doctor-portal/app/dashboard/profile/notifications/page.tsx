"use client";

import { useState } from "react";

type EmailFreq = "instant" | "hourly" | "never";

const APP_TOGGLES = [
  { key: "appointments", label: "Appointment Updates",     defaultOn: true },
  { key: "messages",     label: "New Messages",            defaultOn: true },
  { key: "reminders",    label: "Reminders and Follow-ups",defaultOn: true },
  { key: "system",       label: "System Announcements",    defaultOn: true },
];

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative w-[36px] h-[20px] rounded-full shrink-0 transition-all duration-200 outline-none ${on ? "bg-[#1FAF65]" : "bg-[#D1D5EB]"}`}
    >
      <span
        className={`absolute top-[2px] w-[16px] h-[16px] rounded-full bg-white shadow-sm transition-all duration-200 ${on ? "left-[18px]" : "left-[2px]"}`}
      />
    </button>
  );
}

function RadioCircle({ selected }: { selected: boolean }) {
  return (
    <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${selected ? "border-[#5476FC] bg-white" : "border-[#D1D5EB] bg-white"}`}>
      {selected && <span className="w-2.5 h-2.5 rounded-full bg-[#5476FC]" />}
    </span>
  );
}

export default function NotificationsPage() {
  const [emailFreq, setEmailFreq] = useState<EmailFreq>("instant");
  const [appToggles, setAppToggles] = useState<Record<string, boolean>>(
    Object.fromEntries(APP_TOGGLES.map((t) => [t.key, t.defaultOn]))
  );

  const EMAIL_OPTIONS = [
    { 
      value: "instant" as const, 
      bold: "Instant ", 
      desc: "(Receive notifications as soon as updates happen.)" 
    },
    { 
      value: "hourly" as const, 
      bold: "Once Every Hour ", 
      desc: "(Get a summary of notifications every hour.)" 
    },
    { 
      value: "never" as const, 
      bold: "Never ", 
      desc: "(Opt-out of receiving email notifications.)" 
    },
  ];

  return (
    <>
      <h1 className="text-[#383F45] text-[32px] font-normal leading-none tracking-[-0.64px] select-none mb-2 font-outfit">
        Notifications
      </h1>

      <div className="flex flex-col gap-6 font-outfit select-none">
        {/* Email Notifications Card */}
        <div className="bg-white rounded-xl p-6 flex flex-col gap-5 border border-white">
          <h3 className="text-[#24292E] text-[16px] font-medium tracking-[-0.32px]">
            Email Notifications Preferences
          </h3>
          <p className="text-[#676E76] text-[13px] leading-[1.6] font-normal">
            Choose how often you&apos;d like to receive email notifications for your account updates, appointments, and important alerts. Stay informed based on your preferences.
          </p>
          <p className="text-[#676E76] text-[12px] font-medium tracking-[-0.24px] mt-1">
            Send me notifications:
          </p>
          <div className="flex flex-col gap-4">
            {EMAIL_OPTIONS.map(({ value, bold, desc }) => (
              <label 
                key={value} 
                className="flex items-center gap-3 cursor-pointer group"
                onClick={() => setEmailFreq(value)}
              >
                <RadioCircle selected={emailFreq === value} />
                <div className="text-[13px] leading-none">
                  <span className="text-[#24292E] font-medium">{bold}</span>
                  <span className="text-[#676E76] font-normal">{desc}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* App Notifications Card */}
        <div className="bg-white rounded-xl p-6 flex flex-col gap-5 border border-white">
          <h3 className="text-[#24292E] text-[16px] font-medium tracking-[-0.32px]">
            App Notifications Preferences
          </h3>
          <p className="text-[13px] leading-[1.6] font-normal">
            <span className="text-[#676E76]">Select which types of notifications you&apos;d like to receive in-app. </span>
            <span className="text-[#24292E] font-medium">
              Please note that some critical notifications, like appointment reminders, cannot be disabled.
            </span>
          </p>
          <p className="text-[#676E76] text-[12px] font-medium tracking-[-0.24px] mt-1">
            Send me notifications
          </p>
          <div className="flex flex-col gap-4">
            {APP_TOGGLES.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-3">
                <Toggle
                  on={appToggles[key]}
                  onChange={() => setAppToggles((prev) => ({ ...prev, [key]: !prev[key] }))}
                />
                <span className="text-[#24292E] text-[13px] font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-6 mt-2 w-full">
          <button 
            type="button"
            className="flex-1 py-3.5 rounded-[12px] bg-[#E8EEFF] hover:bg-[#DBE5FF] text-[#182A6F] text-[14px] font-medium tracking-tight transition-all duration-200"
          >
            Cancel
          </button>
          <button 
            type="button"
            className="flex-1 py-3.5 rounded-[12px] bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] hover:shadow-md text-white text-[14px] font-medium tracking-tight transition-all duration-200"
          >
            Save Changes
          </button>
        </div>
      </div>
    </>
  );
}
