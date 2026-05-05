import * as FileSystem from "expo-file-system/legacy"
import { OPENAI_API_KEY } from "@env"
import { getSourceGroupedContext } from "./ragService"

const pick = (obj, ...keys) => {
  for (const k of keys) if (obj[k] != null) return obj[k]
  return ""
}

export const normalizeAnalysis = (raw) => ({
  ...raw,
  fashionTerms: raw.fashionTerms || [],
  outfitItems: (raw.outfitItems || []).map((item) => ({
    "garment type or name": pick(item, "garment type or name", "garmentTypeOrName", "garmentType", "garment_type_or_name", "name", "type"),
    "fit and silhouette":   pick(item, "fit and silhouette",   "fitAndSilhouette",   "fit_and_silhouette",   "fit", "silhouette"),
    "condition and wear":   pick(item, "condition and wear",   "conditionAndWear",   "condition_and_wear",   "condition", "wear"),
    "fabric and texture":   pick(item, "fabric and texture",   "fabricAndTexture",   "fabric_and_texture",   "fabric", "texture", "material"),
    "styling and influence": pick(item, "styling and influence", "stylingAndInfluence", "styling_and_influence", "styling", "style", "influence"),
  })),
})

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
      3. Key fashion terminology relevant to the identified garments (terms a wearer should know)

      Format your response as a JSON object with these keys:
      - outfitItems: array of objects with {"garment type or name", "fit and silhouette", "condition and wear", "fabric and texture", "styling and influence"}
      - styleDescription: string with your factual description of the outfit
      - fashionTerms: array of objects with {term, definition}
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
      max_tokens: 1500,
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

    return normalizeAnalysis(analysisResult)
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

const SOURCE_VOICES = {
  dieworkwear: "Derek Guy from Die, Workwear! (dieworkwear.com) — historically-informed, precise, draws on tailoring tradition and Ivy League menswear, intellectually serious but accessible",
  permanentstyle: "Permanent Style — focused on luxury craft, made-to-measure, bespoke tailoring, and quality materials; refined and authoritative",
  sartorialnotes: "Sartorial Notes — thoughtful, collector-minded, emphasis on classic Italian and English tailoring, details and provenance matter",
  gentlemansgazette: "Gentleman's Gazette — encyclopedic, formal, rooted in traditional dress codes and historical menswear etiquette",
  apetogentleman: "Ape to Gentleman — approachable, contemporary, bridges streetwear and smart-casual; practical for a modern audience",
  realmenrealstyle: "Real Men Real Style — direct, actionable, focused on building a versatile wardrobe; practical and encouraging",
  dappered: "Dappered — budget-conscious, value-focused, everyday style for regular guys; concrete and unpretentious",
  articlesofstyle: "Articles of Style — Chicago-based made-to-measure perspective; personal, story-driven, emphasis on fit and individuality",
}

// Function to generate per-source recommendations based on outfit analysis
export const generateRecommendations = async (analysisResult) => {
  try {
    if (!OPENAI_API_KEY) {
      throw new Error("OpenAI API key is not configured")
    }

    const outfitDescription = JSON.stringify(analysisResult)
    console.log("Generating recommendations for:", outfitDescription)

    const groupedContext = await getSourceGroupedContext(analysisResult)

    let sourceSections = ""
    let sourceList = []

    if (groupedContext && Object.keys(groupedContext).length > 0) {
      sourceList = Object.keys(groupedContext)
      sourceSections = sourceList.map((src) => {
        const voice = SOURCE_VOICES[src] || src
        return `--- SOURCE: ${src} ---\nVoice: ${voice}\nRelevant excerpts:\n${groupedContext[src]}`
      }).join("\n\n")
    } else {
      // Fallback: no RAG context, generate a single generic take
      sourceList = ["general"]
      sourceSections = "No source context available — use your general menswear expertise."
    }

    const allowedSources = sourceList.join(", ")

    const prompt = groupedContext
      ? `You are a fashion recommendation engine. For each menswear publication below, write a style assessment and specific recommendations IN THAT PUBLICATION'S CHARACTERISTIC VOICE, grounded in the provided excerpts.

Outfit:
${outfitDescription}

${sourceSections}

Return a JSON object with exactly one key "sources" — an array where each object has:
- "source": MUST be exactly one of these identifiers: ${allowedSources}
- "styleAssessment": 2-3 sentences in that publication's voice
- "recommendations": array of 2-4 specific suggestion strings

IMPORTANT: Only include sources from this list: ${allowedSources}. Do not invent or add any other source names. Do not include fashionTerms.`
      : `You are a menswear expert. Analyze this outfit and give practical recommendations.

Outfit:
${outfitDescription}

Return a JSON object with exactly one key "sources" containing exactly one object:
{ "source": "general", "styleAssessment": "...", "recommendations": ["...", "..."] }

Do not use any other source name besides "general". Do not include fashionTerms.`

    const payload = {
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2000,
      response_format: { type: "json_object" },
    }

    console.log("Sending recommendations request to OpenAI API...")

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
    const data = JSON.parse(responseText)

    if (data.error) {
      console.error("OpenAI API error in recommendations:", data.error)
      throw new Error(data.error.message || "Error from OpenAI API")
    }

    const content = data.choices[0].message.content
    const result = JSON.parse(content)
    console.log("Parsed recommendations result:", JSON.stringify(result, null, 2))
    return result
  } catch (error) {
    console.error("Error generating recommendations:", error)
    const timedOut = error.message.includes("timed out")
    return {
      sources: [{
        source: "general",
        styleAssessment: timedOut
          ? "The request timed out. Please try again with a better internet connection."
          : "We encountered an error generating recommendations. Please try again.",
        recommendations: timedOut
          ? ["Try again with a better internet connection", "Check your network stability"]
          : ["Try taking a photo with better lighting", "Ensure your full outfit is visible in the frame"],
      }],
    }
  }
}

// Function to combine analysis and recommendations
export const getCompleteOutfitAnalysis = async (analysisResult) => {
  try {
    const recommendationsResult = await generateRecommendations(analysisResult)
    return {
      outfitItems: analysisResult.outfitItems,
      fashionTerms: analysisResult.fashionTerms || [],
      sources: recommendationsResult.sources || [],
    }
  } catch (error) {
    console.error("Error combining analysis and recommendations:", error)
    return {
      outfitItems: analysisResult.outfitItems || [],
      fashionTerms: [],
      sources: [],
    }
  }
}

