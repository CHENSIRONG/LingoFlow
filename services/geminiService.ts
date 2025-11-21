import { GoogleGenAI, Type, Modality } from "@google/genai";

const getClient = () => {
  // Check for VITE_API_KEY (Vercel/Vite standard) or fallback to API_KEY (Local/Node)
  // We cast import.meta to any to avoid TS errors if tsconfig isn't set up for Vite types
  const apiKey = (import.meta as any).env?.VITE_API_KEY || process.env.API_KEY;
  
  if (!apiKey) {
    console.error("API_KEY is missing. Please set VITE_API_KEY in your Vercel Environment Variables.");
  }
  return new GoogleGenAI({ apiKey: apiKey || '' });
};

// --- Audio Controller & Cache ---
const audioCache = new Map<string, string>();

// Global AudioContext for lower latency (reuse context)
let audioContext: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;

const getAudioContext = () => {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioContext = new AudioContextClass({ sampleRate: 24000 });
  }
  return audioContext;
};

// --- PCM Audio Decoding Helpers ---
function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const stopAudio = () => {
  if (currentSource) {
    try {
      currentSource.stop();
    } catch (e) {
      // Ignore errors if already stopped
    }
    currentSource = null;
  }
};

export const playAudio = async (base64Audio: string, onEnded?: () => void) => {
  try {
    stopAudio(); // Stop any currently playing audio
    
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    
    const bytes = decodeBase64(base64Audio);
    const audioBuffer = await decodeAudioData(bytes, ctx, 24000, 1);
    
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    
    source.onended = () => {
      currentSource = null;
      if (onEnded) onEnded();
    };
    
    source.start(0);
    currentSource = source;
  } catch (e) {
    console.error("Audio playback failed", e);
    if (onEnded) onEnded();
  }
};

// --- Main Services ---

// Step 1: Fast Translation
export const translateTextSimple = async (text: string, targetLang: string) => {
  const ai = getClient();
  const prompt = `Translate "${text}" to ${targetLang}. Return only the translation text.`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text?.trim() || '';
  } catch (e) {
    console.error("Fast translation failed", e);
    return '';
  }
};

// Step 2: Rich Context (Explanation & Story)
export const getRichContext = async (
  text: string,
  sourceLang: string,
  targetLang: string
) => {
  const ai = getClient();
  
  // Optimized prompt for speed: Concise instructions reduce input/output tokens
  const prompt = `
    Task: Explain "${text}" to a friend.
    Source: ${sourceLang}, Target: ${targetLang}

    Return JSON:
    1. definition: Casual explanation in ${sourceLang}. Fun, direct, mention context/nuance.
    2. story: Short 1-2 sentence fun story in ${sourceLang} using the input.
    3. translation: Input translated to ${targetLang}.
    4. definitionTranslation: definition translated to ${targetLang}.
    5. storyTranslation: story translated to ${targetLang}.
  `;

  // Optimization: Use gemini-2.5-flash for speed
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash', 
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          definition: { type: Type.STRING },
          story: { type: Type.STRING },
          translation: { type: Type.STRING },
          definitionTranslation: { type: Type.STRING },
          storyTranslation: { type: Type.STRING },
        },
        required: ["definition", "story", "translation", "definitionTranslation", "storyTranslation"],
      },
    },
  });

  return JSON.parse(response.text || '{}');
};

export const chatWithAI = async (
  message: string, 
  context: string, 
  history: {role: string, parts: {text: string}[]}[] 
) => {
  const ai = getClient();

  const systemInstruction = `You are a friendly language tutor. 
  Context: ${context}.
  Answer questions concisely.`;

  const chat = ai.chats.create({
    model: "gemini-2.5-flash",
    history: history,
    config: {
      systemInstruction: systemInstruction
    }
  });

  const result = await chat.sendMessage({ message: message });
  return result.text || "";
};

export const generateVisualImage = async (inputText: string, definition?: string, story?: string) => {
  const ai = getClient();
  try {
    const prompt = `
      Subject: "${inputText}"
      Meaning: "${definition || ''}"
      Story: "${story || ''}"
      
      Create a high-quality, minimalist, educational illustration capturing this subject.
      Style: 4k, dramatic lighting, modern vector-like aesthetic with 3D depth.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: { responseModalities: [Modality.IMAGE] },
    });

    const part = response.candidates?.[0]?.content?.parts?.[0];
    if (part && part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
    return null;
  } catch (e) {
    console.error("Image gen failed", e);
    throw e;
  }
};

export const generateVisualSvg = async (inputText: string, definition?: string, story?: string) => {
  const ai = getClient();
  
  const prompt = `
    Generate SVG code for: "${inputText}".
    Meaning: "${definition || ''}"
    Story: "${story || ''}"
    
    Requirements:
    - Modern, flat, colorful vector art.
    - Abstract/symbolic representation preferred.
    - Self-contained <svg>.
    - Responsive viewBox.
    - NO markdown.
  `;

  // Use gemini-3-pro-preview for better SVG coding capabilities
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: { responseMimeType: 'text/plain' }
  });

  let svg = response.text || '';
  svg = svg.replace(/```xml/g, '').replace(/```svg/g, '').replace(/```/g, '').trim();
  
  if (!svg.includes('<svg')) return null;
  return svg;
};

export const generateSpeech = async (text: string, voiceName: string = 'Puck') => {
  // Check cache first
  const cacheKey = `${text}-${voiceName}`;
  if (audioCache.has(cacheKey)) {
    return audioCache.get(cacheKey);
  }

  const ai = getClient();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      audioCache.set(cacheKey, base64Audio); // Cache the result
      return base64Audio;
    }
    return null;
  } catch (e) {
    console.error("TTS failed", e);
    return null;
  }
};
