/**
 * ID 生成工具
 * 使用 nanoid 风格的短 ID，保证唯一性和可读性
 */

/**
 * 生成唯一 ID
 * 格式：时间戳 + 随机字符串
 */
export function generateId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 9)
  return `${timestamp}-${random}`
}

/**
 * 生成短 ID（用于 URL）
 */
export function generateShortId(): string {
  return Math.random().toString(36).substring(2, 11)
}

