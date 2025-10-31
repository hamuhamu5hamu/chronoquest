import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type ToastVariant = "default" | "success" | "error";

type Toast = {
  id: number;
  message: string;
  variant: ToastVariant;
};

type ShowToastOptions = {
  variant?: ToastVariant;
  durationMs?: number;
};

type ToastContextValue = {
  showToast: (message: string, options?: ShowToastOptions) => void;
};

const defaultContext: ToastContextValue = {
  showToast: () => {},
};

const ToastContext = createContext<ToastContextValue>(defaultContext);

export const useToast = () => useContext(ToastContext);

const DEFAULT_DURATION = 4000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<number, number>>(new Map());

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    (message: string, options?: ShowToastOptions) => {
      const id = Date.now() + Math.random();
      const variant = options?.variant ?? "default";
      const duration = options?.durationMs ?? DEFAULT_DURATION;
      const toast: Toast = { id, message, variant };

      setToasts((prev) => [...prev, toast]);

      const timer = window.setTimeout(() => removeToast(id), duration);
      timers.current.set(id, timer);
    },
    [removeToast]
  );

  useEffect(() => {
    return () => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
      timers.current.clear();
    };
  }, []);

  const contextValue = useMemo<ToastContextValue>(
    () => ({ showToast }),
    [showToast]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast toast--${toast.variant}`}
            onClick={() => removeToast(toast.id)}
            role="status"
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
