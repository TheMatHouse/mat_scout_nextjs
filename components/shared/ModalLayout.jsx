// components/shared/ModalLayout.jsx
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

const ModalLayout = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  withCard = false,
}) => {
  const hasDescription = Boolean(
    description && String(description).trim().length
  );

  return (
    <Dialog
      open={isOpen}
      onOpenChange={onClose}
    >
      <DialogContent
        className="dialog-content-custom max-w-3xl w-full p-0 overflow-y-auto"
        // If there is no textual description, explicitly unset aria-describedby
        aria-describedby={hasDescription ? undefined : undefined}
      >
        {/* Always render header for semantics; hide visually when we use Card */}
        <DialogHeader className={withCard ? "sr-only" : ""}>
          <DialogTitle>{title}</DialogTitle>
          {hasDescription && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>

        {withCard ? (
          <Card className="card-dark w-full shadow-md">
            <CardHdr>
              <CardTitle>{title}</CardTitle>
              {hasDescription && <CardDesc>{description}</CardDesc>}
            </CardHdr>
            <CardContent>{children}</CardContent>
          </Card>
        ) : (
          <div className="bg-[var(--color-card)] text-[var(--color-text)] rounded-lg shadow-lg p-6 max-w-3xl mx-auto">
            {children}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ModalLayout;
