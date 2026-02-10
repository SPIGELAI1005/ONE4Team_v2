import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      position="top-center"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:backdrop-blur-2xl group-[.toaster]:bg-[hsl(228_12%_10%/0.7)] group-[.toaster]:text-foreground group-[.toaster]:border-[hsl(0_0%_100%/0.1)] group-[.toaster]:shadow-[0_8px_32px_hsl(0_0%_0%/0.4),inset_0_1px_0_hsl(0_0%_100%/0.06)] group-[.toaster]:rounded-2xl group-[.toaster]:px-4 group-[.toaster]:py-3",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-sm",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-xl group-[.toast]:font-medium",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-xl",
          success: "group-[.toaster]:border-[hsl(142_70%_45%/0.3)]",
          error: "group-[.toaster]:border-[hsl(0_84%_60%/0.3)]",
        },
        style: {
          transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
