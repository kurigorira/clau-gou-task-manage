"use client";

import Anthropic from "@anthropic-ai/sdk";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReferenceLink } from "./types";

/**
 * Claude（Anthropic API）連携。
 * Google連携と同じ方針で、ユーザー自身のAPIキーを設定画面で入力し（localStorage保存）、
 * ブラウザから直接 Claude を呼び出す。サーバー不要。
 *
 * ⚠️ ブラウザから直接APIを叩くため、APIキーは利用者自身のブラウザ内にのみ保存されます。
 *    個人利用を前提とした構成です。
 */

const API_KEY_STORAGE = "clau-gou-anthropic-key";
// 最新かつ最も高性能な Claude モデル。
const MODEL = "claude-opus-4-8";

export interface SkillSuggestion {
  requiredSkills: string[];
  knowledgeNotes: string;
  referenceLinks: ReferenceLink[];
}

export interface SubtaskSuggestion {
  title: string;
  description: string;
}

interface TaskInput {
  title: string;
  description: string;
}

interface AnthropicContextValue {
  apiKey: string;
  setApiKey: (key: string) => void;
  isConfigured: boolean;
  suggestSkills: (task: TaskInput) => Promise<SkillSuggestion>;
  decomposeTask: (task: TaskInput) => Promise<SubtaskSuggestion[]>;
}

const AnthropicContext = createContext<AnthropicContextValue | null>(null);

function createClient(apiKey: string): Anthropic {
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
}

/** 強制ツール呼び出しで構造化JSONを得るための共通処理。 */
async function callWithTool<T>(
  apiKey: string,
  toolName: string,
  toolDescription: string,
  inputSchema: Anthropic.Tool.InputSchema,
  system: string,
  userText: string,
): Promise<T> {
  const client = createClient(apiKey);
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system,
    tools: [{ name: toolName, description: toolDescription, input_schema: inputSchema }],
    tool_choice: { type: "tool", name: toolName },
    messages: [{ role: "user", content: userText }],
  });

  if (res.stop_reason === "refusal") {
    throw new Error("リクエストが拒否されました。内容を変えて再試行してください。");
  }
  const toolUse = res.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claudeから有効な応答を取得できませんでした。");
  }
  return toolUse.input as T;
}

export function AnthropicProvider({ children }: { children: React.ReactNode }) {
  const [apiKey, setApiKeyState] = useState("");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(API_KEY_STORAGE);
      if (saved) setApiKeyState(saved);
    } catch {
      /* noop */
    }
  }, []);

  const setApiKey = useCallback((key: string) => {
    const trimmed = key.trim();
    setApiKeyState(trimmed);
    try {
      if (trimmed) window.localStorage.setItem(API_KEY_STORAGE, trimmed);
      else window.localStorage.removeItem(API_KEY_STORAGE);
    } catch {
      /* noop */
    }
  }, []);

  const suggestSkills = useCallback<AnthropicContextValue["suggestSkills"]>(
    async (task) => {
      if (!apiKey) throw new Error("先に Anthropic APIキーを設定してください。");
      return callWithTool<SkillSuggestion>(
        apiKey,
        "provide_required_knowledge",
        "タスクの遂行に必要な知識・技術・参考資料を登録する。",
        {
          type: "object",
          properties: {
            requiredSkills: {
              type: "array",
              items: { type: "string" },
              description: "必要な技術・スキル・知識（短い名詞句）",
            },
            knowledgeNotes: {
              type: "string",
              description: "前提知識や進め方のメモ（数文）",
            },
            referenceLinks: {
              type: "array",
              description:
                "信頼できる公式ドキュメント等のリンク。実在に確信があるものだけ。なければ空配列。",
              items: {
                type: "object",
                properties: {
                  label: { type: "string" },
                  url: { type: "string" },
                },
                required: ["label", "url"],
              },
            },
          },
          required: ["requiredSkills", "knowledgeNotes", "referenceLinks"],
        } as Anthropic.Tool.InputSchema,
        "あなたは丁寧なタスク管理アシスタントです。すべて日本語で、簡潔かつ実用的に回答してください。",
        `次のタスクを遂行するために必要な知識・技術を整理してください。\n\nタイトル: ${task.title}\n説明: ${task.description || "（なし）"}`,
      );
    },
    [apiKey],
  );

  const decomposeTask = useCallback<AnthropicContextValue["decomposeTask"]>(
    async (task) => {
      if (!apiKey) throw new Error("先に Anthropic APIキーを設定してください。");
      const result = await callWithTool<{ subtasks: SubtaskSuggestion[] }>(
        apiKey,
        "provide_subtasks",
        "タスクを実行可能なサブタスクに分解する。",
        {
          type: "object",
          properties: {
            subtasks: {
              type: "array",
              description: "3〜7件程度の、順序立てた実行可能なサブタスク",
              items: {
                type: "object",
                properties: {
                  title: { type: "string", description: "サブタスクのタイトル" },
                  description: {
                    type: "string",
                    description: "補足説明（1文程度、不要なら空文字）",
                  },
                },
                required: ["title", "description"],
              },
            },
          },
          required: ["subtasks"],
        } as Anthropic.Tool.InputSchema,
        "あなたは丁寧なタスク管理アシスタントです。すべて日本語で回答してください。",
        `次のタスクを、実行可能なサブタスクに分解してください。\n\nタイトル: ${task.title}\n説明: ${task.description || "（なし）"}`,
      );
      return result.subtasks ?? [];
    },
    [apiKey],
  );

  const value = useMemo<AnthropicContextValue>(
    () => ({
      apiKey,
      setApiKey,
      isConfigured: !!apiKey,
      suggestSkills,
      decomposeTask,
    }),
    [apiKey, setApiKey, suggestSkills, decomposeTask],
  );

  return (
    <AnthropicContext.Provider value={value}>{children}</AnthropicContext.Provider>
  );
}

export function useAnthropic(): AnthropicContextValue {
  const ctx = useContext(AnthropicContext);
  if (!ctx) {
    throw new Error("useAnthropic は AnthropicProvider の内側で使ってください");
  }
  return ctx;
}
