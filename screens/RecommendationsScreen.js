"use client"

import { useState, useEffect } from "react"
import { StyleSheet, View, Text, Image, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { generateRecommendations } from "../services/aiService"

const RecommendationsScreen = ({ route }) => {
  const { imageUri, analysis } = route.params
  const [activeTab, setActiveTab] = useState("analysis")
  const [recommendations, setRecommendations] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Fallback data in case analysis fails
  const fallbackAnalysis = {
    outfitItems: [{ name: "Analysis not available", fit: "N/A", condition: "N/A" }],
    styleDescription: "We couldn't analyze your outfit. Please try again with a clearer photo.",
  }

  // Use the analysis data or fallback if not available
  const analysisData = analysis || fallbackAnalysis

  // Load recommendations when switching to the recommendations tab
  useEffect(() => {
    const loadRecommendations = async () => {
      if (activeTab === "recommendations" && !recommendations && !loading) {
        try {
          setLoading(true)
          setError(null)
          const result = await generateRecommendations(analysisData)
          setRecommendations(result)
        } catch (err) {
          console.error("Error loading recommendations:", err)
          setError("Failed to load recommendations. Please try again.")
        } finally {
          setLoading(false)
        }
      }
    }

    loadRecommendations()
  }, [activeTab, recommendations, loading, analysisData])

  const renderAnalysisTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Your Outfit Components</Text>
      {analysisData.outfitItems.map((item, index) => (
        <View key={index} style={styles.itemCard}>
          <Text style={styles.itemName}>{item.name}</Text>
          <View style={styles.itemDetails}>
            <View style={styles.itemDetail}>
              <Text style={styles.itemDetailLabel}>Fit:</Text>
              <Text style={styles.itemDetailValue}>{item.fit}</Text>
            </View>
            <View style={styles.itemDetail}>
              <Text style={styles.itemDetailLabel}>Condition:</Text>
              <Text style={styles.itemDetailValue}>{item.condition}</Text>
            </View>
          </View>
        </View>
      ))}

      <Text style={styles.sectionTitle}>Style Description</Text>
      <View style={styles.assessmentCard}>
        <Text style={styles.assessmentText}>{analysisData.styleDescription}</Text>
      </View>
    </View>
  )

  const renderRecommendationsTab = () => (
    <View style={styles.tabContent}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3d5a80" />
          <Text style={styles.loadingText}>Generating expert recommendations...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              setRecommendations(null)
              setLoading(false)
              setError(null)
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : recommendations ? (
        <>
          <Text style={styles.sectionTitle}>Expert Style Assessment</Text>
          <View style={styles.assessmentCard}>
            <Text style={styles.assessmentText}>{recommendations.styleAssessment}</Text>
          </View>

          <Text style={styles.sectionTitle}>Improvement Suggestions</Text>
          <View style={styles.recommendationsCard}>
            {recommendations.recommendations.map((recommendation, index) => (
              <View key={index} style={styles.recommendationItem}>
                <Ionicons name="checkmark-circle" size={20} color="#2a9d8f" />
                <Text style={styles.recommendationText}>{recommendation}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Fashion Terminology</Text>
          <View style={styles.termsCard}>
            {recommendations.fashionTerms.map((term, index) => (
              <View key={index} style={styles.termItem}>
                <Text style={styles.termName}>{term.term}</Text>
                <Text style={styles.termDefinition}>{term.definition}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Image source={{ uri: imageUri }} style={styles.outfitImage} resizeMode="cover" />
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "analysis" && styles.activeTab]}
            onPress={() => setActiveTab("analysis")}
          >
            <Text style={[styles.tabText, activeTab === "analysis" && styles.activeTabText]}>Analysis</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "recommendations" && styles.activeTab]}
            onPress={() => setActiveTab("recommendations")}
          >
            <Text style={[styles.tabText, activeTab === "recommendations" && styles.activeTabText]}>
              Derek Guy's Take
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {activeTab === "analysis" && renderAnalysisTab()}
          {activeTab === "recommendations" && renderRecommendationsTab()}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    width: "100%",
    height: 250,
    backgroundColor: "#e9ecef",
  },
  outfitImage: {
    width: "100%",
    height: "100%",
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#dee2e6",
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: "center",
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#3d5a80",
  },
  tabText: {
    fontSize: 16,
    color: "#6c757d",
  },
  activeTabText: {
    color: "#3d5a80",
    fontWeight: "600",
  },
  content: {
    padding: 20,
  },
  tabContent: {
    gap: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#212529",
    marginBottom: 10,
  },
  itemCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#212529",
    marginBottom: 8,
  },
  itemDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  itemDetail: {
    flexDirection: "row",
    alignItems: "center",
  },
  itemDetailLabel: {
    fontSize: 14,
    color: "#6c757d",
    marginRight: 4,
  },
  itemDetailValue: {
    fontSize: 14,
    color: "#212529",
  },
  assessmentCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  assessmentText: {
    fontSize: 16,
    color: "#212529",
    lineHeight: 24,
  },
  recommendationsCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 20,
  },
  recommendationItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 8,
  },
  recommendationText: {
    fontSize: 16,
    color: "#212529",
    flex: 1,
    lineHeight: 22,
  },
  termsCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 20,
  },
  termItem: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
    paddingBottom: 12,
  },
  termName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#212529",
    marginBottom: 4,
  },
  termDefinition: {
    fontSize: 14,
    color: "#495057",
    lineHeight: 20,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: "#495057",
    textAlign: "center",
  },
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  errorText: {
    fontSize: 16,
    color: "#e63946",
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#3d5a80",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
})

export default RecommendationsScreen

