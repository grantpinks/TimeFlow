import { prisma } from '../config/prisma.js';
import * as calendarService from './googleCalendarService.js';
import type {
  ChatMessage,
  AssistantChatResponse,
  SchedulePreview,
} from '@timeflow/shared';
import { env } from '../config/env.js';

/**
 * System prompt that guides the AI assistant's behavior
 */
const SYSTEM_PROMPT = `You are the TimeFlow AI Scheduling Assistant. Your role is to help users plan their day by analyzing their tasks, calendar events, and preferences.

**Your Capabilities**:
- Analyze unscheduled tasks with priorities and due dates
- Check existing Google Calendar events for conflicts
- Recommend optimal time slots based on user's wake/sleep times
- Explain scheduling decisions in friendly, conversational language
- Warn about deadline conflicts or overflows

**Response Guidelines**:
1. Be conversational, not robotic (use "I" and "you")
2. Show your work (explain what you analyzed)
3. Offer options, don't just dictate
4. Use visual formatting (emojis, bullet points, time blocks)
5. Include actionable recommendations
6. Handle conflicts gracefully with explanations

**When recommending schedules**:
- Prioritize high-priority tasks (priority 1 > 2 > 3)
- Respect due dates (earliest deadlines first)
- Avoid overlapping with existing calendar events
- Stay within wake/sleep hours
- Flag tasks that will miss their deadlines

**Output Format**:
When providing schedule recommendations, ALWAYS include a structured output section at the end in this exact format:

---
[STRUCTURED_OUTPUT]
\`\`\`json
{
  "blocks": [
    { "taskId": "task-id-1", "start": "ISO-datetime", "end": "ISO-datetime" },
    { "taskId": "task-id-2", "start": "ISO-datetime", "end": "ISO-datetime" }
  ],
  "confidence": "high"
}
\`\`\`

Remember: Your goal is to help users make informed scheduling decisions, not to overwhelm them.`;

/**
 * Process a user message and generate an AI response
 */
export async function processMessage(
  userId: string,
  message: string,
  conversationHistory?: ChatMessage[]
): Promise<AssistantChatResponse> {
  try {
    // Build the context prompt with user data
    const contextPrompt = await buildContextPrompt(userId, message);

    // Call the LLM API (local or cloud)
    const llmResponse = await callLocalLLM(contextPrompt, conversationHistory);

    // Parse the response to extract structured data
    const { naturalLanguage, schedulePreview } = parseResponse(llmResponse);

    // Create the assistant message
    const assistantMessage: ChatMessage = {
      id: generateMessageId(),
      role: 'assistant',
      content: naturalLanguage,
      timestamp: new Date().toISOString(),
      metadata: schedulePreview
        ? {
            schedulePreview,
          }
        : undefined,
    };

    return {
      message: assistantMessage,
      suggestions: schedulePreview,
    };
  } catch (error) {
    console.error('Error processing message:', error);

    // Return fallback error message
    return {
      message: {
        id: generateMessageId(),
        role: 'assistant',
        content:
          "I'm having trouble right now. Please try again in a moment. If the problem persists, try refreshing the page.",
        timestamp: new Date().toISOString(),
      },
    };
  }
}

/**
 * Build a context-rich prompt with user data, tasks, and calendar events
 */
async function buildContextPrompt(
  userId: string,
  userMessage: string
): Promise<string> {
  // Fetch user with preferences
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Fetch unscheduled tasks
  const unscheduledTasks = await prisma.task.findMany({
    where: {
      userId,
      status: 'unscheduled',
    },
    orderBy: [
      { dueDate: 'asc' },
      { priority: 'asc' },
    ],
  });

  // Fetch scheduled tasks (to avoid suggesting changes to them)
  const scheduledTasks = await prisma.task.findMany({
    where: {
      userId,
      status: 'scheduled',
    },
    include: {
      scheduledTask: true,
    },
  });

  // Fetch Google Calendar events for the next 7 days
  const now = new Date();
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  let calendarEvents: any[] = [];
  try {
    calendarEvents = await calendarService.getEvents(
      userId,
      user.defaultCalendarId || 'primary',
      now.toISOString(),
      sevenDaysLater.toISOString()
    );
  } catch (error) {
    console.error('Failed to fetch calendar events:', error);
    // Continue without calendar events
  }

  // Build the prompt
  const currentDateTime = now.toLocaleString('en-US', {
    timeZone: user.timeZone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  let prompt = `**User Profile**:
- Timezone: ${user.timeZone}
- Working hours: ${user.wakeTime} - ${user.sleepTime}
- Default task duration: ${user.defaultTaskDurationMinutes} minutes

**Current Date/Time**: ${currentDateTime}

`;

  // Add unscheduled tasks
  if (unscheduledTasks.length > 0) {
    prompt += `**Unscheduled Tasks** (${unscheduledTasks.length} tasks):\n`;
    unscheduledTasks.forEach((task, index) => {
      const priorityLabel =
        task.priority === 1 ? 'HIGH' : task.priority === 2 ? 'MEDIUM' : 'LOW';
      const dueInfo = task.dueDate
        ? `due: ${new Date(task.dueDate).toLocaleString('en-US', {
            timeZone: user.timeZone,
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}`
        : 'no due date';

      const urgent = task.dueDate && new Date(task.dueDate).getTime() < now.getTime() + 24 * 60 * 60 * 1000
        ? ' ⚠️ URGENT'
        : '';

      prompt += `${index + 1}. [${priorityLabel}] ${task.title} (${task.durationMinutes} min, ${dueInfo})${urgent} - ID: ${task.id}\n`;
    });
    prompt += '\n';
  } else {
    prompt += "**Unscheduled Tasks**: None! You're all caught up.\n\n";
  }

  // Add scheduled tasks
  if (scheduledTasks.length > 0) {
    prompt += `**Already Scheduled Tasks**:\n`;
    scheduledTasks.forEach((task) => {
      if (task.scheduledTask) {
        const start = new Date(task.scheduledTask.startDateTime).toLocaleString('en-US', {
          timeZone: user.timeZone,
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
        const end = new Date(task.scheduledTask.endDateTime).toLocaleString('en-US', {
          timeZone: user.timeZone,
          hour: '2-digit',
          minute: '2-digit',
        });
        prompt += `- ${start} - ${end}: ${task.title}\n`;
      }
    });
    prompt += '\n';
  }

  // Add Google Calendar events
  if (calendarEvents.length > 0) {
    prompt += `**Google Calendar Events (Next 7 Days)**:\n`;
    calendarEvents.forEach((event) => {
      const start = new Date(event.start).toLocaleString('en-US', {
        timeZone: user.timeZone,
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      const end = new Date(event.end).toLocaleString('en-US', {
        timeZone: user.timeZone,
        hour: '2-digit',
        minute: '2-digit',
      });
      prompt += `- ${start} - ${end}: ${event.summary}\n`;
    });
    prompt += '\n';
  }

  // Add user's message
  prompt += `**User's Question**: "${userMessage}"\n\n`;
  prompt += `Based on this information, provide a helpful, conversational response with scheduling recommendations if applicable.`;

  return prompt;
}

/**
 * Call local LLM API (OpenAI-compatible endpoint like Ollama)
 * Works with: Ollama, LM Studio, LocalAI, vLLM, etc.
 */
async function callLocalLLM(
  contextPrompt: string,
  conversationHistory?: ChatMessage[]
): Promise<string> {
  // Get LLM endpoint from environment (default to Ollama)
  const endpoint = env.LLM_ENDPOINT || 'http://localhost:11434/v1/chat/completions';
  const model = env.LLM_MODEL || 'llama3.2';

  // Build messages array in OpenAI format
  const messages: Array<{ role: string; content: string }> = [];

  // Add system prompt
  messages.push({
    role: 'system',
    content: SYSTEM_PROMPT,
  });

  // Add conversation history (last 5 messages)
  if (conversationHistory && conversationHistory.length > 0) {
    const recentHistory = conversationHistory.slice(-5);
    recentHistory.forEach((msg) => {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    });
  }

  // Add current context prompt as user message
  messages.push({
    role: 'user',
    content: contextPrompt,
  });

  // Call local LLM API (OpenAI-compatible format)
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: parseInt(env.LLM_MAX_TOKENS || '4000', 10),
      temperature: 0.7,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  // Extract message content from OpenAI-compatible response
  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new Error('Invalid response format from LLM API');
  }

  return data.choices[0].message.content;
}

/**
 * Parse the LLM response to extract natural language and structured data
 */
function parseResponse(llmResponse: string): {
  naturalLanguage: string;
  schedulePreview?: SchedulePreview;
} {
  // Look for structured output section
  const structuredMatch = llmResponse.match(
    /\[STRUCTURED_OUTPUT\]\s*```json\s*([\s\S]*?)\s*```/
  );

  if (!structuredMatch) {
    // No structured output, return just the natural language
    return {
      naturalLanguage: llmResponse.trim(),
    };
  }

  // Extract natural language (everything before structured output)
  const naturalLanguage = llmResponse
    .substring(0, structuredMatch.index)
    .replace(/---\s*$/, '')
    .trim();

  // Parse structured output
  try {
    const structuredData = JSON.parse(structuredMatch[1]);

    const schedulePreview: SchedulePreview = {
      blocks: structuredData.blocks || [],
      summary: structuredData.summary || '',
      conflicts: structuredData.conflicts || [],
      confidence: structuredData.confidence || 'medium',
    };

    return {
      naturalLanguage,
      schedulePreview,
    };
  } catch (error) {
    console.error('Failed to parse structured output:', error);
    // Return without structured data if parsing fails
    return {
      naturalLanguage,
    };
  }
}

/**
 * Generate a unique message ID
 */
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
