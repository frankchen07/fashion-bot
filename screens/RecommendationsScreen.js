"use client"

import { useState } from "react"
import { StyleSheet, View, Text, Image, ScrollView, TouchableOpacity, Linking } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"

const RecommendationsScreen = ({ route }) => {
  const { imageUri, analysis } = route.params
  const [activeTab, setActiveTab] = useState("analysis")

  // In a real app, this would come from the AI analysis
  // This is mock data for demonstration
  const mockAnalysis = {
    outfitItems: [
      { name: "Navy Blazer", fit: "Slightly oversized", condition: "Good" },
      { name: "White Dress Shirt", fit: "Regular", condition: "Wrinkled" },
      { name: "Gray Trousers", fit: "Too long", condition: "Good" },
      { name: "Brown Leather Shoes", fit: "Appropriate", condition: "Needs polish" },
    ],
    styleAssessment:
      "Your outfit has good foundational elements of business casual attire, but there are some fit and styling issues that could be improved. The color palette is versatile, but the execution needs refinement.",
    recommendations: [
      "Have your trousers hemmed to achieve a slight break at the shoe",
      "Iron your shirt to create a more polished appearance",
      "Consider a slimmer cut blazer that follows your silhouette more closely",
      "Polish your shoes to elevate the overall look",
      "Add a pocket square for a touch of sophistication",
    ],
    inspirationOutfits: [
      {
        id: 1,
        image: "https://i.imgur.com/JyERwB0.jpg",
        description: "Classic business casual with proper fit",
        items: [
          "Navy tailored blazer",
          "Crisp white shirt",
          "Gray trousers with proper break",
          "Polished brown cap-toe oxfords",
          "Burgundy pocket square",
        ],
        shopLinks: [
          { name: "Similar Blazer", url: "https://www.example.com/blazer" },
          { name: "Dress Shirts", url: "https://www.example.com/shirts" },
        ],
      },
      {
        id: 2,
        image: "https://i.imgur.com/nPDMJAn.jpg",
        description: "Modern business casual with subtle pattern",
        items: [
          "Navy blazer with subtle texture",
          "Light blue shirt",
          "Charcoal gray trousers",
          "Burgundy leather loafers",
          "Patterned pocket square",
        ],
        shopLinks: [
          { name: "Quality Trousers", url: "https://www.example.com/trousers" },
          { name: "Leather Shoes", url: "https://www.example.com/shoes" },
        ],
      },
    ],
    fashionTerms: [
      { term: "Break", definition: "The fold or creasing of the trouser fabric when it meets the shoe" },
      { term: "Blazer", definition: "A tailored jacket typically with structured shoulders and metal buttons" },
      {
        term: "Oxford",
        definition: "A dress shoe with closed lacing system where the eyelet tabs are stitched under the vamp",
      },
    ],
  }

  // Use the mock data for demonstration
  const analysisData = analysis || mockAnalysis

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

      <Text style={styles.sectionTitle}>Style Assessment</Text>
      <View style={styles.assessmentCard}>
        <Text style={styles.assessmentText}>{analysisData.styleAssessment}</Text>
      </View>
    </View>
  )

  const renderRecommendationsTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Improvement Suggestions</Text>
      <View style={styles.recommendationsCard}>
        {analysisData.recommendations.map((recommendation, index) => (
          <View key={index} style={styles.recommendationItem}>
            <Ionicons name="checkmark-circle" size={20} color="#2a9d8f" />
            <Text style={styles.recommendationText}>{recommendation}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Fashion Terminology</Text>
      <View style={styles.termsCard}>
        {analysisData.fashionTerms.map((term, index) => (
          <View key={index} style={styles.termItem}>
            <Text style={styles.termName}>{term.term}</Text>
            <Text style={styles.termDefinition}>{term.definition}</Text>
          </View>
        ))}
      </View>
    </View>
  )

  const renderInspirationTab = () => (
    <View style={styles.tabContent}>
      {analysisData.inspirationOutfits.map((outfit) => (
        <View key={outfit.id} style={styles.inspirationCard}>
          <Image source={{ uri: outfit.image }} style={styles.inspirationImage} resizeMode="cover" />
          <View style={styles.inspirationDetails}>
            <Text style={styles.inspirationTitle}>{outfit.description}</Text>
            <Text style={styles.inspirationSubtitle}>Key Elements:</Text>
            {outfit.items.map((item, index) => (
              <View key={index} style={styles.inspirationItem}>
                <Ionicons name="arrow-forward" size={16} color="#3d5a80" />
                <Text style={styles.inspirationItemText}>{item}</Text>
              </View>
            ))}
            <Text style={styles.inspirationSubtitle}>Shop Similar:</Text>
            <View style={styles.shopLinks}>
              {outfit.shopLinks.map((link, index) => (
                <TouchableOpacity key={index} style={styles.shopButton} onPress={() => Linking.openURL(link.url)}>
                  <Text style={styles.shopButtonText}>{link.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      ))}
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
              Recommendations
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "inspiration" && styles.activeTab]}
            onPress={() => setActiveTab("inspiration")}
          >
            <Text style={[styles.tabText, activeTab === "inspiration" && styles.activeTabText]}>Inspiration</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {activeTab === "analysis" && renderAnalysisTab()}
          {activeTab === "recommendations" && renderRecommendationsTab()}
          {activeTab === "inspiration" && renderInspirationTab()}
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
  inspirationCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: "hidden",
  },
  inspirationImage: {
    width: "100%",
    height: 200,
  },
  inspirationDetails: {
    padding: 15,
  },
  inspirationTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#212529",
    marginBottom: 12,
  },
  inspirationSubtitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#3d5a80",
    marginTop: 12,
    marginBottom: 8,
  },
  inspirationItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 8,
  },
  inspirationItemText: {
    fontSize: 14,
    color: "#495057",
    flex: 1,
  },
  shopLinks: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8,
  },
  shopButton: {
    backgroundColor: "#e9ecef",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  shopButtonText: {
    fontSize: 14,
    color: "#3d5a80",
    fontWeight: "500",
  },
})

export default RecommendationsScreen

