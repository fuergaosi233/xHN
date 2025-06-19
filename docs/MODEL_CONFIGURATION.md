# 模型配置指南

本项目支持多种 AI 模型提供商，你可以根据需求选择最适合的模型。

## 环境变量配置

项目使用以下环境变量来配置 AI 模型：

- `OPENAI_API_KEY`: API 密钥
- `OPENAI_BASE_URL`: API 基础 URL
- `OPENAI_MODEL`: 模型名称

## 支持的模型提供商

### 1. OpenAI (官方)

**GPT-3.5 Turbo (推荐入门)**
```env
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-3.5-turbo
```

**GPT-4 (高质量)**
```env
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4
```

**GPT-4o (最新)**
```env
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o
```

### 2. DeepSeek (国内推荐)

```env
OPENAI_API_KEY=sk-your-deepseek-api-key
OPENAI_BASE_URL=https://api.deepseek.com/v1
OPENAI_MODEL=deepseek-chat
```

**特点:**
- 成本极低，性价比高
- 对中文支持良好
- 国内访问速度快

**获取 API Key:** [DeepSeek 开放平台](https://platform.deepseek.com/)

### 3. Moonshot AI (Kimi)

**8K 上下文版本:**
```env
OPENAI_API_KEY=your-moonshot-api-key
OPENAI_BASE_URL=https://api.moonshot.cn/v1
OPENAI_MODEL=moonshot-v1-8k
```

**32K 上下文版本:**
```env
OPENAI_API_KEY=your-moonshot-api-key
OPENAI_BASE_URL=https://api.moonshot.cn/v1
OPENAI_MODEL=moonshot-v1-32k
```

**特点:**
- 中文理解能力强
- 长上下文支持
- 国内访问友好

**获取 API Key:** [Moonshot AI 开放平台](https://platform.moonshot.cn/)

### 4. 智谱AI (GLM)

```env
OPENAI_API_KEY=your-zhipuai-api-key
OPENAI_BASE_URL=https://open.bigmodel.cn/api/paas/v4
OPENAI_MODEL=glm-4
```

**特点:**
- 国产大模型
- 中文原生支持
- 价格实惠

**获取 API Key:** [智谱AI 开放平台](https://open.bigmodel.cn/)

## 配置建议

### 个人用户
- **预算有限**: DeepSeek (deepseek-chat)
- **追求质量**: OpenAI GPT-4
- **平衡选择**: Moonshot v1-8k

### 企业用户
- **高并发场景**: OpenAI GPT-3.5 Turbo
- **高质量要求**: OpenAI GPT-4o
- **成本控制**: DeepSeek + Moonshot 混合使用

### 国内用户
推荐优先级：
1. DeepSeek (成本最低)
2. Moonshot AI (质量平衡)
3. 智谱AI (国产支持)
4. OpenAI (需要代理)

## 性能对比

| 模型 | 翻译质量 | 速度 | 成本 | 中文支持 |
|------|----------|------|------|----------|
| GPT-4o | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ |
| GPT-4 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐ | ⭐⭐⭐⭐ |
| GPT-3.5 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| DeepSeek | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Moonshot-8K | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| GLM-4 | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

## 故障排除

### 常见错误

1. **"配置错误: 缺少 OPENAI_API_KEY 环境变量"**
   - 检查 `.env.local` 文件是否存在
   - 确认 API Key 已正确设置

2. **"网络错误"**
   - 检查 `OPENAI_BASE_URL` 是否正确
   - 确认网络连接正常
   - 国内用户可能需要代理访问 OpenAI

3. **"API Key 无效"**
   - 检查 API Key 格式是否正确
   - 确认 API Key 未过期
   - 验证账户余额充足

### 配置验证

项目提供了配置验证功能，访问应用后会在页面顶部显示当前模型配置状态。绿色表示配置正常，红色表示有配置问题。

### 获取帮助

如果遇到配置问题，可以：
1. 查看页面上的配置状态提示
2. 检查浏览器开发者工具的控制台错误
3. 参考各模型提供商的官方文档
4. 在项目 GitHub 页面提交 Issue