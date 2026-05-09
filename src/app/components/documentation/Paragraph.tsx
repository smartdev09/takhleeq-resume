import { cn } from "lib/utils";

export const Paragraph = ({
  smallMarginTop = false,
  children,
  className = "",
}: {
  smallMarginTop?: boolean;
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <p
      className={cn(
        smallMarginTop ? "mt-[0.8em]" : "mt-[1.5em]",
        "text-base leading-7 text-gray-700",
        className
      )}
    >
      {children}
    </p>
  );
};
