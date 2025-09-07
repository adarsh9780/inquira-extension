"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const genai_1 = require("@google/genai");
const CodeOutput = {
    type: genai_1.Type.OBJECT,
    properties: {
        code: { type: genai_1.Type.STRING },
        explanation: { type: genai_1.Type.STRING }
    }
};
const Schema = {
    type: genai_1.Type.OBJECT,
    properties: {
        name: { type: genai_1.Type.STRING },
        description: { type: genai_1.Type.STRING }
    }
};
const SchemaList = {
    type: genai_1.Type.ARRAY,
    items: Schema
};
const settings = readJsonFile('/Users/adarshmaurya/.inquira/settings.json');
const ai = new genai_1.GoogleGenAI({ apiKey: settings.apiKey });
async function ask(userQuery, responseSchema, model = 'gemini-2.5-flash') {
    const response = await ai.models.generateContent({
        model: model,
        contents: userQuery,
        config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
        },
    });
    console.log(response.text);
}
// Function to read a JSON file and parse it
function readJsonFile(filePath) {
    try {
        const fs = require('fs');
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const jsonData = JSON.parse(fileContent);
        return jsonData;
    }
    catch (error) {
        console.error('Error reading or parsing JSON file:', filePath, error);
        throw error;
    }
}
// load schema once the schema is generated and pass it throught the Schema list validation
const schema = SchemaList;
const system_instruction = `
You are an expert data analysis assistant. When given a question you should:

1. Determine if the question is safe to answer (is_safe)
2. Determine if the question is relevant to data analysis (is_relevant)
3. Generate appropriate Python code to answer the question (code)
4. Provide a clear explanation in markdown format (explanation)

The code should be generated based on the following schema:
${schema}

Occasionally, you might also see an existing code which will help you to understand what the user was trying.
If there is code, build on top of it, making sure that the new code is self sufficient, meaning it should be able to produce
the user ask without user needing to run the old code.
{code}

Prefer to read only as much as data as required to do the analysis (avoid loading whole data into memory, no matter what).
Use DuckDB to achieve this. The data is stored in the following location:
${settings.data_path}
Once the required data is loaded by duckdb, feel free to use Pandas to achieve the final result. Basically, use DuckDB to load initial
data into the memory and use pandas to analyse the code. this is because, the user file could be very large and reading the whole data
into memory using pandas might take a long time or might not work at all.

# Steps
1. First based on the user ask, analyse how much data you need to load into memory
2. use duckdb and write a SQL query to load the data. if the ask is simple you can use duckdb completely to achieve the task
3. if the ask is not straight forward, make sure first to load the data into memory and then use pandas to do the further transformation
4. Use ".query" to filter rows in pandas, if required
5. Use ".assign" to create new column in pandas, if required
6. Use chained operation as much as possible in pandas
7. make sure all outputs are either: pandas dataframe, plotly figure or scalars and nothing else.


Return your response as a JSON object with these exact keys:
- is_safe: boolean
- is_relevant: boolean
- code: string (Python code)
- explanation: string (markdown formatted explanation) - step by step markdown format explanantion of what code is doing to acheive the task
`;
// load column names using duckdb
const columnNames = ['column1', 'column2', 'column3']; // Placeholder for actual column names
const prompt = `You will be provided a list of columns from a data file along with some context. Your task is to generate the schema information based on the provided information.

Context: ${settings.context}

Columns: ${columnNames.join(', ')}

Please generate a schema description for each column that explains what this column represents in the context of the provided domain knowledge. Return the schema as a JSON array of objects with 'name' and 'description' properties.`;
ask(prompt, SchemaList);
//# sourceMappingURL=test.js.map