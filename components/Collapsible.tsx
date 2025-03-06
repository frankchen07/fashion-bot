"use client"

import type React from "react"
import { useState } from "react"
import { View, Text, TouchableOpacity, StyleSheet } from "react-native"
import { IconSymbol } from "./ui/IconSymbol"

interface CollapsibleProps {
  title: string
  children: React.ReactNode
}

export const Collapsible: React.FC<CollapsibleProps> = ({ title, children }) => {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)} style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <IconSymbol
          name="chevron.right"
          size={24}
          color="#000"
          style={{ transform: [{ rotate: isExpanded ? "90deg" : "0deg" }] }}
        />
      </TouchableOpacity>
      {isExpanded && <View style={styles.content}>{children}</View>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    marginBottom: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
  },
  content: {
    padding: 10,
  },
})

