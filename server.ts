import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Image scanning service is not configured yet. Please check your API key in Settings > Secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function parseJsonSafely<T>(raw: string, fallback: T): T {
  const trimmed = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  if (!trimmed) return fallback;
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    return fallback;
  }
}

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '25mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  app.post('/api/ocr', async (req: Request, res: Response) => {
    try {
      const { imageBase64, mimeType } = req.body as {
        imageBase64?: string;
        mimeType?: string;
      };

      if (!imageBase64 || typeof imageBase64 !== 'string') {
        res.status(400).json({ error: 'Please select or capture an image first.' });
        return;
      }

      const cleanBase64 = imageBase64.includes(',')
        ? imageBase64.split(',')[1]
        : imageBase64;

      if (!cleanBase64 || cleanBase64.length < 32) {
        res.status(400).json({ error: 'The uploaded image appears to be empty or corrupted. Please choose another image.' });
        return;
      }

      const resolvedMimeType =
        mimeType && mimeType.startsWith('image/') ? mimeType : 'image/jpeg';

      const ai = getGeminiClient();

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: resolvedMimeType,
                data: cleanBase64,
              },
            },
            {
              text:
                'Perform careful OCR on this photograph of a notebook, book, or document page. ' +
                'Support both handwritten and printed text. ' +
                'Transcribe the visible readable English text accurately, preserving natural sentence spacing and punctuation, ' +
                'and normalizing accidental mid-word line-break hyphens into clean typing paragraphs. ' +
                'Do not invent text that is not visible in the image. If no readable text is found, return an empty string for text.',
            },
          ],
        },
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              text: {
                type: Type.STRING,
                description: 'The exact transcribed text from the image, formatted cleanly as paragraphs suitable for typing practice.',
              },
              detectedType: {
                type: Type.STRING,
                description: 'One of: handwritten, printed, mixed, or none.',
              },
            },
            required: ['text', 'detectedType'],
          },
        },
      });

      const raw = (response.text ?? '{}').trim();
      const parsed = parseJsonSafely<{ text?: string; detectedType?: string }>(raw, {});
      const extractedText = (parsed.text ?? '').replace(/\s+\n/g, '\n').trim();

      if (!extractedText) {
        res.status(422).json({
          error: 'No readable text was found in this image. Please upload a clearer, well-lit photo with visible text.',
        });
        return;
      }

      res.json({
        text: extractedText,
        detectedType: parsed.detectedType || 'mixed',
      });
    } catch (error) {
      const rawMessage =
        error instanceof Error ? error.message : 'Unable to read text from this image.';
      console.error('OCR Error:', error);

      let friendlyMessage = 'Unable to read text from this image right now. Please try again with a clear JPG or PNG image.';
      if (rawMessage.includes('GEMINI_API_KEY') || rawMessage.includes('API_KEY_INVALID') || rawMessage.includes('PERMISSION_DENIED')) {
        friendlyMessage = 'OCR service key is missing or invalid. Please verify GEMINI_API_KEY in Settings > Secrets.';
      } else if (rawMessage.includes('429') || rawMessage.includes('RESOURCE_EXHAUSTED')) {
        friendlyMessage = 'Too many scan requests right now. Please wait a few seconds and try again.';
      } else if (rawMessage.includes('Unable to process input image') || rawMessage.includes('INVALID_ARGUMENT')) {
        friendlyMessage = 'This image format could not be processed. Please upload a standard JPG, PNG, or WebP image.';
      }

      res.status(500).json({ error: friendlyMessage });
    }
  });

  app.post('/api/dictionary/generate', async (req: Request, res: Response) => {
    try {
      const { difficulty = 'intermediate', count = 6, excludeWords = [] } = req.body as {
        difficulty?: string;
        count?: number;
        excludeWords?: string[];
      };

      const safeCount = Math.min(Math.max(Number(count) || 6, 3), 10);
      const excludeList = Array.isArray(excludeWords)
        ? excludeWords.slice(0, 60).join(', ')
        : '';

      const ai = getGeminiClient();

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents:
          `Generate ${safeCount} useful English vocabulary words at the "${difficulty}" level for typing practice and vocabulary learning. ` +
          (excludeList ? `Avoid repeating these words: ${excludeList}. ` : '') +
          'For each word, provide: the lowercase English word (single word, alphabetic only), phonetic pronunciation (IPA or clear respelling in slashes), part of speech, difficulty ("beginner", "intermediate", or "advanced"), a concise 1-sentence English definition, an accurate Hindi meaning in Devanagari script, a simple Romanized Hindi transliteration, and a short natural example sentence using the word.',
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                word: { type: Type.STRING },
                pronunciation: { type: Type.STRING },
                partOfSpeech: { type: Type.STRING },
                difficulty: { type: Type.STRING },
                definition: { type: Type.STRING },
                hindiMeaning: { type: Type.STRING },
                hindiTransliteration: { type: Type.STRING },
                exampleSentence: { type: Type.STRING },
              },
              required: [
                'word',
                'pronunciation',
                'partOfSpeech',
                'difficulty',
                'definition',
                'hindiMeaning',
                'hindiTransliteration',
                'exampleSentence',
              ],
            },
          },
        },
      });

      const raw = (response.text ?? '[]').trim();
      const words = parseJsonSafely<unknown[]>(raw, []);
      res.json({ words });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to generate dictionary words.';
      console.error('Dictionary Generate Error:', error);
      res.status(500).json({ error: message });
    }
  });

  // Ensure JSON errors for API payload/syntax failures instead of Express HTML error pages
  app.use((err: unknown, req: Request, res: Response, next: (err?: unknown) => void) => {
    if (req.path.startsWith('/api/')) {
      const status = (err as { status?: number })?.status || 500;
      if (status === 413) {
        res.status(413).json({
          error: 'The uploaded image is too large. Please choose a smaller photo (under 15 MB).',
        });
        return;
      }
      res.status(status).json({
        error: 'Request could not be processed. Please try again with a standard JPG or PNG image.',
      });
      return;
    }
    next(err);
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TypeQuest server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
