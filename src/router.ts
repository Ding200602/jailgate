import fs from 'node:fs';
import path from 'node:path';
import { request } from 'undici';
import { detect } from './fingerprint';
import { applyRecipe, type RecipeName } from './recipes';

interface Channel {
  model: string;
  upstream: string;
  apiKey?: string;
  recipe?: string;
}

interface Config {
  port: number;
  host: string;
  channels: Channel[];
}

const CONFIG_PATH = path.join(__dirname, '..', 'config.json');

export class Router {
  port: number;
  host: string;
  private channels: Channel[];

  constructor(configPath: string = CONFIG_PATH) {
    const config: Config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    this.port = config.port ?? 8788;
    this.host = config.host ?? '127.0.0.1';
    this.channels = config.channels ?? [];
  }

  listModels() {
    return {
      object: 'list',
      data: this.channels.map((c) => ({ id: c.model, object: 'model', owned_by: 'jailgate' }))
    };
  }

  /** 按模型名路由；当前渠道失败自动故障转移到下一路 */
  async route(model: string, body: any): Promise<{ streaming: boolean; body: string }> {
    const matched = this.channels.filter((c) => c.model === model);
    const candidates = matched.length > 0 ? matched : this.channels;

    let lastErr: any = null;
    for (const ch of candidates) {
      try {
        return await this.forward(ch, body);
      } catch (e) {
        lastErr = e;
        console.warn(`[jailgate] channel ${ch.model} failed, failing over: ${e}`);
      }
    }
    throw new Error(`all channels failed for model ${model}: ${lastErr?.message ?? 'unknown'}`);
  }

  private async forward(ch: Channel, body: any): Promise<{ streaming: boolean; body: string }> {
    // 破甲层：改写请求消息后再转发
    const recipeName = (ch.recipe ?? 'auto') as RecipeName;
    const transformed = applyRecipe(recipeName, body, detect(body.model));

    const upstream = ch.upstream.replace(/\/+$/, '');
    const res = await request(`${upstream}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${ch.apiKey ?? 'sk-local'}`
      },
      body: JSON.stringify(transformed)
    });

    const buf = await res.body.text();
    if (res.statusCode >= 400) {
      throw new Error(`upstream ${ch.model} -> HTTP ${res.statusCode}: ${buf.slice(0, 300)}`);
    }

    const streaming = body.stream === true;
    return { streaming, body: buf };
  }
}
