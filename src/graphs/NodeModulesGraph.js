import { GraphBase } from "./GraphBase.js";
import { getNodeModuleList } from "../utils/list-utils.js";

/**
 * Generates a graph showing node_modules dependencies
 */
export class NodeModulesGraph extends GraphBase {
  /**
   * @param {Array} dependencyList - List of dependencies
   * @param {Set} [nodeModuleDependents=new Set()] - Set of modules depending on node_modules
   */
  constructor(dependencyList, nodeModuleDependents = new Set()) {
    super();
    this.dependencyList = dependencyList;
    this.nodeModuleDependents = nodeModuleDependents;
  }

  /**
   * Creates a graph of node_modules dependencies
   * 
   * @returns {string} - DOT file content for node_modules graph
   */
  generate() {
    let result = this.recordDigraph("Node Module Dependencies");
    
    // Add node_modules node and connections
    result += this.createNodeModulesSection();
    
    result += '}\n';
    return result;
  }

  /**
   * Creates the node_modules section of the graph
   * 
   * @returns {string} - DOT syntax for node_modules section and relationships
   */
  createNodeModulesSection() {
    // Create node_modules node
    let nodeContent = `"node-modules" [label="{node-modules\\n | \n `;
    let prevModule = "";

    // Add each unique node module
    const nodeMods = getNodeModuleList(this.dependencyList);
    for (const dep of nodeMods) {
      if (prevModule !== dep.importSrc) {
        prevModule = dep.importSrc;
        nodeContent += `\t\t${prevModule}\\l\n`;
      }
    }
    nodeContent += `}"];\n`;

    // Optionally add connections from modules to node-modules
    let relationships = "";
    
    // Uncomment to enable module-to-nodemodule connections
    /*
    for (const module of this.nodeModuleDependents) {
      relationships += `"${module}"->"node-modules"\n`;
    }
    */

    return nodeContent + relationships;
  }
}