import path from "path";
import { GraphBase } from "./GraphBase.js";
import { cleanDirPath, moduleName } from "../utils/file-utils.js";
import { getUsedByList, getDependsOn, getNodeModuleList } from "../utils/list-utils.js";

/**
 * Generates a graph showing module relationships (depends on/used by)
 */
export class RelationsGraph extends GraphBase {
  /**
   * @param {Array} dependencyList - List of dependencies
   * @param {Array} moduleArray - List of modules to graph
   * @param {string} [srcDir=""] - Source directory for graph label
   */
  constructor(dependencyList, moduleArray) {
    super();
    this.dependencyList = dependencyList;
    this.moduleArray = moduleArray;
    this.nodeModuleDependents = new Set();
  }

  /**
   * Creates a graph showing module relationships
   * 
   * @returns {string} - DOT file content for relations graph
   */
  generate() {
    let result = this.digraph("");

    // Process each module
    this.moduleArray.forEach((mod) => {
      result += this.#createModuleRelationNode(mod);
    });

    // Add node_modules section
    result += this.#createNodeModulesSection();

    result += '}\n';
    return result;
  }

  /**
   * Creates a node showing a module's relationships
   * 
   * @param {Object} mod - Module object
   * @returns {string} - DOT syntax for module relation node
   */
  #createModuleRelationNode(mod) {
    // Node header with module name
    const modName = moduleName(mod);

    // Create HTML table-based label instead of record
    let nodeContent = this.nodeStart(modName);
    nodeContent += `<TR><TD ALIGN="left">${modName}</TD></TR>\n`
    nodeContent += `<TR><TD ALIGN="left">Depend On : ${mod.dependsOnCnt}<BR/>\n`
    nodeContent += `Used By : ${mod.usedByCnt}</TD></TR>\n`;

    // Second section: modules this depends on
    let dependsOnSection = '<TR><TD ALIGN="left">';
    let prevDependency = "";
    let result = "";

    const depsOn = getDependsOn(this.dependencyList, modName);
    for (const dep of depsOn) {
      if (prevDependency !== dep.relSrcName) {
        prevDependency = dep.relSrcName;

        // Handle node_module vs local module dependencies
        if (this.isNodeModule(dep)) {
          // This is a node_module dependency
          this.nodeModuleDependents.add(mod.file);
        } else {
          if (this.inSameDirectory(dep)) {
            prevDependency = path.join(cleanDirPath(dep.src), dep.relSrcName).replaceAll("\\", "/");
          }

          // not a local module dependency
          if (dep.src !== prevDependency) {
            result += `"${dep.src}"->"${prevDependency}"\n`;
          }
        }

        dependsOnSection += `${prevDependency}<BR/>\n`;
      }
    }
    dependsOnSection += '</TD></TR>\n';

    // Third section: modules that use this module
    let usedBySection = '<TR><TD ALIGN="left">';
    prevDependency = "";

    const usedList = getUsedByList(this.dependencyList, mod);
    for (const dep of usedList) {
      if (prevDependency !== dep.src) {
        prevDependency = dep.src;
        usedBySection += `${prevDependency}<BR/>\n`;
      }
    }

    return nodeContent + dependsOnSection + usedBySection + this.nodeFinish() + result;
  }

  /**
   * Creates the node_modules section of the graph
   * 
   * @returns {string} - DOT syntax for node_modules section
   */
  #createNodeModulesSection() {
    // Create node_modules node with HTML label
    let nodeContent = `"node-modules" [shape=none, label=<<table border="0" align="left" cellborder="1" cellspacing="0">\n`;
    nodeContent += `<tr><td bgcolor="lightgrey"><b>node-modules</b></td></tr>\n`
    nodeContent += `<tr><td align="left">`;

    let prevModule = "";

    // Add each unique node module
    const nodeMods = getNodeModuleList(this.dependencyList);
    for (const dep of nodeMods) {
      if (prevModule !== dep.importSrc) {
        prevModule = dep.importSrc;
        nodeContent += `${prevModule}<BR/>\n`;
      }
    }
    nodeContent += `</td></tr>\n</table>>];\n`;

    // Optionally add connections from modules to node-modules
    let relationships = "";
    /*
    // Currently disabled as it would create too many links
    for (const module of this.nodeModuleDependents) {
      relationships += `"${module}"->"node-modules"\n`;
    }
    */

    return nodeContent + relationships;
  }
}