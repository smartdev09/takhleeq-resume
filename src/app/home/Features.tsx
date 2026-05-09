import { Sparkles, ShieldCheck, Lock, Globe2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "components/ui/card";

const FEATURES = [
  {
    icon: Sparkles,
    title: "AI-Powered Improvements",
    text: "One click to improve your ATS score, rewrite bullet points, and tailor your resume to any job description. Powered by Gemini, Groq, OpenAI, or your own local AI.",
  },
  {
    icon: ShieldCheck,
    title: "ATS-Safe by Default",
    text: "Every template is tested against top ATS platforms like Greenhouse and Lever. Avoid the common formatting pitfalls that silently get resumes rejected.",
  },
  {
    icon: Lock,
    title: "Privacy First",
    text: "Your data lives in your browser. No accounts, no databases, no data sold. Takhleeq believes your resume is yours — and only yours.",
  },
  {
    icon: Globe2,
    title: "Global Job Market",
    text: "Built for job seekers worldwide — from Karachi to San Francisco. Pakistan-friendly date formats, country field, and local resume samples included.",
  },
];

export const Features = () => {
  return (
    <section className="py-12 lg:py-24">
      <div className="mx-auto lg:max-w-4xl">
        <dl className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <Card key={title} className="overflow-hidden bg-[#f7f9f8]">
              <CardHeader>
                <dt className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[color:var(--theme-primary)]/10">
                    <Icon
                      className="h-5 w-5 text-[color:var(--theme-primary)]"
                      strokeWidth={1.75}
                    />
                  </div>
                  <CardTitle className="text-xl">{title}</CardTitle>
                </dt>
              </CardHeader>
              <CardContent>
                <dd className="text-gray-700">{text}</dd>
              </CardContent>
            </Card>
          ))}
        </dl>
      </div>
    </section>
  );
};
