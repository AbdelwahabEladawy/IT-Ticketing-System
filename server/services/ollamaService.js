import util from 'node:util';
import { execFile } from 'node:child_process';

const execFileAsync = util.promisify(execFile);
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const MODEL = process.env.OLLAMA_MODEL || 'gemma3:4b';
const DEFAULT_TIMEOUT_MS = Number(process.env.OLLAMA_REQUEST_TIMEOUT_MS || 30000);

const SYSTEM_PROMPT = `
You are كراون, the جلوبال انيرجي IT Assistant.
Begin each response with: "أنا تاج بس في القسم بيقولولي يا زغلول ، مساعد تكنولوجيا المعلومات في جلوبال انيرجي."
Always mention the company name exactly as "جلوبال انيرجي".
Respond professionally, clearly, and respectfully.
Use a friendly, technical tone when needed.
If asked about tickets, systems, or support processes, answer based on the available context.
If you do not have enough information, ask politely for clarification.
Language rules:
- Always reply in Arabic only.
Write the response in Arabic exactly as the user writes.
Do not invent sensitive internal details.
`;
const buildOllamaPayload = (message) => ({
    model: MODEL,
    prompt: `${SYSTEM_PROMPT}\nUser question: ${message}`,
    max_tokens: 256,
    temperature: 0.25
});

const getTextFromOllamaResponse = (json) => {
    if (!json || typeof json !== 'object') return null;

    if (Array.isArray(json.choices) && json.choices.length > 0) {
        const choice = json.choices[0];
        if (typeof choice.text === 'string' && choice.text.trim()) {
            return choice.text.trim();
        }
        if (choice.message && typeof choice.message.content === 'string') {
            return choice.message.content.trim();
        }
    }

    if (Array.isArray(json.output) && json.output.length > 0) {
        const output = json.output[0];
        if (typeof output === 'string' && output.trim()) {
            return output.trim();
        }
        if (output?.content && Array.isArray(output.content) && output.content.length > 0) {
            return String(output.content[0]).trim();
        }
    }

    if (typeof json.text === 'string' && json.text.trim()) {
        return json.text.trim();
    }

    return null;
};

const fetchWithTimeout = async (url, options = {}) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timeout);
    }
};

export const runOllamaPrompt = async (message) => {
    const payload = buildOllamaPayload(message);

    try {
        const response = await fetchWithTimeout(`${OLLAMA_HOST}/v1/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const bodyText = await response.text();
            throw new Error(`Ollama HTTP error ${response.status}: ${bodyText}`);
        }

        const json = await response.json();
        const text = getTextFromOllamaResponse(json);
        if (!text) {
            throw new Error('Unexpected Ollama HTTP response');
        }
        return text;
    } catch (error) {
        throw new Error(`Ollama HTTP failed: ${error?.message || 'unknown error'}`);
    }
};

export const runOllamaPromptCli = async (message) => {
    const args = [
        'run',
        MODEL,
        message,
        '--keepalive',
        '10m',
        '--nowordwrap',
        '--format',
        'json',
        '--think',
        'low'
    ];

    try {
        const { stdout, stderr } = await execFileAsync('ollama', args, {
            maxBuffer: 5 * 1024 * 1024
        });

        const output = stdout?.toString().trim() || stderr?.toString().trim();
        if (!output) {
            throw new Error('No output from ollama CLI');
        }

        const json = JSON.parse(output);
        const text = getTextFromOllamaResponse(json);
        if (!text) {
            throw new Error('Unexpected Ollama CLI response');
        }

        return text;
    } catch (error) {
        throw new Error(`Ollama CLI failed: ${error?.message || 'unknown error'}`);
    }
};

export const runOllama = async (message) => {
    try {
        return await runOllamaPrompt(message);
    } catch (httpError) {
        try {
            return await runOllamaPromptCli(message);
        } catch (cliError) {
            throw new Error(`${httpError.message}; fallback CLI failed: ${cliError.message}`);
        }
    }
};

export const warmupOllamaModel = async () => {
    try {
        await runOllamaPrompt('Hello');
    } catch {
        // ignore warmup failures
    }
};
