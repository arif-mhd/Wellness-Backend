// Shows the doctor which language the patient speaks and which language they
// asked to be consulted in, so they know before the call starts. Renders
// nothing when the patient has set neither.
export default function LanguageChips({
  spoken,
  preferred,
  className = "",
}: {
  spoken?: string | null;
  preferred?: string | null;
  className?: string;
}) {
  if (!spoken && !preferred) return null;
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {preferred && (
        <span className="px-2 py-0.5 rounded-full bg-[#E8F5EC] text-[#179353] text-[11px] font-medium leading-none py-1" title="Language the patient asked to be consulted in">
          Consult in: {preferred}
        </span>
      )}
      {spoken && (
        <span className="px-2 py-0.5 rounded-full bg-[#EEF2FF] text-[#5476FC] text-[11px] font-medium leading-none py-1" title="Language the patient speaks">
          Speaks: {spoken}
        </span>
      )}
    </div>
  );
}
