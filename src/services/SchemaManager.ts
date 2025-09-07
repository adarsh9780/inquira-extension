import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { LLMService } from './LLMService';

export class SchemaManager {
    private llmService: LLMService;

    constructor() {
        this.llmService = new LLMService();
    }

    public getSchemaPath(dataPath: string): string {
        const dataDir = path.dirname(dataPath);
        const dataName = path.basename(dataPath, path.extname(dataPath));
        return path.join(dataDir, `${dataName}_schema.json`);
    }

    public async generateSchema(dataPath: string, apiKey: string, model: string = 'gemini-1.5-flash', context?: string): Promise<void> {
        const schema = await this.llmService.generateSchema(dataPath, apiKey, model, context);
        const schemaPath = this.getSchemaPath(dataPath);

        // Ensure directory exists
        const dir = path.dirname(schemaPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2));
    }

    public async loadSchema(dataPath: string): Promise<any | null> {
        const schemaPath = this.getSchemaPath(dataPath);

        if (!fs.existsSync(schemaPath)) {
            return null;
        }

        try {
            const content = fs.readFileSync(schemaPath, 'utf8');
            return JSON.parse(content);
        } catch (error) {
            console.error('Error loading schema:', error);
            return null;
        }
    }

    public async saveSchema(dataPath: string, schema: any): Promise<void> {
        const schemaPath = this.getSchemaPath(dataPath);
        fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2));
    }
}