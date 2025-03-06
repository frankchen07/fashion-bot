import type React from "react"
import type { StyleProp, TextStyle } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"

const MAPPING: { [key: string]: keyof typeof MaterialIcons.glyphMap } = {
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "compare-arrows",
  "chevron.right": "chevron-right",
  // Add any other icon mappings you need
}

type IconName = keyof typeof MAPPING

interface IconSymbolProps {
  name: IconName
  color?: string
  size?: number
  style?: StyleProp<TextStyle>
}

export const IconSymbol: React.FC<IconSymbolProps> = ({ name, color, size = 24, style }) => {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />
}

