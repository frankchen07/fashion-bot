"use client"

import { useState, useEffect } from "react"
import { StyleSheet, View, Text, TouchableOpacity, Image, Platform, Linking } from "react-native"
import * as ImagePicker from "expo-image-picker"
import { Ionicons } from "@expo/vector-icons"
import { SafeAreaView } from "react-native-safe-area-context"

const PhotoPickerScreen = ({ navigation }) => {
  const [hasPermission, setHasPermission] = useState(null)
  const [selectedImage, setSelectedImage] = useState(null)

  useEffect(() => {
    const getPermission = async () => {
      try {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
        setHasPermission(status === "granted")
      } catch (error) {
        console.error("Error requesting permission:", error)
        setHasPermission(false)
      }
    }
    
    getPermission()
  }, [])

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      })

      if (!result.canceled) {
        setSelectedImage(result.assets[0].uri)
      }
    } catch (error) {
      console.error("Error picking image:", error)
    }
  }

  const retakePicture = () => {
    setSelectedImage(null)
  }

  const confirmPicture = () => {
    navigation.navigate("Analysis", { imageUri: selectedImage })
  }

  const openSettings = () => {
    Linking.openSettings()
  }

  const retryPermission = async () => {
    try {
      setHasPermission(null)
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      setHasPermission(status === "granted")
    } catch (error) {
      console.error("Retry permission failed:", error)
      setHasPermission(false)
    }
  }

  // Render the image picker UI
  const renderImagePicker = () => {
    return (
      <View style={styles.pickerContainer}>
        <Text style={styles.pickerText}>Select an outfit photo from your gallery</Text>
        <TouchableOpacity style={styles.pickerButton} onPress={pickImage}>
          <Ionicons name="images" size={32} color="#fff" />
          <Text style={styles.pickerButtonText}>Choose Photo</Text>
        </TouchableOpacity>
      </View>
    )
  }

  // Render the image preview UI
  const renderPreview = () => {
    return (
      <View style={styles.previewContainer}>
        <Image source={{ uri: selectedImage }} style={styles.previewImage} />
        <View style={styles.previewActions}>
          <TouchableOpacity style={styles.actionButton} onPress={retakePicture}>
            <Ionicons name="refresh" size={24} color="#fff" />
            <Text style={styles.actionText}>Choose Another</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.confirmButton]} onPress={confirmPicture}>
            <Ionicons name="checkmark" size={24} color="#fff" />
            <Text style={styles.actionText}>Confirm</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  if (hasPermission === null) {
    return <View style={styles.container}><Text style={styles.permissionText}>Requesting permissions...</Text></View>
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>Gallery access is required</Text>
        <TouchableOpacity style={styles.settingsButton} onPress={openSettings}>
          <Text style={styles.settingsButtonText}>Open Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.retryButton} onPress={retryPermission}>
          <Text style={styles.retryButtonText}>Retry Permission</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {selectedImage ? renderPreview() : renderImagePicker()}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  pickerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  pickerText: {
    color: "#fff",
    fontSize: 18,
    marginBottom: 20,
    textAlign: "center",
  },
  pickerButton: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  pickerButtonText: {
    color: "#fff",
    fontSize: 16,
    marginLeft: 10,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: "#000",
    width: "100%",
  },
  previewImage: {
    flex: 1,
    resizeMode: "contain",
  },
  previewActions: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  confirmButton: {
    backgroundColor: "#4CAF50",
  },
  actionText: {
    color: "#fff",
    marginLeft: 5,
  },
  permissionText: {
    color: "#fff",
    fontSize: 18,
    textAlign: "center",
    marginBottom: 20,
  },
  settingsButton: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  settingsButtonText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#4CAF50",
    padding: 15,
    borderRadius: 10,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
  },
})

export default PhotoPickerScreen

