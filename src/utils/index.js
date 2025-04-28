/**
 * @module utils/index
 * @description Utils Module
 * Provides common utility functions for file operations and dependency management
 */

import fileUtils from './file-utils.js';
import listUtils from './list-utils.js';

// Re-export file utilities
export const {
  hasExtension,
  removeExtension,
  normalizePath,
  cleanPath,
  getFilename,
  getModuleArray
} = fileUtils;

// Re-export list utilities
export const {
  addToMapArray,
  getUsedByList,
  getDependsOn,
  getExportedList,
  getNodeModuleList
} = listUtils;

// Export consolidated utils object
export default {
  file: fileUtils,
  list: listUtils
};
