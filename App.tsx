"use client"

import { useState, useRef } from "react"
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
} from "react-native"
import * as ImagePicker from "expo-image-picker"
import { Camera, CameraType } from "expo-camera"
import * as FileSystem from "expo-file-system"
import { useAIAnalysis } from "./hooks/useAIAnalysis"

interface Analysis {
  description: string
  style: string
  suggestions: string[]
  shopping: string[]
  examples: string[]
}

export default function App() {
  const [image, setImage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [cameraVisible, setCameraVisible] = useState(false)
  const cameraRef = useRef<Camera | null>(null)
  const { analyzeFashionWithAI } = useAIAnalysis()

  // // Request camera and photo library permissions
  // const requestPermissions = async () => {
  //   const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync()
  //   const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync()

  //   if (cameraStatus !== "granted" || libraryStatus !== "granted") {
  //     alert("We need camera and photo library permissions to make this work!")
  //     return false
  //   }
  //   return true
  // }

  // Request camera and photo library permissions
  const requestPermissions = async () => {
    const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync()
    const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync()
  
    if (cameraStatus !== "granted" || libraryStatus !== "granted") {
      alert("We need camera and photo library permissions to make this work!")
      return false
    }
    return true
  }

  // Take a photo with the camera
  const takePhoto = async () => {
    if (!(await requestPermissions())) return
    setCameraVisible(true)
  }

  // Capture photo from camera
  const handleCameraCapture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync()
      setCameraVisible(false)
      setImage(photo.uri)
    }
  }

  // Pick an image from the photo library
  const pickImage = async () => {
    if (!(await requestPermissions())) return

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    })

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImage(result.assets[0].uri)
    }
  }

  // Analyze the fashion in the image
  const analyzeOutfit = async () => {
    if (!image) return

    setLoading(true)

    try {
      const base64Image = await FileSystem.readAsStringAsync(image, {
        encoding: FileSystem.EncodingType.Base64,
      })

      const analysisResult = await analyzeFashionWithAI(base64Image)
      setAnalysis(analysisResult)
    } catch (error) {
      console.error("Error analyzing outfit:", error)
      alert("Failed to analyze outfit. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Reset the app state
  const reset = () => {
    setImage(null)
    setAnalysis(null)
  }

  return (
    <SafeAreaView style={styles.container}>
      {cameraVisible ? (
        <View style={styles.cameraContainer}>
          <Camera style={styles.camera} type={CameraType.back} ref={cameraRef}>
            <View style={styles.cameraControls}>
              <TouchableOpacity style={styles.cameraButton} onPress={handleCameraCapture}>
                <Text style={styles.cameraButtonText}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cameraButton, styles.cancelButton]}
                onPress={() => setCameraVisible(false)}
              >
                <Text style={styles.cameraButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Camera>
        </View>
      ) : (
        <>
          <Text style={styles.title}>Fashion Advisor</Text>

          {!image ? (
            <View style={styles.inputContainer}>
              <TouchableOpacity style={styles.button} onPress={takePhoto}>
                <Text style={styles.buttonText}>Take a Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.button} onPress={pickImage}>
                <Text style={styles.buttonText}>Choose from Library</Text>
              </TouchableOpacity>
            </View>
          ) : !analysis ? (
            <View style={styles.previewContainer}>
              <Image source={{ uri: image }} style={styles.previewImage} />
              {loading ? (
                <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />
              ) : (
                <View style={styles.actionButtons}>
                  <TouchableOpacity style={styles.button} onPress={analyzeOutfit}>
                    <Text style={styles.buttonText}>Analyze Outfit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={reset}>
                    <Text style={styles.buttonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <ScrollView style={styles.resultsContainer}>
              <Text style={styles.sectionTitle}>Your Outfit</Text>
              <Image source={{ uri: image }} style={styles.resultImage} />

              <Text style={styles.sectionTitle}>Analysis</Text>
              <Text style={styles.descriptionText}>{analysis.description}</Text>
              <Text style={styles.styleText}>Style: {analysis.style}</Text>

              <Text style={styles.sectionTitle}>Suggestions</Text>
              {analysis.suggestions.map((suggestion, index) => (
                <Text key={index} style={styles.suggestionText}>
                  • {suggestion}
                </Text>
              ))}

              <Text style={styles.sectionTitle}>Style Examples</Text>
              <ScrollView horizontal style={styles.examplesContainer}>
                {analysis.examples.map((example, index) => (
                  <Image key={index} source={{ uri: example }} style={styles.exampleImage} />
                ))}
              </ScrollView>

              <Text style={styles.sectionTitle}>Shopping Recommendations</Text>
              {analysis.shopping.map((item, index) => (
                <Text key={index} style={styles.shoppingText}>
                  • {item}
                </Text>
              ))}

              <TouchableOpacity style={[styles.button, styles.resetButton]} onPress={reset}>
                <Text style={styles.buttonText}>Start Over</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraControls: {
    flex: 1,
    backgroundColor: "transparent",
    flexDirection: "row",
    justifyContent: "center",
    margin: 20,
  },
  cameraButton: {
    backgroundColor: "#2c3e50",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginHorizontal: 10,
    alignItems: "center",
  },
  cameraButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  inputContainer: {
    alignItems: "center",
  },
  button: {
    backgroundColor: "#3498db",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginBottom: 20,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  previewContainer: {
    alignItems: "center",
  },
  previewImage: {
    width: 200,
    height: 300,
    resizeMode: "cover",
    marginBottom: 20,
  },
  loader: {
    marginBottom: 20,
  },
  actionButtons: {
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#e74c3c",
  },
  resultsContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: 16,
    marginBottom: 10,
  },
  styleText: {
    fontSize: 16,
    marginBottom: 10,
  },
  suggestionText: {
    fontSize: 16,
    marginBottom: 5,
  },
  examplesContainer: {
    marginTop: 10,
    marginBottom: 10,
  },
  exampleImage: {
    width: 120,
    height: 180,
    resizeMode: "cover",
    marginRight: 10,
  },
  shoppingText: {
    fontSize: 16,
    marginBottom: 5,
  },
  resetButton: {
    backgroundColor: "#27ae60",
    marginTop: 20,
  },
  resultImage: {
    width: 200,
    height: 300,
    resizeMode: "cover",
    marginBottom: 20,
    alignSelf: "center",
  },
})

