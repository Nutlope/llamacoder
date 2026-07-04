import * as React from "react";

export type ToastActionElement = React.ReactElement;

export type ToastProps = {
  id?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
  variant?: "default" | "destructive";
  duration?: number;
};

type ToastRecord = ToastProps & { id: string };
type Listener = (toasts: Array<ToastRecord>) => void;

let memoryState: Array<ToastRecord> = [];
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) listener(memoryState);
}

export function toast(props: ToastProps) {
  const id = props.id ?? Math.random().toString(36).slice(2);
  memoryState = [{ ...props, id }, ...memoryState].slice(0, 5);
  emit();

  if (props.duration !== 0) {
    window.setTimeout(() => dismiss(id), props.duration ?? 4000);
  }

  return {
    id,
    dismiss: () => dismiss(id),
    update: (next: ToastProps) => {
      memoryState = memoryState.map((toastRecord) =>
        toastRecord.id === id ? { ...toastRecord, ...next, id } : toastRecord,
      );
      emit();
    },
  };
}

export function dismiss(toastId?: string) {
  memoryState = toastId
    ? memoryState.filter((toastRecord) => toastRecord.id !== toastId)
    : [];
  emit();
}

export function useToast() {
  const [toasts, setToasts] = React.useState(memoryState);

  React.useEffect(() => {
    listeners.add(setToasts);
    return () => {
      listeners.delete(setToasts);
    };
  }, []);

  return {
    toast,
    dismiss,
    toasts,
  };
}
