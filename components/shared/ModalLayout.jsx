"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Card,
  CardHeader as CardHdr,
  CardContent,
  CardTitle,
  CardDescription as CardDesc,
} from "@/components/ui/card";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

export default function ModalLayout({
  isOpen,
  onClose,
  title,
  description,
  children,
  withCard = false,
}) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={onClose}
    >
      <DialogContent className="max-w-3xl w-full p-0 overflow-y-auto max-h-[90vh]">
        {/* Accessibility: Always include DialogHeader */}
        <DialogHeader className={withCard ? "sr-only" : ""}>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {withCard ? (
          <Card className="w-full shadow-md card-dark">
            <CardHdr>
              <CardTitle>{title}</CardTitle>
              {description && <CardDesc>{description}</CardDesc>}
            </CardHdr>
            <CardContent>{children}</CardContent>
          </Card>
        ) : (
          <div className="p-6">{children}</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
