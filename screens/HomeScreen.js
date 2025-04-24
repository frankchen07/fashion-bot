import { StyleSheet, View, Text, TouchableOpacity, Image, ScrollView } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { SafeAreaView } from "react-native-safe-area-context"
import * as ImagePicker from "expo-image-picker"

const HomeScreen = ({ navigation }) => {
  const handleChoosePhoto = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync()

    if (permissionResult.granted === false) {
      alert("Permission to access camera roll is required!")
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    })

    if (!result.canceled) {
      navigation.navigate("Analysis", { imageUri: result.assets[0].uri })
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Image source={require("../assets/images/logo.png")} style={styles.logo} resizeMode="contain" />
          <Text style={styles.title}>Men's Fashion Advisor</Text>
          <Text style={styles.subtitle}>Get AI-powered (Derek Guy's) style recommendations based on your outfit</Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={handleChoosePhoto}>
            <Ionicons name="image" size={32} color="#fff" />
            <Text style={styles.buttonText}>Choose Photo</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>How it works</Text>
          <View style={styles.infoItem}>
            <Ionicons name="image-outline" size={24} color="#495057" />
            <Text style={styles.infoText}>Select a photo of your outfit from your gallery</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="analytics-outline" size={24} color="#495057" />
            <Text style={styles.infoText}>Our AI (Derek Guy) analyzes your style</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="thumbs-up-outline" size={24} color="#495057" />
            <Text style={styles.infoText}>Get personalized recommendations</Text>
          </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    alignItems: "center",
    padding: 0,
    marginTop: -40, // This will make the logo extend up into the safe area
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 0,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#212529",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6c757d",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  buttonContainer: {
    padding: 20,
  },
  button: {
    backgroundColor: "#3d5a80",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  infoContainer: {
    padding: 20,
    backgroundColor: "#fff",
    margin: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#212529",
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  infoText: {
    fontSize: 16,
    color: "#495057",
    flex: 1,
  },
})

export default HomeScreen

