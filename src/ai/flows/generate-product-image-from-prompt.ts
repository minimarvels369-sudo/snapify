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
  imageUrl: z.string().optional().describe("A source image to use for image-to-image generation, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type GenerateProductImageFromPromptInput = z.infer<typeof GenerateProductImageFromPromptInputSchema>;

const GenerateProductImageFromPromptOutputSchema = z.object({
  imageUrl: z.string().describe('The URL of the generated product image as a data URI.'),
});
export type GenerateProductImageFromPromptOutput = z.infer<typeof GenerateProductImageFromPromptOutputSchema>;

export async function generateProductImageFromPrompt(input: GenerateProductImageFromPromptInput): Promise<GenerateProductImageFromPromptOutput> {
  return generateProductImageFromPromptFlow(input);
}

const generateProductImageFromPromptFlow = ai.defineFlow(
  {
    name: 'generateProductImageFromPromptFlow',
    inputSchema: GenerateProductImageFromPromptInputSchema,
    outputSchema: GenerateProductImageFromPromptOutputSchema,
  },
  async input => {
    const prompt: any[] = [{text: input.prompt}];
    if (input.imageUrl) {
        prompt.unshift({media: {url: input.imageUrl}});
    }

    const {media} = await ai.generate({
      model: 'googleai/gemini-2.5-flash-image-preview',
      prompt: prompt,
       config: {
        responseModalities: ['IMAGE'],
      },
    });

    if (!media || !media.url) {
      throw new Error('Failed to generate image.');
    }

    return {imageUrl: media.url};
  }
);
