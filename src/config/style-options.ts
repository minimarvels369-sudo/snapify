
import { PlaceHolderImages } from "@/lib/placeholder-images";

// #region Type Definitions
export interface StyleOption {
  id: string;
  name: string;
  category: 'solid' | 'texture' | 'lifestyle' | 'seasonal';
  prompt: string;
  thumbnail: string;
  imageHint: string;
}

export interface ModelOption {
  id: string;
  name: string;
  description: string;
  prompt: string;
  ageGroup: 'young-adult' | 'adult' | 'child' | 'none';
  thumbnail: string;
  imageHint: string;
}

export interface EnhancementOption {
  id: string;
  name: string;
  description: string;
  creditCost: number;
}

export interface QuickPreset {
  id: string;
  name: string;
  description: string;
  settings: GenerationSettings;
}

export interface GenerationSettings {
  background: string;
  model: string;
  enhancements: string[];
}
// #endregion

// #region Data Exports

const findImage = (id: string, fallbackId: string) => {
    return PlaceHolderImages.find(img => img.id === id)?.imageUrl || PlaceHolderImages.find(img => img.id === fallbackId)?.imageUrl || 'https://picsum.photos/seed/1/200/200'
}

const findHint = (id: string, fallbackId: string) => {
    return PlaceHolderImages.find(img => img.id === id)?.imageHint || PlaceHolderImages.find(img => img.id === fallbackId)?.imageHint || 'placeholder'
}


export const backgrounds: StyleOption[] = [
  // Solid Colors
  { id: 'white-clean', name: 'White Clean', category: 'solid', prompt: 'clean white background, professional studio lighting, seamless backdrop', thumbnail: findImage('gen-9', 'gen-1'), imageHint: findHint('gen-9', 'gen-1') },
  { id: 'gray-solid', name: 'Gray Solid', category: 'solid', prompt: 'solid light gray background, studio lighting', thumbnail: 'https://picsum.photos/seed/bg2/200/200', imageHint: 'gray background' },
  { id: 'beige-solid', name: 'Beige Solid', category: 'solid', prompt: 'warm beige solid color background', thumbnail: 'https://picsum.photos/seed/bg3/200/200', imageHint: 'beige background' },
  { id: 'black-solid', name: 'Black Solid', category: 'solid', prompt: 'dramatic solid black background, moody lighting', thumbnail: 'https://picsum.photos/seed/bg4/200/200', imageHint: 'black background' },
  // Textures
  { id: 'wood-texture', name: 'Wood Texture', category: 'texture', prompt: 'light wood texture background, rustic feel', thumbnail: 'https://picsum.photos/seed/bg5/200/200', imageHint: 'wood texture' },
  { id: 'marble-texture', name: 'Marble Texture', category: 'texture', prompt: 'elegant white marble texture background, high-end', thumbnail: 'https://picsum.photos/seed/bg6/200/200', imageHint: 'marble texture' },
  { id: 'concrete-texture', name: 'Concrete Wall', category: 'texture', prompt: 'urban concrete wall background, textured, minimalist', thumbnail: 'https://picsum.photos/seed/bg7/200/200', imageHint: 'concrete wall' },
  { id: 'fabric-texture', name: 'Fabric Backdrop', category: 'texture', prompt: 'soft fabric backdrop, gentle folds, textured', thumbnail: 'https://picsum.photos/seed/bg8/200/200', imageHint: 'fabric backdrop' },
  // Lifestyle Scenes
  { id: 'cafe-scene', name: 'Cafe Scene', category: 'lifestyle', prompt: 'blurry background of a chic, modern cafe, lifestyle shot', thumbnail: 'https://picsum.photos/seed/bg9/200/200', imageHint: 'cafe background' },
  { id: 'street-scene', name: 'Street Style', category: 'lifestyle', prompt: 'urban city street background, slightly out of focus, street style fashion', thumbnail: findImage('gen-1', 'gen-1'), imageHint: findHint('gen-1', 'gen-1') },
  { id: 'beach-scene', name: 'Beach Vibes', category: 'lifestyle', prompt: 'sunny beach background, ocean waves, out of focus', thumbnail: findImage('gen-7', 'gen-1'), imageHint: findHint('gen-7', 'gen-1') },
  { id: 'party-scene', name: 'Party / Event', category: 'lifestyle', prompt: 'blurry background of a sophisticated evening party with warm lights', thumbnail: 'https://picsum.photos/seed/bg12/200/200', imageHint: 'party background' },
  { id: 'outdoor-nature', name: 'Outdoor Nature', category: 'lifestyle', prompt: 'lush green nature background, forest or park, soft sunlight', thumbnail: 'https://picsum.photos/seed/bg13/200/200', imageHint: 'nature background' },
  { id: 'studio-professional', name: 'Professional Studio', category: 'lifestyle', prompt: 'professional photography studio setting with equipment in the background', thumbnail: 'https://picsum.photos/seed/bg14/200/200', imageHint: 'photo studio' },
  { id: 'gym-fitness', name: 'Gym/Fitness', category: 'lifestyle', prompt: 'modern gym setting with workout equipment in the background', thumbnail: findImage('gen-8', 'gen-1'), imageHint: findHint('gen-8', 'gen-1') },
  { id: 'office-modern', name: 'Modern Office', category: 'lifestyle', prompt: 'bright and modern office environment, minimalist decor', thumbnail: 'https://picsum.photos/seed/bg15/200/200', imageHint: 'office background' },
  // Seasonal
  { id: 'summer-vibe', name: 'Summer Vibe', category: 'seasonal', prompt: 'bright sunny day, vibrant summer colors', thumbnail: findImage('gen-5', 'gen-1'), imageHint: findHint('gen-5', 'gen-1') },
  { id: 'autumn-vibe', name: 'Autumn Mood', category: 'seasonal', prompt: 'warm autumn colors, fallen leaves, cozy atmosphere', thumbnail: 'https://picsum.photos/seed/bg17/200/200', imageHint: 'autumn scene' },
  { id: 'winter-vibe', name: 'Winter Wonderland', category: 'seasonal', prompt: 'snowy landscape, cool winter tones, soft light', thumbnail: 'https://picsum.photos/seed/bg18/200/200', imageHint: 'winter snow' },
  { id: 'spring-vibe', name: 'Spring Fresh', category: 'seasonal', prompt: 'blooming flowers, fresh spring colors, soft sunlight', thumbnail: 'https://picsum.photos/seed/bg19/200/200', imageHint: 'spring flowers' },
];

export const modelOptions: ModelOption[] = [
  { id: 'female-casual', name: 'Female - Casual', description: 'Young female, casual pose', prompt: 'worn by an attractive young female model, casual relaxed pose, natural smile, fashion photography', ageGroup: 'young-adult', thumbnail: findImage('gen-1', 'gen-1'), imageHint: findHint('gen-1', 'gen-1') },
  { id: 'female-elegant', name: 'Female - Elegant', description: 'Woman in an elegant, graceful pose', prompt: 'worn by an elegant woman, graceful and sophisticated pose, high fashion photography', ageGroup: 'adult', thumbnail: findImage('gen-7', 'gen-1'), imageHint: findHint('gen-7', 'gen-1') },
  { id: 'male-casual', name: 'Male - Casual', description: 'Young male, casual pose', prompt: 'worn by a handsome young male model, casual relaxed pose, confident expression, fashion photography', ageGroup: 'young-adult', thumbnail: findImage('gen-2', 'gen-1'), imageHint: findHint('gen-2', 'gen-1') },
  { id: 'male-formal', name: 'Male - Formal', description: 'Man in a formal, sharp pose', prompt: 'worn by a sharp-dressed man, formal and confident pose, professional fashion shot', ageGroup: 'adult', thumbnail: findImage('gen-6', 'gen-1'), imageHint: findHint('gen-6', 'gen-1') },
  { id: 'child-boy', name: 'Child - Boy', description: 'Young boy, playful pose', prompt: 'worn by a happy young boy, playful and energetic pose, kids fashion photography', ageGroup: 'child', thumbnail: 'https://picsum.photos/seed/mo5/200/200', imageHint: 'boy model' },
  { id: 'child-girl', name: 'Child - Girl', description: 'Young girl, cheerful pose', prompt: 'worn by a cheerful young girl, bright and happy pose, kids fashion photography', ageGroup: 'child', thumbnail: 'https://picsum.photos/seed/mo6/200/200', imageHint: 'girl model' },
  { id: 'none', name: 'None', description: 'Ghost mannequin or flat lay', prompt: 'on a ghost mannequin, perfectly shaped, or in a flat lay style, product only', ageGroup: 'none', thumbnail: 'https://picsum.photos/seed/mo7/200/200', imageHint: 'product only' },
];

export const enhancements: EnhancementOption[] = [
  { id: 'remove-bg', name: 'Remove Background', description: 'Clean transparent background', creditCost: 1 },
  { id: 'color-pop', name: 'Color Pop', description: 'Enhance and saturate colors', creditCost: 1 },
  { id: 'add-shadow', name: 'Add Shadow', description: 'Add a soft, realistic shadow', creditCost: 1 },
  { id: 'sharpen', name: 'Sharpen Details', description: 'Increase sharpness and detail', creditCost: 1 },
  { id: 'auto-resize', name: 'Auto Resize', description: 'Resize for social media formats', creditCost: 1 },
];

export const quickPresets: QuickPreset[] = [
  { id: 'amazon-ready', name: 'Amazon Ready', description: 'White background, no model', settings: { background: 'white-clean', model: 'none', enhancements: ['sharpen'] } },
  { id: 'instagram-viral', name: 'Instagram Viral', description: 'Street style, casual model', settings: { background: 'street-scene', model: 'female-casual', enhancements: ['color-pop'] } },
  { id: 'luxury-look', name: 'Luxury Look', description: 'Marble, elegant model', settings: { background: 'marble-texture', model: 'female-elegant', enhancements: ['add-shadow'] } },
  { id: 'streetwear-cool', name: 'Streetwear Cool', description: 'Concrete, casual male model', settings: { background: 'concrete-texture', model: 'male-casual', enhancements: [] } },
];
// #endregion

// #region Helper Functions

/**
 * Calculates the credit cost for a generation based on settings.
 * @param settings The selected generation settings.
 * @returns The total credit cost.
 */
export function calculateCreditCost(settings: Partial<GenerationSettings>): number {
  let cost = 2; // Base cost per image
  if (settings.enhancements) {
    cost += settings.enhancements.length * 1; // 1 credit per enhancement
  }
  if (settings.model && settings.model !== 'none') {
    cost += 1; // Extra credit for a model
  }
  return cost;
}

/**
 * Builds a detailed AI prompt from the selected settings.
 * @param productTitle The title of the product.
 * @param settings The selected generation settings.
 * @returns A string representing the full prompt for the AI.
 */
export function buildAIPrompt(productTitle: string, settings: GenerationSettings): string {
  const bg = backgrounds.find(b => b.id === settings.background);
  const model = modelOptions.find(m => m.id === settings.model);
  
  if (!bg || !model) {
    throw new Error("Invalid background or model selected.");
  }

  let prompt = `professional fashion product photography of a ${productTitle}, high resolution, 8k quality, ${bg.prompt}, ${model.prompt}`;
  
  if (settings.enhancements.includes('color-pop')) {
    prompt += ', vibrant saturated colors, color grading';
  }
  if (settings.enhancements.includes('sharpen')) {
    prompt += ', ultra sharp details, crisp textures';
  }
  if (settings.enhancements.includes('add-shadow')) {
    prompt += ', with a soft realistic drop shadow';
  }
  
  prompt += ', centered composition, perfect lighting, ultra-realistic';
  
  return prompt;
}

// #endregion
