// hooks/useAIAnalysis.ts

interface FashionAnalysis {
    description: string;
    style: string;
    suggestions: string[];
    shopping: string[];
  }
  
  export function useAIAnalysis() {
    const analyzeFashionWithAI = async (imageBase64: string): Promise<FashionAnalysis> => {
      try {
        const response = await fetch('http://localhost:3000', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ image: imageBase64 }),
        });
  
        if (!response.ok) {
          throw new Error('Failed to analyze fashion');
        }
  
        const analysis = await response.json();
        return analysis;
      } catch (error) {
        console.error('Error analyzing fashion with AI:', error);
        throw error;
      }
    };
  
    return { analyzeFashionWithAI };
  }