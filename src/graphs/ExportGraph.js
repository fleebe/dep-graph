import { GraphBase } from "./GraphBase.js";
import { moduleName } from "../utils/file-utils.js";
import { getExportedList, getDependsOn } from "../utils/list-utils.js";

/**
 * Generates a graph showing module exports and imports
 */
export class ExportGraph extends GraphBase {
  /**
   * @param {Array} dependencyList - List of imports and their sources
   * @param {Array} exportList - List of files and exported functions
   * @param {Array} moduleArray - List of files to graph
   */
  constructor(dependencyList, exportList, moduleArray) {
    super();
    this.dependencyList = dependencyList;
    this.exportList = exportList;
    this.moduleArray = moduleArray;
  }

  /**
   * Creates a graph file for modules, showing exports and imports
   * 
   * @returns {string} - DOT file content for exports graph
   */
  generate(dir) {
    let result = this.digraph(`${dir} Module Exports`);

    // Create nodes for each module
    this.moduleArray
    .filter(mod => mod.dir === dir)
    .forEach((mod) => {
      const exp = getExportedList(this.exportList, moduleName(mod));
      result += this.createModuleNode(mod, exp);
    });

    // Add graph footer
    result += '}\n';
    return result;
  }

  /**
   * Creates a node for a single module
   * 
   * @param {Object} mod - Module object
   * @param {Array} exportList - List of exported functions for this module
   * @returns {string} - DOT syntax for module node
   */
  createModuleNode(mod, exportList) {
    const modName = moduleName(mod);
    let nodeContent = `"${modName}" [shape=none, label=<<TABLE cellspacing="0" cellborder="1">\n`
    nodeContent += `<TR><TD bgcolor="lightblue" align="center"><B>${modName}</B></TD></TR>\n`;
    nodeContent += `<TR><TD align="left">\n`;
    
    // Add exported functions
    const uniqueExports = new Set();
    for (const exported of exportList) {
      if (!uniqueExports.has(exported.exported)) {
        uniqueExports.add(exported.exported);
        nodeContent += `${exported.exported}<BR/>\n`;
      }
    }
    
    nodeContent +=  `</TD></TR>\n`;
    nodeContent += `<TR><TD align="center">\n`;

    const depsOn = getDependsOn(this.dependencyList, modName);
    let prevDependency = "";
    for (const dep of depsOn) {
      if (prevDependency !== dep.relSrcName) {
        prevDependency = dep.relSrcName;  
        nodeContent += `<font color="red"><I>${dep.relSrcName}</I></font><BR/>\n`;
      }
      nodeContent += `${dep.import}<BR/>\n`;
    }
    
    nodeContent += `</TD></TR>\n`;
    return `${nodeContent}</TABLE>>];\n\n`;
  }
}