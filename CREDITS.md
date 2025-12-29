# Credits & Acknowledgments

This project stands on the shoulders of giants. We're grateful to all the open-source projects, libraries, and developers who made this possible.

## 🎯 Primary Inspiration & Foundation

### ChatGPT Export Explorer

**Project**: [chatgpt-export-explorer](https://github.com/z1shivam/chatgpt-export-explorer)  
**Author**: [z1shivam](https://github.com/z1shivam)  
**License**: MIT License

This project is built on the excellent foundation of ChatGPT Export Explorer. We borrowed:

- **Core Architecture**: The IndexedDB-based storage system using Dexie.js
- **Search Implementation**: The global search functionality and keyboard shortcuts
- **UI Structure**: The landing page and conversation viewer layout
- **Message Rendering**: The conversation rendering logic with markdown support
- **Database Schema**: The optimized conversation and message storage structure

**Thank you, z1shivam, for creating such a solid foundation!** 🙏

Without your work, this project wouldn't exist. We've added ZIP import support and enhanced the documentation, but the core brilliance is yours.

## 📚 Core Dependencies

### Dexie.js

**Project**: [Dexie.js](https://github.com/dexie/Dexie.js)  
**Author**: [David Fahlander](https://github.com/dfahlander)  
**License**: Apache-2.0 License

Dexie.js provides the elegant IndexedDB wrapper that makes local storage fast and reliable. It's the backbone of our data persistence layer.

**Thank you for making IndexedDB actually usable!** 🎉

### JSZip

**Project**: [JSZip](https://github.com/Stuk/jszip)  
**Author**: [Stuart Knightley](https://github.com/Stuk) and contributors  
**License**: MIT License

JSZip enables our ZIP import feature, allowing users to drop their full ChatGPT export ZIP without manual extraction.

**Thank you for the robust ZIP handling!** 📦

### Marked.js

**Project**: [Marked](https://github.com/markedjs/marked)  
**Author**: [Marked.js Contributors](https://github.com/markedjs/marked/graphs/contributors)  
**License**: MIT License

Marked.js parses markdown in ChatGPT conversations, rendering code blocks, lists, and formatting correctly.

**Thank you for the fast, reliable markdown parser!** ✍️

### Prism.js

**Project**: [Prism](https://github.com/PrismJS/prism)  
**Author**: [Prism.js Contributors](https://github.com/PrismJS/prism/graphs/contributors)  
**License**: MIT License

Prism.js provides syntax highlighting for code blocks in conversations, making technical discussions readable.

**Thank you for making code beautiful!** 💎

### Vite

**Project**: [Vite](https://github.com/vitejs/vite)  
**Author**: [Evan You](https://github.com/yyx990803) and Vite Contributors  
**License**: MIT License

Vite powers our development experience and production builds with lightning-fast HMR and optimized bundling.

**Thank you for the best dev experience!** ⚡

## 🎨 Design & UX Inspiration

### ChatGPT Export Explorer UI

The clean, professional interface design was inspired by the original ChatGPT Export Explorer. We've enhanced it but kept the core UX principles:

- Minimal, focused interface
- Drag-and-drop file handling
- Responsive sidebar navigation
- Accessible keyboard shortcuts

## 🔧 Tools & Infrastructure

### Node.js & npm

**Project**: [Node.js](https://nodejs.org/)  
**License**: Various (see Node.js license)

The JavaScript runtime that makes this all possible.

### Modern Web Standards

- **IndexedDB API**: Browser-native database for offline storage
- **File API**: Drag-and-drop file handling
- **CSS Custom Properties**: Theme system
- **ES6+ Modules**: Modern JavaScript architecture

## 🙏 Special Thanks

### The Open Source Community

This project exists because of the incredible open-source ecosystem. Every dependency, every tool, every standard was built by people who believed in sharing knowledge.

### Early Users & Testers

To everyone who will use this tool and provide feedback - thank you for helping make it better.

### ChatGPT Users

To everyone who wants to own and search their ChatGPT conversation data - this tool is for you.

## 📝 License Compatibility

All dependencies and upstream projects use permissive licenses (MIT, Apache-2.0) that allow this project to exist and be freely distributed.

## 🤝 Contributing Back

We believe in giving back to the projects we depend on:

- **Upstream Contributions**: Improvements that benefit the original ChatGPT Export Explorer are contributed back via pull requests
- **Dependency Support**: We support and use the latest stable versions of all dependencies
- **Documentation**: We document how we use each dependency to help others

## 💡 Inspiration & Learning

This project learned from:

- **Privacy-first design**: Inspired by tools that keep user data local
- **Zero-config philosophy**: Following the principle that tools should "just work"
- **Progressive enhancement**: Building on web standards that work everywhere

---

**Made with ❤️ and gratitude for the open-source community.**

If you use code or ideas from this project, please:
1. Credit the original sources (especially ChatGPT Export Explorer)
2. Link back to this project
3. Keep the spirit of open-source alive

Thank you for being part of this journey! 🚀

