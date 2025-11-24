"use client";

import { Provider as AppBridgeProvider } from "@shopify/app-bridge-react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

// This new component contains the logic that uses the client-side hook.
function ShopifyProvider({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const shop = searchParams.get("shop");
  const host = searchParams.get("host");

  // If the necessary params for Shopify App Bridge are not present,
  // just render the children without the provider.
  // This is expected for pages like /auth or when accessed outside Shopify.
  if (!shop || !host) {
    return <>{children}</>;
  }

  const apiKey = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY!;
  if (!apiKey) {
    // In a real app, you'd want to handle this more gracefully.
    console.error("NEXT_PUBLIC_SHOPIFY_API_KEY is not set.");
    return <>{children}</>;
  }

  const config = {
    apiKey,
    host,
    forceRedirect: true,
  };

  return <AppBridgeProvider config={config}>{children}</AppBridgeProvider>;
}

// The main export 'Providers' now uses Suspense.
export function Providers({ children }: { children: React.ReactNode }) {
  // On the server (during build) or on initial client load, the fallback will be rendered.
  // The fallback is just the children, so the app doesn't look broken.
  // On the client, React will then render the ShopifyProvider component.
  return (
    <Suspense fallback={<>{children}</>}>
      <ShopifyProvider>{children}</ShopifyProvider>
    </Suspense>
  );
}
