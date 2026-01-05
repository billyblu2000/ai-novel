/**
 * AI 功能处理器导出
 */

// 基础设施
export {
  type FunctionHandler,
  type FunctionHandlerContext,
  type FunctionHandlerResult,
  registerHandler,
  getHandler,
  getAllHandlers,
} from "./base";

// 导入处理器以触发注册
import "./modify";
import "./chat";

// 导出具体处理器（可选，用于直接访问）
export { polishHandler, expandHandler, compressHandler } from "./modify";
export { chatHandler } from "./chat";
