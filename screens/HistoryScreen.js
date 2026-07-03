import { useState, useCallback } from "react"
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useFocusEffect } from "@react-navigation/native"
import { getHistory, deleteEntry } from "../services/storageService"
import { normalizeAnalysis } from "../services/aiService"

const HistoryScreen = ({ navigation }) => {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useFocusEffect(
    useCallback(() => {
      loadHistory()
    }, [])
  )

  const loadHistory = async () => {
    setLoading(true)
    const entries = await getHistory()
    setHistory(entries)
    setLoading(false)
  }

  const handleDelete = (id) => {
    Alert.alert("Delete Entry", "Remove this outfit from your history?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteEntry(id)
            setHistory((prev) => prev.filter((e) => e.id !== id))
          } catch (e) {
            Alert.alert("Error", "Failed to delete entry. Please try again.")
          }
        },
      },
    ])
  }

  const handleOpen = (entry) => {
    navigation.navigate("Recommendations", {
      imageUri: entry.imageUri,
      analysis: entry.analysis,
      entryId: entry.id,
    })
  }

  const formatDate = (iso) => {
    const d = new Date(iso)
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }

  const renderEntry = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => handleOpen(item)} activeOpacity={0.8}>
      <Image source={{ uri: item.imageUri }} style={styles.thumbnail} resizeMode="cover" />
      <View style={styles.cardBody}>
        <Text style={styles.dateText}>{formatDate(item.timestamp)}</Text>
        <Text style={styles.descText} numberOfLines={2}>
          {normalizeAnalysis(item.analysis || {}).styleDescription || "No description"}
        </Text>
      </View>
      <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)} hitSlop={8}>
        <Ionicons name="trash-outline" size={20} color="#adb5bd" />
      </TouchableOpacity>
    </TouchableOpacity>
  )

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#3d5a80" style={{ marginTop: 60 }} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {history.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="shirt-outline" size={64} color="#dee2e6" />
          <Text style={styles.emptyTitle}>No outfits yet</Text>
          <Text style={styles.emptySubtitle}>Analyze an outfit and it'll show up here.</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          renderItem={renderEntry}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  list: {
    padding: 16,
    gap: 12,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    alignItems: "center",
  },
  thumbnail: {
    width: 80,
    height: 80,
  },
  cardBody: {
    flex: 1,
    padding: 12,
    gap: 4,
  },
  dateText: {
    fontSize: 13,
    color: "#6c757d",
    fontWeight: "500",
  },
  descText: {
    fontSize: 14,
    color: "#212529",
    lineHeight: 20,
  },
  deleteBtn: {
    padding: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#495057",
  },
  emptySubtitle: {
    fontSize: 15,
    color: "#adb5bd",
    textAlign: "center",
  },
})

export default HistoryScreen
