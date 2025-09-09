import { SYSTEM_INSTRUCTION, SCHEMA_GENERATION_PROMPT, CODE_GENERATION_PROMPT, fillPrompts } from "../prompts";

export class LLMService {
    private ai: any = null;

    public async generateCode(
        question: string,
        schema: any,
        apiKey: string,
        model: string = 'gemini-2.5-flash',
        currentFileContent?: string,
        dataPath?: string
    ): Promise<any> {
        const { GoogleGenAI, Type } = await import("@google/genai");

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
            SYSTEM_INSTRUCTION: SYSTEM_INSTRUCTION,
            QUESTION: question,
            CURRENT_CODE_CONTEXT: currentFileContent ? `\nExisting code in the file:\n${currentFileContent}` : '',
            SCHEMA: JSON.stringify(schema, null, 2),
            DATA_PATH: dataPath || ''
        };

        const prompt = fillPrompts(CODE_GENERATION_PROMPT, replacements);

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

    public async generateSchema(dataPath: string, apiKey: string, model: string = 'gemini-2.5-flash', context?: string): Promise<any> {
        const { GoogleGenAI, Type } = await import("@google/genai");

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

        const prompt = fillPrompts(SCHEMA_GENERATION_PROMPT, replacements);

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

    private async getColumnNames(dataPath: string): Promise<string[]> {
        // Use fallback method to read column names from CSV
        return this.getColumnNamesFallback(dataPath);
    }

    private async getColumnNamesFallback(dataPath: string): Promise<string[]> {
        try {
            const fs = require('fs');
            const content = fs.readFileSync(dataPath, 'utf8');
            const lines = content.split('\n');
            if (lines.length > 0) {
                // Assume first line is header
                const headers = lines[0].split(',').map((h: string) => h.trim().replace(/"/g, ''));
                return headers;
            }
            return [];
        } catch (error) {
            console.error('Error in fallback column name extraction:', error);
            return [];
        }
    }
}