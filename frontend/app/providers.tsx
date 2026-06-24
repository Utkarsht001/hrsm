'use client';
import { Provider as ReduxProvider } from "react-redux";
import { PropsWithChildren } from "react";
import { Toaster } from "react-hot-toast";
import { store } from "../store";
import { SessionProvider } from "../context/SessionContext";

// Stable references — extracted from JSX to avoid re-allocating per render.
const TOAST_STYLE = {
  background: "#0f766e",
  color: "white",
  borderRadius: "12px",
  fontSize: "13px",
} as const;

const TOAST_OPTIONS = { style: TOAST_STYLE } as const;

export function Providers({ children }: PropsWithChildren) {
  return (
    <ReduxProvider store={store}>
      <SessionProvider>
        {children}
        <Toaster position="top-center" toastOptions={TOAST_OPTIONS} />
      </SessionProvider>
    </ReduxProvider>
  );
}
