import * as FileSystem from "expo-file-system"
import { OPENAI_API_KEY } from "@env"

// OpenAI API configuration
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"
const API_TIMEOUT = 60000 // 60 seconds timeout

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

// Helper function to make API calls with timeout
const makeAPICall = async (url, options) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.')
    }
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

      1. A detailed breakdown of each visible clothing item, including these categories but not limited to these examples:
        a. Garment Type & Name
          - Tailoring → Sack suit, Neapolitan jacket, English drape, hacking jacket, double-breasted blazer, dinner suit
          - Casualwear → OCBD (Oxford cloth button-down), camp shirt, chore coat, M-65 jacket, Barbour, field jacket
          - Knitwear → Shetland sweater, Fair Isle, cable knit, cricket sweater, roll neck
          - Trousers → Pleated trousers, high-rise trousers, Gurkhas, selvedge denim, flannel trousers
          - Footwear → Oxfords, derbies, loafers (tassel, penny, Belgian), chukka boots, service boots
        b. Fit & Silhouette
          - Close-fitting → Trim, tailored, slim-cut, sharp
          - Relaxed → Roomy, drapey, louche, slouchy, oversized
          - Proportions → High-rise, long-lined, cropped, boxy, tapered, full-cut
        c. Condition & Wear
        	- New → Pristine, deadstock, NOS (new old stock), unwashed
        	- Aged/Worn → Patina, broken-in, faded, whiskering, honeycombs (for denim), softly worn
        d. Fabric & Texture
        	- Wool → Tweed, flannel, worsted, cashmere, herringbone, houndstooth
        	- Cotton → Poplin, Oxford, broadcloth, gabardine, corduroy, moleskin
        	- Denim → Selvedge, raw, slubby, stonewashed, rope-dyed
        	- Leather → Shell cordovan, full-grain, top-grain, pebble-grain suede, veg-tanned
        e. Styling & Influence
        	- Classic Menswear → Ivy, Neapolitan, Savile Row, British countrywear
        	- Casual → Workwear, Americana, Japanese repro, rugged
        	- Refinement → Understated, elegant, rakish, insouciant, refined, subtle

      2. An objective description of the overall style
      
      Format your response as a JSON object with these keys:
      - outfitItems: array of objects with {"garment type or name", "fit and silhouette", "condition and wear", "fabric and texture", "styling and influence"}
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

    console.log("Sending request to OpenAI API...")
    console.log("Payload:", JSON.stringify(payload, null, 2))

    // Make the API request with timeout
    const response = await makeAPICall(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(payload),
    })

    console.log("API Response status:", response.status)
    const responseText = await response.text()
    console.log("Raw API response:", responseText)

    // Parse the response
    const data = JSON.parse(responseText)

    if (data.error) {
      console.error("OpenAI API error:", data.error)
      throw new Error(data.error.message || "Error from OpenAI API")
    }

    // Extract and parse the JSON response
    const content = data.choices[0].message.content
    console.log("Raw API response content:", content)
    const analysisResult = JSON.parse(content)
    console.log("Parsed analysis result:", JSON.stringify(analysisResult, null, 2))

    return analysisResult
  } catch (error) {
    console.error("Error analyzing outfit:", error)
    if (error.message.includes('timed out')) {
      return {
        outfitItems: [{
          "garment type or name": "Request timed out",
          "fit and silhouette": "Please try again",
          "condition and wear": "The analysis took too long",
          "fabric and texture": "N/A",
          "styling and influence": "N/A"
        }],
        styleDescription: "The request timed out. Please try again with a better internet connection.",
      }
    }

    // Return a fallback response in case of error
    return {
      outfitItems: [{
        "garment type or name": "Item detection failed",
        "fit and silhouette": "Unable to analyze",
        "condition and wear": "Please try again",
        "fabric and texture": "N/A",
        "styling and influence": "N/A"
      }],
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
    console.log("Generating recommendations for:", outfitDescription)

    // Prepare the prompt for Derek Guy style recommendations
    const prompt = `
      You are Derek Guy, the renowned menswear expert from Die, Workwear! This is your website: https://dieworkwear.com.

      Based on the following outfit description, provide recommendations in your distinctive voice and expertise:
      ${outfitDescription}
      
      Please provide:
      1. An overall style assessment in your characteristic thoughtful, historically-informed perspective
      2. Specific recommendations for improvement that reflect your deep knowledge of classic menswear. You may also say, "it's pretty good" if it's something you'd wear yourself, which will let me know that my outfit is already on point. You may also say, "it needs a lot of improvement" if it's something that's pretty bad.
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

    console.log("Sending recommendations request to OpenAI API...")
    console.log("Payload:", JSON.stringify(payload, null, 2))

    // Make the API request with timeout
    const response = await makeAPICall(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(payload),
    })

    console.log("Recommendations API Response status:", response.status)
    const responseText = await response.text()
    console.log("Raw recommendations response:", responseText)

    // Parse the response
    const data = JSON.parse(responseText)

    if (data.error) {
      console.error("OpenAI API error in recommendations:", data.error)
      throw new Error(data.error.message || "Error from OpenAI API")
    }

    // Extract and parse the JSON response
    const content = data.choices[0].message.content
    console.log("Raw recommendations content:", content)
    const recommendationsResult = JSON.parse(content)
    console.log("Parsed recommendations result:", JSON.stringify(recommendationsResult, null, 2))

    return recommendationsResult
  } catch (error) {
    console.error("Error generating recommendations:", error)
    if (error.message.includes('timed out')) {
      return {
        styleAssessment: "The request timed out. Please try again with a better internet connection.",
        recommendations: ["Try again with a better internet connection", "Check your network stability"],
        fashionTerms: [{ term: "Timeout", definition: "The request took too long to complete. Please try again." }],
      }
    }

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
      outfitItems: analysisResult.outfitItems || [{
        "garment type or name": "Item detection failed",
        "fit and silhouette": "Unable to analyze",
        "condition and wear": "Please try again",
        "fabric and texture": "N/A",
        "styling and influence": "N/A"
      }],
      styleAssessment: "We encountered an error generating recommendations. Please try again.",
      recommendations: ["Try taking a photo with better lighting", "Ensure your full outfit is visible in the frame"],
      fashionTerms: [{ term: "Error", definition: "We couldn't process your request. Please try again." }],
    }
  }
}

