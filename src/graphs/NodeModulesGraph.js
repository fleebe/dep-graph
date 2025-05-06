import { GraphBase } from "./GraphBase.js";
import { getNodeModuleList } from "../utils/list-utils.js";

/**
 * Generates a graph showing node_modules dependencies
 */
export class NodeModulesGraph extends GraphBase {
  #dependencyList = []
  /**
   * @param {Array} dependencyList - List of dependencies
   * @param {Set} [nodeModuleDependents=new Set()] - Set of modules depending on node_modules
   */
  constructor(dependencyList) {
    super();
    this.#dependencyList = dependencyList;
  }

  /**
   * Creates a graph of node_modules dependencies
   * 
   * @returns {string} - DOT file content for node_modules graph
   */
  generate() {
    let result = this.digraph("Node Modules Dependencies");
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
    let nodeContent = this.nodeStart("node-modules");
    nodeContent += `<TR><TD><B>node-modules</B></TD></TR>\n<TR><TD align="left">\n`;

    // Add each unique node module
    const nodeMods = getNodeModuleList(this.#dependencyList);
    // Get the set of unique node module names
    const nodeModuleNames = new Set(nodeMods.map(dep => dep.importSrc));
    for (const dep of nodeModuleNames) {
      nodeContent += `${dep}<BR/>\n`;
    }
    nodeContent += this.nodeFinish();

    const nodeModuleDependents = new Set(
      this.#dependencyList
          .filter(dep => nodeModuleNames.has(dep.importSrc))
      .map(dep => dep.src));

    nodeContent += this.nodeStart("modules");
    nodeContent += `<TR><TD><B>modules</B></TD></TR>\n<TR><TD align="left">\n`;
    for (const module of nodeModuleDependents) {
      nodeContent += `${module}<BR/>\n`;
    }
    nodeContent += this.nodeFinish();

    nodeContent += `"modules"->"node-modules"\n`;

    return nodeContent;
  }
}