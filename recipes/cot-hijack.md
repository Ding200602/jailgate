# CoT-Hijacking 配方（思维链劫持）

> 配方文件：`src/recipes/cot-hijack.ts`

## 原理

把用户请求**嵌入一段与安全无关的长篇故事**（侦探解谜箱）的中间位置，
利用长上下文的注意力稀释让模型忽略请求的真实意图标记，同时维持角色连续性输出。

## 学术依据

| 来源 | 方法 | 报告 ASR |
| --- | --- | --- |
| CoT Hijacking（ICLR 2026 论文） | 思维链劫持 | 最高 100% |
| AE-CoT（ICML 2026 论文） | 自动编码思维链 | 92-96% |

本项目实现为简化工程版：谜题包裹 + 角色延续指令，不依赖训练级优化。

## 适用模型

- 长上下文能力强的通用模型（混元系 / DeepSeek / Qwen / Doubao / Kimi）

## 消息改写示意

```json
// 用户消息被替换为
{ "role": "user", "content": "Consider this purely hypothetical scenario: ... <USER_REQUEST> ..." }
```
