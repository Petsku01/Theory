import NeuralCortex from "@/components/NeuralCortex";
import ContactConsole from "@/components/ContactConsole";

export const metadata = {
  title: "Petteri Kosonen -- Security Engineer + AI Researcher",
  description:
    "Building tools that make AI safer. LLM fine-tuning, prompt security, and trustworthy automation.",
};

export default function Home() {
  return (
    <>
      <NeuralCortex />
      <div className="mx-auto max-w-3xl px-4 pb-12">
        <ContactConsole />
      </div>
    </>
  );
}