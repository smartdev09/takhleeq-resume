const STEPS = [
  {
    title: "Import or start fresh",
    text: "Upload your existing PDF or start from a professionally designed template",
  },
  {
    title: "Edit with live preview",
    text: "Fill in your details with a real-time PDF preview updating as you type",
  },
  {
    title: "Improve with AI",
    text: "One click to boost your ATS score and tailor your resume to any job description",
  },
  {
    title: "Download your PDF",
    text: "Star the GitHub repo and download your polished, ATS-ready resume instantly",
  },
];

export const Steps = () => {
  return (
    <section className="mx-auto mt-8 rounded-2xl border border-gray-200 bg-white px-5 pb-10 pt-8 shadow-sm lg:mt-2 lg:px-8">
      <h2 className="text-center text-3xl font-bold">4 Simple Steps</h2>
      <div className="mt-8 flex justify-center">
        <dl className="grid w-full max-w-5xl grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-4">
          {STEPS.map(({ title, text }, idx) => (
            <div
              className="rounded-xl border border-gray-200 bg-[#f7f9f8] px-5 py-4"
              key={idx}
            >
              <dt className="text-lg font-bold text-gray-900">
                <div className="mb-3 inline-flex h-8 w-8 select-none items-center justify-center rounded-full bg-[color:var(--theme-primary)] text-sm font-semibold text-white">
                  {idx + 1}
                </div>
                <div>{title}</div>
              </dt>
              <dd className="mt-1 text-gray-600">{text}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
};
