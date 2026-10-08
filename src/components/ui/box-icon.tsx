import * as React from "react";
import { cn } from "@/lib/utils";

export interface BoxIconProps extends React.HTMLAttributes<HTMLElement> {
  name: string;
  solid?: boolean;
  filled?: boolean;
  active?: boolean;
  className?: string;
}

const ONLY_BX_ICONS = new Set([
  "menu",
  "menu-alt-left",
  "menu-alt-right",
  "list-ol",
  "list-ul",
  "list-check",
  "list-plus",
  "list-minus",
  "barcode-reader",
  "filter",
  "qr",
  "qr-scan",
  "sync",
  "link-external",
  "loader",
  "loader-alt",
  "loader-circle",
  "history",
  "import",
  "export",
  "undo",
  "redo",
  "reset",
  "dots-horizontal",
  "dots-vertical",
  "dots-horizontal-rounded",
  "dots-vertical-rounded",
]);

const ONLY_BXS_ICONS = new Set([
  "magic-wand",
  "component",
  "dashboard",
  "offer",
  "discount",
  "badge-dollar",
  "camera-plus",
  "shopping-bag-alt",
  "shopping-bags",
]);

export function BoxIcon({
  name,
  solid,
  filled,
  active,
  className,
  ...props
}: BoxIconProps) {
  const isSolid = active ?? solid ?? filled ?? false;

  let explicitPrefix: "bx" | "bxs" | null = null;
  let cleanName = name;
  if (cleanName.startsWith("bxs-")) {
    cleanName = cleanName.slice(4);
    explicitPrefix = "bxs";
  } else if (cleanName.startsWith("bx-")) {
    cleanName = cleanName.slice(3);
    explicitPrefix = "bx";
  } else if (cleanName.startsWith("bxl-")) {
    return <i className={cn("bx", cleanName, className)} aria-hidden="true" {...props} />;
  }

  if (cleanName === "menu-left" || cleanName === "menu left") {
    cleanName = "menu-alt-left";
  }

  let prefix = isSolid ? "bxs" : "bx";
  if (explicitPrefix) {
    prefix = explicitPrefix;
  } else if (ONLY_BX_ICONS.has(cleanName)) {
    prefix = "bx";
  } else if (ONLY_BXS_ICONS.has(cleanName)) {
    prefix = "bxs";
  }

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
