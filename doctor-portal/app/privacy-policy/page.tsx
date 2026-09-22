import Link from "next/link";

// Public, unauthenticated, SERVER-rendered page (deliberately not a client
// component like the rest of this portal's BrandingContext consumers) — the
// real policy text must be present in the initial HTML response, since
// Google's automated Play Console review may fetch this URL without
// executing JavaScript. A client-fetched "Loading…" shell would look empty
// to a non-JS crawler. Content still adapts per org (NEXT_PUBLIC_ORG_SLUG),
// same data source (/api/meta/branding) as BrandingContext, just resolved
// at request time on the server instead of after mount in the browser.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type FeatureKey =
  | "appointments" | "prescriptions" | "pharmacy" | "lab_booking" | "insurance"
  | "vaccination" | "fitness" | "menstrual" | "pregnancy" | "nutrition_ai"
  | "ai_chat" | "articles" | "sos";

const ALL_FEATURES: FeatureKey[] = [
  "appointments", "prescriptions", "pharmacy", "lab_booking", "insurance",
  "vaccination", "fitness", "menstrual", "pregnancy", "nutrition_ai",
  "ai_chat", "articles", "sos",
];

async function getBranding() {
  const orgSlug = process.env.NEXT_PUBLIC_ORG_SLUG;
  const url = orgSlug ? `${API_URL}/api/meta/branding?org=${encodeURIComponent(orgSlug)}` : `${API_URL}/api/meta/branding`;
  try {
    // no-store: this is a legal/compliance page — always reflect the org's
    // current name/email/features, never a stale cached build.
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    const b = data.branding ?? {};
    return {
      name: b.name || "Wellness Central",
      supportEmail: b.supportEmail || null,
      enabledFeatures: (Array.isArray(data.enabledFeatures) ? data.enabledFeatures : ALL_FEATURES) as FeatureKey[],
    };
  } catch {
    return { name: "Wellness Central", supportEmail: null, enabledFeatures: ALL_FEATURES };
  }
}

export async function generateMetadata() {
  const { name } = await getBranding();
  return { title: `Privacy Policy – ${name}` };
}

export default async function PrivacyPolicyPage() {
  const branding = await getBranding();
  const hasFeature = (key: FeatureKey) => branding.enabledFeatures.includes(key);

  const appName = branding.name;
  const contactEmail = branding.supportEmail || "support@example.com";
  const lastUpdated = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16 font-outfit text-slate-700 leading-relaxed">
        <h1 className="text-3xl font-marcellus text-slate-900 mb-2">{appName} Privacy Policy</h1>
        <p className="text-sm text-slate-400 mb-10">Last updated: {lastUpdated}</p>

        <p className="mb-6">
          This Privacy Policy explains how {appName} ("we", "us", "our") collects, uses, shares, and
          protects your information when you use our mobile application and related services (the
          "App"). By creating an account or using the App, you agree to the practices described here.
        </p>

        <h2 className="text-xl font-marcellus text-slate-900 mt-10 mb-3">Information We Collect</h2>
        <p className="mb-2">We collect the following categories of information:</p>
        <ul className="list-disc pl-6 mb-6 space-y-1.5">
          <li><span className="font-medium text-slate-800">Personal information</span> — your name, email address, phone number, date of birth, gender, and a government-issued identity document where required for account verification.</li>
          <li><span className="font-medium text-slate-800">Health information</span> — symptoms, medical history, prescriptions, consultation notes, and other information you share with a doctor through the App{hasFeature("ai_chat") ? ", including through our AI-assisted symptom-checker chat" : ""}.</li>
          <li><span className="font-medium text-slate-800">Location information</span> — delivery and appointment addresses you provide{hasFeature("pharmacy") ? " for medicine delivery" : ""}{hasFeature("lab_booking") ? " or lab sample collection" : ""}.</li>
          <li><span className="font-medium text-slate-800">Payment information</span> — details needed to process payments for consultations{hasFeature("pharmacy") ? ", medicines" : ""}{hasFeature("lab_booking") ? ", lab tests" : ""}, and other services, generally handled by our payment processor rather than stored directly by us.</li>
          <li><span className="font-medium text-slate-800">Device and usage information</span> — device identifiers, app version, and how you interact with the App, used to keep the service reliable and secure.</li>
        </ul>

        <h2 className="text-xl font-marcellus text-slate-900 mt-10 mb-3">How We Use Your Information</h2>
        <ul className="list-disc pl-6 mb-6 space-y-1.5">
          <li>To create and manage your account, and verify your identity.</li>
          <li>To connect you with doctors{hasFeature("pharmacy") ? ", pharmacies" : ""}{hasFeature("lab_booking") ? ", labs" : ""} and deliver the healthcare services you request.</li>
          <li>To process payments for services booked through the App.</li>
          <li>To send you appointment reminders, order updates, and important service notifications.</li>
          <li>To improve the App's features, reliability, and security.</li>
          <li>To comply with applicable healthcare, tax, and other legal requirements.</li>
        </ul>

        <h2 className="text-xl font-marcellus text-slate-900 mt-10 mb-3">How We Share Your Information</h2>
        <p className="mb-2">We share your information only as needed to provide our services:</p>
        <ul className="list-disc pl-6 mb-6 space-y-1.5">
          <li>With the doctor(s) you consult, so they can provide care.</li>
          {hasFeature("pharmacy") && <li>With pharmacies, to fulfill medicine orders you place.</li>}
          {hasFeature("lab_booking") && <li>With diagnostic labs, to fulfill test bookings you place.</li>}
          <li>With payment processors, to complete transactions securely.</li>
          <li>With service providers who help us operate the App (e.g. cloud hosting), under confidentiality obligations.</li>
          <li>When required by law, regulation, or a valid legal request.</li>
        </ul>
        <p className="mb-6">We do not sell your personal or health information to third parties.</p>

        <h2 className="text-xl font-marcellus text-slate-900 mt-10 mb-3">Data Security</h2>
        <p className="mb-6">
          All data sent between the App and our servers is encrypted in transit (HTTPS/TLS). We use
          reasonable administrative, technical, and physical safeguards to protect your information,
          though no method of transmission or storage is completely secure.
        </p>

        <h2 className="text-xl font-marcellus text-slate-900 mt-10 mb-3">Data Retention &amp; Deletion</h2>
        <p className="mb-6">
          We retain your information for as long as your account is active or as needed to provide
          services, comply with legal obligations, and resolve disputes. You can request deletion of
          your account and data at any time — see our{" "}
          <Link href="/data-deletion" className="text-[#5476FC] font-medium hover:underline">Data Deletion</Link>{" "}
          page for details on how, and exactly what is deleted versus retained.
        </p>

        <h2 className="text-xl font-marcellus text-slate-900 mt-10 mb-3">Your Rights</h2>
        <p className="mb-6">
          You may access, correct, or request deletion of your personal information at any time
          through the App's settings, or by contacting us at the email below.
        </p>

        <h2 className="text-xl font-marcellus text-slate-900 mt-10 mb-3">Children's Privacy</h2>
        <p className="mb-6">
          The App is not directed at children under 18. A parent or guardian may add a child as a
          family member/dependent profile under their own account to manage the child's care.
        </p>

        <h2 className="text-xl font-marcellus text-slate-900 mt-10 mb-3">Changes to This Policy</h2>
        <p className="mb-6">
          We may update this Privacy Policy from time to time. We will notify you of material changes
          through the App or by other reasonable means. Continued use of the App after a change
          constitutes acceptance of the updated policy.
        </p>

        <h2 className="text-xl font-marcellus text-slate-900 mt-10 mb-3">Contact Us</h2>
        <p className="mb-6">
          If you have questions about this Privacy Policy or how your information is handled, contact
          us at{" "}
          <a href={`mailto:${contactEmail}`} className="text-[#5476FC] font-medium hover:underline">{contactEmail}</a>.
        </p>
      </div>
    </div>
  );
}
