"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMService = void 0;
const prompts_1 = require("../prompts");
class LLMService {
    constructor() {
        this.ai = null;
    }
    async generateCode(question, schema, apiKey, model = 'gemini-2.5-flash', currentFileContent, dataPath) {
        const { GoogleGenAI, Type } = await Promise.resolve().then(() => require("@google/genai"));
        if (!this.ai) {
            this.ai = new GoogleGenAI({ apiKey: apiKey });
        }
        const CodeOutput = {
            type: Type.OBJECT,
            properties: {
                is_safe: { type: Type.BOOLEAN },
                is_relevant: { type: Type.BOOLEAN },
                code: { type: Type.STRING },
                explanation: { type: Type.STRING }
            }
        };
        const replacements = {
            SYSTEM_INSTRUCTION: prompts_1.SYSTEM_INSTRUCTION,
            QUESTION: question,
            CURRENT_CODE_CONTEXT: currentFileContent ? `\nExisting code in the file:\n${currentFileContent}` : '',
            SCHEMA: JSON.stringify(schema, null, 2),
            DATA_PATH: dataPath || ''
        };
        const prompt = (0, prompts_1.fillPrompts)(prompts_1.CODE_GENERATION_PROMPT, replacements);
        const result = await this.ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: CodeOutput,
            }
        });
        const text = result.text || '';
        return JSON.parse(text);
    }
    async generateSchema(dataPath, apiKey, model = 'gemini-2.5-flash', context) {
        const { GoogleGenAI, Type } = await Promise.resolve().then(() => require("@google/genai"));
        if (!this.ai) {
            this.ai = new GoogleGenAI({ apiKey: apiKey });
        }
        const SchemaItem = {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING },
                description: { type: Type.STRING }
            }
        };
        const SchemaList = {
            type: Type.ARRAY,
            items: SchemaItem
        };
        // Get column names using DuckDB
        const columnNames = await this.getColumnNames(dataPath);
        const replacements = {
            CONTEXT: context || 'General data analysis',
            COLUMNS: columnNames.join(', ')
        };
        const prompt = (0, prompts_1.fillPrompts)(prompts_1.SCHEMA_GENERATION_PROMPT, replacements);
        const result = await this.ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: SchemaList
            }
        });
        const text = result.text || '';
        return JSON.parse(text);
    }
    async getColumnNames(dataPath) {
        // Use fallback method to read column names from CSV
        return this.getColumnNamesFallback(dataPath);
    }
    async getColumnNamesFallback(dataPath) {
        try {
            const fs = require('fs');
            const content = fs.readFileSync(dataPath, 'utf8');
            const lines = content.split('\n');
            if (lines.length > 0) {
                // Assume first line is header
                const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''));
                return headers;
            }
            return [];
        }
        catch (error) {
            console.error('Error in fallback column name extraction:', error);
            return [];
        }
    }
}
exports.LLMService = LLMService;
//# sourceMappingURL=LLMService.js.map