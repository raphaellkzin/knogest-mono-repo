import React, { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// Definição dos tamanhos permitidos
type ModalSize = "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "full";

// Mapeamento de tamanhos para classes do Tailwind
const sizeClasses: Record<ModalSize, string> = {
  sm: "sm:max-w-sm", // ~384px
  md: "sm:max-w-md", // ~448px
  lg: "sm:max-w-lg", // ~512px
  xl: "sm:max-w-xl", // ~576px
  "2xl": "sm:max-w-2xl", // ~672px
  "3xl": "sm:max-w-3xl", // ~768px
  "4xl": "sm:max-w-4xl", // ~896px
  full: "sm:max-w-[95vw] h-[90vh]", // Quase tela cheia
};

interface BaseModalProps extends React.ComponentProps<typeof Dialog> {
  trigger?: React.ReactNode;

  title?: string | React.ReactNode;
  description?: string | React.ReactNode;

  footer?: React.ReactNode;

  size?: ModalSize;
  children: ReactNode;
  className?: string;
}

export function BaseModal({
  trigger,
  title,
  description,
  footer,
  children,
  size,
  className,
  ...props
}: BaseModalProps) {
  return (
    <Dialog {...props}>
      {trigger && <DialogTrigger>{trigger}</DialogTrigger>}

      <DialogContent
        className={cn(
          "flex max-h-[calc(100vh-2rem)] flex-col overflow-hidden",
          size ? sizeClasses[size] : undefined,
          className,
        )}
      >
        <DialogHeader>
          {title && <DialogTitle>{title}</DialogTitle>}
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="min-h-0 flex-1 py-2 overflow-y-auto">{children}</div>

        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}
