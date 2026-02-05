export default function Projects() {
  const projects = [
    { name: "VDI Performance Diagnostic", desc: "PowerShell tool for diagnosing VDI performance issues", tech: "PowerShell", link: "https://github.com/Petsku01/Theory/tree/main/VDI%20Performance%20Diagnostic" },
    { name: "Network Design Tool", desc: "Tool for network design and planning", tech: "Python", link: "https://github.com/Petsku01/Theory/tree/main/Network%20Design%20tool" },
    { name: "Honeypot System", desc: "Meta honeypot implementation for security research", tech: "Python", link: "https://github.com/Petsku01/Theory/tree/main/Hpots" },
    { name: "Backup System", desc: "GUI-based backup solution with Tkinter", tech: "Python", link: "https://github.com/Petsku01/Theory/tree/main/Backup_1.01" },
    { name: "Compression Tests", desc: "Compression algorithms and testing", tech: "Rust", link: "https://github.com/Petsku01/Theory/tree/main/Compression_tests" },
    { name: "MFA Theory", desc: "Multi-factor authentication implementations", tech: "JavaScript", link: "https://github.com/Petsku01/Theory/tree/main/MFA_Theory" },
    { name: "Pentesting Tools", desc: "Collection of penetration testing utilities", tech: "Various", link: "https://github.com/Petsku01/Theory/tree/main/Pentesting" },
    { name: "Hash Generator", desc: "Web-based hash generation tool", tech: "HTML/JavaScript", link: "https://github.com/Petsku01/Theory/blob/main/Hash_Generator.html" },
    { name: "Malware Detection Demo", desc: "Polymorphic malware detection demonstration", tech: "Python", link: "https://github.com/Petsku01/Theory/blob/main/malware_detection_polymorph_demo.py" },
    { name: "Lagswitch Detector", desc: "Tool for detecting suspected lagswitch behavior", tech: "Python", link: "https://github.com/Petsku01/Theory/blob/main/Flag_suspected_lagswitch.py" },
  ];

  return (
    <div>
      <section className="py-20">
        <h1 className="text-3xl font-medium text-white mb-4">Projects</h1>
        <p className="text-neutral-400">
          Open source projects from my <a href="https://github.com/Petsku01/Theory" className="text-neutral-300 hover:text-white">GitHub</a>.
        </p>
      </section>

      <section className="pb-20">
        <div className="space-y-6">
          {projects.map((p, i) => (
            <a key={i} href={p.link} target="_blank" rel="noopener noreferrer" className="block py-6 border-t border-neutral-900 hover:bg-neutral-900/30 -mx-4 px-4 transition-colors">
              <h3 className="text-white mb-2">{p.name}</h3>
              <p className="text-sm text-neutral-500 mb-2">{p.desc}</p>
              <p className="text-xs text-neutral-600">{p.tech}</p>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
