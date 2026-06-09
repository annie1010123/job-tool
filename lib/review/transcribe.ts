import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function transcribeAudio(audioBuffer: Buffer, filename: string): Promise<string> {
  const file = new File([new Uint8Array(audioBuffer)], filename, { type: "audio/mpeg" });

  const response = await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
    language: "zh",
    response_format: "text",
  });

  return response as unknown as string;
}
