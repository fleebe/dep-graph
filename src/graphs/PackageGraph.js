import { cleanDirPath } from "../utils/file-utils.js";
import { GraphBase } from "./GraphBase.js";

/**
 * Generates a package dependency graph showing directory-level dependencies
 */
export class PackageGraph extends GraphBase {
  /**
   * @param {Array} moduleArray - Array of module objects with metadata
   * @param {Array} dependencyList - Array of dependencies
   */

  #moduleArray = []
  #dependencyList = []
  #diagramsHTML = "diagrams.html"

  constructor(moduleArray, dependencyList) {
    super();
    this.#moduleArray = moduleArray;
    this.#dependencyList = dependencyList;
    this.#diagramsHTML = "diagrams.html";
  }

  /**
   * Creates a graphviz .dot file of package dependencies
   * 
   * @returns {string} - DOT file content as string
   */
  generate() {
    let result = this.digraph("");

    // Add packages to the graph
    result += this.createPackageNodes();

    // Create the dependencies for the package map
    result += this.createPackageDependencies();

    result += '}\n';
    return result;
  }

  /**
   * Creates package dependency relationships for the graph
   * 
   * @returns {string} - DOT syntax for package dependencies
   */
  createPackageDependencies() {
    let depArr = [];
    let result = "";

    for (const dep of this.#dependencyList) {
      const src = cleanDirPath(dep.src);
      const dest = cleanDirPath(dep.relSrcName);

      if (src === dest) {
        // Skip self-references
        continue;
      }
      // Skip node_module dependencies which typically don't have paths
      if (this.isNodeModule(dep)) {
        continue;
      }

      // same directory dependencies are not shown in the graph
      if (this.inSameDirectory(dep)) {
        continue;
      }
      // Create relationship between src and dest packages
      let ln = `"${src}"->"${dest}";\n`;

      // Add dependency to graph and array if it doesn't already exist
      if (depArr.indexOf(ln) === -1) {
        depArr.push(ln);
        result += ln;
      }
    }

    return result;
  }

  /**
   * Creates nodes for packages in the graph
   * 
   * @returns {string} - DOT syntax for package nodes
   */
  createPackageNodes() {
    let nodeContent = "";
    // Get unique set of directories
    const dirList = new Set(this.#moduleArray.map(a => a.dir));

    // For each directory, create a node with its files
    for (const directory of dirList) {
      nodeContent += this.nodeStart(directory);
      nodeContent += `<TR><TD ALIGN="center" HREF="${this.#diagramsHTML}#${directory}" TARGET="_top">${directory}</TD></TR>\n`;
      nodeContent += `<TR><TD ALIGN="left">\n`

      // Add each file in the directory to the node
      const filesInDir = this.#moduleArray.filter(a => directory === a.dir);
      for (const dirFile of filesInDir) {
        nodeContent += `${dirFile.file}<BR/>\n`;
      }

      nodeContent += this.nodeFinish();
    }
    return nodeContent;
  }
}