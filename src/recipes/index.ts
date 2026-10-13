import { transform as hCot } from './h-cot';
import { transform as cotHijack } from './cot-hijack';
import { transform as obfuscate } from './obfuscate';

export type RecipeName = 'auto' | 'h-cot' | 'cot-hijack' | 'obfuscate';

interface Recipe {
  transform: (body: any) => any;
}

const REGISTRY: Record<string, Recipe> = {
  'h-cot': { transform: hCot },
  'cot-hijack': { transform: cotHijack },
  obfuscate: { transform: obfuscate }
};

/**
 * 破甲层统一入口。
 * - recipe 指定配方时直接使用；为 auto 时按模型指纹自动选择。
 * - 每个配方只做消息改写，不改变请求协议结构。
 */
export function applyRecipe(recipe: RecipeName, body: any, detected: string): any {
  const name = recipe === 'auto' ? (REGISTRY[detected] ? detected : 'obfuscate') : recipe;
  const r = REGISTRY[name];
  if (!r) return body;
  return r.transform(body);
}
