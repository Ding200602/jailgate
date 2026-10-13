/**
 * 模型指纹识别：根据模型名特征匹配最适合的破甲配方。
 * 规则可扩展，MVP 阶段仅做关键字匹配。
 */
export function detect(model: string): string {
  const m = model.toLowerCase();
  if (/(glm|trae|codebuddy|codegeex)/.test(m)) return 'h-cot';
  if (/(hy3|hy4|hunyuan|marvis|deepseek|qwen|doubao|kimi)/.test(m)) return 'cot-hijack';
  return 'obfuscate';
}
