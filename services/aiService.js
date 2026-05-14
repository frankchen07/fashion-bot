import * as FileSystem from "expo-file-system/legacy"
import { createClient } from "@supabase/supabase-js"
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@env"
import { getOrCreateDeviceId } from "./storageService"

let _supabase = null
const getSupabase = () => {
  if (!_supabase) _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  return _supabase
}

const pick = (obj, ...keys) => {
  for (const k of keys) if (obj[k] != null) return obj[k]
  return ""
}

export const normalizeAnalysis = (raw) => ({
  ...raw,
  fashionTerms: raw.fashionTerms || [],
  outfitItems: (raw.outfitItems || []).map((item) => ({
    "garment type or name":  pick(item, "garment type or name", "garmentTypeOrName", "garmentType", "garment_type_or_name", "name", "type"),
    "fit and silhouette":    pick(item, "fit and silhouette",   "fitAndSilhouette",   "fit_and_silhouette",   "fit", "silhouette"),
    "condition and wear":    pick(item, "condition and wear",   "conditionAndWear",   "condition_and_wear",   "condition", "wear"),
    "fabric and texture":    pick(item, "fabric and texture",   "fabricAndTexture",   "fabric_and_texture",   "fabric", "texture", "material"),
    "styling and influence": pick(item, "styling and influence", "stylingAndInfluence", "styling_and_influence", "styling", "style", "influence"),
  })),
})

const imageToBase64 = async (imageUri) => {
  try {
    if (imageUri.startsWith("http")) {
      const fileInfo = await FileSystem.downloadAsync(
        imageUri,
        FileSystem.documentDirectory + "temp_image.jpg"
      )
      imageUri = fileInfo.uri
    }
    return FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    })
  } catch (error) {
    if (__DEV__) console.error("Error converting image to base64:", error)
    throw error
  }
}

export const analyzeOutfit = async (imageUri) => {
  const [base64Image, deviceId] = await Promise.all([
    imageToBase64(imageUri),
    getOrCreateDeviceId(),
  ])
  const { data, error } = await getSupabase().functions.invoke("analyze-outfit", {
    body: { base64Image },
    headers: { "x-device-id": deviceId },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return normalizeAnalysis(data)
}

export const generateRecommendations = async (analysisResult) => {
  const { data, error } = await getSupabase().functions.invoke("get-recommendations", {
    body: { analysis: analysisResult },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data
}
