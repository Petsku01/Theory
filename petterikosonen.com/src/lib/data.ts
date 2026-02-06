export interface BlogPost {
  title: string;
  date: string;
  desc: string;
  link: string;
}

export interface Project {
  name: string;
  desc: string;
  tech: string;
  link: string;
}

export const blogPosts: BlogPost[] = [
  { 
    title: "Polymorphic Malware Detection", 
    date: "2024-12-01", 
    desc: "Exploring detection techniques for polymorphic malware", 
    link: "https://github.com/Petsku01/Theory/blob/main/malware_detection_polymorph_demo.py" 
  },
  { 
    title: "Honeypot Implementation", 
    date: "2024-11-15", 
    desc: "Building a meta honeypot for security research", 
    link: "https://github.com/Petsku01/Theory/tree/main/Hpots" 
  },
  { 
    title: "VDI Performance Analysis", 
    date: "2024-10-20", 
    desc: "Diagnosing and troubleshooting VDI environments", 
    link: "https://github.com/Petsku01/Theory/tree/main/VDI%20Performance%20Diagnostic" 
  },
  { 
    title: "MFA Implementation Patterns", 
    date: "2024-09-10", 
    desc: "Different approaches to multi-factor authentication", 
    link: "https://github.com/Petsku01/Theory/tree/main/MFA_Theory" 
  },
  { 
    title: "Compression Algorithms in Rust", 
    date: "2024-08-05", 
    desc: "Testing and comparing compression techniques", 
    link: "https://github.com/Petsku01/Theory/tree/main/Compression_tests" 
  },
  { 
    title: "Network Security Analysis", 
    date: "2024-07-01", 
    desc: "Tools and techniques for network security", 
    link: "https://github.com/Petsku01/Theory/tree/main/Analyses" 
  },
];

export const projects: Project[] = [
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
