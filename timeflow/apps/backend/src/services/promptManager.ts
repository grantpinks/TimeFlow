import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * AI Assistant mode types
 */
export type AssistantMode = 'conversation' | 'scheduling' | 'availability';

/**
 * Manages AI Assistant prompts across different modes
 *
 * Responsibilities:
 * - Load prompt files from disk
 * - Compose mode-specific prompts with base personality
 * - Cache prompts in memory for performance
 *
 * File structure:
 * - base.txt: Shared personality and formatting rules
 * - conversation.txt: Q&A mode (no scheduling actions)
 * - scheduling.txt: Task scheduling mode (respects fixed events)
 * - availability.txt: "When am I free?" queries
 */
export class PromptManager {
  private prompts: Map<string, string> = new Map();
  private readonly promptsDir: string;

  constructor() {
    this.promptsDir = path.join(__dirname, '../prompts');
    this.loadBasePrompt();
  }

  /**
   * Load the base prompt (personality, formatting, capabilities)
   */
  private loadBasePrompt(): void {
    const basePrompt = this.loadPromptFile('base.txt');
    this.prompts.set('base', basePrompt);
  }

  /**
   * Load a prompt file from disk
   */
  private loadPromptFile(filename: string): string {
    const filePath = path.join(this.promptsDir, filename);

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return content.trim();
    } catch (error) {
      throw new Error(
        `Failed to load prompt file: ${filename}. Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get the complete system prompt for a specific mode
   *
   * Composes the base prompt with mode-specific instructions
   *
   * @param mode - The assistant mode (conversation, scheduling, or availability)
   * @returns Complete system prompt string
   */
  getPrompt(mode: AssistantMode): string {
    // Get base prompt (cached)
    const basePrompt = this.prompts.get('base');
    if (!basePrompt) {
      throw new Error('Base prompt not loaded');
    }

    // Load mode-specific prompt
    const modeFilename = `${mode}.txt`;
    let modePrompt: string;

    // Check cache first
    if (this.prompts.has(mode)) {
      modePrompt = this.prompts.get(mode)!;
    } else {
      // Load from file and cache
      modePrompt = this.loadPromptFile(modeFilename);
      this.prompts.set(mode, modePrompt);
    }

    // Compose: base + mode-specific
    return `${basePrompt}\n\n${modePrompt}`;
  }

  /**
   * Clear the prompt cache (useful for testing or hot-reloading)
   */
  clearCache(): void {
    this.prompts.clear();
    this.loadBasePrompt();
  }

  /**
   * Get all available modes
   */
  getAvailableModes(): AssistantMode[] {
    return ['conversation', 'scheduling', 'availability'];
  }

  /**
   * Check if a mode-specific prompt file exists
   */
  hasModePrompt(mode: AssistantMode): boolean {
    const filePath = path.join(this.promptsDir, `${mode}.txt`);
    return fs.existsSync(filePath);
  }
}

// Singleton instance
let promptManagerInstance: PromptManager | null = null;

/**
 * Get the PromptManager singleton instance
 */
export function getPromptManager(): PromptManager {
  if (!promptManagerInstance) {
    promptManagerInstance = new PromptManager();
  }
  return promptManagerInstance;
}

/**
 * Reset the PromptManager singleton (useful for testing)
 */
export function resetPromptManager(): void {
  promptManagerInstance = null;
}
