'use server';

/**
 * @fileOverview Suggests relevant image enhancements based on clothing type and style.
 *
 * - suggestImageEnhancements - A function that suggests image enhancements.
 * - SuggestImageEnhancementsInput - The input type for the suggestImageEnhancements function.
 * - SuggestImageEnhancementsOutput - The return type for the suggestImageEnhancements function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestImageEnhancementsInputSchema = z.object({
  clothingType: z.string().describe('The type of clothing in the image (e.g., dress, shirt, pants).'),
  clothingStyle: z.string().describe('The style of the clothing (e.g., casual, formal, vintage).'),
});
export type SuggestImageEnhancementsInput = z.infer<
  typeof SuggestImageEnhancementsInputSchema
>;

const SuggestImageEnhancementsOutputSchema = z.object({
  suggestedEnhancements: z
    .array(z.string())
    .describe('An array of suggested image enhancements (e.g., high resolution, background blur, color correction).'),
});
export type SuggestImageEnhancementsOutput = z.infer<
  typeof SuggestImageEnhancementsOutputSchema
>;

export async function suggestImageEnhancements(
  input: SuggestImageEnhancementsInput
): Promise<SuggestImageEnhancementsOutput> {
  return suggestImageEnhancementsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestImageEnhancementsPrompt',
  input: {schema: SuggestImageEnhancementsInputSchema},
  output: {schema: SuggestImageEnhancementsOutputSchema},
  prompt: `You are an AI assistant specializing in suggesting image enhancements for fashion product images.

  Based on the clothing type and style provided, suggest a list of relevant image enhancements that would improve the visual quality and appeal of the image.

  Clothing Type: {{{clothingType}}}
  Clothing Style: {{{clothingStyle}}}

  Consider enhancements such as:
  - high resolution
  - background blur
  - color correction
  - shadow adjustment
  - texture enhancement
  - detail sharpening
  - perspective correction
  - style transfer

  Return only the array of suggested enhancements.
  `,
});

const suggestImageEnhancementsFlow = ai.defineFlow(
  {
    name: 'suggestImageEnhancementsFlow',
    inputSchema: SuggestImageEnhancementsInputSchema,
    outputSchema: SuggestImageEnhancementsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
