# ChatGPT Export Explorer

**The first complete ChatGPT export viewer with ZIP import support.** 🎉

A privacy-first, zero-setup web application for importing, viewing, and searching your ChatGPT conversation exports. Works entirely in your browser with no backend, no databases, and no configuration required.

## ✨ Features

### Core Functionality
- **📦 ZIP Import**: Drop your full ChatGPT export ZIP file - no manual extraction needed
- **📚 Multi-Export Support**: Import multiple export files, each with its own database
- **🔄 Resume Functionality**: Automatically loads all previously imported exports on startup
- **🔍 Powerful Search**: Search across all conversation titles and message content simultaneously
- **💾 Local Storage**: Uses IndexedDB with Dexie.js for fast, offline data access
- **🎨 Beautiful UI**: Clean, modern interface with dark/light theme support
- **⚡ Lightning Fast**: Optimized for large conversation datasets (10,000+ conversations)
- **🔒 Privacy First**: All data stays in your browser - never leaves your device

### User Experience
- **Drag & Drop**: Simply drag your ChatGPT export ZIP onto the landing screen
- **Keyboard Shortcuts**: Full keyboard navigation (Ctrl+K, F3, Shift+F3)
- **Responsive Design**: Works seamlessly across desktop, tablet, and mobile
- **Accessibility**: Font size controls, high contrast mode, and ARIA labels
- **Real-time Highlighting**: Search terms highlighted with context snippets

### What Makes This Different

This is the **first tool** that:
- ✅ Accepts the full ChatGPT export ZIP (no manual extraction)
- ✅ Works completely offline (no servers, no Supabase)
- ✅ Requires zero setup (just `npm install && npm run dev`)
- ✅ Has a polished, production-ready UI
- ✅ Keeps your data 100% private

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or pnpm package manager
- Modern web browser (Chrome 89+, Firefox 87+, Safari 14+, Edge 89+)

### Installation

1. Clone this repository:
   ```bash
   git clone <your-repo-url>
   cd chatgpt-export-explorer
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   pnpm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

4. Open `http://localhost:5173` in your browser.

**That's it.** No Docker, no Supabase, no database setup, no configuration.

### Building for Production

Build the application:
```bash
npm run build
# or
pnpm build
```

Preview the production build:
```bash
npm run preview
# or
pnpm preview
```

## 📖 Usage

### Importing Your ChatGPT Exports

1. **Export from ChatGPT**:
   - Go to ChatGPT Settings → Data Controls → Export Data
   - Wait for the email with your export
   - Download the ZIP file from the email

2. **Import into ChatGPT Export Explorer**:
   - **Drag & Drop**: Drag the ZIP file onto the landing screen
   - **Browse**: Click "Add Export" and select one or more ZIP files
   - The app will automatically extract `conversations.json` and import all conversations
   - Each export file gets its own database, allowing you to manage multiple exports separately

3. **Browse & Search**:
   - Click any conversation in the sidebar to view it
   - Use the search bar to find specific conversations or messages
   - All data is stored locally in your browser's IndexedDB
   - Previously imported exports are automatically loaded when you return to the app

### Navigation Features

- **Landing Screen**: Professional interface with drag-and-drop functionality
- **Conversation Sidebar**: Browse all conversations chronologically with search filtering
- **Main Conversation View**: Read full conversation threads with syntax-highlighted code blocks
- **Global Search**: Find content across all conversations instantly (Ctrl+Shift+K)
- **Conversation Search**: Search within the current conversation (Ctrl+K)
- **Theme Toggle**: Switch between dark and light themes or use automatic system detection

### Search Capabilities

- **Comprehensive Search**: Searches both conversation titles and message content
- **Real-time Highlighting**: Search terms highlighted in yellow, current result in orange
- **Context Snippets**: Search results show relevant context around matches
- **Search Navigation**: Use F3/Shift+F3 or navigation buttons to jump between results
- **Instant Filtering**: Search results appear as you type with intelligent debouncing

### Keyboard Shortcuts

- **Ctrl+Shift+K**: Open global search (default search mode)
- **Ctrl+K**: Search within current conversation
- **F3**: Navigate to next search result
- **Shift+F3**: Navigate to previous search result
- **Escape**: Clear active search and return to conversation list
- **Ctrl+Plus/Minus**: Adjust font size
- **Ctrl+Shift+H**: Toggle high contrast mode

## 🏗️ Architecture

### Technology Stack

- **Frontend**: Vanilla JavaScript (ES6+ modules) with Vite build system
- **Database**: IndexedDB with Dexie.js wrapper for structured data storage
- **Styling**: Professional CSS with CSS custom properties for theming
- **Markdown**: Marked.js for rich text rendering
- **Syntax Highlighting**: Prism.js for code blocks in conversations
- **ZIP Support**: JSZip for extracting conversations.json from export ZIPs

### Data Structure

The application processes ChatGPT export format:
- `conversations.json` containing array of conversation objects
- Each conversation includes `title`, `create_time`, `update_time`, and `mapping`
- Messages extracted from nested `mapping` structure with role-based organization
- Optimized database schema with indexed fields for fast queries

### Performance Features

- **Intelligent Search**: Global search across titles and content with result ranking
- **Debounced Inputs**: 300ms debouncing prevents excessive database queries
- **Bulk Operations**: Efficient batch inserts for large datasets
- **Memory Optimization**: Clean event handling and DOM management
- **Responsive Rendering**: Uses DocumentFragment for efficient DOM updates
- **Theme Persistence**: Automatic theme detection with localStorage persistence

### File Structure

```
chatgpt-export-explorer/
├── src/
│   ├── main.js           # Core application logic and UI management
│   ├── database.js       # IndexedDB operations with Dexie.js (multi-database support)
│   ├── export-manager.js # Export registry and multi-export management
│   ├── zip-handler.js    # Secure ZIP file extraction and validation
│   ├── search.js         # Global search functionality and keyboard shortcuts
│   ├── renderer.js       # Message rendering with syntax highlighting
│   ├── sampleData.js    # Sample conversations for testing
│   └── style.css         # Professional styling with theme system
├── index.html           # Application structure with landing screen
├── package.json         # Dependencies and build scripts
└── README.md            # This file
```

## 🔄 Upstream Tracking

This project is based on [ChatGPT Export Explorer](https://github.com/z1shivam/chatgpt-export-explorer) by [z1shivam](https://github.com/z1shivam), with significant enhancements:

### Enhancements Over Upstream

- ✅ **ZIP Import**: Full ChatGPT export ZIP support (no manual extraction)
- ✅ **Multi-Export Support**: Import and manage multiple export files with separate databases
- ✅ **Resume Functionality**: Automatically loads all previously imported exports on startup
- ✅ **Enhanced UI**: Improved landing page and user experience
- ✅ **Better Documentation**: Comprehensive setup and usage guides
- ✅ **Production Ready**: Optimized build and deployment configuration
- ✅ **Security Hardening**: Dynamic system-aware limits, comprehensive security audit

### Syncing with Upstream

To pull updates from the upstream repository:

```bash
# Add upstream remote (if not already added)
git remote add upstream https://github.com/z1shivam/chatgpt-export-explorer.git

# Fetch upstream changes
git fetch upstream

# Merge upstream changes into your branch
git merge upstream/main

# Or rebase your changes on top of upstream
git rebase upstream/main
```

## 🔒 Security

This application follows UNIX best practices for secure file handling:

### ZIP File Security

- **Path Validation**: All file paths are validated to prevent directory traversal attacks (`../`, absolute paths, etc.)
- **Selective Extraction**: Only `conversations.json` is extracted from ZIP files - all other files are ignored
- **Size Limits**: Multiple size limits prevent ZIP bomb attacks and resource exhaustion
- **Memory Management**: Resources are properly cleaned up after processing
- **No Disk Writes**: All processing happens in memory (browser context)

### Security Features

- ✅ XSS protection via DOMPurify sanitization
- ✅ Dynamic file size validation (system-aware limits based on available memory)
- ✅ ZIP bomb protection (validates extracted size before extraction)
- ✅ Path sanitization (prevents directory traversal)
- ✅ Content Security Policy headers
- ✅ Input validation at every step
- ✅ Duplicate export detection (prevents re-processing same files)

For detailed security information, see:
- [SECURITY.md](./SECURITY.md) - Security audit and recommendations
- [SECURITY_REVIEW.md](./SECURITY_REVIEW.md) - Comprehensive security review
- [SECURITY_ZIP_HANDLING.md](./SECURITY_ZIP_HANDLING.md) - ZIP file handling security

## 🤝 Contributing

Contributions are welcome! This project fills a real gap in the ChatGPT export tooling ecosystem.

### Development Setup

1. Fork the repository
2. Clone your fork: `git clone <your-fork-url>`
3. Navigate to project: `cd chatgpt-export-explorer`
4. Install dependencies: `npm install`
5. Start development server: `npm run dev`
6. Make your changes and test thoroughly
7. **Run pre-commit validation**: `npm run pre-commit`
8. Submit a pull request with detailed description

### Code Quality Requirements

**All code must pass validation before committing:**

```bash
npm run pre-commit  # Runs lint, format check, and build
```

This ensures:
- ✅ Zero ESLint errors or warnings
- ✅ Code is properly formatted
- ✅ Build succeeds without errors

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.

### Code Guidelines

- Follow existing code style and architecture
- Run `npm run lint:fix` and `npm run format` before committing
- Test with large conversation datasets
- Ensure responsive design works across devices
- Maintain performance optimizations
- Update documentation for new features

## 📝 License

This project is open source and available under the **MIT License**.

## 🙏 Credits

For detailed credits and acknowledgments, see [CREDITS.md](./CREDITS.md).

### Quick Credits

- **Upstream**: [ChatGPT Export Explorer](https://github.com/z1shivam/chatgpt-export-explorer) by [z1shivam](https://github.com/z1shivam)
- **Dependencies**: Dexie.js, JSZip, Marked.js, Prism.js, Vite
- **Full Credits**: See [CREDITS.md](./CREDITS.md) for complete acknowledgments

## 🐛 Troubleshooting

### Common Issues

1. **File not loading**: 
   - Ensure your file is a valid ChatGPT export ZIP
   - Check file size (very large files may take time to process)
   - Verify the ZIP contains `conversations.json`

2. **Performance issues**: 
   - For datasets >10,000 conversations, allow extra time for initial indexing
   - Close other browser tabs to free up memory
   - Consider clearing old data if no longer needed

3. **Search not working**: 
   - Ensure conversations are fully loaded and indexed
   - Try refreshing the page and reloading data
   - Check browser console for any error messages

4. **Theme not persisting**:
   - Ensure localStorage is enabled in your browser
   - Check if browser is in private/incognito mode

### Performance Tips

- **Large Datasets**: Allow time for initial processing of large conversation files
- **Search Efficiency**: Use specific search terms rather than single characters
- **Memory Management**: Clear data periodically if working with multiple large datasets
- **Browser Resources**: Close unnecessary tabs when working with large conversation sets

### Getting Help

- Check the browser console (F12) for detailed error messages
- Ensure your ChatGPT export file is recent and complete
- Try the application with a smaller test file first
- Report issues with specific error messages and file sizes

## 🌟 Why This Exists

Most ChatGPT export tools require:
- Manual ZIP extraction
- Server setup (Supabase, Docker, etc.)
- Complex configuration
- Data uploads to external services

**ChatGPT Export Explorer** eliminates all of that. It's the tool that should have existed from day one - simple, private, and it just works.

---

**Made with ❤️ for people who want to own their ChatGPT conversation data.**
