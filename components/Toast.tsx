"use client";

import { Toaster } from "react-hot-toast";
import { useEffect, useState } from "react";

export function Toast({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  return (
    <>
      {mounted && (
        <Toaster
          position="top-right"
          reverseOrder={false}
          gutter={8}
          toastOptions={{
            duration: 4000,
            style: {
              background: "#FFFFFF",
              color: "#1A1A1A",
              borderRadius: "12px",
              boxShadow:
                "0 8px 24px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.08)",
              border: "none",
              padding: "16px 20px",
              fontSize: "15px",
              fontWeight: "500",
            },
            success: {
              style: {
                background: "linear-gradient(135deg, #FFFFFF 0%, #F0FFFF 100%)",
                color: "#1A1A1A",
                border: "1px solid rgba(0, 200, 200, 0.2)",
              },
              iconTheme: {
                primary: "#029610",
                secondary: "#FFFFFF",
              },
            },
            error: {
              style: {
                background: "linear-gradient(135deg, #FFFFFF 0%, #FFF5F5 100%)",
                color: "#1A1A1A",
                border: "1px solid rgba(255, 68, 68, 0.2)",
              },
              iconTheme: {
                primary: "#FF4444",
                secondary: "#FFFFFF",
              },
            },
            loading: {
              style: {
                background: "linear-gradient(135deg, #FFFFFF 0%, #F0F8FF 100%)",
                color: "#1A1A1A",
                border: "1px solid rgba(0, 127, 255, 0.2)",
              },
              iconTheme: {
                primary: "#007FFF",
                secondary: "#FFFFFF",
              },
            },
          }}
        />
      )}
      {children}
    </>
  );
}
