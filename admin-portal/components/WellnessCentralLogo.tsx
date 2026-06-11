// Shared Wellness Central Logo — matches the login page design exactly
export default function WellnessCentralLogo({ size = 32 }: { size?: number }) {
  const barH = Math.round(size * 0.75);
  const barW = Math.round(size * 0.125);
  const gap  = Math.round(size * 0.078);

  const DoubleBar = () => (
    <span
      className="inline-flex items-end mx-[1px]"
      style={{ gap: `${gap}px`, height: size + 2, transform: "translateY(2px)" }}
    >
      <span style={{ width: barW, height: barH }} className="rounded-full bg-[#3276D2] inline-block" />
      <span style={{ width: barW, height: barH }} className="rounded-full bg-[#3276D2] inline-block" />
    </span>
  );

  const SingleBar = () => (
    <span
      className="inline-flex items-end mx-[1px]"
      style={{ height: size + 2, transform: "translateY(2px)" }}
    >
      <span style={{ width: barW, height: barH }} className="rounded-full bg-[#3276D2] inline-block" />
    </span>
  );

  return (
    <div
      className="font-sans font-black text-slate-800 leading-[1.05] select-none tracking-tight"
      style={{ fontSize: size }}
    >
      <div>We<DoubleBar />ness</div>
      <div>Centr<SingleBar />al</div>
    </div>
  );
}
