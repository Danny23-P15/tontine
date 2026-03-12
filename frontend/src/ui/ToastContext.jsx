import { createContext, useContext, useState } from "react";

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "info") => {
    setToast({ message, type });

    // auto-hide après 3 secondes
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && <Toast {...toast} />}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}


export default function Toast({ message, type }) {
  const colors = {
    success: "#4CAF50",
    error: "#F44336",
    info: "#2196F3",
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 20,
        right: 20,
        backgroundColor: colors[type] || colors.info,
        color: "white",
        padding: "12px 20px",
        borderRadius: 8,
        boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
        zIndex: 1000,
      }}
    >
      {message}
    </div>
  );
}
