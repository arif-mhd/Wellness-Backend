"use client";

import { useState } from "react";

type EmailFreq = "instant" | "hourly" | "never";

const APP_TOGGLES = [
  { key: "appointments", label: "Appointment Updates",     defaultOn: false },
  { key: "messages",     label: "New Messages",            defaultOn: true },
  { key: "reminders",    label: "Reminders and Follow-ups",defaultOn: true },
  { key: "system",       label: "System Announcements",    defaultOn: true },
];

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative w-[33px] h-[17px] rounded-full shrink-0 transition-colors ${on ? "bg-[#1FAF65]" : "bg-[#D1D5EB]"}`}
    >
      <span
        className={`absolute top-[1.5px] w-[14px] h-[14px] rounded-full bg-white shadow transition-all ${on ? "right-[1.5px]" : "left-[1.5px]"}`}
      />
    </button>
  );
}

function RadioCircle({ selected }: { selected: boolean }) {
  return (
    <span className={`w-5 h-5 rounded-full border-[3px] flex items-center justify-center shrink-0 ${selected ? "border-[#5476FC]" : "border-[#D1D5EB]"}`}>
      {selected && <span className="w-2.5 h-2.5 rounded-full bg-[#5476FC]" />}
    </span>
  );
}

export default function NotificationsPage() {
  const [emailFreq, setEmailFreq] = useState<EmailFreq>("instant");
  const [appToggles, setAppToggles] = useState<Record<string, boolean>>(
    Object.fromEntries(APP_TOGGLES.map((t) => [t.key, t.defaultOn]))
  );

  const EMAIL_OPTIONS: { value: EmailFreq; label: string }[] = [
    { value: "instant", label: "Instant (Receive notifications as soon as updates happen.)" },
    { value: "hourly",  label: "Once Every Hour (Get a summary of notifications every hour.)" },
    { value: "never",   label: "Never (Opt-out of receiving email notifications.)" },
  ];

  return (
    <>
      <h2 className="text-[#24292E] text-base font-medium tracking-tight">Notifications</h2>

      <div className="flex flex-col gap-6">
        {/* Email Notifications Card */}
        <div className="bg-white rounded-xl p-6 flex flex-col gap-5">
          <span className="text-[#24292E] text-xs font-normal">Email Notifications Preferences</span>
          <p className="text-[#676E76] text-xs leading-relaxed">
            Choose how often you&apos;d like to receive email notifications for your account updates, appointments, and important alerts. Stay informed based on your preferences.
          </p>
          <p className="text-[#676E76] text-xs font-medium">Send me notifications:</p>
          <div className="flex flex-col gap-3">
            {EMAIL_OPTIONS.map(({ value, label }) => (
              <label key={value} className="flex items-center gap-3 cursor-pointer">
                <RadioCircle selected={emailFreq === value} />
                <span
                  className="text-[#24292E] text-xs"
                  onClick={() => setEmailFreq(value)}
                >
                  {label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* App Notifications Card */}
        <div className="bg-white rounded-xl p-6 flex flex-col gap-5">
          <span className="text-[#24292E] text-xs font-normal">App Notifications Preferences</span>
          <p className="text-xs leading-relaxed">
            <span className="text-[#676E76]">Select which types of notifications you&apos;d like to receive in-app. </span>
            <span className="text-[#383F45] font-medium">Please note that some critical notifications, like appointment reminders, cannot be disabled.</span>
          </p>
          <p className="text-[#676E76] text-xs font-medium">Send me notifications</p>
          <div className="flex flex-col gap-4">
            {APP_TOGGLES.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-3">
                <Toggle
                  on={appToggles[key]}
                  onChange={() => setAppToggles((prev) => ({ ...prev, [key]: !prev[key] }))}
                />
                <span className="text-[#24292E] text-xs">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-4">
        <button className="flex-1 py-3.5 rounded-xl bg-[#E0E7FF] text-[#383F45] text-base font-medium">
          Cancel
        </button>
        <button className="flex-1 py-3.5 rounded-xl bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-base font-medium">
          Save Changes
        </button>
      </div>
    </>
  );
}
