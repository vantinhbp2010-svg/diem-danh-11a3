import { createContext, useContext } from "react";

export const UxContext = createContext(null);

export function useUx() {
  const context = useContext(UxContext);
  if (!context) throw new Error("useUx phải được dùng trong ToastProvider");
  return context;
}
