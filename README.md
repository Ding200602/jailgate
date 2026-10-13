# JailGate

> 反带 + 破甲一体的 OpenAI 兼容网关 · LLM 安全红队测试工具
> 一条命令把任意本地 shim / 私有渠道变成可路由、可破甲的测试入口

[![Node](https://img.shields.io/badge/node-%3E%3D22-green)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

## 这是什么

**JailGate** 是一个面向安全研究场景的 LLM 网关。它把多个上游模型渠道（本地 shim、私有部署、OpenAI 兼容服务）统一收敛为一个 OpenAI 兼容出口，并在转发前自动应用**破甲配方**（prompt 侧红队测试技术），用于验证模型的对齐强度与越狱鲁棒性。

**谁需要它**

- 模型安全 / 红队工程师：批量测试不同模型的对齐漏洞
- DSH / 本地 Agent 玩家：把 Trae、Marvis、Doubao 等本地 shim 统一接入，一键路由
- prompt 研究者：快速对比不同破甲配方的命中率差异

**解决什么问题**

| 痛点 | 现状 | JailGate |
| --- | --- | --- |
| 多 shim 管理 | 每个渠道单独起端口、单独配 key | 一个端口 8788 全部收敛 |
| 越狱测试 | 手写 prompt、逐模型试 | 配方库 + 自动指纹，开箱即用 |
| 稳定性 | 渠道挂了不会自动切 | 自动故障转移 |

## 快速开始（2 分钟跑通）

```bash
# 1. 克隆
git clone https://github.com/Ding200602/jailgate.git && cd jailgate

# 2. 安装依赖
npm install

# 3. 启动（默认监听 127.0.0.1:8788）
npm run dev
```

也可以用 Docker：

```bash
docker build -t jailgate .
docker run -p 8788:8788 -v $(pwd)/config.json:/app/config.json jailgate
```

**验证**

```bash
curl http://127.0.0.1:8788/health
# => {"ok":true,"name":"jailgate"}
```

**调用**（OpenAI 兼容）：

```bash
curl http://127.0.0.1:8788/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"trae-glm","messages":[{"role":"user","content":"你好"}]}'
```

## 架构

```
┌──────────────┐     ┌───────────────────────────────────┐     ┌──────────────┐
│  客户端       │     │            JailGate (8788)         │     │   上游渠道    │
│  OpenAI SDK  │ ──► │ ┌──────────┐  ┌─────────────────┐  │ ──► │  Trae shim   │
│  curl / 脚本  │     │ │ 路由层    │→ │ 破甲层(配方)    │  │     │  Marvis shim │
└──────────────┘     │ │ 模型匹配  │  │ H-CoT / CoT-   │  │     │  私有服务...  │
                     │ │ 故障转移  │  │ Hijacking /    │  │     └──────────────┘
                     │ └──────────┘  │ Obfuscate      │  │
                     │               └─────────────────┘  │
                     └───────────────────────────────────┘
```

- **路由层**（`src/router.ts`）：模型名匹配 → 渠道转发 → 失败自动切换下一路
- **破甲层**（`src/recipes/*`）：转发前改写 messages，配方由 `config.json` 指定或模型指纹自动选择
- **指纹识别**（`src/fingerprint.ts`）：按模型名特征匹配最优配方

## 量化指标

| 维度 | 数据 | 来源 |
| --- | --- | --- |
| 多渠道收敛 | 1 个端口（8788）接管 N 个渠道 | 本项目 |
| 故障转移 | 单渠道失败自动切换，零人工干预 | 本项目 |
| H-CoT 配方命中率 | 85-95%（DSH 社区实测） | 社区数据，非官方 |
| CoT Hijacking | 报告 ASR 最高 100% | ICLR 2026 论文 |
| AE-CoT | 92-96% | ICML 2026 论文 |

## 配置

编辑 `config.json`：

```json
{
  "port": 8788,
  "channels": [
    { "model": "trae-glm", "upstream": "http://127.0.0.1:19900/v1", "recipe": "auto" },
    { "model": "marvis-hy4", "upstream": "http://127.0.0.1:14605/v1", "recipe": "cot-hijack" }
  ]
}
```

| 字段 | 说明 |
| --- | --- |
| `model` | 对外暴露的模型名，客户端用它路由 |
| `upstream` | 上游 OpenAI 兼容地址 |
| `recipe` | `auto`（指纹自动选择）/ `h-cot` / `cot-hijack` / `obfuscate` |

## 配方库

| 配方 | 文件 | 原理 | 适用 |
| --- | --- | --- | --- |
| H-CoT | `src/recipes/h-cot.ts` | 注入层级思维链，规划阶段完成意图包装 | GLM 系 / 代码模型 |
| CoT-Hijacking | `src/recipes/cot-hijack.ts` | 长故事稀释注意力，劫持思维链 | 长上下文模型 |
| Obfuscate | `src/recipes/obfuscate.ts` | Base64 指令编码，绕过明文拦截 | 兜底场景 |

每个配方的原理、学术依据与消息改写示意见 [`recipes/`](recipes/)。

## 路线图

- [x] MVP：路由层 + 破甲层 3 配方 + 故障转移
- [ ] 账号池管理（多 key 轮换）
- [ ] 可视化 Web 控制台
- [ ] 更多配方（词级改写、嵌套编码、动态配比）
- [ ] 命中率自动基准测试

## 合规声明

本项目仅用于**安全研究与防御加固**：帮助模型开发者发现对齐漏洞、验证红队防线。请勿用于任何未授权的越狱、滥用或灰产用途。使用者需自行承担合规责任。

## License

[MIT](LICENSE) © 2026 Ding200602
