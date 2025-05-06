import { cleanDirPath } from "../utils/file-utils.js";

/**
 * Base class for all graph generators
 * Provides common functionality used by specific graph implementations
 */
export class GraphBase {
  /**
   * Creates the standard header for a graphviz digraph
   * 
   * @param {string} [title] - Title to use for the graph
   * @returns {string} - Formatted digraph header
   */
  digraph(title) {
    return `digraph {label="${title}";\nlabelloc="t";\n`
   }

  nodeStart(title) {
    return `"${title}"[shape = none, label =<<TABLE cellspacing="0" cellborder="1" align="left">\n`;
  }

  nodeFinish() {
    return `</TD></TR>\n</TABLE>>];\n`
  }



  recordDigraph(title = "") {
    let result = "digraph {\n";
    result += `label="${title}";\n`;
    result += `labelloc="t";\n`;
    result += "node [shape=record];\n";
    return result;
  }


  /**
   * Checks if a dependency is a node module
   * 
   * @param {Object} dep - Dependency object
   * @returns {boolean} - True if it's a node module dependency
   */
  isNodeModule(dep) {
    return dep.importSrc === dep.relSrcName;
  }

  /**
   * Checks if a dependency is in the same directory
   * 
   * @param {Object} dep - Dependency object
   * @returns {boolean} - True if the dependency is in the same directory
   */
  inSameDirectory(dep) {
    const src = cleanDirPath(dep.src);
    return ((src !== '') && (dep.importSrc.startsWith('./')));
  }

  /**
   * Generate the complete graph
   * Abstract method to be implemented by subclasses
   * 
   * @returns {string} - Complete DOT graph content
   */
  generate() {
    throw new Error("Subclass must implement generate() method");
  }
}