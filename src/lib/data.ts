import type { GeneratedImage, Transaction } from "@/lib/types";
import { PlaceHolderImages } from "@/lib/placeholder-images";

const getImage = (id: string) => PlaceHolderImages.find(img => img.id === id)?.imageUrl || '';

export const recentGenerations: GeneratedImage[] = [
  {
    id: "img_001",
    shopId: "shop_123",
    productId: "prod_abc",
    originalImageUrl: getImage("gen-1"),
    generatedImageUrls: [getImage("gen-1")],
    settings: {
      backgroundStyle: "City Street",
      modelType: "Female",
      enhancements: ["High Resolution"],
    },
    status: "completed",
    createdAt: new Date("2023-10-26T10:00:00Z"),
    creditsUsed: 2,
  },
  {
    id: "img_002",
    shopId: "shop_123",
    productId: "prod_def",
    originalImageUrl: getImage("gen-2"),
    generatedImageUrls: [getImage("gen-2")],
    settings: {
      backgroundStyle: "Studio",
      modelType: "Male",
      enhancements: ["Color Correction", "Background Blur"],
    },
    status: "completed",
    createdAt: new Date("2023-10-26T09:45:00Z"),
    creditsUsed: 3,
  },
  {
    id: "img_003",
    shopId: "shop_456",
    productId: "prod_ghi",
    originalImageUrl: getImage("gen-3"),
    generatedImageUrls: [],
    settings: {
      backgroundStyle: "Outdoor",
      modelType: "Female",
      enhancements: [],
    },
    status: "processing",
    createdAt: new Date("2023-10-26T11:00:00Z"),
    creditsUsed: 1,
  },
  {
    id: "img_004",
    shopId: "shop_123",
    productId: "prod_jkl",
    originalImageUrl: getImage("gen-4"),
    generatedImageUrls: [],
    settings: {
      backgroundStyle: "Abstract",
      modelType: "None",
      enhancements: ["Detail Sharpening"],
    },
    status: "failed",
    createdAt: new Date("2023-10-25T14:00:00Z"),
    creditsUsed: 1,
  },
  {
    id: "img_005",
    shopId: "shop_789",
    productId: "prod_mno",
    originalImageUrl: getImage("gen-5"),
    generatedImageUrls: [getImage("gen-5")],
    settings: {
      backgroundStyle: "Beach",
      modelType: "Female",
      enhancements: ["High Resolution", "Shadow Adjustment"],
    },
    status: "completed",
    createdAt: new Date("2023-10-25T12:00:00Z"),
    creditsUsed: 3,
  },
    {
    id: "img_006",
    shopId: "shop_123",
    productId: "prod_pqr",
    originalImageUrl: getImage("gen-6"),
    generatedImageUrls: [getImage("gen-6")],
    settings: {
      backgroundStyle: "Office",
      modelType: "Male",
      enhancements: ["High Resolution"],
    },
    status: "completed",
    createdAt: new Date("2023-10-24T18:00:00Z"),
    creditsUsed: 2,
  },
    {
    id: "img_007",
    shopId: "shop_456",
    productId: "prod_stu",
    originalImageUrl: getImage("gen-7"),
    generatedImageUrls: [getImage("gen-7")],
    settings: {
      backgroundStyle: "Tropical",
      modelType: "Female",
      enhancements: ["Color Correction"],
    },
    status: "completed",
    createdAt: new Date("2023-10-24T16:30:00Z"),
    creditsUsed: 2,
  },
    {
    id: "img_008",
    shopId: "shop_123",
    productId: "prod_vwx",
    originalImageUrl: getImage("gen-8"),
    generatedImageUrls: [],
    settings: {
      backgroundStyle: "Gym",
      modelType: "Female",
      enhancements: ["High Resolution"],
    },
    status: "pending",
    createdAt: new Date("2023-10-26T11:05:00Z"),
    creditsUsed: 2,
  },
];

export const transactions: Transaction[] = [
    {
        id: "txn_001",
        shopId: "shop_123",
        type: 'purchase',
        credits: 1000,
        amount: 50.00,
        description: "Pro Plan Credit Top-up",
        timestamp: new Date('2023-10-01T12:00:00Z')
    },
    {
        id: "txn_002",
        shopId: "shop_123",
        type: 'usage',
        credits: -2,
        amount: 0,
        description: "Image generation for prod_abc",
        timestamp: new Date('2023-10-26T10:00:00Z')
    },
    {
        id: "txn_003",
        shopId: "shop_123",
        type: 'usage',
        credits: -3,
        amount: 0,
        description: "Image generation for prod_def",
        timestamp: new Date('2023-10-26T09:45:00Z')
    },
        {
        id: "txn_004",
        shopId: "shop_456",
        type: 'purchase',
        credits: 200,
        amount: 15.00,
        description: "Starter Plan Credit Pack",
        timestamp: new Date('2023-10-15T09:00:00Z')
    },
    {
        id: "txn_005",
        shopId: "shop_456",
        type: 'usage',
        credits: -1,
        amount: 0,
        description: "Image generation for prod_ghi",
        timestamp: new Date('2023-10-26T11:00:00Z')
    },
    {
        id: "txn_006",
        shopId: "shop_123",
        type: 'refund',
        credits: 1,
        amount: 0,
        description: "Refund for failed generation on prod_jkl",
        timestamp: new Date('2023-10-25T14:05:00Z')
    },
];
