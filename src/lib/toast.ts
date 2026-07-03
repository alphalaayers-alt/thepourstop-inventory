import Swal from "sweetalert2";

/** Site palette — slate + emerald accents */
const COLORS = {
  slate900: "#0f172a",
  slate500: "#64748b",
  slate200: "#e2e8f0",
  emerald600: "#059669",
  red600: "#dc2626",
  amber500: "#f59e0b",
  white: "#ffffff",
} as const;

const toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3200,
  timerProgressBar: true,
  background: COLORS.white,
  color: COLORS.slate900,
  customClass: {
    popup: "pourstop-toast",
    title: "pourstop-toast-title",
    htmlContainer: "pourstop-toast-text",
    timerProgressBar: "pourstop-toast-progress",
  },
});

const alert = Swal.mixin({
  background: COLORS.white,
  color: COLORS.slate900,
  confirmButtonColor: COLORS.slate900,
  cancelButtonColor: COLORS.slate500,
  customClass: {
    popup: "pourstop-alert",
    title: "pourstop-alert-title",
    htmlContainer: "pourstop-alert-text",
    confirmButton: "pourstop-alert-confirm",
    cancelButton: "pourstop-alert-cancel",
  },
  buttonsStyling: true,
});

export function showSuccess(title: string, text?: string) {
  return toast.fire({
    icon: "success",
    iconColor: COLORS.emerald600,
    title,
    text,
  });
}

export function showError(title: string, text?: string) {
  return toast.fire({
    icon: "error",
    iconColor: COLORS.red600,
    title,
    text,
    timer: 4200,
  });
}

export function showWarning(title: string, text?: string) {
  return toast.fire({
    icon: "warning",
    iconColor: COLORS.amber500,
    title,
    text,
    timer: 3800,
  });
}

export function showInfo(title: string, text?: string) {
  return toast.fire({
    icon: "info",
    iconColor: COLORS.slate900,
    title,
    text,
  });
}

export async function confirmAction(options: {
  title: string;
  text?: string;
  confirmText?: string;
  cancelText?: string;
  icon?: "warning" | "question";
}): Promise<boolean> {
  const result = await alert.fire({
    title: options.title,
    text: options.text,
    icon: options.icon ?? "warning",
    iconColor: COLORS.amber500,
    showCancelButton: true,
    confirmButtonText: options.confirmText ?? "Yes, continue",
    cancelButtonText: options.cancelText ?? "Cancel",
    reverseButtons: true,
    focusCancel: true,
  });
  return result.isConfirmed;
}
