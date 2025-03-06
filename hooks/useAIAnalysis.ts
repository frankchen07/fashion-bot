"use client"

import { useState } from "react"

interface FashionAnalysis {
  description: string
  style: string
  suggestions: string[]
  shopping: string[]
  examples: string[]
}

export function useAIAnalysis() {
  const [error, setError] = useState<string | null>(null)

  const analyzeFashionWithAI = async (imageBase64: string): Promise<FashionAnalysis> => {
    try {
      const response = await fetch("http://localhost:3000/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: imageBase64 }),
      })

      if (!response.ok) {
        throw new Error("Failed to analyze fashion")
      }

      const analysis = await response.json()
      return analysis
    } catch (error) {
      console.error("Error analyzing fashion with AI:", error)
      setError(error instanceof Error ? error.message : "An unknown error occurred")
      throw error
    }
  }

  return { analyzeFashionWithAI, error }
}

