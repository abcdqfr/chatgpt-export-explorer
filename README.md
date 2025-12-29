# ChatGPT Export Explorer

Privacy-first web application for viewing and searching ChatGPT conversation exports. Works entirely in your browser with no backend required.

## Features

- ZIP import (no manual extraction)
- Multi-export support with separate databases
- Resume functionality (loads previous imports on startup)
- Search across conversations and messages
- Offline-first with IndexedDB
- Dark/light theme support
- Keyboard shortcuts

## Installation

1. **Clone the project repository:**
   - Open a terminal window.
   - Copy and paste this command, then press Enter:

     ```bash
     git clone https://github.com/abcdqfr/chatgpt-export-explorer.git
     ```

   - Change directory into the project:

     ```bash
     cd chatgpt-export-explorer
     ```

2. **Install dependencies and start the development server:**

   ```bash
   npm install
   npm run dev
   ```

## Usage

1. Export from ChatGPT: Settings → Data Controls → Export Data
2. Open `http://localhost:5173` in your browser.
3. Drag and drop the ZIP file onto the landing screen
4. Browse and search your conversations

### Keyboard Shortcuts

- `Ctrl+Shift+K`: Global search
- `Ctrl+K`: Search current conversation
- `F3` / `Shift+F3`: Navigate search results
- `Escape`: Clear search
- `Ctrl+Plus/Minus`: Font size
- `Ctrl+Shift+H`: High contrast

## Build

```bash
npm run build
npm run preview
```

## File Structure

```text
src/
├── main.js           # Core application logic
├── database.js       # IndexedDB operations
├── export-manager.js # Export registry
├── zip-handler.js    # ZIP extraction
├── search.js         # Search functionality
├── renderer.js       # Message rendering
├── sampleData.js     # Sample data
└── style.css         # Styling
```

## Security

- Path validation prevents directory traversal
- Only extracts `conversations.json` from ZIPs
- Size limits prevent resource exhaustion
- XSS protection via DOMPurify
- All processing in memory (no disk writes)

---

## Credits

This project relies on the work of others in the open-source community. Our appreciation goes out to:

## Upstream Foundation

**ChatGPT Export Explorer** ([z1shivam/chatgpt-export-explorer](https://github.com/z1shivam/chatgpt-export-explorer), MIT License)

- Provided core architecture: IndexedDB (Dexie.js), global search design, UI structure, message rendering, and database schema.
- We added ZIP import and documentation improvements; core concepts are retained from z1shivam.
- Special thanks to [z1shivam](https://github.com/z1shivam).

## Dependencies

- **Dexie.js** ([Dexie.js](https://github.com/dexie/Dexie.js), [David Fahlander](https://github.com/dfahlander), Apache-2.0)\
  Efficient IndexedDB interface.
- **JSZip** ([JSZip](https://github.com/Stuk/jszip), [Stuart Knightley](https://github.com/Stuk) and contributors, MIT)\
  ZIP archive extraction.
- **Marked.js** ([Marked](https://github.com/markedjs/marked), Marked.js contributors, MIT)\
  Markdown parsing.
- **Prism.js** ([Prism](https://github.com/PrismJS/prism), Prism.js contributors, MIT)\
  Syntax highlighting.
- **Vite** ([Vite](https://github.com/vitejs/vite), [Evan You](https://github.com/yyx990803) and contributors, MIT)\
  Dev/build tooling.
- **Node.js** ([Node.js](https://nodejs.org/))\
  JS runtime (see their license).

### Web APIs & Standards

- IndexedDB API (offline data)
- File API (file management)
- CSS Custom Properties (theming)
- ES6+ Modules (architecture)

## Design & UX

- Inspired by the minimal and robust UI of ChatGPT Export Explorer.
- Key features: focused interface, drag-and-drop, sidebar navigation, keyboard accessibility.

## Special Thanks

- **Open Source Community**: Your shared efforts make projects like this viable.
- **Early Users & Testers**: Feedback is crucial—thank you!
- **ChatGPT Users**: Those advocating for user-owned data inspired this tool.

## License

MIT License

Copyright (c) 2024 ChatGPT Export Explorer Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Contributing Back

- Improvements relevant to the upstream project are proposed as pull requests.
- We follow current, stable releases for dependencies.
- Documentation covers usage of each key library.

## Additional Influences

- Privacy-by-design approaches.
- "Works out of the box" philosophy.
- Progressive enhancement with standards.

---

_Made with appreciation for the open-source community._

If you use this code or its ideas:

- Attribute original creators (especially ChatGPT Export Explorer and dependencies).
- Link to this project if possible.
- Continue supporting open-source ideals.

Thank you!
