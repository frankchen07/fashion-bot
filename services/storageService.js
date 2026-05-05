import AsyncStorage from "@react-native-async-storage/async-storage"
import * as FileSystem from "expo-file-system/legacy"

const HISTORY_KEY = "wardrobe_history"
const IMAGE_DIR = FileSystem.documentDirectory + "wardrobe/"

const ensureDir = async () => {
  const info = await FileSystem.getInfoAsync(IMAGE_DIR)
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(IMAGE_DIR, { intermediates: true })
  }
}

export const saveAnalysis = async (imageUri, analysis) => {
  const id = Date.now().toString()
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
}
