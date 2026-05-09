import { cn } from "lib/utils";

/**
 * ExpanderWithHeightTransition is a div wrapper with built-in CSS grid transition
 * for smooth height animation.
 *
 * Based on: https://css-tricks.com/css-grid-can-do-auto-height-transitions/
 */
export const ExpanderWithHeightTransition = ({
  expanded,
  children,
}: {
  expanded: boolean;
  children: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "grid overflow-hidden transition-all duration-300",
        expanded ? "visible" : "invisible"
      )}
      style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
    >
      <div className="min-h-0">{children}</div>
    </div>
  );
};
