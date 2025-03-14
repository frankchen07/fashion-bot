import * as FileSystem from "expo-file-system"
import { OPENAI_API_KEY } from "@env"

// OpenAI API configuration
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"

// Function to convert image to base64
const imageToBase64 = async (imageUri) => {
  try {
    // Check if the image URI is a remote URL
    if (imageUri.startsWith("http")) {
      // Download the image first
      const fileInfo = await FileSystem.downloadAsync(imageUri, FileSystem.documentDirectory + "temp_image.jpg")
      imageUri = fileInfo.uri
    }

    // Read the file as base64
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    })

    return base64
  } catch (error) {
    console.error("Error converting image to base64:", error)
    throw error
  }
}

// Function to analyze outfit using OpenAI's Vision API
export const analyzeOutfit = async (imageUri) => {
  try {
    // Verify API key is available
    if (!OPENAI_API_KEY) {
      throw new Error("OpenAI API key is not configured")
    }
    
    // Convert image to base64
    const base64Image = await imageToBase64(imageUri)

    // Prepare the prompt for factual outfit analysis
    const prompt = `
      You are Derek Guy, the renowned menswear expert from Die, Workwear! This is your website: https://dieworkwear.com. Analyze this outfit image and provide only factual observations.
      
      Please provide:
      1. A detailed breakdown of each visible clothing item (name, fit, condition)
      2. An objective description of the overall style
      
      Format your response as a JSON object with these keys:
      - outfitItems: array of objects with {name, fit, condition}
      - styleDescription: string with your factual description of the outfit
    `

    // Prepare the request payload
    const payload = {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
      response_format: { type: "json_object" },
    }

    // Make the API request
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(payload),
    })

    // Parse the response
    const data = await response.json()

    if (data.error) {
      throw new Error(data.error.message || "Error from OpenAI API")
    }

    // Extract and parse the JSON response
    const content = data.choices[0].message.content
    const analysisResult = JSON.parse(content)

    return analysisResult
  } catch (error) {
    console.error("Error analyzing outfit:", error)

    // Return a fallback response in case of error
    return {
      outfitItems: [{ name: "Item detection failed", fit: "Unable to analyze", condition: "Please try again" }],
      styleDescription: "We encountered an error analyzing your outfit. Please check your internet connection and try again.",
    }
  }
}

// Function to generate recommendations based on outfit analysis
export const generateRecommendations = async (analysisResult) => {
  try {
    // Verify API key is available
    if (!OPENAI_API_KEY) {
      throw new Error("OpenAI API key is not configured")
    }

    // Convert the analysis result to a string description
    const outfitDescription = JSON.stringify(analysisResult)

    // Prepare the prompt for Derek Guy style recommendations
    const prompt = `
      You are Derek Guy, the renowned menswear expert from Die, Workwear! This is your website: https://dieworkwear.com.

      Based on the following outfit description, provide recommendations in your distinctive voice and expertise:
      ${outfitDescription}
      
      Please provide:
      1. An overall style assessment in your characteristic thoughtful, historically-informed perspective
      2. Specific recommendations for improvement that reflect your deep knowledge of classic menswear
      3. Key fashion terminology that would help educate the wearer
      
      Format your response as a JSON object with these keys:
      - styleAssessment: string with your overall assessment
      - recommendations: array of strings with specific suggestions
      - fashionTerms: array of objects with {term, definition}
    `

    // Prepare the request payload
    const payload = {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 1000,
      response_format: { type: "json_object" },
    }

    // Make the API request
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(payload),
    })

    // Parse the response
    const data = await response.json()

    if (data.error) {
      throw new Error(data.error.message || "Error from OpenAI API")
    }

    // Extract and parse the JSON response
    const content = data.choices[0].message.content
    const recommendationsResult = JSON.parse(content)

    return recommendationsResult
  } catch (error) {
    console.error("Error generating recommendations:", error)

    // Return a fallback response in case of error
    return {
      styleAssessment: "We encountered an error generating recommendations. Please try again.",
      recommendations: ["Try taking a photo with better lighting", "Ensure your full outfit is visible in the frame"],
      fashionTerms: [{ term: "Error", definition: "We couldn't process your request. Please try again." }],
    }
  }
}

// Function to combine analysis and recommendations
export const getCompleteOutfitAnalysis = async (analysisResult) => {
  try {
    // Generate recommendations based on the analysis
    const recommendationsResult = await generateRecommendations(analysisResult)
    
    // Combine the results
    return {
      outfitItems: analysisResult.outfitItems,
      styleAssessment: recommendationsResult.styleAssessment,
      recommendations: recommendationsResult.recommendations,
      fashionTerms: recommendationsResult.fashionTerms,
    }
  } catch (error) {
    console.error("Error combining analysis and recommendations:", error)
    
    // Return a fallback response
    return {
      outfitItems: analysisResult.outfitItems || [{ name: "Item detection failed", fit: "Unable to analyze", condition: "Please try again" }],
      styleAssessment: "We encountered an error generating recommendations. Please try again.",
      recommendations: ["Try taking a photo with better lighting", "Ensure your full outfit is visible in the frame"],
      fashionTerms: [{ term: "Error", definition: "We couldn't process your request. Please try again." }],
    }
  }
}

