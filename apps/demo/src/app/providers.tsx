"use client";

import type { ReactNode } from "react";
import { ToastProvider } from "@velocityuikit/velocityui";

type ProvidersProps = {
  children: ReactNode;
};

export default function Providers({ children }: ProvidersProps) {
  return <ToastProvider>{children}</ToastProvider>;
}
