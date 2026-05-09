import { cn } from "lib/utils";

export const Link = ({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className={cn(
        "text-brand underline underline-offset-2 hover:decoration-2",
        className
      )}
    >
      {children}
    </a>
  );
};
