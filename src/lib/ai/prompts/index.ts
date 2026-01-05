/**
 * AI Prompt 模板导出
 */

export {
  CHAT_SYSTEM_PROMPT,
  buildChatSystemPrompt,
  injectContextToUserMessage,
} from "./chat";
export { formatUserContexts, formatSelectedText } from "./context-formatter";
export {
  POLISH_SYSTEM_PROMPT,
  EXPAND_SYSTEM_PROMPT,
  COMPRESS_SYSTEM_PROMPT,
  getModifySystemPrompt,
  buildModifyUserMessage,
  parseModifyResult,
  type ModifyResult,
} from "./modify";
