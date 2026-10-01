import * as React from "react";
import { cn } from "@/lib/utils";

export interface BoxIconProps extends React.HTMLAttributes<HTMLElement> {
  name: string;
  solid?: boolean;
  filled?: boolean;
  active?: boolean;
  className?: string;
}

export function BoxIcon({
  name,
  solid,
  filled,
  active,
  className,
  ...props
}: BoxIconProps) {
  const isSolid = active ?? solid ?? filled ?? false;

  let cleanName = name;
  if (cleanName.startsWith("bxs-")) {
    cleanName = cleanName.slice(4);
  } else if (cleanName.startsWith("bx-")) {
    cleanName = cleanName.slice(3);
  } else if (cleanName.startsWith("bxl-")) {
    return <i className={cn("bx", cleanName, className)} aria-hidden="true" {...props} />;
  }

  if (cleanName === "menu-left" || cleanName === "menu left") {
    cleanName = "menu-alt-left";
  }

  const prefix = isSolid ? "bxs" : "bx";

  return (
    <i
      className={cn(
        "bx leading-none shrink-0 inline-flex items-center justify-center",
        `${prefix}-${cleanName}`,
        className
      )}
      aria-hidden="true"
      {...props}
    />
  );
}

export type BoxIconComponent = React.ComponentType<{
  className?: string;
  active?: boolean;
  solid?: boolean;
  filled?: boolean;
} & React.HTMLAttributes<HTMLElement>>;

export function createBoxIcon(
  regularName: string,
  solidName?: string
): BoxIconComponent {
  return function IconWrapper({
    active,
    solid,
    filled,
    className,
    ...props
  }) {
    const isSolid = active ?? solid ?? filled ?? false;
    const iconName = isSolid ? (solidName || regularName) : regularName;
    return (
      <BoxIcon
        name={iconName}
        solid={isSolid}
        className={className}
        {...props}
      />
    );
  };
}
