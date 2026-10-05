import Link from "next/link";

// Public, unauthenticated, SERVER-rendered page — see privacy-policy/page.tsx
// for why this must not be a client-fetched "use client" component.
//
// Linked as the Support URL on the App Store and Play Store listings. Apple
// checks that the URL resolves and offers a real way to get help; pointing a
// store listing at the privacy policy instead is a routine rejection.

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
  return { title: `Support – ${name}` };
}

export default async function SupportPage() {
  const branding = await getBranding();
  const appName = branding.name;
  const contactEmail = branding.supportEmail || "arif@methuselahventures.ai";

  const faqs: { q: string; a: React.ReactNode }[] = [
    {
      q: "I can't sign in to my account",
      a: (
        <>
          Check that you are using the same email address or phone number you registered with. If you
          signed up with Google or Apple, use that same button rather than a password. Still stuck?
          Email us and we will restore access.
        </>
      ),
    },
    {
      q: "No doctors are showing as available",
      a: (
        <>
          Doctors appear when they are online and have open slots. If the list is empty, try again
          shortly or browse by clinic instead — you can book a future slot even when nobody is online
          right now.
        </>
      ),
    },
    {
      q: "My video consultation won't connect",
      a: (
        <>
          Allow {appName} access to your microphone and camera when prompted, and make sure you are on
          a stable connection. If the call drops, reopen the appointment from the Appointments tab and
          rejoin — your slot stays open for its full duration.
        </>
      ),
    },
    {
      q: "Where are my prescriptions and test results?",
      a: (
        <>
          Open the <span className="font-medium text-[#24292E]">Profile</span> tab and choose{" "}
          <span className="font-medium text-[#24292E]">My Records</span>. Everything from past
          consultations is stored there, searchable by doctor or reason.
        </>
      ),
    },
    {
      q: "A pharmacy or lab order needs changing",
      a: (
        <>
          Orders can be tracked from the Orders section of your profile. To cancel or amend one that is
          already being prepared, email us with your order reference and we will contact the pharmacy or
          lab on your behalf.
        </>
      ),
    },
    {
      q: "I was charged incorrectly",
      a: (
        <>
          Email us from the address on your account with the appointment or order reference. Refunds for
          cancelled consultations are returned to the original payment method.
        </>
      ),
    },
    {
      q: "How do I delete my account?",
      a: (
        <>
          You can do it yourself from inside the app, or by email. Our{" "}
          <Link href="/data-deletion" className="text-[#5476FC] font-medium hover:underline">
            Account &amp; Data Deletion
          </Link>{" "}
          page explains both routes, and exactly what is erased versus retained.
        </>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#F7F8FA] font-outfit">
      <header className="bg-white border-b border-[#EBEEF5]">
        <div className="max-w-3xl mx-auto px-6 py-5">
          <span className="text-[#24292E] text-[17px] font-medium tracking-[-0.34px]">{appName}</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 md:py-14">
        <div className="bg-white rounded-2xl border border-[#EBEEF5] shadow-sm px-6 py-8 md:px-12 md:py-12 text-[#676E76] text-[15px] leading-[1.75]">
          <h1 className="text-[#24292E] text-[28px] font-medium tracking-[-0.56px] mb-8">Support</h1>

          <p className="mb-6">
            Need help with {appName}? Email us and a person will reply — we aim to respond within one
            business day.
          </p>

          <div className="rounded-xl border border-[#EBEEF5] bg-[#F7F8FA] px-5 py-4 mb-10">
            <p className="text-[13px] text-[#9EA5AD] mb-1">Contact us</p>
            <a
              href={`mailto:${contactEmail}`}
              className="text-[#5476FC] text-[17px] font-medium hover:underline"
            >
              {contactEmail}
            </a>
            <p className="text-[13px] mt-2">
              Please include your registered email address and, where relevant, the appointment or order
              reference — it lets us find your account without a round of questions.
            </p>
          </div>

          <h2 className="text-[#24292E] text-[18px] font-medium tracking-[-0.36px] mb-5">
            Common questions
          </h2>

          <div className="space-y-6">
            {faqs.map(({ q, a }) => (
              <div key={q}>
                <h3 className="text-[#24292E] text-[15px] font-medium mb-1.5">{q}</h3>
                <p>{a}</p>
              </div>
            ))}
          </div>

          <h2 className="text-[#24292E] text-[18px] font-medium tracking-[-0.36px] mt-10 mb-3">
            Medical emergencies
          </h2>
          <p className="mb-6">
            {appName} is not an emergency service and is not monitored around the clock. If you are
            experiencing a medical emergency, contact your local emergency services immediately.
          </p>

          <h2 className="text-[#24292E] text-[18px] font-medium tracking-[-0.36px] mt-9 mb-3">
            Privacy and your data
          </h2>
          <p>
            Our{" "}
            <Link href="/privacy-policy" className="text-[#5476FC] font-medium hover:underline">
              Privacy Policy
            </Link>{" "}
            explains what we collect and how it is used. To remove your information, see{" "}
            <Link href="/data-deletion" className="text-[#5476FC] font-medium hover:underline">
              Account &amp; Data Deletion
            </Link>
            .
          </p>
        </div>

        <p className="text-center text-[13px] text-[#9EA5AD] mt-8">
          © {new Date().getFullYear()} {appName}
        </p>
      </main>
    </div>
  );
}
