export const Badge = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex rounded-md bg-brand/10 px-2 pb-0.5 align-text-bottom text-xs font-semibold text-brand ring-1 ring-inset ring-brand/20">
    {children}
  </span>
);
