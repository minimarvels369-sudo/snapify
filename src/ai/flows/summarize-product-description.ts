'use server';

/**
 * @fileOverview Summarizes a product description for AI image generation.
 *
 * - summarizeProductDescription - A function that summarizes the product description.
 * - SummarizeProductDescriptionInput - The input type for the summarizeProductDescription function.
 * - SummarizeProductDescriptionOutput - The return type for the summarizeProductDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeProductDescriptionInputSchema = z.object({
  productDescription: z
    .string()
    .describe('The description of the product to be summarized.'),
});

export type SummarizeProductDescriptionInput = z.infer<
  typeof SummarizeProductDescriptionInputSchema
>;

const SummarizeProductDescriptionOutputSchema = z.object({
  prompt: z
    .string()
    .describe(
      'A concise prompt suitable for an AI image generator, based on the product description.'
    ),
});

export type SummarizeProductDescriptionOutput = z.infer<
  typeof SummarizeProductDescriptionOutputSchema
>;

export async function summarizeProductDescription(
  input: SummarizeProductDescriptionInput
): Promise<SummarizeProductDescriptionOutput> {
  return summarizeProductDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeProductDescriptionPrompt',
  input: {schema: SummarizeProductDescriptionInputSchema},
  output: {schema: SummarizeProductDescriptionOutputSchema},
  prompt: `You are an AI expert in creating prompts for image generation from product descriptions.
Your goal is to create a concise and effective prompt that captures the essence of the product for AI image generation.

Product Description: {{{productDescription}}}

Concise Prompt:`,
});

const summarizeProductDescriptionFlow = ai.defineFlow(
  {
    name: 'summarizeProductDescriptionFlow',
    inputSchema: SummarizeProductDescriptionInputSchema,
    outputSchema: SummarizeProductDescriptionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
