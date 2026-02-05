export default function About() {
  return (
    <div>
      <section className="py-20">
        <h1 className="text-3xl font-medium text-white mb-4">About</h1>
        <p className="text-neutral-400">
          Engineering student specializing in data networks and cybersecurity.
        </p>
      </section>

      <section className="py-12 border-t border-neutral-900">
        <h2 className="text-lg font-medium text-white mb-6">Background</h2>
        <div className="text-neutral-500 text-sm leading-relaxed space-y-4">
          <p>
            Calm and open person, always willing to learn and work hard. Comfortable 
            working under pressure and find problem-solving both familiar and intriguing.
          </p>
          <p>
            Team player who values collaboration and enjoys contributing to a positive 
            environment. Currently studying Information and Communication Technology 
            with focus on Data Networks and Cybersecurity at Turku University of Applied Sciences.
          </p>
        </div>
      </section>

      <section className="py-12 border-t border-neutral-900">
        <h2 className="text-lg font-medium text-white mb-6">Microsoft Technologies</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <h3 className="text-neutral-400 mb-2">Identity & Access</h3>
            <ul className="text-neutral-500 space-y-1">
              <li>• Entra/Azure AD</li>
              <li>• MFA & Conditional Access</li>
              <li>• Active Directory (on-prem)</li>
            </ul>
          </div>
          <div>
            <h3 className="text-neutral-400 mb-2">Security</h3>
            <ul className="text-neutral-500 space-y-1">
              <li>• Defender EDR</li>
              <li>• Intune</li>
              <li>• Email quarantine</li>
            </ul>
          </div>
          <div>
            <h3 className="text-neutral-400 mb-2">Productivity</h3>
            <ul className="text-neutral-500 space-y-1">
              <li>• Office 365</li>
              <li>• Exchange Online</li>
              <li>• Teams / Skype for Business</li>
            </ul>
          </div>
          <div>
            <h3 className="text-neutral-400 mb-2">Other</h3>
            <ul className="text-neutral-500 space-y-1">
              <li>• PowerShell automation</li>
              <li>• Linux/Windows Servers</li>
              <li>• Python / SQL</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="py-12 border-t border-neutral-900">
        <h2 className="text-lg font-medium text-white mb-6">Languages</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-neutral-400">Finnish</span>
            <span className="text-neutral-600">Native</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">English</span>
            <span className="text-neutral-600">Good</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">Swedish</span>
            <span className="text-neutral-600">Written</span>
          </div>
        </div>
      </section>
    </div>
  );
}
