# 🤖 Inquira - AI Data Assistant for VS Code

> Transform your data analysis workflow with AI-powered insights and automated code generation

[![VS Code Marketplace](https://img.shields.io/badge/VS_Code_Marketplace-Install-blue)](https://marketplace.visualstudio.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

## 📋 Table of Contents

- [✨ Features](#-features)
- [🚀 Installation](#-installation)
- [⚙️ Configuration](#️-configuration)
- [🎯 Usage](#-usage)
- [🔧 Commands](#-commands)
- [🎨 Interface](#-interface)
- [🛠️ Development](#️-development)
- [📊 Performance](#-performance)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

## ✨ Features

### 🤖 AI-Powered Data Analysis

- **Intelligent Query Processing**: Natural language queries about your data
- **Context-Aware Responses**: Understands your data schema and relationships
- **Smart Code Generation**: Generates optimized Python code for data analysis
- **Real-time AI Responses**: Powered by Google Gemini 2.5 Flash

### 📊 Schema Management

- **Automatic Schema Generation**: Analyzes CSV files and creates data schemas
- **Schema Validation**: Ensures data integrity and type safety
- **Dynamic Schema Updates**: Adapts to changing data structures
- **Schema Viewing**: Integrated schema viewer in VS Code

### 💻 Code Integration

- **Seamless Code Insertion**: Automatically inserts generated code into your editor
- **Syntax Highlighting**: Proper Python syntax highlighting for generated code
- **Import Management**: Handles necessary library imports
- **Code Optimization**: Generates efficient, production-ready code

### 🎨 Modern UI/UX

- **Full-Width Layout**: Maximizes screen real estate for content
- **Markdown Rendering**: Rich text formatting with headers, lists, and code blocks
- **Responsive Design**: Adapts to different screen sizes
- **Dark/Light Theme Support**: Follows VS Code theme preferences
- **Smooth Scrolling**: Optimized scrolling performance

### ⚡ Performance Optimized

- **Lazy Loading**: Only activates when needed
- **Minimal Bundle Size**: Just 19KB package size
- **Fast Startup**: Optimized activation events
- **Memory Efficient**: In-memory chat storage with session persistence

### 🔧 Developer Experience

- **TypeScript**: Full type safety and IntelliSense support
- **ESLint**: Code quality and consistency
- **Source Maps**: Enhanced debugging experience
- **Hot Reload**: Development with live reloading

## 🚀 Installation

### Option 1: VS Code Marketplace (Recommended)

1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X` / `Cmd+Shift+X`)
3. Search for "Inquira"
4. Click **Install**

### Option 2: Manual Installation

1. Download the `.vsix` file from [releases](https://github.com/adarsh9780/inquira-extension/releases)
2. In VS Code: `Extensions → Install from VSIX...`
3. Select the downloaded `.vsix` file

### Option 3: From Source

```bash
git clone https://github.com/adarsh9780/inquira-extension.git
cd inquira-extension
npm install
npm run compile
code --install-extension inquira-extension-0.1.0.vsix
```

## ⚙️ Configuration

### Required Setup

1. **Google Gemini API Key**:

   - Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Free tier available with generous limits

2. **Data File Path**:
   - Path to your CSV data file
   - Supports absolute and relative paths
   - Example: `/Users/username/data/sales.csv`

### Configuration Steps

1. Open Inquira view in VS Code Explorer
2. Click the **⚙️ Settings** button
3. Fill in:
   - **API Key**: Your Google Gemini API key
   - **Data Path**: Path to your CSV file
   - **Context**: Optional description of your data
   - **Model**: Gemini model version (default: gemini-2.5-flash)
4. Click **Save Settings**
5. The extension will automatically generate your data schema

### Advanced Configuration

```json
{
  "inquira.apiKey": "your-gemini-api-key",
  "inquira.dataPath": "/path/to/your/data.csv",
  "inquira.hasSchema": true,
  "inquira.modelName": "gemini-2.5-flash",
  "inquira.context": "Sales data for Q1 2024"
}
```

## 🎯 Usage

### Basic Workflow

1. **Setup**: Configure API key and data path
2. **Schema Generation**: Extension analyzes your CSV automatically
3. **Query**: Ask questions in natural language
4. **Code Generation**: Get optimized Python code
5. **Integration**: Code inserts directly into your editor

### Example Queries

```
"Show me the total sales by region"
"Find customers with orders over $1000"
"Calculate average order value by month"
"Create a chart of sales trends"
"Filter data for customers from California"
```

### Generated Code Examples

```python
import duckdb
import pandas as pd

# Load and analyze data efficiently
query = "SELECT region, SUM(sales) as total_sales FROM data GROUP BY region"
df = duckdb.query(query).to_df()

# Display results
print(df)
```

## 🔧 Commands

| Command                    | Description                     | Shortcut |
| -------------------------- | ------------------------------- | -------- |
| `Inquira: Open Settings`   | Configure API key and data path | -        |
| `Inquira: Generate Schema` | Analyze CSV and create schema   | -        |
| `Inquira: View Schema`     | Open schema viewer              | -        |

## 🎨 Interface

### Main Interface

```
┌─────────────────┐
│ 🤖 Inquira      │ ← Header with controls
│ ⚙️ 👁️           │
├─────────────────┤
│                 │
│ Assistant:      │ ← Full-width responses
│ [Rich content   │
│  with markdown] │
│                 │
│ User message    │ ← Right-aligned input
│ [Your query]    │
│                 │
├─────────────────┤
│ Ask a question... │ ← Input area
│ [Send] ➤        │
└─────────────────┘
```

### Key Components

- **🤖 Robot Icon**: Extension branding
- **⚙️ Settings**: Configuration panel
- **👁️ Schema Viewer**: Data structure inspection
- **Input Area**: Natural language queries
- **Message History**: Scrollable conversation
- **Code Blocks**: Syntax-highlighted generated code

## 🛠️ Development

### Prerequisites

- Node.js 18+
- VS Code 1.74+
- Google Gemini API key

### Setup

```bash
# Clone repository
git clone https://github.com/adarsh9780/inquira-extension.git
cd inquira-extension

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch for changes
npm run watch
```

### Project Structure

```
inquira-extension/
├── src/
│   ├── extension.ts              # Main extension entry point
│   ├── providers/
│   │   └── InquiraViewProvider.ts # Webview provider
│   └── services/
│       ├── LLMService.ts         # AI integration
│       ├── SchemaManager.ts      # Data schema handling
│       ├── CodeInjector.ts       # Code insertion
│       └── ChatHistoryService.ts # Chat persistence
├── media/
│   ├── main.css                  # UI styles
│   └── webview.js               # Frontend logic
├── out/                          # Compiled JavaScript
├── package.json                  # Extension manifest
├── tsconfig.json                 # TypeScript config
└── README.md                     # This file
```

### Testing

```bash
# Run tests
npm test

# Lint code
npm run lint

# Package extension
npm run package
```

## 📊 Performance

### Bundle Size

- **Total Size**: 19.09 KB
- **Files**: 13 optimized files
- **Compression**: 99% reduction from development build

### Memory Usage

- **Startup**: Minimal impact (< 5MB)
- **Runtime**: Efficient in-memory storage
- **Activation**: Lazy loading only when needed

### Speed Metrics

- **First Load**: < 100ms
- **Query Response**: 2-5 seconds (depends on query complexity)
- **Code Generation**: Instant insertion
- **UI Rendering**: Smooth 60fps scrolling

## 🤝 Contributing

### Ways to Contribute

- 🐛 **Bug Reports**: Use GitHub Issues
- 💡 **Feature Requests**: Suggest new capabilities
- 🔧 **Code Contributions**: Submit Pull Requests
- 📖 **Documentation**: Improve guides and examples

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Run tests: `npm test`
5. Submit a Pull Request

### Code Standards

- **TypeScript**: Strict type checking enabled
- **ESLint**: Airbnb configuration
- **Prettier**: Consistent code formatting
- **Conventional Commits**: Structured commit messages

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

### Permissions

- ✅ Commercial use
- ✅ Modification
- ✅ Distribution
- ✅ Private use

### Limitations

- ❌ Liability
- ❌ Warranty

## 🙏 Acknowledgments

- **Google Gemini**: AI model powering the analysis
- **VS Code**: Excellent extension platform
- **DuckDB**: High-performance analytical database
- **TypeScript**: Type-safe development experience

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/adarsh9780/inquira-extension/issues)
- **Discussions**: [GitHub Discussions](https://github.com/adarsh9780/inquira-extension/discussions)
- **Email**: support@inquira.dev

---

**Made with ❤️ for data scientists and analysts**

Transform your data workflow with AI-powered insights and automated code generation! 🚀
