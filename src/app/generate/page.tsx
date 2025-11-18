"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Bot,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Sparkles,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  summarizeProductDescription,
  SummarizeProductDescriptionOutput,
} from "@/ai/flows/summarize-product-description";
import {
  suggestImageEnhancements,
  SuggestImageEnhancementsOutput,
} from "@/ai/flows/suggest-image-enhancements";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { generateProductImageFromPrompt } from "@/ai/flows/generate-product-image-from-prompt";

export default function GeneratePage() {
  const { toast } = useToast();
  const [description, setDescription] = useState(
    "A classic white cotton t-shirt, crew neck, short sleeves, relaxed fit. Perfect for casual wear."
  );
  const [prompt, setPrompt] = useState("");
  const [enhancements, setEnhancements] = useState<string[]>([]);
  const [suggestedEnhancements, setSuggestedEnhancements] = useState<string[]>([]);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const originalImage = PlaceHolderImages.find(img => img.id === 'gen-9');

  const handleSuggestEnhancements = async () => {
    setIsSuggesting(true);
    try {
      const result: SuggestImageEnhancementsOutput = await suggestImageEnhancements({
        clothingType: "t-shirt", // This would be dynamic in a real app
        clothingStyle: "casual",
      });
      setSuggestedEnhancements(result.suggestedEnhancements);
      toast({
        title: "Suggestions Ready",
        description: "We've suggested some enhancements for your image.",
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Suggestion Failed",
        description: "Could not get AI-powered suggestions.",
      });
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleSummarize = async () => {
    if (!description) {
      toast({
        variant: "destructive",
        title: "Missing Description",
        description: "Please enter a product description first.",
      });
      return;
    }
    setIsLoadingSummary(true);
    try {
      const result: SummarizeProductDescriptionOutput = await summarizeProductDescription({
        productDescription: description,
      });
      setPrompt(result.prompt);
      toast({
        title: "Prompt Generated",
        description: "Your description has been summarized into a prompt.",
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Summarization Failed",
        description: "The AI could not summarize the description.",
      });
    } finally {
      setIsLoadingSummary(false);
    }
  };
  
  const handleGenerate = async () => {
    if (!prompt) {
      toast({ variant: 'destructive', title: 'Missing Prompt', description: 'Please generate or write a prompt first.' });
      return;
    }
    setIsGenerating(true);
    setGeneratedImage(null);
    try {
      const { imageUrl } = await generateProductImageFromPrompt({ prompt, imageUrl: originalImage?.imageUrl });
      setGeneratedImage(imageUrl);
      toast({ title: 'Image Generated!', description: 'Your new product image is ready.' });
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Generation Failed', description: 'The AI could not generate an image from this prompt.' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEnhancementChange = (checked: boolean, enhancement: string) => {
    setEnhancements(prev => 
      checked ? [...prev, enhancement] : prev.filter(e => e !== enhancement)
    );
  };

  return (
    <div className="grid flex-1 auto-rows-max gap-4 lg:grid-cols-3">
      {/* Left Column: Form */}
      <div className="grid auto-rows-max items-start gap-4 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Product Details</CardTitle>
            <CardDescription>
              Describe your product to generate an AI-powered prompt.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6">
              <div className="grid gap-3">
                <Label htmlFor="description">Product Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-32"
                />
              </div>
              <Button onClick={handleSummarize} disabled={isLoadingSummary || !description}>
                <Sparkles className="mr-2 h-4 w-4" />
                {isLoadingSummary ? 'Generating...' : 'Generate AI Prompt'}
              </Button>
              <div className="grid gap-3">
                <Label htmlFor="prompt">AI Prompt</Label>
                <div className="relative">
                  <Input
                    id="prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., A white t-shirt on a male model, studio lighting..."
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute right-1 top-1 h-7 w-7"
                    onClick={() => navigator.clipboard.writeText(prompt)}
                  >
                    <Clipboard className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Image Settings</CardTitle>
            <CardDescription>
              Customize the model, background, and other visual enhancements.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="grid gap-3">
                <Label htmlFor="model-type">Model Type</Label>
                <Select>
                  <SelectTrigger id="model-type">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="none">None (Product Only)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3">
                <Label htmlFor="background-style">Background Style</Label>
                <Select>
                  <SelectTrigger id="background-style">
                    <SelectValue placeholder="Select background" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="studio">Studio</SelectItem>
                    <SelectItem value="outdoor">Outdoor</SelectItem>
                    <SelectItem value="city">City</SelectItem>
                    <SelectItem value="abstract">Abstract</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Separator />
            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <Label>Enhancements</Label>
                <Button onClick={handleSuggestEnhancements} variant="ghost" size="sm" disabled={isSuggesting}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {isSuggesting ? "Suggesting..." : "AI Suggestions"}
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {suggestedEnhancements.length > 0
                  ? suggestedEnhancements.map((enhancement) => (
                      <div className="flex items-center space-x-2" key={enhancement}>
                        <Checkbox id={enhancement} onCheckedChange={(checked) => handleEnhancementChange(!!checked, enhancement)} />
                        <label
                          htmlFor={enhancement}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize"
                        >
                          {enhancement.replace(/_/g, ' ')}
                        </label>
                      </div>
                    ))
                  : [1,2,3,4,5,6].map(i => <div key={i} className="flex items-center space-x-2"><Skeleton className="h-4 w-4" /><Skeleton className="h-4 w-24" /></div>)}
              </div>
            </div>
          </CardContent>
          <CardFooter>
             <Button className="w-full" size="lg" onClick={handleGenerate} disabled={isGenerating}>
              <Bot className="mr-2 h-5 w-5" />
              {isGenerating ? 'Generating Image...' : 'Generate (2 Credits)'}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Right Column: Image Preview */}
      <div className="grid auto-rows-max items-start gap-4 lg:col-span-1">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="font-headline">Image Preview</CardTitle>
            <CardDescription>
              Your original and AI-generated images will appear here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <h3 className="font-semibold">Original Image</h3>
                <div className="relative aspect-square w-full overflow-hidden rounded-md border">
                  {originalImage ? (
                    <Image
                      alt="Original product"
                      src={originalImage.imageUrl}
                      fill
                      className="object-cover"
                      data-ai-hint={originalImage.imageHint}
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center bg-muted">
                        <Upload className="h-10 w-10 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mt-2">Upload an image</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid gap-2">
                <h3 className="font-semibold">Generated Image</h3>
                 {isGenerating ? (
                   <Skeleton className="aspect-square w-full" />
                 ) : generatedImage ? (
                    <div className="relative aspect-square w-full overflow-hidden rounded-md border">
                        <Image
                        alt="Generated product"
                        src={generatedImage}
                        fill
                        className="object-cover"
                        data-ai-hint="fashion model"
                        />
                    </div>
                 ) : (
                    <div className="flex aspect-square w-full items-center justify-center rounded-md border-2 border-dashed">
                        <div className="text-center text-muted-foreground">
                            <Bot className="mx-auto h-12 w-12" />
                            <p className="mt-2 text-sm">Your AI image will appear here.</p>
                        </div>
                    </div>
                 )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
