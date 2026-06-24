'use client';
import { Provider as ReduxProvider } from "react-redux";
import { PropsWithChildren } from "react";
import { Toaster } from "react-hot-toast";
import { store } from "../store";
import { SessionProvider } from "../context/SessionContext";

export function Providers({ children }: PropsWithChildren) {
  return (
    <ReduxProvider store={store}>
      <SessionProvider>
        {children}
        <Toaster position="top-center" toastOptions={{
          style: { background: "#0f766e", color: "white", borderRadius: "12px", fontSize: "13px" },
        }} />
      </SessionProvider>
    </ReduxProvider>
  );
}
