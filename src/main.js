import './style.css';
import { dbOperations, deleteDatabase } from './database.js';
import { setupSearch } from './search.js';
import { ConversationRenderer } from './renderer.js';
import { extractConversationsJson } from './zip-handler.js';
import {
  generateExportId,
  addExportToRegistry,
  removeExportFromRegistry,
  findExportByFile,
  getAllExports,
  clearExportRegistry
} from './export-manager.js';
import { sampleConversations } from './sampleData.js';

class ChatGPTExplorer {
  constructor() {
    this.currentConversation = null;
    this.conversations = [];
    this.renderer = new ConversationRenderer();
    this.searchHandlers = null;
    this.searchResults = [];
    this.currentSearchIndex = -1;
    this.currentSearchQuery = '';
    this.hasConversations = false;
    this.currentFontSize = 'normal';
    this.highContrastMode = false;
    this.isProcessingFiles = false; // Prevent multiple simultaneous file processing
    this.activeExports = []; // Track loaded export IDs
    // Configurable limits - initialized from system detection and user preferences
    this.limits = this.initializeLimits();
    this.init();
  }
  initializeLimits() {
    // Detect available system resources
    const deviceMemory =
      typeof navigator !== 'undefined' && navigator.deviceMemory ? navigator.deviceMemory : 4; // GB, default to 4GB if unknown

    // Base limits on available memory (conservative: use 25% of available)
    // For 4GB device: ~1GB, for 8GB: ~2GB, for 16GB+: ~4GB
    const baseMemoryMB = Math.min(deviceMemory * 256, 4096); // Cap at 4GB for safety

    // Load user-configured limits from localStorage
    const savedLimits = this.loadLimitsFromStorage();

    // Default limits based on system capabilities
    const defaults = {
      MAX_FILE_SIZE: Math.max(baseMemoryMB * 1024 * 1024, 500 * 1024 * 1024), // At least 500MB
      MAX_ZIP_SIZE: Math.max(baseMemoryMB * 2 * 1024 * 1024, 1000 * 1024 * 1024), // At least 1GB
      MAX_JSON_TEXT_SIZE: Math.max(baseMemoryMB * 1024 * 1024, 500 * 1024 * 1024), // At least 500MB
      MAX_CONVERSATIONS: 1000000, // 1 million conversations (reasonable for most users)
      MAX_EXTRACTED_SIZE: Math.max(baseMemoryMB * 2 * 1024 * 1024, 1000 * 1024 * 1024), // At least 1GB
      MAX_CONTENT_LENGTH: 50 * 1024 * 1024 // 50MB per message (very large code blocks)
    };

    // Merge user preferences with defaults
    return { ...defaults, ...savedLimits };
  }
  loadLimitsFromStorage() {
    try {
      const saved = localStorage.getItem('chatgptExportExplorerLimits');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.warn('Failed to load limits from storage:', error);
    }
    return {};
  }
  saveLimitsToStorage(limits) {
    try {
      localStorage.setItem('chatgptExportExplorerLimits', JSON.stringify(limits));
      this.limits = { ...this.limits, ...limits };
    } catch (error) {
      console.warn('Failed to save limits to storage:', error);
    }
  }
  async init() {
    this.bindEvents();
    this.initializeTheme();
    this.setupDragAndDrop();
    // Resume: Load all existing exports on startup
    await this.resumeExports();
    this.setupKeyboardShortcuts();
    this.setupAccessibilityControls();
    this.updateUI();
  }

  /**
   * Resume all exports from previous session
   * Loads conversations from all registered exports
   */
  async resumeExports() {
    try {
      const exports = getAllExports();
      this.activeExports = exports.map(exp => exp.id);

      if (exports.length === 0) {
        // No exports to resume - check for legacy single DB
        await this.loadConversationsFromDB(false);
        return;
      }

      // Load conversations from all exports
      const allConversations = await dbOperations.getAllConversationsFromExports(
        this.activeExports
      );
      this.conversations = allConversations;
      this.hasConversations = allConversations.length > 0;

      if (this.hasConversations) {
        this.renderConversationsList(this.conversations);
        this.updateUI();
      }
    } catch (error) {
      console.error('Error resuming exports:', error);
      // Fallback to legacy single DB
      await this.loadConversationsFromDB(false);
    }
  }
  updateUI() {
    const landingScreen = document.getElementById('landingScreen');
    const mainApp = document.getElementById('mainApp');
    console.log(
      `updateUI: hasConversations=${this.hasConversations}, conversations.length=${this.conversations.length}`
    );
    if (this.hasConversations && this.conversations.length > 0) {
      console.log('Switching to main app view');
      if (landingScreen) landingScreen.style.display = 'none';
      if (mainApp) mainApp.style.display = 'flex';
      document.body.classList.add('main-app-active');
    } else {
      console.log('Switching to landing screen');
      if (landingScreen) landingScreen.style.display = 'flex';
      if (mainApp) mainApp.style.display = 'none';
      document.body.classList.remove('main-app-active');
    }
  }
  bindEvents() {
    document
      .getElementById('loadBtn')
      .addEventListener('click', () => this.loadConversationsFile());
    document.getElementById('clearBtn').addEventListener('click', () => this.clearData());

    // Update button text to "Add Export"
    const loadBtn = document.getElementById('loadBtn');
    if (loadBtn) {
      loadBtn.textContent = 'Add Export';
      loadBtn.title = 'Add another export file';
    }
    document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
    document.getElementById('browseBtn').addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      this.loadConversationsFile();
    });
    document
      .getElementById('landingThemeToggle')
      .addEventListener('click', () => this.toggleTheme());
    document.getElementById('fileInput').addEventListener('change', e => this.handleFileLoad(e));

    // Sample data button
    const loadSampleButton = document.getElementById('loadSampleData');
    if (loadSampleButton) {
      loadSampleButton.addEventListener('click', () => this.loadSampleData());
    }

    // Accessibility controls
    this.setupFontSizeControls();
    this.setupHighContrastToggle();
  }
  setupDragAndDrop() {
    const dropzone = document.getElementById('dropzone');
    const landingScreen = document.getElementById('landingScreen');
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      landingScreen.addEventListener(eventName, this.preventDefaults, false);
      document.body.addEventListener(eventName, this.preventDefaults, false);
    });
    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(
        eventName,
        () => {
          dropzone.classList.add('drag-over');
        },
        false
      );
    });
    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(
        eventName,
        () => {
          dropzone.classList.remove('drag-over');
        },
        false
      );
    });
    dropzone.addEventListener(
      'drop',
      async e => {
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
          // Prevent processing if already processing
          if (this.isProcessingFiles) {
            this.showMessage('File processing already in progress. Please wait.', 'warning');
            return;
          }

          // Immediate visual feedback
          dropzone.classList.add('processing');
          const dropzoneContent = dropzone.querySelector('.dropzone-content');
          let originalHTML = '';
          if (dropzoneContent) {
            originalHTML = dropzoneContent.innerHTML;
            const validFiles = files.filter(
              f => f.name.endsWith('.zip') || f.name.endsWith('.json')
            );
            dropzoneContent.innerHTML = `
            <div class="dropzone-icon">⏳</div>
            <h3>Processing ${validFiles.length} file${validFiles.length > 1 ? 's' : ''}...</h3>
            <p>Please wait while we extract and import your conversations</p>
            <div class="dropzone-formats" style="margin-top: 1rem; opacity: 0.7;">
              <span>This may take a moment for large files</span>
            </div>
          `;
          }
          // Process files
          this.handleDroppedFiles(files).finally(() => {
            // Reset dropzone after processing completes (with small delay for visual feedback)
            setTimeout(() => {
              dropzone.classList.remove('processing');
              if (dropzoneContent && originalHTML) {
                dropzoneContent.innerHTML = originalHTML;
                // Re-bind browse button
                const browseBtn = document.getElementById('browseBtn');
                if (browseBtn) {
                  browseBtn.addEventListener('click', event => {
                    event.preventDefault();
                    event.stopPropagation();
                    this.loadConversationsFile();
                  });
                }
              }
            }, 500);
          });
        }
      },
      false
    );
    dropzone.addEventListener('click', e => {
      // Don't trigger if clicking the browse button
      if (e.target.id === 'browseBtn' || e.target.closest('#browseBtn')) {
        return;
      }
      this.loadConversationsFile();
    });
  }
  preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }
  async handleDroppedFile(file) {
    await this.processFiles([file]);
  }
  async handleDroppedFiles(files) {
    // Show immediate feedback
    const validFiles = files.filter(
      file => file.name.endsWith('.zip') || file.name.endsWith('.json')
    );

    if (validFiles.length === 0) {
      this.showMessage('Please drop ChatGPT export ZIP files or conversations.json files', 'error');
      return;
    }

    // Show loading immediately
    this.showLoading();

    try {
      await this.processFiles(files);
    } catch (error) {
      console.error('Error processing dropped files:', error);
      this.hideLoading();
      this.showMessage(`Error: ${error.message}`, 'error');
      throw error; // Re-throw so dropzone can reset
    } finally {
      // Always hide loading when done (processFiles also hides, but this ensures it)
      this.hideLoading();
    }
  }
  async processFiles(files) {
    if (files.length === 0) return;

    // Set processing flag
    if (this.isProcessingFiles) {
      console.warn('File processing already in progress');
      return;
    }
    this.isProcessingFiles = true;

    // Filter valid files
    const validFiles = files.filter(
      file => file.name.endsWith('.zip') || file.name.endsWith('.json')
    );

    if (validFiles.length === 0) {
      this.isProcessingFiles = false;
      this.showMessage('Please drop ChatGPT export ZIP files or conversations.json files', 'error');
      return;
    }

    try {
      this.showLoading(); // Just spinner, no text

      let allConversations = [];
      let processedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;
      const errors = [];

      // Process each file
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        try {
          // Check if export already exists BEFORE processing
          const existingExport = findExportByFile(file);
          if (existingExport) {
            // Export already processed - skip and load from existing DB
            console.log(
              `Export "${file.name}" already exists (ID: ${existingExport.id}), skipping processing...`
            );
            if (!this.activeExports.includes(existingExport.id)) {
              this.activeExports.push(existingExport.id);
            }
            // Load conversations from this export's DB
            const exportConversations = await dbOperations.getConversations(existingExport.id);
            exportConversations.forEach(conv => {
              conv.exportId = existingExport.id;
              conv.exportFilename = existingExport.filename;
            });
            allConversations = allConversations.concat(exportConversations);
            skippedCount++;
            continue;
          }

          // Validate file size
          if (file.size > this.limits.MAX_FILE_SIZE) {
            throw new Error(
              `File "${file.name}" is too large. Maximum size is ${this.limits.MAX_FILE_SIZE / (1024 * 1024)}MB.`
            );
          }

          const conversations = await this.extractConversationsFromFile(file);

          if (!Array.isArray(conversations)) {
            throw new Error(
              `Invalid format in "${file.name}": conversations.json should contain an array of conversations`
            );
          }

          // Limit conversation count per file
          if (conversations.length > this.limits.MAX_CONVERSATIONS) {
            throw new Error(
              `File "${file.name}" contains too many conversations. Maximum ${this.limits.MAX_CONVERSATIONS.toLocaleString()} conversations per file.`
            );
          }

          // Generate export ID and add to registry
          const exportId = generateExportId(file);
          console.log(`Processing file "${file.name}" with export ID: ${exportId}`);
          const exportData = addExportToRegistry(file, exportId);
          if (!this.activeExports.includes(exportId)) {
            this.activeExports.push(exportId);
          }
          console.log(`Active exports:`, this.activeExports);

          // Store conversations in export-specific database
          console.log(
            `Storing ${conversations.length} conversations in database for export ${exportId}`
          );
          await dbOperations.storeConversations(
            conversations,
            false,
            {
              MAX_CONTENT_LENGTH: this.limits.MAX_CONTENT_LENGTH
            },
            exportId
          );
          console.log(
            `Stored ${conversations.length} conversations in database for export ${exportId}`
          );

          // Add export metadata to conversations
          conversations.forEach(conv => {
            conv.exportId = exportId;
            conv.exportFilename = exportData.filename;
          });

          allConversations = allConversations.concat(conversations);
          processedCount++;
        } catch (error) {
          errorCount++;
          errors.push({ file: file.name, error: error.message });
          console.error(`Error processing file ${file.name}:`, error);
        }
      }

      if (allConversations.length === 0) {
        throw new Error('No valid conversations found in any of the files.');
      }

      // Limit total conversation count
      if (allConversations.length > this.limits.MAX_CONVERSATIONS) {
        throw new Error(
          `Total conversations (${allConversations.length.toLocaleString()}) exceeds maximum (${this.limits.MAX_CONVERSATIONS.toLocaleString()}).`
        );
      }

      // Get stats from all active exports
      const stats = await dbOperations.getAllStats(this.activeExports);
      console.log(
        `Stored ${stats.conversations} conversations with ${stats.messages} messages from ${processedCount} file(s)`
      );
      console.log(
        `Processed ${allConversations.length} conversations from files, stored ${stats.conversations} in database`
      );

      // Verify conversations were stored
      if (stats.conversations === 0 && allConversations.length > 0) {
        console.error('Error: Conversations were processed but not stored in database');
        throw new Error('Failed to store conversations in database. Please try again.');
      }

      if (allConversations.length > 0 && stats.conversations === 0) {
        console.error('Error: No conversations were stored despite processing successful files');
        throw new Error(
          'Failed to store conversations. The files may be corrupted or in an unsupported format.'
        );
      }

      // Reload all conversations from all exports
      console.log(
        `Reloading conversations from ${this.activeExports.length} export(s):`,
        this.activeExports
      );
      const allConversationsReloaded = await dbOperations.getAllConversationsFromExports(
        this.activeExports
      );
      console.log(`Loaded ${allConversationsReloaded.length} conversations from all exports`);
      this.conversations = allConversationsReloaded;
      this.hasConversations = allConversationsReloaded.length > 0;
      console.log(`About to render ${this.conversations.length} conversations`);
      this.renderConversationsList(this.conversations);
      console.log(`Conversations list rendered`);
      this.updateUI(); // Ensure UI updates
      console.log(
        `UI updated. hasConversations=${this.hasConversations}, conversations.length=${this.conversations.length}`
      );

      // Verify conversations were loaded and displayed
      console.log(
        `After loadConversationsFromDB: hasConversations=${this.hasConversations}, conversations.length=${this.conversations.length}`
      );

      if (this.conversations.length === 0 && stats.conversations > 0) {
        console.error('Error: Conversations were stored but not loaded from database');
        throw new Error('Failed to load conversations from database. Please refresh the page.');
      }

      if (this.conversations.length === 0 && allConversations.length > 0) {
        console.error('Error: No conversations displayed despite successful processing');
        throw new Error(
          'Conversations were processed but could not be displayed. Please refresh the page.'
        );
      }
      this.hideLoading();

      // Show success message with details
      if (errorCount > 0 && processedCount === 0 && skippedCount === 0) {
        // All files failed
        const errorDetails = errors.map(e => `"${e.file}": ${e.error}`).join('; ');
        this.showMessage(`All files failed to load. Errors: ${errorDetails}`, 'error');
        console.error('All files failed:', errors);
      } else if (errorCount > 0) {
        // Some files failed
        const errorDetails = errors.map(e => `"${e.file}": ${e.error}`).join('; ');
        const parts = [];
        if (processedCount > 0) parts.push(`${processedCount} new`);
        if (skippedCount > 0) parts.push(`${skippedCount} existing`);
        const message = `Loaded ${stats.conversations} conversation${stats.conversations !== 1 ? 's' : ''} from ${parts.join(' + ')} file${processedCount + skippedCount !== 1 ? 's' : ''}, but ${errorCount} file${errorCount !== 1 ? 's' : ''} failed: ${errorDetails}`;
        this.showMessage(message, 'error');
        console.error('Files with errors:', errors);
      } else {
        // All files succeeded
        const parts = [];
        if (processedCount > 0) parts.push(`${processedCount} new`);
        if (skippedCount > 0) parts.push(`${skippedCount} existing`);
        this.showMessage(
          `Successfully loaded ${stats.conversations} conversation${stats.conversations !== 1 ? 's' : ''} from ${parts.join(' + ')} file${processedCount + skippedCount !== 1 ? 's' : ''}!`,
          'success'
        );
      }
    } catch (error) {
      console.error('Error processing files:', error);
      this.hideLoading();
      this.showMessage(`Error: ${error.message}`, 'error');
    } finally {
      // Always ensure loading is hidden and processing flag is cleared
      this.hideLoading();
      this.isProcessingFiles = false;
    }
  }
  async extractConversationsFromFile(file) {
    if (file.name.endsWith('.zip')) {
      // Use secure ZIP handler following UNIX best practices
      // - Only extracts conversations.json (principle of least privilege)
      // - Validates paths to prevent directory traversal
      // - Cleans up resources after use
      return await extractConversationsJson(file, {
        MAX_ZIP_SIZE: this.limits.MAX_ZIP_SIZE,
        MAX_JSON_TEXT_SIZE: this.limits.MAX_JSON_TEXT_SIZE,
        MAX_EXTRACTED_SIZE: this.limits.MAX_EXTRACTED_SIZE
      });
    } else if (file.name.endsWith('.json')) {
      // Validate file size
      if (file.size > this.limits.MAX_FILE_SIZE) {
        throw new Error(
          `JSON file too large. Maximum size is ${this.limits.MAX_FILE_SIZE / (1024 * 1024)}MB.`
        );
      }

      const text = await file.text();

      // Validate text size
      if (text.length > this.limits.MAX_JSON_TEXT_SIZE) {
        throw new Error(
          `JSON file content is too large. Maximum size is ${this.limits.MAX_JSON_TEXT_SIZE / (1024 * 1024)}MB.`
        );
      }

      // Parse with error handling
      try {
        return JSON.parse(text);
      } catch (error) {
        if (error instanceof SyntaxError) {
          throw new Error('Invalid JSON format. Please ensure this is a valid ChatGPT export.');
        }
        throw new Error(`Error parsing JSON: ${error.message}`);
      }
    } else {
      throw new Error('Unsupported file type. Please use a ZIP or JSON file.');
    }
  }
  async processFile(file) {
    // Backward compatibility: process single file using processFiles
    await this.processFiles([file]);
  }
  setupKeyboardShortcuts() {
    this.searchHandlers = setupSearch(
      this.conversations,
      (conversations, isGlobalSearch) =>
        this.renderConversationsList(conversations, isGlobalSearch),
      (messages, query) => this.handleSearchResults(messages, query)
    );
    document
      .getElementById('prevResult')
      .addEventListener('click', () => this.navigateSearchResult(-1));
    document
      .getElementById('nextResult')
      .addEventListener('click', () => this.navigateSearchResult(1));
    document
      .getElementById('clearSearchResults')
      .addEventListener('click', () => this.clearSearchResults());

    // Accessibility keyboard shortcuts
    document.addEventListener('keydown', e => {
      // Ctrl + Plus/Minus for font size
      if (e.ctrlKey && e.key === '=') {
        e.preventDefault();
        const sizes = ['small', 'normal', 'large', 'xl'];
        const currentIndex = sizes.indexOf(this.currentFontSize);
        const nextIndex = Math.min(currentIndex + 1, sizes.length - 1);
        this.setFontSize(sizes[nextIndex]);
      } else if (e.ctrlKey && e.key === '-') {
        e.preventDefault();
        const sizes = ['small', 'normal', 'large', 'xl'];
        const currentIndex = sizes.indexOf(this.currentFontSize);
        const nextIndex = Math.max(currentIndex - 1, 0);
        this.setFontSize(sizes[nextIndex]);
      } else if (e.ctrlKey && e.shiftKey && e.key === 'H') {
        // Ctrl + Shift + H for high contrast
        e.preventDefault();
        this.toggleHighContrast();
      }
    });
  }
  clearSearchResults() {
    document.getElementById('globalSearch').value = '';
    this.renderConversationsList(this.conversations, false);
  }
  handleSearchResults(messages, query) {
    this.currentSearchQuery = query;
    if (!this.currentConversation || !query.trim()) {
      this.hideSearchNavigation();
      this.highlightSearchResults(messages);
      return;
    }
    this.searchResults = this.findSearchMatches(messages, query);
    this.currentSearchIndex = this.searchResults.length > 0 ? 0 : -1;
    this.updateSearchNavigation();
    this.highlightSearchResults(messages);
    setTimeout(() => {
      this.updateCurrentHighlight();
      this.scrollToCurrentResult();
    }, 100);
  }
  findSearchMatches(messages, query) {
    const matches = [];
    const lowerQuery = query.toLowerCase();
    messages.forEach((message, messageIndex) => {
      const content = message.content.toLowerCase();
      let index = content.indexOf(lowerQuery);
      while (index !== -1) {
        matches.push({
          messageIndex,
          messageId: message.message_id,
          position: index,
          text: message.content.substr(index, query.length)
        });
        index = content.indexOf(lowerQuery, index + 1);
      }
    });
    return matches;
  }
  navigateSearchResult(direction) {
    if (this.searchResults.length === 0) return;
    this.currentSearchIndex += direction;
    if (this.currentSearchIndex >= this.searchResults.length) {
      this.currentSearchIndex = 0;
    } else if (this.currentSearchIndex < 0) {
      this.currentSearchIndex = this.searchResults.length - 1;
    }
    this.updateSearchNavigation();
    this.updateCurrentHighlight();
    this.scrollToCurrentResult();
  }
  updateSearchNavigation() {
    const navigation = document.getElementById('searchNavigation');
    const countElement = document.getElementById('searchResultsCount');
    const prevBtn = document.getElementById('prevResult');
    const nextBtn = document.getElementById('nextResult');
    if (this.searchResults.length === 0) {
      this.hideSearchNavigation();
      return;
    }
    navigation.style.display = 'flex';
    countElement.textContent = `${this.currentSearchIndex + 1} of ${this.searchResults.length}`;
    prevBtn.disabled = false;
    nextBtn.disabled = false;
  }
  hideSearchNavigation() {
    document.getElementById('searchNavigation').style.display = 'none';
    this.searchResults = [];
    this.currentSearchIndex = -1;
    this.currentSearchQuery = '';
    this.renderer.setSearchQuery('');
  }
  updateCurrentHighlight() {
    document.querySelectorAll('.highlight.current').forEach(el => {
      el.classList.remove('current');
    });
    if (this.currentSearchIndex >= 0 && this.currentSearchIndex < this.searchResults.length) {
      const currentResult = this.searchResults[this.currentSearchIndex];
      const messageElement = document.querySelector(
        `[data-message-id="${currentResult.messageId}"]`
      );
      if (messageElement) {
        const highlights = messageElement.querySelectorAll('.highlight');
        let highlightIndex = 0;
        for (let i = 0; i < this.currentSearchIndex; i++) {
          if (this.searchResults[i].messageId === currentResult.messageId) {
            highlightIndex++;
          }
        }
        if (highlights[highlightIndex]) {
          highlights[highlightIndex].classList.add('current');
          setTimeout(() => {
            const highlightRect = highlights[highlightIndex].getBoundingClientRect();
            const windowHeight = window.innerHeight;
            const headerHeight =
              document.querySelector('.conversation-header')?.offsetHeight || 100;
            if (highlightRect.top < headerHeight || highlightRect.bottom > windowHeight) {
              this.scrollToCurrentResult();
            }
          }, 100);
        }
      }
    }
  }
  scrollToCurrentResult() {
    if (this.currentSearchIndex < 0) return;
    const currentResult = this.searchResults[this.currentSearchIndex];
    const messageElement = document.querySelector(`[data-message-id="${currentResult.messageId}"]`);
    if (messageElement) {
      const highlightElements = messageElement.querySelectorAll('.highlight');
      let targetHighlight = null;
      let highlightIndex = 0;
      for (let i = 0; i < this.currentSearchIndex; i++) {
        if (this.searchResults[i].messageId === currentResult.messageId) {
          highlightIndex++;
        }
      }
      if (highlightElements[highlightIndex]) {
        targetHighlight = highlightElements[highlightIndex];
      }
      const contentContainer = document.getElementById('conversationContent');
      const conversationHeader = document.querySelector('.conversation-header');
      const headerHeight = conversationHeader ? conversationHeader.offsetHeight : 100;
      if (targetHighlight && contentContainer) {
        const highlightRect = targetHighlight.getBoundingClientRect();
        const containerRect = contentContainer.getBoundingClientRect();
        const relativeTop = highlightRect.top - containerRect.top + contentContainer.scrollTop;
        const targetScrollTop =
          relativeTop - contentContainer.clientHeight / 2 + highlightRect.height / 2;
        const finalScrollTop = Math.max(0, targetScrollTop - headerHeight);
        contentContainer.scrollTo({
          top: finalScrollTop,
          behavior: 'smooth'
        });
      } else {
        const messageRect = messageElement.getBoundingClientRect();
        const containerRect = contentContainer.getBoundingClientRect();
        const relativeTop = messageRect.top - containerRect.top + contentContainer.scrollTop;
        const targetScrollTop = relativeTop - headerHeight - 20;
        contentContainer.scrollTo({
          top: Math.max(0, targetScrollTop),
          behavior: 'smooth'
        });
      }
    }
  }
  async loadConversationsFile() {
    // Prevent opening file dialog if already processing
    if (this.isProcessingFiles) {
      return;
    }
    document.getElementById('fileInput').click();
  }

  async loadSampleData() {
    try {
      this.showLoading('Loading sample conversations...');

      console.log('Loaded sample conversations:', sampleConversations.length);

      await dbOperations.clearAll();
      const stats = await dbOperations.storeConversations(sampleConversations, false, {
        MAX_CONTENT_LENGTH: this.limits.MAX_CONTENT_LENGTH
      });
      console.log(`Loaded ${stats.conversations} conversations with ${stats.messages} messages`);
      await this.loadConversationsFromDB();

      this.hideLoading();
      this.showMessage(`Successfully loaded ${stats.conversations} sample conversations!`);
    } catch (error) {
      console.error('Error loading sample data:', error);
      this.hideLoading();
      this.showMessage('Failed to load sample conversations. Please try again.', 'error');
    }
  }
  async handleFileLoad(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    // Prevent processing if already processing files
    if (this.isProcessingFiles) {
      console.warn('File processing already in progress, ignoring new file selection');
      event.target.value = '';
      return;
    }

    // Reset file input immediately to allow selecting same files again
    event.target.value = '';

    // Process files asynchronously
    this.processFiles(files)
      .catch(error => {
        console.error('Error processing files:', error);
        this.hideLoading();
        this.showMessage(`Error: ${error.message}`, 'error');
      })
      .finally(() => {
        this.isProcessingFiles = false;
      });
  }
  async loadConversationsFromDB(showLoading = false) {
    if (showLoading) {
      this.showLoading('Loading conversations...');
    }

    try {
      this.conversations = await dbOperations.getConversations();
      this.hasConversations = this.conversations.length > 0;
      console.log(`Loaded ${this.conversations.length} conversations from database`);

      if (this.hasConversations) {
        // Show loading if rendering large list
        if (this.conversations.length > 100 && showLoading) {
          this.showLoading(`Rendering ${this.conversations.length} conversations...`);
        }
        this.renderConversationsList(this.conversations);
        if (!this.currentConversation) {
          this.clearMainContent();
        }
      } else {
        // No conversations is expected on first load - not an error
        this.clearMainContent();
      }
      this.updateUI();
    } catch (error) {
      console.error('Error loading conversations from database:', error);
      this.hasConversations = false;
      this.conversations = [];
      this.clearMainContent();
      this.updateUI();
      // Show error to user
      this.showMessage(
        'Error loading conversations from database. Please try loading your files again.',
        'error'
      );
    } finally {
      if (showLoading) {
        this.hideLoading();
      }
    }
  }
  clearMainContent() {
    document.getElementById('conversationTitle').textContent = 'Select a conversation';
    document.getElementById('conversationContent').innerHTML =
      '<div class="no-conversation">Select a conversation from the sidebar to view its content</div>';
    this.hideSearchNavigation();
  }
  renderConversationsList(conversations, isGlobalSearchResults = false) {
    const conversationsList = document.getElementById('conversationsList');
    const searchResults = document.getElementById('searchResults');
    if (isGlobalSearchResults) {
      conversationsList.style.display = 'none';
      searchResults.style.display = 'flex';
      this.renderGlobalSearchResults(conversations);
    } else {
      conversationsList.style.display = '';
      searchResults.style.display = 'none';
      if (!conversations || conversations.length === 0) {
        conversationsList.innerHTML = '<div class="no-data">No conversations loaded</div>';
        return;
      }
      const fragment = document.createDocumentFragment();
      console.log(`Creating fragment for ${conversations.length} conversations`);
      conversations.forEach(conversation => {
        const item = document.createElement('button');
        item.className = 'conversation-item';
        item.dataset.conversationId = conversation.conversation_id;
        if (conversation.exportId) {
          item.dataset.exportId = conversation.exportId;
        }
        item.setAttribute('role', 'listitem');
        item.setAttribute('tabindex', '0');
        item.setAttribute('aria-label', `Conversation: ${conversation.title}`);
        const date = new Date(
          (conversation.update_time || conversation.create_time) * 1000
        ).toLocaleDateString();
        const exportLabel = conversation.exportFilename
          ? `<span class="export-label" title="From: ${this.escapeHtml(conversation.exportFilename)}">📦</span>`
          : '';
        item.innerHTML = `
          <div class="conversation-title">${this.escapeHtml(conversation.title)} ${exportLabel}</div>
          <div class="conversation-date">${date}</div>
        `;
        item.addEventListener('click', () => this.selectConversation(conversation));
        item.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.selectConversation(conversation);
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            const nextItem = item.nextElementSibling;
            if (nextItem) nextItem.focus();
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prevItem = item.previousElementSibling;
            if (prevItem) prevItem.focus();
          }
        });
        fragment.appendChild(item);
      });
      console.log(`Fragment created with ${fragment.children.length} items`);
      conversationsList.innerHTML = '';
      conversationsList.appendChild(fragment);
      console.log(`Conversations list updated with ${conversationsList.children.length} items`);
    }
  }
  renderGlobalSearchResults(searchResults) {
    const searchResultsList = document.getElementById('searchResultsList');
    const query = document.getElementById('globalSearch').value.trim();
    if (!searchResults || searchResults.length === 0) {
      searchResultsList.innerHTML = '<div class="no-data">No results found</div>';
      return;
    }
    const fragment = document.createDocumentFragment();
    searchResults.forEach(result => {
      const item = document.createElement('div');
      item.className = 'search-result-item';
      const date = new Date(result.conversation.create_time * 1000).toLocaleDateString();
      let titleHtml = this.escapeHtml(result.conversation.title);
      if (result.titleMatch && query) {
        titleHtml = this.highlightSearchTerm(titleHtml, query);
      }
      let matchesHtml = '';
      if (result.messageMatches.length > 0) {
        matchesHtml = result.messageMatches
          .slice(0, 3)
          .map(match => {
            const contextHtml = this.highlightSearchTerm(this.escapeHtml(match.context), query);
            return `
            <div class="search-match">
              <div class="search-match-role ${match.role}">${match.role}</div>
              <div class="search-match-context">${contextHtml}</div>
            </div>
          `;
          })
          .join('');
        if (result.messageMatches.length > 3) {
          matchesHtml += `<div class="search-result-summary">+${result.messageMatches.length - 3} more matches</div>`;
        }
      }
      item.innerHTML = `
        <div class="search-result-title">${titleHtml}</div>
        <div class="search-result-meta">${date} • ${result.messageMatches.length} message${result.messageMatches.length !== 1 ? 's' : ''}</div>
        <div class="search-result-matches">${matchesHtml}</div>
      `;
      item.addEventListener('click', () => this.selectConversationFromSearch(result.conversation));
      fragment.appendChild(item);
    });
    searchResultsList.innerHTML = '';
    searchResultsList.appendChild(fragment);
  }
  highlightSearchTerm(text, query) {
    if (!query.trim()) return text;
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
  }
  async selectConversationFromSearch(conversation) {
    document.getElementById('globalSearch').value = '';
    this.showLoading('Loading conversation...');
    try {
      await this.loadConversationsFromDB(false); // Don't show loading twice
      await this.selectConversation(conversation);
    } finally {
      // Loading is handled by selectConversation
    }
  }
  async selectConversation(conversation) {
    // Update UI immediately for responsiveness
    document.querySelectorAll('.conversation-item').forEach(item => {
      item.classList.remove('active');
    });
    const selectedItem = document.querySelector(
      `[data-conversation-id="${conversation.conversation_id}"]`
    );
    if (selectedItem) {
      selectedItem.classList.add('active');
    }
    document.getElementById('conversationSearch').value = '';
    this.hideSearchNavigation();

    // Show loading immediately
    this.showLoading('Loading conversation...');
    document.getElementById('conversationTitle').textContent = conversation.title;

    try {
      this.currentConversation = conversation;

      // Get export ID from conversation (if available)
      const exportId = conversation.exportId || null;

      // Add timeout protection for database queries
      const messagesPromise = dbOperations.getConversationMessages(
        conversation.conversation_id,
        exportId
      );
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Database query timeout')), 30000)
      );

      const messages = await Promise.race([messagesPromise, timeoutPromise]);

      // Show loading if rendering many messages
      if (messages.length > 50) {
        this.showLoading(`Rendering ${messages.length} messages...`);
      }

      document.getElementById('conversationTitle').textContent = conversation.title;

      // Render messages with error handling
      try {
        this.renderer.renderMessages(messages);
      } catch (renderError) {
        console.error('Error rendering messages:', renderError);
        this.showMessage('Error rendering conversation messages', 'error');
        throw renderError;
      }
    } catch (error) {
      console.error('Error loading conversation messages:', error);
      this.showMessage(`Error loading conversation messages: ${error.message}`, 'error');
      this.clearMainContent();
    } finally {
      this.hideLoading();
    }
  }
  async removeExport(exportId) {
    const exportData = getAllExports().find(exp => exp.id === exportId);
    if (!exportData) {
      this.showMessage('Export not found', 'error');
      return;
    }

    if (
      !confirm(
        `Remove export "${exportData.filename}"? This will delete all conversations from this export.`
      )
    ) {
      return;
    }

    try {
      // Delete the database
      await deleteDatabase(exportId);

      // Remove from registry
      removeExportFromRegistry(exportId);

      // Remove from active exports
      this.activeExports = this.activeExports.filter(id => id !== exportId);

      // Reload conversations
      if (this.activeExports.length > 0) {
        const allConversations = await dbOperations.getAllConversationsFromExports(
          this.activeExports
        );
        this.conversations = allConversations;
        this.hasConversations = allConversations.length > 0;
        this.renderConversationsList(this.conversations);
      } else {
        this.conversations = [];
        this.hasConversations = false;
        this.currentConversation = null;
        this.clearMainContent();
      }

      this.updateUI();
      this.showMessage(`Export "${exportData.filename}" removed successfully`, 'success');
    } catch (error) {
      console.error('Error removing export:', error);
      this.showMessage('Error removing export', 'error');
    }
  }

  async clearData() {
    if (
      !confirm(
        'Are you sure you want to clear all data? This will remove all exports and conversations. This action cannot be undone.'
      )
    ) {
      return;
    }

    // Show loading immediately
    const clearBtn = document.getElementById('clearBtn');
    const originalText = clearBtn ? clearBtn.textContent : 'Clear Data';
    if (clearBtn) {
      clearBtn.disabled = true;
      clearBtn.textContent = 'Clearing...';
      clearBtn.style.opacity = '0.6';
      clearBtn.style.cursor = 'wait';
    }

    // Show loading in main content area
    this.showLoading('Clearing all conversations and messages...');

    try {
      // Delete all export databases
      for (const exportId of this.activeExports) {
        await deleteDatabase(exportId);
      }

      // Clear legacy database
      await dbOperations.clearAll();

      // Clear registry
      clearExportRegistry();

      this.activeExports = [];
      this.conversations = [];
      this.hasConversations = false;
      this.currentConversation = null;
      this.clearMainContent();
      this.updateUI();
      this.showMessage('All data cleared successfully!', 'success');
    } catch (error) {
      console.error('Error clearing data:', error);
      this.showMessage('Error clearing data', 'error');
    } finally {
      // Restore button state
      if (clearBtn) {
        clearBtn.disabled = false;
        clearBtn.textContent = originalText;
        clearBtn.style.opacity = '1';
        clearBtn.style.cursor = 'pointer';
      }
      this.hideLoading();
    }
  }
  highlightSearchResults(messages) {
    if (!this.currentConversation) return;
    this.renderer.setSearchQuery(this.currentSearchQuery);
    if (!messages) {
      this.selectConversation(this.currentConversation);
      return;
    }
    this.renderer.renderMessages(messages, true);
  }
  showLoading(_message = null) {
    // Use exact same element/location as success messages - KISS
    const toast = document.createElement('div');
    toast.id = 'loadingToast';
    toast.className = 'toast toast-loading';
    toast.innerHTML =
      '<span class="loading-dot" style="animation-delay: 0s;">·</span><span class="loading-dot" style="animation-delay: 0.2s;">·</span><span class="loading-dot" style="animation-delay: 0.4s;">·</span>';
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #ffd33d;
      color: #1f2328;
      padding: 12px 20px;
      border-radius: 6px;
      font-size: 14px;
      z-index: 1000;
      opacity: 1;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: center;
      gap: 4px;
      font-weight: bold;
      font-size: 24px;
      line-height: 1;
    `;
    document.body.appendChild(toast);
  }
  hideLoading() {
    // Remove the loading toast - same as success messages
    const loadingToast = document.getElementById('loadingToast');
    if (loadingToast) {
      loadingToast.remove();
    }
  }
  showMessage(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: ${type === 'error' ? '#dc3545' : '#28a745'};
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      font-size: 14px;
      z-index: 1000;
      opacity: 0;
      transition: opacity 0.3s ease;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '1';
    }, 100);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 3000);
  }
  initializeTheme() {
    const savedTheme = localStorage.getItem('chatgpt-explorer-theme');
    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
      this.updateThemeToggleIcon(savedTheme);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const theme = prefersDark ? 'dark' : 'light';
      this.updateThemeToggleIcon(theme);
    }
  }
  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('chatgpt-explorer-theme', newTheme);
    this.updateThemeToggleIcon(newTheme);
  }
  updateThemeToggleIcon(theme) {
    const themeToggle = document.getElementById('themeToggle');
    const landingThemeToggle = document.getElementById('landingThemeToggle');
    const icon = theme === 'dark' ? '☀️' : '🌙';
    const title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    if (themeToggle) {
      themeToggle.textContent = icon;
      themeToggle.title = title;
    }
    if (landingThemeToggle) {
      landingThemeToggle.textContent = icon;
      landingThemeToggle.title = title;
    }
  }
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  setupAccessibilityControls() {
    const savedFontSize = localStorage.getItem('fontSize') || 'normal';
    const savedHighContrast = localStorage.getItem('highContrast') === 'true';

    this.setFontSize(savedFontSize);
    if (savedHighContrast) {
      this.toggleHighContrast();
    }
  }

  setupFontSizeControls() {
    const fontSizeButtons = document.querySelectorAll('.font-size-btn');
    fontSizeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const { size } = btn.dataset;
        this.setFontSize(size);
      });
    });
  }

  setupHighContrastToggle() {
    const highContrastBtn = document.getElementById('highContrastToggle');
    if (highContrastBtn) {
      highContrastBtn.addEventListener('click', () => {
        this.toggleHighContrast();
      });
    }
  }

  setFontSize(size) {
    // Remove all font size classes
    document.body.classList.remove(
      'font-size-small',
      'font-size-normal',
      'font-size-large',
      'font-size-xl'
    );

    // Add the selected font size class
    document.body.classList.add(`font-size-${size}`);

    this.currentFontSize = size;
    localStorage.setItem('fontSize', size);

    // Update button states
    document.querySelectorAll('.font-size-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.size === size);
    });
  }

  toggleHighContrast() {
    this.highContrastMode = !this.highContrastMode;
    document.body.classList.toggle('high-contrast', this.highContrastMode);
    localStorage.setItem('highContrast', this.highContrastMode);

    const btn = document.getElementById('highContrastToggle');
    if (btn) {
      btn.classList.toggle('active', this.highContrastMode);
      btn.title = this.highContrastMode ? 'Disable High Contrast' : 'Enable High Contrast';
    }
  }
}
const chatApp = new ChatGPTExplorer();
window.chatApp = chatApp;
