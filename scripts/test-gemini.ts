/**
 * Gemini API 测试脚本
 * 运行: npx tsx scripts/test-gemini.ts
 */

import { ProxyAgent, fetch as undiciFetch } from "undici";

// 配置
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ""; // 替换为你的 API Key
const PROXY_URL = process.env.HTTPS_PROXY || "http://127.0.0.1:1080";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";

async function testGemini() {
  console.log("=== Gemini API 测试 ===\n");
  console.log(`API Key: ${GEMINI_API_KEY.slice(0, 10)}...`);
  console.log(`Proxy: ${PROXY_URL}`);
  console.log(`Base URL: ${BASE_URL}\n`);

  const proxyAgent = new ProxyAgent(PROXY_URL);

  // 测试请求体
  const requestBody = {
    model: "gemini-3-flash-preview",
    messages: [
  ],
    temperature: 0.7,
    max_tokens: 8192,
    stream: true,
  };

  console.log("请求体:");
  console.log(JSON.stringify(requestBody, null, 2));
  console.log("\n--- 开始请求 ---\n");

  try {
    const response = await undiciFetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GEMINI_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
      dispatcher: proxyAgent,
    });

    console.log(`状态码: ${response.status}`);
    console.log(`状态文本: ${response.statusText}`);
    console.log(`Headers:`, Object.fromEntries(response.headers.entries()));
    console.log("\n--- 响应内容 ---\n");

    if (!response.ok) {
      const errorText = await response.text();
      console.error("错误响应:", errorText);
      return;
    }

    if (!response.body) {
      console.error("No response body");
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let chunkCount = 0;
    let fullContent = "";
    let lastFinishReason: string | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        console.log("\n\n--- Stream 结束 ---");
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (trimmed === "data: [DONE]") {
          console.log("\n[收到 DONE 信号]");
          continue;
        }

        if (trimmed.startsWith("data: ")) {
          try {
            const json = JSON.parse(trimmed.slice(6));
            chunkCount++;

            // 打印完整的 JSON 结构（前几个 chunk）
            if (chunkCount <= 3) {
              console.log(`\nChunk ${chunkCount} 完整结构:`);
              console.log(JSON.stringify(json, null, 2));
            }

            const content = json.choices?.[0]?.delta?.content;
            const finishReason = json.choices?.[0]?.finish_reason;

            if (finishReason) {
              lastFinishReason = finishReason;
              console.log(`\n[Finish Reason: ${finishReason}]`);
            }

            if (content) {
              process.stdout.write(content);
              fullContent += content;
            }
          } catch (e) {
            console.error("\n解析错误:", trimmed.slice(0, 200), e);
          }
        } else {
          console.log("\n非 data 行:", trimmed);
        }
      }
    }

    console.log("\n\n=== 统计 ===");
    console.log(`总 Chunk 数: ${chunkCount}`);
    console.log(`内容长度: ${fullContent.length} 字符`);
    console.log(`Finish Reason: ${lastFinishReason}`);
    console.log(`\n完整内容:\n${fullContent}`);

  } catch (error) {
    console.error("请求错误:", error);
  }
}

// 非流式测试
async function testGeminiNonStream() {
  console.log("\n\n=== 非流式测试 ===\n");

  const proxyAgent = new ProxyAgent(PROXY_URL);

  const requestBody = {
    model: "gemini-3-flash-preview",
    messages: [
      {
        role: "system",
        content: "你是一个小说写作助手。请用中文回复。",
      },
      {
        role: "user",
        content: "请写一个100字左右的短故事开头，关于一个神秘的古老图书馆。",
      },
    ],
    temperature: 0.7,
    max_tokens: 8192,
    stream: false,
  };

  try {
    const response = await undiciFetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GEMINI_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
      dispatcher: proxyAgent,
    });

    console.log(`状态码: ${response.status}`);

    const data = await response.json() as {
      choices?: Array<{
        message?: { content?: string };
        finish_reason?: string;
      }>;
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      };
    };
    console.log("\n完整响应:");
    console.log(JSON.stringify(data, null, 2));

    console.log("\n=== 提取信息 ===");
    console.log(`内容: ${data.choices?.[0]?.message?.content}`);
    console.log(`Finish Reason: ${data.choices?.[0]?.finish_reason}`);
    console.log(`Usage:`, data.usage);

  } catch (error) {
    console.error("请求错误:", error);
  }
}

// 运行测试
async function main() {
  if (GEMINI_API_KEY === "YOUR_API_KEY_HERE") {
    console.error("请设置 GEMINI_API_KEY 环境变量或在脚本中替换 API Key");
    console.log("\n运行方式: GEMINI_API_KEY=your_key npx tsx scripts/test-gemini.ts");
    process.exit(1);
  }

  await testGemini();
  await testGeminiNonStream();
}

main();
