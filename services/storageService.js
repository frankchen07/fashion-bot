import AsyncStorage from "@react-native-async-storage/async-storage"
import * as FileSystem from "expo-file-system/legacy"

const HISTORY_KEY = "wardrobe_history"
const RECOMMENDATIONS_KEY = "wardrobe_recommendations"
const IMAGE_DIR = FileSystem.documentDirectory + "wardrobe/"

const ensureDir = async () => {
  const info = await FileSystem.getInfoAsync(IMAGE_DIR)
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(IMAGE_DIR, { intermediates: true })
  }
}

export const saveAnalysis = async (imageUri, analysis) => {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  await ensureDir()

  // Copy to persistent location — picker URIs expire on iOS
  const persistentUri = IMAGE_DIR + id + ".jpg"
  await FileSystem.copyAsync({ from: imageUri, to: persistentUri })

  const entry = {
    id,
    timestamp: new Date().toISOString(),
    imageUri: persistentUri,
    analysis,
  }

  const existing = await getHistory()
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify([entry, ...existing]))
  return entry
}

export const getHistory = async () => {
  const raw = await AsyncStorage.getItem(HISTORY_KEY)
  return raw ? JSON.parse(raw) : []
}

export const deleteEntry = async (id) => {
  const history = await getHistory()
  const entry = history.find((e) => e.id === id)
  if (entry) {
    await FileSystem.deleteAsync(entry.imageUri, { idempotent: true }).catch(() => {})
  }
  const updated = history.filter((e) => e.id !== id)
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated))

  const recsRaw = await AsyncStorage.getItem(RECOMMENDATIONS_KEY)
  if (recsRaw) {
    const recs = JSON.parse(recsRaw)
    delete recs[id]
    await AsyncStorage.setItem(RECOMMENDATIONS_KEY, JSON.stringify(recs))
  }
}

export const saveRecommendations = async (id, recommendations) => {
  const raw = await AsyncStorage.getItem(RECOMMENDATIONS_KEY)
  const existing = raw ? JSON.parse(raw) : {}
  existing[id] = recommendations
  await AsyncStorage.setItem(RECOMMENDATIONS_KEY, JSON.stringify(existing))
}

export const getRecommendations = async (id) => {
  const raw = await AsyncStorage.getItem(RECOMMENDATIONS_KEY)
  if (!raw) return null
  return JSON.parse(raw)[id] || null
}
