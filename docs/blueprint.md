# **App Name**: RunwayML: AI Fashion Studio

## Core Features:

- Shop Authentication: Securely authenticate Shopify shops using OAuth and store relevant shop data like domain and access token.
- AI Image Generation: Leverage generative AI to create unique product images with options to modify background, model type, and other enhancements.  A tool assists the LLM in deciding which enhancements would work best with which clothing types.
- Image Management: Organize and manage generated images, associating them with specific products and shops. This functionality is backed by the Firestore database.
- Credit Management: Implement a credit-based system to track AI usage, including purchases, usage, and refunds. Database access is secured by Firestore rules.
- Transaction History: Log all transactions (purchases, usage, refunds) related to credit usage for auditing and reporting. These transactions are persisted in Firestore.
- Subscription Management: Manage shop subscriptions, tracking plan status, start/end dates, and auto-renewal preferences, saved and managed in Firestore.
- Image Status Tracking: Track the status of image generation (pending, processing, completed, failed) and display this information in the UI to the user.

## Style Guidelines:

- Primary color: Deep periwinkle (#4C61B0) to convey trust and sophistication.
- Background color: Very light periwinkle (#F2F4F9).
- Accent color: Deep purple (#6B489B), for a rich, complementary contrast with the primary and background.
- Font: 'Belleza' (sans-serif) for headlines, matched with 'Alegreya' (serif) for body. Note: currently only Google Fonts are supported.
- Use clean, minimalist icons representing fashion, AI, and e-commerce concepts.
- Design a clean and intuitive layout optimized for Shopify's UI, with clear navigation and prominent CTAs.
- Subtle loading animations and transitions to enhance user experience.