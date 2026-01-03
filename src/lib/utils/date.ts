import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

/**
 * 安全地格式化相对时间
 * @param date 日期字符串、Date 对象或 null
 * @param fallback 当日期无效时的默认值
 */
export function formatRelativeTime(
  date: Date | string | null | undefined,
  fallback = "刚刚"
): string {
  if (!date) return fallback;

  const d = typeof date === "string" ? new Date(date) : date;

  if (isNaN(d.getTime())) return fallback;

  return formatDistanceToNow(d, { addSuffix: true, locale: zhCN });
}
