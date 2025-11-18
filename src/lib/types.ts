export interface Shop {
  id: string;
  shopDomain: string;
  accessToken: string; // Should be encrypted in a real application
  email: string;
  plan: "free" | "starter" | "pro" | "enterprise";
  credits: number;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export type ImageGenerationStatus = "pending" | "processing" | "completed" | "failed";

export interface GeneratedImage {
  id: string;
  shopId: string;
  productId: string;
  originalImageUrl: string;
  generatedImageUrls: string[];
  settings: {
    backgroundStyle: string;
    modelType: string;
    enhancements: string[];
  };
  status: ImageGenerationStatus;
  createdAt: Date;
  creditsUsed: number;
}

export interface Transaction {
  id: string;
  shopId: string;
  type: "purchase" | "usage" | "refund";
  credits: number;
  amount: number;
  description: string;
  timestamp: Date;
}

export interface Subscription {
  id: string;
  shopId: string;
  plan: string;
  status: "active" | "cancelled" | "expired";
  startDate: Date;
  endDate: Date;
  autoRenew: boolean;
}
