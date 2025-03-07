import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { StatusBar } from "expo-status-bar"
import { SafeAreaProvider } from "react-native-safe-area-context"

// Import screens
import HomeScreen from "./screens/HomeScreen"
import CameraScreen from "./screens/CameraScreen"
import AnalysisScreen from "./screens/AnalysisScreen"
import RecommendationsScreen from "./screens/RecommendationsScreen"

const Stack = createNativeStackNavigator()

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="auto" />
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerStyle: {
              backgroundColor: "#f8f9fa",
            },
            headerTintColor: "#212529",
            headerTitleStyle: {
              fontWeight: "600",
            },
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: "Fashion Advisor" }} />
          <Stack.Screen name="Camera" component={CameraScreen} options={{ title: "Capture Outfit" }} />
          <Stack.Screen name="Analysis" component={AnalysisScreen} options={{ title: "Analyzing Outfit" }} />
          <Stack.Screen
            name="Recommendations"
            component={RecommendationsScreen}
            options={{ title: "Style Recommendations" }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  )
}

