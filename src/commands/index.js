/**
 *  @module commands/index
 * @description Commands Module
 * Consolidates all command modules into a unified interface
 */

import graphCommands from './graph.js';
import htmlCommands from './html.js';
import jsonCommands from './json.js';

// Re-export individual commands for direct imports
export { createPackageGraph, createExportGraph as createGraph, createRelationsGraph } from './graph.js';
export { createModuleHtml } from './html.js';
export { jsonOut, jsonIn } from './json.js';

// Export consolidated commands object
export default {
  graph: graphCommands,
  html: htmlCommands,
  json: jsonCommands
};
