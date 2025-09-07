# Inquira Extension

A VS Code extension that brings conversational data analysis capabilities powered by Google Gemini LLM directly into your editor.

## Features

- **Natural Language Data Queries**: Ask questions about your data in plain English
- **Automatic Code Generation**: Get Python code generated and inserted into your files
- **Schema Management**: Generate and edit data schemas as JSON files
- **Multi-format Support**: Works with Python files and Jupyter notebooks
- **Side Panel Interface**: Clean, integrated UI similar to other AI coding assistants

## Setup

1. Install the extension
2. Get a Google Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
3. Open VS Code settings and configure:
   - `inquira.apiKey`: Your Google Gemini API key
   - `inquira.dataPath`: Path to your data file (CSV, JSON, etc.)
   - `inquira.model`: Gemini model (default: gemini-2.5-flash)

## Usage

1. Open the Inquira panel from the Explorer sidebar
2. Click the settings icon to configure your data file and API key
3. Generate a schema for your data (optional but recommended)
4. Ask questions like:
   - "What are the top 5 products by sales?"
   - "Show me the average price by category"
   - "Plot a histogram of customer ages"

The generated Python code will be automatically inserted into your active Python file or Jupyter notebook.

## Schema Management

- **Generate Schema**: Click the gear icon and select "Generate Schema"
- **View Schema**: Click the gear icon and select "View Schema" to open the JSON file
- **Edit Schema**: Open the generated `_schema.json` file in VS Code to modify column types and descriptions

## Supported File Types

- Python (.py) files
- Jupyter notebooks (.ipynb)

## Requirements

- VS Code 1.74.0 or later
- Google Gemini API key
- Data file (CSV, JSON, Excel, etc.)

## Architecture

The extension consists of:

- **Webview UI**: React-like interface for chat and settings
- **LLM Service**: Integration with Google Gemini for code generation
- **Schema Manager**: Handles data schema generation and storage
- **Code Injector**: Inserts generated code into editors and notebooks

## Development

```bash
npm install
npm run compile
npm run watch
```

Press F5 to launch extension development host.

## License

MIT
