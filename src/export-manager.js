/**
 * Export Manager - Handles multiple export files with separate databases
 *
 * Each export file gets its own IndexedDB database for isolation and easy removal.
 * Export registry is stored in localStorage for persistence across sessions.
 */

const EXPORT_REGISTRY_KEY = 'chatgpt-export-registry';

/**
 * Generate a unique ID for an export file
 * @param {File} file - The export file
 * @returns {string} - Unique export ID
 */
export function generateExportId(file) {
  // Use filename + size + lastModified for uniqueness
  // This allows same file re-imported to be detected
  const hash = `${file.name}_${file.size}_${file.lastModified}`;
  // Create a simple hash (not crypto-secure, but sufficient for this use case)
  let hashValue = 0;
  for (let i = 0; i < hash.length; i++) {
    const char = hash.charCodeAt(i);
    hashValue = (hashValue << 5) - hashValue + char;
    hashValue = hashValue & hashValue; // Convert to 32-bit integer
  }
  return `export_${Math.abs(hashValue).toString(36)}`;
}

/**
 * Get export registry from localStorage
 * @returns {Array} - Array of export metadata
 */
export function getExportRegistry() {
  try {
    const registry = localStorage.getItem(EXPORT_REGISTRY_KEY);
    return registry ? JSON.parse(registry) : [];
  } catch (error) {
    console.error('Error reading export registry:', error);
    return [];
  }
}

/**
 * Save export registry to localStorage
 * @param {Array} registry - Array of export metadata
 */
export function saveExportRegistry(registry) {
  try {
    localStorage.setItem(EXPORT_REGISTRY_KEY, JSON.stringify(registry));
  } catch (error) {
    console.error('Error saving export registry:', error);
    throw new Error('Failed to save export registry. Storage may be full.');
  }
}

/**
 * Add an export to the registry
 * @param {File} file - The export file
 * @param {string} exportId - Unique export ID
 * @returns {Object} - Export metadata
 */
export function addExportToRegistry(file, exportId) {
  const registry = getExportRegistry();

  // Check if export already exists
  const existing = registry.find(exp => exp.id === exportId);
  if (existing) {
    return existing; // Return existing export
  }

  const exportData = {
    id: exportId,
    filename: file.name,
    size: file.size,
    timestamp: Date.now(),
    dbName: `ChatGPTDatabase_${exportId}`
  };

  registry.push(exportData);
  saveExportRegistry(registry);

  return exportData;
}

/**
 * Remove an export from the registry
 * @param {string} exportId - Export ID to remove
 * @returns {boolean} - True if removed, false if not found
 */
export function removeExportFromRegistry(exportId) {
  const registry = getExportRegistry();
  const index = registry.findIndex(exp => exp.id === exportId);

  if (index === -1) {
    return false;
  }

  registry.splice(index, 1);
  saveExportRegistry(registry);

  return true;
}

/**
 * Find export by file (check if already imported)
 * @param {File} file - The export file
 * @returns {Object|null} - Export metadata if found, null otherwise
 */
export function findExportByFile(file) {
  const exportId = generateExportId(file);
  const registry = getExportRegistry();
  const found = registry.find(exp => exp.id === exportId);
  if (found) {
    console.log(`Found existing export: ID=${exportId}, filename="${found.filename}", size=${found.size}`);
  }
  return found || null;
}

/**
 * Get all registered exports
 * @returns {Array} - Array of all export metadata
 */
export function getAllExports() {
  return getExportRegistry();
}

/**
 * Clear all exports from registry
 */
export function clearExportRegistry() {
  saveExportRegistry([]);
}
