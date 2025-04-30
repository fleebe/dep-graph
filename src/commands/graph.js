import { PackageGraph } from "../graphs/PackageGraph.js";
import { ExportGraph } from "../graphs/ExportGraph.js";
import { RelationsGraph } from "../graphs/RelationsGraph.js";
import { ClassDiagram } from "../graphs/ClassDiagram.js";
import { NodeModulesGraph } from "../graphs/NodeModulesGraph.js"; 

/**
 * @module commands/graph  
 * @description Graph command module providing various graph generation functions
 */

/**
 * Creates a graphviz .dot file of package dependencies
 * 
 * @param {Array} moduleArray - Array of module objects with metadata
 * @param {Array} dependencyList - Array of dependencies
 * @param {string} [srcDir=""] - Source directory for labeling the graph
 * @returns {string} - DOT file content as string
 */
export const createPackageGraph = (moduleArray, dependencyList, srcDir = "") => {
  const packageGraph = new PackageGraph(moduleArray, dependencyList, srcDir);
  return packageGraph.generate();
};

/**
 * Creates a graph file for modules, showing exports and imports
 * 
 * @param {Array} dependencyList - List of imports and their sources
 * @param {Array} exportList - List of files and exported functions
 * @param {Array} moduleArray - List of files to graph
 * @returns {string} - DOT file content for dependencies graph
 */
export const createExportGraph = (dependencyList, exportList, moduleArray) => {
  const exportGraph = new ExportGraph(dependencyList, exportList, moduleArray);
  return exportGraph.generate();
};

/**
 * Creates a graph showing module relationships (depends on/used by)
 * 
 * @param {Array} dependencyList - List of dependencies
 * @param {Array} moduleArray - List of modules to graph
 * @param {string} [srcDir=""] - Source directory for graph label
 * @returns {string} - DOT file content for relations graph
 */
export const createRelationsGraph = (dependencyList, moduleArray, srcDir = "") => {
  const relationsGraph = new RelationsGraph(dependencyList, moduleArray, srcDir);
  return relationsGraph.generate();
};

/**
 * Creates a class diagram showing classes and their relationships
 * 
 * @param {Array} dependencyList - List of dependencies to identify relationships
 * @returns {string} - DOT file content for class diagram
 */
export const createClassDiagram = (dependencyList, classList) => {
  const classDiagram = new ClassDiagram(dependencyList, classList);
  return classDiagram.generate();
};

// Export all graph classes 
export { 
  PackageGraph,
  ExportGraph,
  RelationsGraph,
  ClassDiagram,
  NodeModulesGraph
};

export default {
  createPackageGraph,
  createExportGraph,
  createRelationsGraph,
  createClassDiagram
};

