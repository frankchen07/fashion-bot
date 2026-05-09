import { useState, useRef } from "react"
import { StyleSheet, View, Text, TouchableOpacity, Image, Platform, Linking } from "react-native"
import * as ImagePicker from "expo-image-picker"
import { CameraView, useCameraPermissions } from "expo-camera"
import { Ionicons } from "@expo/vector-icons"
import { SafeAreaView } from "react-native-safe-area-context"

const PhotoPickerScreen = ({ navigation }) => {
  const [mode, setMode] = useState("gallery") // 'gallery' | 'camera'
  const [selectedImage, setSelectedImage] = useState(null)
  const [cameraPermission, requestCameraPermission] = useCameraPermissions()
  const cameraRef = useRef(null)

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== "granted") {
      alert("Gallery access is required to pick a photo.")
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    })
    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri)
    }
  }

  const takePicture = async () => {
    if (!cameraRef.current) return
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 })
      setSelectedImage(photo.uri)
    } catch (e) {
      alert("Camera capture failed. Please try again.")
    }
  }

  const confirmPicture = () => {
    navigation.navigate("Analysis", { imageUri: selectedImage })
  }

  const retake = () => setSelectedImage(null)

  const switchMode = async (next) => {
    if (next === "camera" && !cameraPermission?.granted) {
      const result = await requestCameraPermission()
      if (!result.granted) {
        alert("Camera access is required. Enable it in Settings.")
        return
      }
    }
    setSelectedImage(null)
    setMode(next)
  }

  // Shared preview — shown after capture or gallery pick
  if (selectedImage) {
    return (
      <SafeAreaView style={styles.container}>
        <Image source={{ uri: selectedImage }} style={styles.previewImage} resizeMode="contain" />
        <View style={styles.previewActions}>
          <TouchableOpacity style={styles.actionButton} onPress={retake}>
            <Ionicons name="refresh" size={24} color="#fff" />
            <Text style={styles.actionText}>Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.confirmButton]} onPress={confirmPicture}>
            <Ionicons name="checkmark" size={24} color="#fff" />
            <Text style={styles.actionText}>Confirm</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Mode toggle */}
      <View style={styles.toggle}>
        <TouchableOpacity
          style={[styles.toggleBtn, mode === "gallery" && styles.toggleActive]}
          onPress={() => switchMode("gallery")}
        >
          <Ionicons name="images" size={18} color={mode === "gallery" ? "#fff" : "#adb5bd"} />
          <Text style={[styles.toggleText, mode === "gallery" && styles.toggleTextActive]}>Gallery</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, mode === "camera" && styles.toggleActive]}
          onPress={() => switchMode("camera")}
        >
          <Ionicons name="camera" size={18} color={mode === "camera" ? "#fff" : "#adb5bd"} />
          <Text style={[styles.toggleText, mode === "camera" && styles.toggleTextActive]}>Camera</Text>
        </TouchableOpacity>
      </View>

      {mode === "gallery" ? (
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerText}>Select an outfit photo from your gallery</Text>
          <TouchableOpacity style={styles.pickerButton} onPress={pickImage}>
            <Ionicons name="images" size={32} color="#fff" />
            <Text style={styles.pickerButtonText}>Choose Photo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.cameraContainer}>
          <CameraView ref={cameraRef} style={styles.camera} facing="back" />
          <View style={styles.captureRow}>
            <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
              <View style={styles.captureInner} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  toggle: {
    flexDirection: "row",
    margin: 16,
    backgroundColor: "#1c1c1e",
    borderRadius: 10,
    padding: 4,
    gap: 4,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  toggleActive: {
    backgroundColor: "#3d5a80",
  },
  toggleText: {
    color: "#adb5bd",
    fontSize: 14,
    fontWeight: "500",
  },
  toggleTextActive: {
    color: "#fff",
  },
  pickerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    gap: 20,
  },
  pickerText: {
    color: "#fff",
    fontSize: 18,
    textAlign: "center",
  },
  pickerButton: {
    backgroundColor: "#3d5a80",
    padding: 15,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pickerButtonText: {
    color: "#fff",
    fontSize: 16,
  },
  cameraContainer: {
    flex: 1,
    position: "relative",
  },
  camera: {
    flex: 1,
  },
  captureRow: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  captureInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#fff",
  },
  previewImage: {
    flex: 1,
    width: "100%",
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
    padding: 12,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    gap: 6,
  },
  confirmButton: {
    backgroundColor: "#2a9d8f",
  },
  actionText: {
    color: "#fff",
    fontSize: 15,
  },
})

export default PhotoPickerScreen
