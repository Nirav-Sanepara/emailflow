import OpenAI from "openai";

function getOpenAI() {
  return new OpenAI({
    apiKey: process.env.OPENCODE_ZEN_API_KEY || process.env.OPENAI_API_KEY,
    baseURL: "https://opencode.ai/zen/v1",
  });
}

export async function improveEmail(
  action: string,
  subject: string,
  body: string
): Promise<{ subject: string; body: string }> {
  let prompt = "";

  switch (action) {
    case "subject_variants":
      prompt = `Given the email subject "${subject}" and body "${body}", generate 3 alternative subject lines that are engaging and effective. Return a JSON object with a "subject" field containing the best variant.`;
      break;
    case "professional":
      prompt = `Rewrite the following email to be more professional and polished in tone. Return a JSON object with "subject" and "body" fields.\n\nSubject: ${subject}\n\nBody: ${body}`;
      break;
    case "friendly":
      prompt = `Rewrite the following email to be warm and friendly in tone. Return a JSON object with "subject" and "body" fields.\n\nSubject: ${subject}\n\nBody: ${body}`;
      break;
    case "grammar":
      prompt = `Fix grammar, spelling, and clarity issues in the following email while preserving its original tone. Return a JSON object with "subject" and "body" fields.\n\nSubject: ${subject}\n\nBody: ${body}`;
      break;
    default:
      throw new Error(`Unknown action: ${action}`);
  }

  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model: "deepseek-v4-flash-free",
    messages: [
      {
        role: "system",
        content:
          "You are an expert email copywriter. Return only valid JSON with 'subject' and 'body' fields. No markdown, no code fences.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.7,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from AI");
  }

  const cleaned = content.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const parsed = JSON.parse(cleaned);
  return {
    subject: parsed.subject || subject,
    body: parsed.body || body,
  };
}

export async function generateFromPrompt(
  userPrompt: string
): Promise<{ subject: string; body: string }> {
  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model: "deepseek-v4-flash-free",
    messages: [
      {
        role: "system",
        content:
          "You are an expert email copywriter. Write a complete email based on the user's request. " +
          "Return only valid JSON with 'subject' and 'body' fields. " +
          "The body must be valid, complete HTML. " +
          "Use proper <p> tags for paragraphs. " +
          "For buttons/links, use complete <a href=\"\"> tags with empty href (users will fill in the URL later). " +
          "Include appropriate heading, greeting, and signature sections. " +
          "No markdown, no code fences, no triple backticks.",
      },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from AI");
  }

  const cleaned = content.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const parsed = JSON.parse(cleaned);
  return {
    subject: parsed.subject || "",
    body: parsed.body || "",
  };
}

export async function generateSubjectVariants(
  subject: string,
  body: string
): Promise<string[]> {
  const prompt = `Given the email subject "${subject}" and body "${body}", generate 3 alternative subject lines. Return a JSON object with a "variants" array containing 3 strings. No markdown, no code fences.`;

  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model: "deepseek-v4-flash-free",
    messages: [
      {
        role: "system",
        content:
          "You are an expert email copywriter. Return only valid JSON with a 'variants' array. No markdown, no code fences.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.7,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from AI");
  }

  const cleaned = content.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const parsed = JSON.parse(cleaned);
  return parsed.variants || [subject];
}
