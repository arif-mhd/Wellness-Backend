// Public, unauthenticated, SERVER-rendered page — see privacy-policy/page.tsx
// for why this must not be a client-fetched "use client" component.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function getBranding() {
  const orgSlug = process.env.NEXT_PUBLIC_ORG_SLUG;
  const url = orgSlug ? `${API_URL}/api/meta/branding?org=${encodeURIComponent(orgSlug)}` : `${API_URL}/api/meta/branding`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    const b = data.branding ?? {};
    return { name: b.name || "Wellness Central", supportEmail: b.supportEmail || null };
  } catch {
    return { name: "Wellness Central", supportEmail: null };
  }
}

export async function generateMetadata() {
  const { name } = await getBranding();
  return { title: `Account & Data Deletion – ${name}` };
}

export default async function DataDeletionPage() {
  const branding = await getBranding();
  const appName = branding.name;
  // See privacy-policy/page.tsx — a placeholder address does not belong on a
  // public page linked from app store listings.
  const contactEmail = branding.supportEmail || "arif@methuselahventures.ai";

  return (
    <div className="min-h-screen bg-[#F7F8FA] font-outfit">
      <header className="bg-white border-b border-[#EBEEF5]">
        <div className="max-w-3xl mx-auto px-6 py-5">
          <span className="text-[#24292E] text-[17px] font-medium tracking-[-0.34px]">{appName}</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 md:py-14">
        <div className="bg-white rounded-2xl border border-[#EBEEF5] shadow-sm px-6 py-8 md:px-12 md:py-12 text-[#676E76] text-[15px] leading-[1.75]">
          <h1 className="text-[#24292E] text-[28px] font-medium tracking-[-0.56px] mb-8">
            Account &amp; Data Deletion
          </h1>

        <p className="mb-6">
          This page explains how to request deletion of your {appName} account and associated data.
        </p>

        <h2 className="text-[#24292E] text-[18px] font-medium tracking-[-0.36px] mt-9 mb-3">Option 1 — Delete In-App</h2>
        <p className="mb-3">The fastest way to delete your account:</p>
        <ol className="list-decimal pl-5 mb-6 space-y-2 marker:text-[#9EA5AD]">
          <li>Open the {appName} app and go to the <span className="font-medium text-[#24292E]">Profile</span> tab.</li>
          <li>Tap <span className="font-medium text-[#24292E]">Settings</span>, then <span className="font-medium text-[#24292E]">Privacy &amp; Security → Privacy</span>.</li>
          <li>Under the <span className="font-medium text-[#24292E]">Legal</span> section, tap <span className="font-medium text-[#24292E]">Data Deletion Request</span>.</li>
          <li>Confirm by typing <span className="font-mono text-[13px] bg-[#F1F3F7] text-[#24292E] px-1.5 py-0.5 rounded">DELETE</span> when prompted.</li>
        </ol>

        <h2 className="text-[#24292E] text-[18px] font-medium tracking-[-0.36px] mt-9 mb-3">Option 2 — Request by Email</h2>
        <p className="mb-6">
          If you no longer have access to the app, email us at{" "}
          <a href={`mailto:${contactEmail}`} className="text-[#5476FC] font-medium hover:underline">{contactEmail}</a>{" "}
          from the email address associated with your account, with the subject line "Account Deletion Request".
          We will verify your identity and process the request within 30 days.
        </p>

        <h2 className="text-[#24292E] text-[18px] font-medium tracking-[-0.36px] mt-9 mb-3">What Gets Deleted</h2>
        <ul className="list-disc pl-5 mb-6 space-y-2 marker:text-[#C4C9CF]">
          <li>Your login credentials and ability to sign in — deleted immediately and permanently.</li>
          <li>Your account is marked as deleted and is no longer accessible to you or visible to doctors/clinics through the app.</li>
        </ul>

        <h2 className="text-[#24292E] text-[18px] font-medium tracking-[-0.36px] mt-9 mb-3">What Is Retained, and Why</h2>
        <p className="mb-3">
          Some information is retained after account deletion rather than immediately and permanently
          erased, specifically:
        </p>
        <ul className="list-disc pl-5 mb-6 space-y-2 marker:text-[#C4C9CF]">
          <li>Your profile and health records are retained in our systems, marked as deleted, for a limited period — this supports continuity of care if you re-register, and compliance with medical record-keeping and financial/tax record obligations that apply to healthcare and payment data.</li>
          <li>Records required for legal, regulatory, tax, or dispute-resolution purposes are retained for as long as applicable law requires.</li>
        </ul>
        <p className="mb-6">
          If you would like more detail on what specifically is retained for your account, or want to
          request full erasure once any legally-required retention period has passed, contact us at{" "}
          <a href={`mailto:${contactEmail}`} className="text-[#5476FC] font-medium hover:underline">{contactEmail}</a>.
        </p>
        </div>

        <p className="text-center text-[13px] text-[#9EA5AD] mt-8">
          © {new Date().getFullYear()} {appName}
        </p>
      </main>
    </div>
  );
}
