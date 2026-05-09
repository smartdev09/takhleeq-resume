import { Tooltip } from "components/Tooltip";
import { Button as UiButton } from "components/ui/button";
import { cn } from "lib/utils";

type ButtonProps = React.ComponentProps<typeof UiButton>;

type IconButtonProps = Omit<ButtonProps, "size"> & {
  size?: "small" | "medium";
  tooltipText: string;
};

export const IconButton = ({
  className,
  size = "medium",
  tooltipText,
  ...props
}: IconButtonProps) => (
  <Tooltip text={tooltipText}>
    <UiButton
      type="button"
      size="icon"
      variant="outline"
      className={cn(
        "rounded-full outline-none hover:bg-gray-100 focus-visible:bg-gray-100",
        size === "medium" ? "p-1.5" : "p-1",
        className
      )}
      {...props}
    />
  </Tooltip>
);
