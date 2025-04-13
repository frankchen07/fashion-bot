"use client"

import { useState, useEffect } from "react"
import { StyleSheet, View, Text, TouchableOpacity, Image, Platform, Linking } from "react-native"
import * as ImagePicker from "expo-image-picker"
import { Ionicons } from "@expo/vector-icons"
import { SafeAreaView } from "react-native-safe-area-context"

const CameraScreen = ({ navigation }) => {
  const [hasPermission, setHasPermission] = useState(null)
  const [capturedImage, setCapturedImage] = useState(null)

  useEffect(() => {
    const getPermission = async () => {
      try {
        console.log("Requesting media library permission...")
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
        console.log("Media library permission status:", status)
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
        setCapturedImage(result.assets[0].uri)
      }
    } catch (error) {
      console.error("Error picking image:", error)
    }
  }

  const retakePicture = () => {
    setCapturedImage(null)
  }

  const confirmPicture = () => {
    navigation.navigate("Analysis", { imageUri: capturedImage })
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
    );
  };

  // Render the image preview UI
  const renderPreview = () => {
    return (
      <View style={styles.previewContainer}>
        <Image source={{ uri: capturedImage }} style={styles.previewImage} />
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
    );
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>Requesting gallery permission...</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={retryPermission}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>No access to gallery</Text>
        <Text style={styles.permissionSubText}>Please enable gallery permissions in your device settings</Text>
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={openSettings}
        >
          <Text style={styles.settingsButtonText}>Open Settings</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {capturedImage ? renderPreview() : renderImagePicker()}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  permissionText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  permissionSubText: {
    color: "#ddd",
    textAlign: "center",
    fontSize: 14,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#3d5a80",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 20,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  settingsButton: {
    backgroundColor: "#2a9d8f",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 10,
  },
  settingsButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  pickerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    padding: 20,
  },
  pickerText: {
    color: "#fff",
    fontSize: 18,
    textAlign: "center",
    marginBottom: 30,
  },
  pickerButton: {
    backgroundColor: "#3d5a80",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  pickerButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  previewContainer: {
    flex: 1,
    width: "100%",
  },
  previewImage: {
    flex: 1,
  },
  previewActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    position: "absolute",
    bottom: 30,
    left: 30,
    right: 30,
  },
  actionButton: {
    backgroundColor: "#3d5a80",
    borderRadius: 12,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flex: 0.48,
    gap: 8,
  },
  confirmButton: {
    backgroundColor: "#2a9d8f",
  },
  actionText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
})

export default CameraScreen

