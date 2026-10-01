import { BoxIcon } from "@/components/ui/box-icon";
import { Button } from "@/components/ui/button";
import { ComponentProps } from "react";

interface LoadingButtonProps extends ComponentProps<typeof Button> {
  loading?: boolean;
}

export function LoadingButton({ loading, children, ...props }: LoadingButtonProps) {
  return (
    <Button disabled={loading || props.disabled} {...props}>
      {loading && <BoxIcon name="loader-alt" className="mr-2 text-base bx-spin text-current" />}
      {children}
    </Button>
  );
}
