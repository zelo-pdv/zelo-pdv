"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"

interface DialogContextValue {
  blur?: boolean
}

const DialogContext = React.createContext<DialogContextValue>({ blur: false })

function Dialog({
  blur = false,
  isForm = false,
  ...props
}: DialogPrimitive.Root.Props & { blur?: boolean; isForm?: boolean }) {
  const shouldBlur = blur || isForm
  return (
    <DialogContext.Provider value={{ blur: shouldBlur }}>
      <DialogPrimitive.Root data-slot="dialog" {...props} />
    </DialogContext.Provider>
  )
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  blur: blurProp,
  isForm: isFormProp,
  ...props
}: DialogPrimitive.Backdrop.Props & { blur?: boolean; isForm?: boolean }) {
  const context = React.useContext(DialogContext)
  const isBlurActive = blurProp ?? isFormProp ?? context.blur ?? false

  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      data-blur={isBlurActive ? "" : undefined}
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/40 duration-200 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        isBlurActive && "supports-backdrop-filter:backdrop-blur-sm",
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  initialFocus = false,
  blur,
  isForm,
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean
  blur?: boolean
  isForm?: boolean
}) {
  const context = React.useContext(DialogContext)
  const isBlurActive = blur ?? isForm ?? context.blur ?? false

  return (
    <DialogPortal>
      <DialogOverlay blur={blur} isForm={isForm} />
      <DialogPrimitive.Popup
        initialFocus={initialFocus}
        data-slot="dialog-content"
        data-blur={isBlurActive ? "" : undefined}
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-popover p-4 text-sm text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-2 right-2"
                size="icon-sm"
              />
            }
          >
            <XIcon
            />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline" />}>
          Close
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "font-heading text-base leading-none font-medium",
        className
      )}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
