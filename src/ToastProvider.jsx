import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { OfflineBanner } from "./UxComponents";
import { UxContext } from "./UxContext";
import "./ux.css";

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmation, setConfirmation] = useState(null);
  const confirmResolver = useRef(null);
  const toastTimers = useRef(new Map());
  const reduceMotion = useReducedMotion();

  const dismissToast = useCallback((id) => {
    const timer = toastTimers.current.get(id);
    if (timer) clearTimeout(timer);
    toastTimers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({
      id = `${Date.now()}-${Math.random()}`,
      message,
      type = "success",
      duration,
      action,
    }) => {
      const toastDuration = duration ?? (type === "error" ? 5000 : 3000);
      const existingTimer = toastTimers.current.get(id);
      if (existingTimer) {
        clearTimeout(existingTimer);
        toastTimers.current.delete(id);
      }
      setToasts((current) => {
        const toast = { id, message, type, action };
        return current.some((item) => item.id === id)
          ? current.map((item) => (item.id === id ? toast : item))
          : [...current, toast];
      });
      if (toastDuration > 0) {
        toastTimers.current.set(
          id,
          setTimeout(() => dismissToast(id), toastDuration)
        );
      }
      return id;
    },
    [dismissToast]
  );

  const requestConfirmation = useCallback((options) => {
    if (confirmResolver.current) confirmResolver.current(false);
    setConfirmation({
      title: options.title || "Xác nhận",
      message: options.message,
      confirmText: options.confirmText || "Xác nhận",
      cancelText: options.cancelText || "Hủy",
      destructive: options.destructive === true,
    });
    return new Promise((resolve) => {
      confirmResolver.current = resolve;
    });
  }, []);

  const resolveConfirm = useCallback((accepted) => {
    confirmResolver.current?.(accepted);
    confirmResolver.current = null;
    setConfirmation(null);
  }, []);

  useEffect(() => {
    const handleToastEvent = (event) => showToast(event.detail || {});
    const handleConfirmEvent = (event) => {
      const { message, options = {}, resolve } = event.detail || {};
      requestConfirmation({ ...options, message }).then(resolve);
    };
    window.addEventListener("app:toast", handleToastEvent);
    window.addEventListener("app:confirm", handleConfirmEvent);
    return () => {
      window.removeEventListener("app:toast", handleToastEvent);
      window.removeEventListener("app:confirm", handleConfirmEvent);
    };
  }, [requestConfirmation, showToast]);

  useEffect(() => () => {
    toastTimers.current.forEach(clearTimeout);
    toastTimers.current.clear();
    confirmResolver.current?.(false);
  }, []);

  return (
    <UxContext.Provider value={{ showToast }}>
      <OfflineBanner />
      {children}
      <div className="toast-stack" aria-live="polite" aria-atomic="false">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              className={`toast toast-${toast.type}`}
              role={toast.type === "error" ? "alert" : "status"}
              initial={reduceMotion ? false : { opacity: 0, x: 32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: reduceMotion ? 0 : 0.2 }}
            >
              <span>{toast.message}</span>
              {toast.action && (
                <button
                  type="button"
                  className="toast-action"
                  onClick={() => {
                    dismissToast(toast.id);
                    toast.action.onClick();
                  }}
                >
                  {toast.action.label}
                </button>
              )}
              <button
                type="button"
                className="toast-dismiss"
                aria-label="Đóng thông báo"
                onClick={() => dismissToast(toast.id)}
              >
                ×
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {confirmation && (
          <motion.div
            className="confirm-backdrop"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) resolveConfirm(false);
            }}
          >
            <motion.section
              className="confirm-dialog"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="confirm-title"
              aria-describedby="confirm-message"
              initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
            >
              <h2 id="confirm-title">{confirmation.title}</h2>
              <p id="confirm-message">{confirmation.message}</p>
              <div className="confirm-actions">
                <button type="button" onClick={() => resolveConfirm(false)}>
                  {confirmation.cancelText}
                </button>
                <button
                  type="button"
                  className={confirmation.destructive ? "danger" : ""}
                  onClick={() => resolveConfirm(true)}
                >
                  {confirmation.confirmText}
                </button>
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </UxContext.Provider>
  );
}
