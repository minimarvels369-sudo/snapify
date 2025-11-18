"use client";

import { Provider as AppBridgeProvider } from "@shopify/app-bridge-react";
import { useSearchParams } from "next/navigation";

export function Providers({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const shop = searchParams.get("shop");
  const host = searchParams.get("host");

  if (!shop || !host) {
    // Return children directly if shop or host is not present
    // This will be the case for the /auth page
    return <>{children}</>;
  }

  // Ensure this is not process.env
  const apiKey = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY!;
  const config = {
    apiKey,
    host,
    forceRedirect: true,
  };

  return <AppBridgeProvider config={config}>{children}</AppBridgeProvider>;
}
