"use client";

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { BoxIcon } from "@/components/ui/box-icon"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <BoxIcon name="check-circle" solid className="text-base text-current" />
        ),
        info: (
          <BoxIcon name="info-circle" solid className="text-base text-current" />
        ),
        warning: (
          <BoxIcon name="error" solid className="text-base text-current" />
        ),
        error: (
          <BoxIcon name="x-circle" solid className="text-base text-current" />
        ),
        loading: (
          <BoxIcon name="loader-alt" className="text-base bx-spin text-current" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
