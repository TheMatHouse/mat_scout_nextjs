import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef(
  ({ className, type, autoComplete = "off", ...props }, ref) => {
    return (
      <input
        type={type}
        autoComplete={autoComplete}
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-md border border-ms-blue dark:border-ms-light-gray bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
