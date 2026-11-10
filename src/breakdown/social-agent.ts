import { OutlierCandidate, ExtractedVideoFrame, AIAgentAudit } from '../types';
import { actualVideoFrames, uniqueFrames } from './evidence';

export const SOCIAL_MEDIA_EXPERT_SYSTEM_PROMPT = `Analyze only the supplied video samples. Each image is labeled with its measured timestamp.
Describe visible details precisely; do not invent camera actions, dialogue, editing between samples, audio, audience reactions or algorithm behavior.
Separate observations from hypotheses about why the content might work. No retention, completion-rate or viral-score numbers are available.
Return strict JSON with winningElement (observed visual feature), theOneOutlierThing (a qualified creative hypothesis), frameHighlights (objects with frameIndex and visualTrigger), and expertVerdict.
Do not claim these images establish the whole video timeline or its first six seconds.`;

/**
 * Runs the AI Social Media Expert Agent against the sequential FFmpeg frames.
 */
export async function runSocialMediaExpertAgent(
  candidate: OutlierCandidate,
  frames: ExtractedVideoFrame[],
  apiKey?: string
): Promise<AIAgentAudit> {
  const effectiveApiKey = apiKey || process.env.GEMINI_API_KEY;
  const samples = actualVideoFrames(frames);
  if (samples.length < 2) return unavailableAudit(frames, 'Video frames could not be extracted. A cover image cannot establish what happens in the video.');

  // 1. Try Gemini Multimodal API if an API key is present
  if (effectiveApiKey && effectiveApiKey.trim().length > 10) {
    try {
      const geminiResult = await callGeminiMultimodal(candidate, samples, effectiveApiKey.trim());
      if (geminiResult) {
        return {
          status: 'ai_analyzed',
          evidenceSource: 'frames',
          limitation: 'AI inspected sampled video images only. Audio and viewer retention were not measured.',
          agentModel: geminiResult.modelName,
          systemPrompt: SOCIAL_MEDIA_EXPERT_SYSTEM_PROMPT,
          winningElement: geminiResult.winningElement,
          theOneOutlierThing: geminiResult.theOneOutlierThing,
          framesExtractedCount: samples.length,
          extractedFrames: samples.map((f) => {
            const highlight = geminiResult.frameHighlights?.find((h: any) => h.frameIndex === f.index);
            return {
              ...f,
              visualTrigger: highlight?.visualTrigger || f.visualTrigger
            };
          }),
          frameHighlights: geminiResult.frameHighlights,
          rawInsights: geminiResult.expertVerdict,
          timestamp: new Date().toISOString()
        };
      }
    } catch (err: any) {
      console.warn('[Social Agent] Gemini multimodal call fallback:', err.message);
    }
  }

  // No generated expert claims when the model fails.
  return unavailableAudit(samples, 'Video images were extracted, but AI analysis did not complete. No creative verdict is available.');
}

/**
 * Calls Google Gemini multimodal endpoint with FFmpeg frames and system prompt.
 */
async function callGeminiMultimodal(
  candidate: OutlierCandidate,
  frames: ExtractedVideoFrame[],
  apiKey: string
): Promise<{
  modelName: string;
  winningElement: string;
  theOneOutlierThing: string;
  frameHighlights: any[];
  expertVerdict: string;
} | null> {
  // gemini-2.5-flash-lite tried first: confirmed fast and reliable in testing. gemini-1.5-flash
  // and gemini-2.0-flash are dropped - both confirmed 404 (deprecated/unavailable on this API
  // version; Google's own error for 2.0-flash points to gemini-3.8-flash as the replacement).
  const modelsToTry = [
    'gemini-2.5-flash-lite',
    'gemini-flash-latest',
    'gemini-3.8-flash'
  ];

  const userPrompt = `Video Title: "${candidate.title}"
Platform: ${candidate.platform}
View Count: ${candidate.viewCount.toLocaleString()}
Creator Median Views: ${candidate.creator.medianViews.toLocaleString()} (${candidate.outlierMultiplier}x Viral Multiplier)
Follower Reach Ratio: ${candidate.viewToFollowerRatio ? `${candidate.viewToFollowerRatio}x` : 'N/A'}
Caption: "${candidate.caption || ''}"
Audio: "${candidate.musicOrAudio || 'Original Audio'}"

Analyze the ${frames.length} sequential frames extracted via FFmpeg above.
Define the WINNING ELEMENT and the ONE THING that makes this video an outlier in exactly 2-3 sentences.`;

  // Build parts array: image frames first, then user prompt
  const parts: any[] = [];

  for (const frame of frames) {
    const base64Data = frame.dataUrl.replace(/^data:image\/[a-z]+;base64,/, '');
    if (base64Data && base64Data.length > 50) {
      parts.push({ text: `Video sample ${frame.index} at ${frame.timestamp}` });
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Data
        }
      });
    }
  }

  parts.push({ text: userPrompt });

  for (const model of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const payload: any = {
        systemInstruction: {
          parts: [{ text: SOCIAL_MEDIA_EXPERT_SYSTEM_PROMPT }]
        },
        contents: [
          {
            role: 'user',
            parts
          }
        ],
        generationConfig: {
          temperature: 0.5,
          responseMimeType: 'application/json'
        }
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000)
      });

      if (!res.ok) {
        // If forbidden or bad auth, do not loop further
        if (res.status === 400 || res.status === 401 || res.status === 403) {
          const errData = await res.json().catch(() => ({}));
          if (errData.error?.status === 'INVALID_ARGUMENT') break;
        }
        continue;
      }

      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) continue;

      const parsed = JSON.parse(rawText);
      if (typeof parsed.winningElement !== 'string' || !parsed.winningElement.trim() || typeof parsed.theOneOutlierThing !== 'string' || !parsed.theOneOutlierThing.trim()) continue;
      return {
        modelName: `Gemini Multimodal (${model})`,
        winningElement: parsed.winningElement,
        theOneOutlierThing: parsed.theOneOutlierThing,
        frameHighlights: Array.isArray(parsed.frameHighlights) ? parsed.frameHighlights.filter((h: any) => frames.some(f => f.index === h.frameIndex) && typeof h.visualTrigger === 'string').map((h: any) => ({ frameIndex: h.frameIndex, timestamp: frames.find(f => f.index === h.frameIndex)!.timestamp, visualTrigger: h.visualTrigger })) : [],
        expertVerdict: parsed.expertVerdict || rawText
      };
    } catch (e) {
      // Try next model
    }
  }

  return null;
}

/** Missing media or model output must not turn into a fabricated expert verdict. */
export function unavailableAudit(frames: ExtractedVideoFrame[], limitation: string): AIAgentAudit {
  const samples = actualVideoFrames(frames);
  return {
    status: 'unavailable',
    evidenceSource: samples.length ? 'frames' : frames.some(f => f.source === 'thumbnail') ? 'thumbnail' : 'none',
    limitation,
    framesExtractedCount: samples.length,
    extractedFrames: uniqueFrames(frames),
    timestamp: new Date().toISOString()
  };
}
