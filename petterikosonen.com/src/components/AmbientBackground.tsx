export default function AmbientBackground() {
  return (
    <div aria-hidden="true" className="fixed inset-0 -z-20 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 terminal-grid opacity-[0.06]" />
      <div className="absolute -top-40 -left-24 h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,rgba(124,140,255,0.22),transparent_64%)]" />
      <div className="absolute top-[10%] -right-32 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.18),transparent_62%)]" />
      <div className="absolute bottom-[-24%] left-[35%] h-[32rem] w-[32rem] rounded-full bg-[radial-gradient(circle,rgba(57,255,136,0.12),transparent_68%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(5,7,10,0.12),rgba(5,7,10,0.78))]" />
    </div>
  );
}
