import { z } from "zod";
import { getPrivateBlob } from "@/lib/storage";
import { llmLite } from "@/lib/llm";
import { LocalPDFParseProvider } from "@/lib/pdf-parse/local";

const ResumeProfileSchema = z.object({
  currentTitle: z.string().nullable(),
  yearsOfExperience: z.string().nullable(),
  industry: z.string().nullable(),
  specialties: z.array(z.string()).default([]),
  targetRole: z.string().nullable(),
  strengths: z.array(z.string()).default([]),
  tonePreference: z.string().nullable(),
  summary: z.string().nullable(),
});

export type ResumeProfileDraft = z.infer<typeof ResumeProfileSchema>;

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function inferYearsOfExperience(rawText: string) {
  const text = normalizeText(rawText);
  const match = text.match(/(\d{1,2})\+?\s*(?:年|yrs?|years?)/i);
  if (!match) return null;
  const years = Number(match[1]);
  if (Number.isNaN(years)) return null;
  if (years < 1) return "1 年以下";
  if (years <= 2) return "1–2 年";
  if (years <= 3) return "2–3 年";
  if (years <= 5) return "3–5 年";
  if (years <= 8) return "5–8 年";
  return "8 年以上";
}

async function extractPdfText(source: string, name: string) {
  const blobResult = await getPrivateBlob(source);
  if (blobResult.statusCode !== 200) {
    throw new Error("resume_blob_unavailable");
  }
  const fileBlob = await new Response(blobResult.stream).blob();
  const file = new File([fileBlob], name, { type: "application/pdf" });
  const provider = new LocalPDFParseProvider();
  const result = await provider.parse(file);
  return result.scanResult.units
    .map((unit) => unit.extractedTextSummary)
    .filter((value): value is string => Boolean(value))
    .join("\n");
}

export async function parseResumeFile(params: {
  source: string;
  name: string;
  type: string;
}) {
  const { source, name, type } = params;
  if (type !== "application/pdf") {
    return {
      rawText: "",
      profileDraft: {
        currentTitle: null,
        yearsOfExperience: null,
        industry: null,
        specialties: [],
        targetRole: null,
        strengths: [],
        tonePreference: "balanced",
        summary: "当前版本仅支持解析 PDF 简历。",
      } satisfies ResumeProfileDraft,
      parseStatus: "FAILED" as const,
    };
  }

  const rawText = await extractPdfText(source, name);
  if (!rawText.trim()) {
    return {
      rawText,
      profileDraft: {
        currentTitle: null,
        yearsOfExperience: null,
        industry: null,
        specialties: [],
        targetRole: null,
        strengths: [],
        tonePreference: "balanced",
        summary: "没能从这份简历里稳定提取到文字，请换一份可复制文本的 PDF 再试。",
      } satisfies ResumeProfileDraft,
      parseStatus: "FAILED" as const,
    };
  }

  const fallbackDraft: ResumeProfileDraft = {
    currentTitle: null,
    yearsOfExperience: inferYearsOfExperience(rawText),
    industry: null,
    specialties: [],
    targetRole: null,
    strengths: [],
    tonePreference: "balanced",
    summary: "已读取到简历文本，可继续手动补充行业、优势与目标岗位。",
  };

  try {
    const profileDraft = await llmLite.generateStructured(
      `你是一位作品集顾问。请从这份设计师简历中，提取适合写入 Designer Profile 的信息。

只提取能从简历明确判断的信息，不要编造。若没有明确证据就返回 null 或空数组。

返回字段说明：
- currentTitle: 当前职位
- yearsOfExperience: 只允许返回以下枚举之一：1 年以下 / 1–2 年 / 2–3 年 / 3–5 年 / 5–8 年 / 8 年以上
- industry: 主要行业或业务方向
- specialties: 最多 5 个，如 产品设计 / UI 设计 / UX 设计 / 交互设计 / 视觉设计 / 品牌设计 / 运营设计 / B 端设计 / C 端设计
- targetRole: 若简历能明显看出目标岗位再写，否则 null
- strengths: 最多 4 个，如 用户研究 / 信息架构 / 交互逻辑 / 视觉表达 / 系统设计 / 业务理解 / 跨团队协作 / 数据分析
- tonePreference: professional / balanced / expressive 三选一
- summary: 一句总结，说明这次从简历里提取到了什么

简历文本如下：
${rawText.slice(0, 12000)}`,
      ResumeProfileSchema,
      {
        task: "resume_parse",
        temperature: 0.1,
      }
    );

    return {
      rawText,
      profileDraft: {
        ...fallbackDraft,
        ...profileDraft,
        yearsOfExperience: profileDraft.yearsOfExperience ?? fallbackDraft.yearsOfExperience,
        tonePreference: profileDraft.tonePreference ?? "balanced",
      },
      parseStatus: "DONE" as const,
    };
  } catch {
    return {
      rawText,
      profileDraft: fallbackDraft,
      parseStatus: "DONE" as const,
    };
  }
}
