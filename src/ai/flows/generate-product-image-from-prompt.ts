'use server';
/**
 * @fileOverview An AI agent that generates product images from a text prompt.
 *
 * - generateProductImageFromPrompt - A function that handles the product image generation process.
 * - GenerateProductImageFromPromptInput - The input type for the generateProductImageFromPrompt function.
 * - GenerateProductImageFromPromptOutput - The return type for the generateProductImageFromPrompt function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateProductImageFromPromptInputSchema = z.object({
  prompt: z.string().describe('A text prompt describing the desired product image.'),
});
export type GenerateProductImageFromPromptInput = z.infer<typeof GenerateProductImageFromPromptInputSchema>;

const GenerateProductImageFromPromptOutputSchema = z.object({
  imageUrl: z.string().describe('The URL of the generated product image as a data URI.'),
});
export type GenerateProductImageFromPromptOutput = z.infer<typeof GenerateProductImageFromPromptOutputSchema>;

export async function generateProductImageFromPrompt(input: GenerateProductImageFromPromptInput): Promise<GenerateProductImageFromPromptOutput> {
  return generateProductImageFromPromptFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateProductImageFromPromptPrompt',
  input: {schema: GenerateProductImageFromPromptInputSchema},
  output: {schema: GenerateProductImageFromPromptOutputSchema},
  prompt: `You are an AI assistant specializing in generating product images based on text prompts. Please generate a high-quality image that accurately reflects the description in the prompt.\n\nPrompt: {{{prompt}}}`,
});

const generateProductImageFromPromptFlow = ai.defineFlow(
  {
    name: 'generateProductImageFromPromptFlow',
    inputSchema: GenerateProductImageFromPromptInputSchema,
    outputSchema: GenerateProductImageFromPromptOutputSchema,
  },
  async input => {
    const {media} = await ai.generate({
      model: 'googleai/imagen-4.0-fast-generate-001',
      prompt: input.prompt,
    });

    if (!media || !media.url) {
      throw new Error('Failed to generate image.');
    }

    return {imageUrl: media.url};
  }
);
