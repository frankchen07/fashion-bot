import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

interface FashionAnalysis {
  description: string
  style: string
  suggestions: string[]
  examples: string[]
  shopping: string[]
}

export function useAIAnalysis() {
  // Function to analyze fashion using AI
  const analyzeFashionWithAI = async (imageBase64: string): Promise<FashionAnalysis> => {
    try {
      // In a real app, you would send the image to your backend
      // The backend would use the AI SDK to analyze the image

      // Example of how the backend would use the AI SDK:
      const prompt = `
        Analyze this outfit image:
        [Image: ${imageBase64.substring(0, 20)}...]
        
        Describe the outfit in fashion terms.
        Provide style improvement suggestions based on Die Work Wear style for men.
        Include specific terminology and potential items to purchase.
        Format your response as JSON with these fields:
        - description: detailed description of the current outfit
        - style: current style category
        - suggestions: array of 3 improvement suggestions
        - shopping: array of recommended items to purchase with price estimates
      `

      // This would be on your backend server
      const { text } = await generateText({
        model: openai("gpt-4o"),
        prompt: prompt,
        system:
          "You are a men's fashion expert specializing in classic menswear in the style of Die Work Wear blog. Analyze outfits and provide detailed, constructive feedback.",
      })

      // Parse the JSON response
      return JSON.parse(text)
    } catch (error) {
      console.error("Error analyzing fashion with AI:", error)
      throw error
    }
  }

  return { analyzeFashionWithAI }
}

