import { useState, useCallback } from 'react';

export function useSSE() {
  const [data, setData] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const stream = useCallback(async (url: string, body: any) => {
    setIsStreaming(true);
    setData("");
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonStr = line.slice(6);
            if (!jsonStr.trim()) continue;
            try {
              const parsed = JSON.parse(jsonStr);
              if (parsed.content) {
                setData((prev) => prev + parsed.content);
              }
              if (parsed.done) {
                setIsStreaming(false);
              }
            } catch (e) {
              console.error("Failed to parse SSE JSON:", e);
            }
          }
        }
      }
    } catch (error) {
      console.error("SSE streaming error:", error);
    } finally {
      setIsStreaming(false);
    }
  }, []);

  return { stream, data, isStreaming, setData };
}
