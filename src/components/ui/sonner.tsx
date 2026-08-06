import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * App-styled toasts: paper card, ink text, serif-ish title, and a thin
 * left accent bar per tone instead of loud red/green fills.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      position="top-center"
      toastOptions={{
        classNames: {
          toast: "app-toast",
          title: "app-toast-title",
          description: "app-toast-desc",
          actionButton: "app-toast-action",
          cancelButton: "app-toast-cancel",
          error: "app-toast-error",
          success: "app-toast-success",
          info: "app-toast-info",
          warning: "app-toast-warning",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
