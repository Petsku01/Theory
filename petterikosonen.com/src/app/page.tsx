export default function Home() {
  return (
    <div>
      <section className="py-20">
        <h1 className="text-3xl font-medium text-white mb-2">
          Petteri Kosonen
        </h1>
        <p className="text-neutral-400 mb-6">
          B.Eng. Student — Information and Communication Technology
        </p>
        <p className="text-neutral-500 text-sm leading-relaxed max-w-xl">
          Calm and open person, always willing to learn and work hard. 
          Comfortable working under pressure with strong problem-solving skills. 
          Team player who values collaboration.
        </p>
      </section>

      <section className="py-12 border-t border-neutral-900">
        <h2 className="text-lg font-medium text-white mb-8">Experience</h2>
        
        <div className="space-y-8">
          <div>
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-white">2M-IT — Security Trainee</h3>
              <span className="text-neutral-600 text-sm">Mar 2024 – Sep 2024</span>
            </div>
            <ul className="text-sm text-neutral-500 space-y-1">
              <li>• Maintaining and studying information security standards</li>
              <li>• Investigating security alerts and requests</li>
              <li>• Testing new Microsoft security products</li>
            </ul>
          </div>

          <div>
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-white">2M-IT — IT Support Specialist</h3>
              <span className="text-neutral-600 text-sm">Nov 2022 – Present</span>
            </div>
            <ul className="text-sm text-neutral-500 space-y-1">
              <li>• Resolving technical issues, cloud management</li>
              <li>• Healthcare application support</li>
              <li>• Pattern recognition and reporting</li>
            </ul>
          </div>

          <div>
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-white">theFirma — IT Support Intern</h3>
              <span className="text-neutral-600 text-sm">Jan 2018 – Jun 2019</span>
            </div>
            <ul className="text-sm text-neutral-500 space-y-1">
              <li>• Assisting clients with technical needs</li>
              <li>• Device and software troubleshooting</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="py-12 border-t border-neutral-900">
        <h2 className="text-lg font-medium text-white mb-8">Education</h2>
        
        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-start mb-1">
              <h3 className="text-white">Turku University of Applied Sciences</h3>
              <span className="text-neutral-600 text-sm">2020 – Present</span>
            </div>
            <p className="text-sm text-neutral-500">B.Eng. Information and Communication Technology — Data Networks and Cybersecurity</p>
          </div>

          <div>
            <div className="flex justify-between items-start mb-1">
              <h3 className="text-white">Turku Vocational Institute</h3>
              <span className="text-neutral-600 text-sm">2017 – 2019</span>
            </div>
            <p className="text-sm text-neutral-500">IT Technician, IT Support</p>
          </div>
        </div>
      </section>

      <section className="py-12 border-t border-neutral-900">
        <h2 className="text-lg font-medium text-white mb-8">Skills</h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="text-neutral-400 text-sm mb-2">Microsoft</h3>
            <div className="flex flex-wrap gap-2">
              {["Entra/Azure AD", "Intune", "Defender EDR", "Exchange Online", "Active Directory", "Office 365"].map((s) => (
                <span key={s} className="px-2 py-1 bg-neutral-900 text-neutral-400 text-xs rounded">{s}</span>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="text-neutral-400 text-sm mb-2">Security & Tools</h3>
            <div className="flex flex-wrap gap-2">
              {["F-Secure Policy Manager", "PowerShell", "Linux/Windows Servers", "ServiceNow", "SCCM", "Python", "SQL"].map((s) => (
                <span key={s} className="px-2 py-1 bg-neutral-900 text-neutral-400 text-xs rounded">{s}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 border-t border-neutral-900">
        <h2 className="text-lg font-medium text-white mb-4">Contact</h2>
        <div className="space-y-2 text-sm">
          <a href="https://www.linkedin.com/in/petteri-kosonen-511907172/" className="text-neutral-400 hover:text-white block">
            LinkedIn →
          </a>
          <a href="https://tryhackme.com/p/Petsku" className="text-neutral-400 hover:text-white block">
            TryHackMe →
          </a>
        </div>
      </section>
    </div>
  );
}
