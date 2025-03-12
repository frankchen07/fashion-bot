"use client"

import { useEffect, useState } from "react"
import { StyleSheet, View, Text, Image, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { analyzeOutfit } from "../services/aiService"

const AnalysisScreen = ({ route, navigation }) => {
  const { imageUri } = route.params
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)

  useEffect(() => {
    const processImage = async () => {
      try {
        setProgress(10)
        // Simulate progress updates
        const progressInterval = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 90) {
              clearInterval(progressInterval)
              return prev
            }
            return prev + 10
          })
        }, 800)

        // Call the AI service to analyze the outfit
        const analysisResult = await analyzeOutfit(imageUri)

        clearInterval(progressInterval)
        setProgress(100)

        // Navigate to recommendations screen with the analysis results
        setTimeout(() => {
          navigation.replace("Recommendations", {
            imageUri,
            analysis: analysisResult,
          })
        }, 500)
      } catch (err) {
        setError("Failed to analyze the outfit. Please try again.")
        setLoading(false)
        console.error("Analysis error:", err)
      }
    }

    processImage()
  }, [imageUri, navigation])

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" />

        <View style={styles.analysisContainer}>
          <Text style={styles.title}>Analyzing your outfit</Text>

          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : (
            <>
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${progress}%` }]} />
              </View>

              <View style={styles.statusContainer}>
                <ActivityIndicator size="large" color="#3d5a80" />
                <Text style={styles.statusText}>
                  {progress < 30
                    ? "Identifying clothing items..."
                    : progress < 60
                      ? "Analyzing style elements..."
                      : progress < 90
                        ? "Processing outfit details..."
                        : "Finalizing analysis..."}
                </Text>
              </View>
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  image: {
    width: "100%",
    height: 300,
    borderRadius: 12,
    marginBottom: 20,
  },
  analysisContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#212529",
    marginBottom: 20,
    textAlign: "center",
  },
  progressContainer: {
    height: 8,
    backgroundColor: "#e9ecef",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 20,
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#3d5a80",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  statusText: {
    fontSize: 16,
    color: "#495057",
  },
  errorText: {
    color: "#e63946",
    fontSize: 16,
    textAlign: "center",
    marginTop: 10,
  }
})

export default AnalysisScreen

