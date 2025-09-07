"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaManager = void 0;
const path = require("path");
const fs = require("fs");
const LLMService_1 = require("./LLMService");
class SchemaManager {
    constructor() {
        this.llmService = new LLMService_1.LLMService();
    }
    getSchemaPath(dataPath) {
        const dataDir = path.dirname(dataPath);
        const dataName = path.basename(dataPath, path.extname(dataPath));
        return path.join(dataDir, `${dataName}_schema.json`);
    }
    async generateSchema(dataPath, apiKey, model = 'gemini-1.5-flash', context) {
        const schema = await this.llmService.generateSchema(dataPath, apiKey, model, context);
        const schemaPath = this.getSchemaPath(dataPath);
        // Ensure directory exists
        const dir = path.dirname(schemaPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2));
    }
    async loadSchema(dataPath) {
        const schemaPath = this.getSchemaPath(dataPath);
        if (!fs.existsSync(schemaPath)) {
            return null;
        }
        try {
            const content = fs.readFileSync(schemaPath, 'utf8');
            return JSON.parse(content);
        }
        catch (error) {
            console.error('Error loading schema:', error);
            return null;
        }
    }
    async saveSchema(dataPath, schema) {
        const schemaPath = this.getSchemaPath(dataPath);
        fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2));
    }
}
exports.SchemaManager = SchemaManager;
//# sourceMappingURL=SchemaManager.js.map