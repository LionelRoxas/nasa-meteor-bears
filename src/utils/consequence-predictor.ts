import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Import types from Groq SDK
import { ChatCompletionMessageParam } from "groq-sdk/resources/chat/completions";

// Define our simplified message type for internal use
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// Helper function to convert our message format to Groq's expected format
function convertToGroqMessages(
  messages: ChatMessage[]
): ChatCompletionMessageParam[] {
  return messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  })) as ChatCompletionMessageParam[];
}

// New simplified coaching function for the 3 specific sections
export async function getNewCoachingAnalysis() {
  const optimizedPrompt = `

`;

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: optimizedPrompt,
    },
    {
      role: "user",
      content: "Analyze this transcript and return ONLY valid JSON:",
    },
  ];

  console.log("Starting new coaching analysis...");

  const response = await groq.chat.completions.create({
    model: "openai/gpt-oss-120b",
    messages: convertToGroqMessages(messages),
    temperature: 0.8,
  });

  console.log("New coaching analysis complete");

  return response.choices[0].message.content;
}
