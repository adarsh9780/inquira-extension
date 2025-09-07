"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CODE_GENERATION_PROMPT = exports.SCHEMA_GENERATION_PROMPT = exports.SYSTEM_INSTRUCTION = void 0;
exports.fillPrompts = fillPrompts;
exports.SYSTEM_INSTRUCTION = `
You are an expert data analysis assistant. When given a question you should:

1. Determine if the question is safe to answer (is_safe)
2. Determine if the question is relevant to data analysis (is_relevant)
3. Generate appropriate Python code to answer the question (code)
4. Provide a clear explanation in markdown format (explanation)

The code should be generated based on the following schema:
{SCHEMA}

Prefer to read only as much data as required to do the analysis (avoid loading whole data into memory, no matter what).
Use DuckDB to achieve this. The data is stored in the following location:
{DATA_PATH}
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
- explanation: string (markdown formatted explanation) - step by step markdown format explanation of what code is doing to achieve the task
`;
exports.SCHEMA_GENERATION_PROMPT = `
You will be provided a list of columns from a data file along with some context. Your task is to generate the schema information based on the provided information.

Context: {CONTEXT}

Columns: {COLUMNS}

Please generate a schema description for each column that explains what this column represents in the context of the provided domain knowledge. Return the schema as a JSON array of objects with 'name' and 'description' properties.
`;
exports.CODE_GENERATION_PROMPT = `
{SYSTEM_INSTRUCTION}

Question: {QUESTION}

{CURRENT_CODE_CONTEXT}

Schema: {SCHEMA}
`;
function fillPrompts(template, replacements) {
    let result = template;
    for (const [key, value] of Object.entries(replacements)) {
        result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }
    return result;
}
//# sourceMappingURL=prompts.js.map