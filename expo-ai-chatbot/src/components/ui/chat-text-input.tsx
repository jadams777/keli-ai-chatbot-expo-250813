import * as React from "react";
import { TextInput } from "react-native";
import { cn } from "@/lib/utils";
import { Platform } from "react-native";
import { Slot } from "@radix-ui/react-slot";

const ChatTextInput = React.forwardRef<
  TextInput,
  React.ComponentPropsWithoutRef<typeof TextInput> & {
    asChild?: boolean;
    noFocus?: boolean;
    autoFocus?: boolean;
  }
>(
  (
    {
      className,
      placeholderClassName,
      asChild = false,
      noFocus = false,
      autoFocus = false,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : TextInput;

    return (
      <Comp
        ref={ref as any}
        className={cn(
          "native:h-20 native:text-lg native:leading-[1.25] h-20 rounded-md border border-input bg-background px-3 py-2 text-lg text-foreground file:border-0 file:bg-transparent file:font-medium placeholder:text-muted-foreground web:flex web:w-full lg:text-sm",
          "web:ring-offset-background web:focus-visible:outline-none web:focus-visible:ring-2 web:focus-visible:ring-ring web:focus-visible:ring-offset-2",
          noFocus && "web:focus-visible:ring-0 web:focus-visible:ring-offset-0",
          props.editable === false && "opacity-50 web:cursor-not-allowed",
          className,
        )}
        placeholderClassName={cn("text-muted-foreground", placeholderClassName)}
        {...(props as any)}
      />
    );
  },
);

ChatTextInput.displayName = "ChatTextInput";

export { ChatTextInput };
