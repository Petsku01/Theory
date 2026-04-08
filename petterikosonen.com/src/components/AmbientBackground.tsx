export default function AmbientBackground() {
  return (
    <div aria-hidden="true" className="fixed inset-0 -z-20 overflow-hidden pointer-events-none">
      {/* Grid pattern */}
      <div className="absolute inset-0 terminal-grid opacity-[0.04]" />

      {/* Noise texture */}
      <div className="absolute inset-0 noise-overlay opacity-60" />

      {/* Gradient orbs - richer and more layered */}
      <div className="absolute -top-40 -left-24 h-[40rem] w-[40rem] rounded-full bg-[radial-gradient(circle,rgba(124,140,255,0.18),transparent_55%)] blur-3xl" />
      <div className="absolute top-[8%] -right-40 h-[36rem] w-[36rem] rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.14),transparent_55%)] blur-3xl" />
      <div className="absolute top-[45%] -left-20 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.08),transparent_60%)] blur-3xl" />
      <div className="absolute bottom-[-15%] left-[30%] h-[36rem] w-[36rem] rounded-full bg-[radial-gradient(circle,rgba(57,255,136,0.08),transparent_60%)] blur-3xl" />
      <div className="absolute bottom-[10%] right-[10%] h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(circle,rgba(124,140,255,0.1),transparent_65%)] blur-3xl" />

      {/* Top and bottom gradient fade */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(5,7,10,0.2)_0%,transparent_30%,transparent_70%,rgba(5,7,10,0.8)_100%)]" />
    </div>
  );
}
