/**
 * AI Prompt 模板导出
 */

export {
  UNIFIED_SYSTEM_PROMPT,
  buildUnifiedSystemPrompt,
  getTaskDescription,
  formatUserContexts,
  buildSpecialRequestUserMessage,
  buildChatUserMessage,
} from "./unified";

export {
  JAILBREAK_SYSTEM_PROMPT,
  JAILBREAK_TRIGGER,
  JAILBREAK_TASK_SUFFIX,
  JAILBREAK_PREFILL_CHAT,
  JAILBREAK_PREFILL_SPECIAL,
  getJailbreakPrefill,
} from "./jailbreak";
