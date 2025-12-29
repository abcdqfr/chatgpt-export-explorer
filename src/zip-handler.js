/**
 * Secure ZIP file handler following UNIX best practices
 *
 * This module handles ZIP file extraction in a secure, memory-efficient manner:
 * - Only extracts required files (conversations.json)
 * - Validates file paths to prevent directory traversal attacks
 * - Cleans up memory after processing
 * - Follows principle of least privilege
 */

import JSZip from 'jszip';

/**
 * Sanitize and validate file path to prevent directory traversal attacks
 * @param {string} path - File path from ZIP
 * @param {boolean} strict - If true, use strict validation (for files we extract). If false, allow common filename characters (for media files we skip)
 * @returns {boolean} - True if path is safe
 */
function isSafePath(path, strict = true) {
  // Reject paths with directory traversal attempts (always check this)
  if (path.includes('..') || path.includes('//') || path.startsWith('/')) {
    return false;
  }

  // Reject absolute paths (always check this)
  if (path.match(/^[a-zA-Z]:[\\/]/)) {
    return false;
  }

  if (strict) {
    // Strict validation for files we extract (conversations.json)
    // Only allow alphanumeric, dots, slashes, hyphens, underscores
    if (!path.match(/^[a-zA-Z0-9._\-/]+$/)) {
      return false;
    }
  } else {
    // More permissive validation for media files we skip
    // Allow common filename characters: alphanumeric, dots, slashes, hyphens, underscores, commas, spaces, parentheses, brackets
    // Still prevents dangerous characters like: < > | : " ? * \ and control characters
    if (!path.match(/^[a-zA-Z0-9._\-\s,()[\]/]+$/)) {
      return false;
    }
  }

  return true;
}

/**
 * Extract conversations.json from ZIP file securely
 *
 * Following UNIX best practices:
 * - Extract only what's needed (conversations.json)
 * - Validate all paths to prevent directory traversal
 * - Process in memory (no disk writes)
 * - Clean up resources after use
 *
 * @param {File} file - ZIP file from user input
 * @param {Object} limits - Security limits
 * @param {number} limits.MAX_ZIP_SIZE - Maximum ZIP file size
 * @param {number} limits.MAX_JSON_TEXT_SIZE - Maximum JSON file size
 * @param {number} limits.MAX_EXTRACTED_SIZE - Maximum extracted size
 * @returns {Promise<Object>} - Parsed conversations JSON
 * @throws {Error} - If extraction fails or security limits exceeded
 */
export async function extractConversationsJson(file, limits) {
  const { MAX_ZIP_SIZE, MAX_JSON_TEXT_SIZE, MAX_EXTRACTED_SIZE } = limits;

  // Validate file size before processing (fail fast)
  if (file.size > MAX_ZIP_SIZE) {
    throw new Error(`ZIP file too large. Maximum size is ${MAX_ZIP_SIZE / (1024 * 1024)}MB.`);
  }

  let zip = null;
  let zipData = null;

  try {
    // Load ZIP into memory
    zipData = await file.arrayBuffer();

    // Validate ZIP structure size
    if (zipData.byteLength > MAX_ZIP_SIZE) {
      throw new Error('ZIP file exceeds maximum size limit.');
    }

    // Create JSZip instance
    zip = new JSZip();
    const zipContents = await zip.loadAsync(zipData);

    // Protect against ZIP bombs - validate total extracted size before extraction
    let totalExtractedSize = 0;
    let jsonFile = null;

    // First pass: Find conversations.json and validate sizes
    for (const [path, zipFile] of Object.entries(zipContents.files)) {
      // Security: Validate path to prevent directory traversal
      // Use strict validation for files we might extract, permissive for media files we skip
      const normalizedPath = path.replace(/\\/g, '/');
      const fileName = normalizedPath.split('/').pop();
      const isTargetFile =
        fileName === 'conversations.json' || normalizedPath === 'conversations.json';

      if (!isSafePath(path, isTargetFile)) {
        // Only warn for files we were actually looking for
        // Media files with unusual characters are expected and safe to skip silently
        if (isTargetFile) {
          console.warn(`Skipping potentially unsafe path: ${path}`);
        }
        continue;
      }

      // Skip directories
      if (zipFile.dir) {
        continue;
      }

      const uncompressedSize = zipFile._data?.uncompressedSize || 0;
      totalExtractedSize += uncompressedSize;

      // Check total extracted size (ZIP bomb protection)
      if (totalExtractedSize > MAX_EXTRACTED_SIZE) {
        throw new Error(
          `ZIP file contains too much data. Maximum extracted size is ${MAX_EXTRACTED_SIZE / (1024 * 1024)}MB.`
        );
      }

      // Check individual file size
      if (uncompressedSize > MAX_JSON_TEXT_SIZE) {
        throw new Error(
          `File "${path}" is too large. Maximum size is ${MAX_JSON_TEXT_SIZE / (1024 * 1024)}MB.`
        );
      }

      // Find conversations.json (only file we need)
      // normalizedPath already computed above

      if (fileName === 'conversations.json' || normalizedPath === 'conversations.json') {
        jsonFile = zipFile;

        // Validate JSON file size specifically
        if (uncompressedSize > MAX_JSON_TEXT_SIZE) {
          throw new Error('conversations.json file is too large. Maximum size is 50MB.');
        }
      }
    }

    // Security: Only extract conversations.json, ignore all other files
    if (!jsonFile) {
      throw new Error(
        'conversations.json not found in ZIP file. Please ensure you exported from ChatGPT correctly.'
      );
    }

    // Extract only the required file (principle of least privilege)
    const jsonText = await jsonFile.async('string');

    // Validate extracted text size
    if (jsonText.length > MAX_JSON_TEXT_SIZE) {
      throw new Error('JSON file content is too large. Maximum size is 50MB.');
    }

    // Parse JSON
    let conversations;
    try {
      conversations = JSON.parse(jsonText);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Invalid JSON format. Please ensure this is a valid ChatGPT export.');
      }
      throw new Error(`Error parsing JSON: ${error.message}`);
    }

    // Validate structure
    if (!Array.isArray(conversations)) {
      throw new Error(
        'Invalid format: conversations.json should contain an array of conversations'
      );
    }

    return conversations;
  } finally {
    // Clean up resources (UNIX best practice: always clean up)
    // In browser context, this helps with garbage collection
    zip = null;
    zipData = null;

    // Note: Garbage collection hints are not available in browser context
    // The browser's GC will handle cleanup automatically
  }
}

/**
 * Validate file path for security
 * @param {string} path - File path to validate
 * @returns {boolean} - True if path is safe
 */
export function validateFilePath(path) {
  return isSafePath(path);
}
