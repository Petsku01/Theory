import ContactConsole from "@/components/ContactConsole";

export const metadata = {
  title: "Contact",
  description: "Get in touch with Petteri Kosonen for cybersecurity, AI safety, and IT support collaboration.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <ContactConsole />
    </div>
  );
}