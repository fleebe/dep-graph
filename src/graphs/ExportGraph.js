import { GraphBase } from "./GraphBase.js";
import { moduleName } from "../utils/file-utils.js";
import { getExportedList, getDependsOn } from "../utils/list-utils.js";

/**
 * Generates a graph showing module exports and imports
 */
export class ExportGraph extends GraphBase {
  #dependencyList = []
  #exportList = []
  #moduleArray = []

  /**
   * @param {Array} dependencyList - List of imports and their sources
   * @param {Array} exportList - List of files and exported functions
   * @param {Array} moduleArray - List of files to graph
   */
  constructor(dependencyList, exportList, moduleArray) {
    super();
    this.#dependencyList = dependencyList;
    this.#exportList = exportList;
    this.#moduleArray = moduleArray;
  }

  /**
   * Creates a graph file for modules, showing exports and imports
   * 
   * @returns {string} - DOT file content for exports graph
   */
  generate(dir) {
    let result = this.digraph(`${dir} Module Exports`);

    const modules = this.#moduleArray.filter(mod => mod.dir === dir)

    // Create nodes for each module
    modules.forEach((mod) => {
      const exp = getExportedList(this.#exportList, moduleName(mod));
      result += this.createModuleNode(mod, exp);
    });

    result += this.#createRelations(modules);

    // Add graph footer
    result += '}\n';
    return result;
  }

  /**
   * Creates a node for a single module
   * 
   * @param {Object} mod - Module object from ModuleArray.json
   * @param {Array} exportList - List of exported functions for this module
   * @returns {string} - DOT syntax for module node
   */
  createModuleNode(mod, exportList) {
    const modName = moduleName(mod);
    const nodeModuleDependents = new Set();

    let nodeContent = this.nodeStart(modName);
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

    const depsOn = getDependsOn(this.#dependencyList, modName);
    // Group imports by their source module
    const importsBySource = new Map();
    for (const dep of depsOn) {
      if (this.isNodeModule(dep)) {
        // This is a node_module dependency
        nodeModuleDependents.add(dep);
        continue;
      }

      if (!importsBySource.has(dep.relSrcName)) {
        importsBySource.set(dep.relSrcName, new Set());
      }
      importsBySource.get(dep.relSrcName).add(dep.import);
    }
    // Add grouped imports to the node content
    for (const [source, imports] of importsBySource.entries()) {
      nodeContent += `<font color="red"><I>${source}</I></font><BR/>\n`; // Add the source module name
      imports.forEach(imp => nodeContent += `${imp}<BR/>\n`); // Add each import from that source
    }
    nodeContent += this.nodeFinish();
    nodeContent += this.#createNodeModulesRelations(modName, nodeModuleDependents)

    return nodeContent;
  }

  #createNodeModulesRelations(modName, nodeMods) {
    if (nodeMods.size < 1) return ''
    const nodeName = modName + "-node_modules"
    let nodeContent = this.nodeStart(nodeName);
    nodeContent += `<TR><TD>node_modules</TD></TR>\n`;
    nodeContent += `<TR><TD align="center">\n`;
    nodeMods.forEach(dep => {
      nodeContent += `<font color="red"><I>${dep.relSrcName}</I></font><BR/>\n`
      nodeContent += `${dep.import}<BR/>\n`
    })
    nodeContent += this.nodeFinish();
    nodeContent +=  `"${modName}"->"${nodeName}"\n`

    return nodeContent;

  }

  #createRelations(modules) {
    let result = "";
    // Create a set of module names that are part of this specific diagram for quick lookups
    const moduleNamesInDiagram = new Set(modules.map(m => moduleName(m)));

    modules.forEach((mod) => {
      const modName = moduleName(mod);
      const depsOn = getDependsOn(this.#dependencyList, modName);
      const linkedSources = new Set(); // Keep track of linked sources for this module to avoid duplicates

      depsOn.forEach(dep => {
        const sourceName = dep.relSrcName;
        // Check if the dependency source is also in the current diagram and not already linked
        if (moduleNamesInDiagram.has(sourceName) && !linkedSources.has(sourceName)) {
          result += `"${modName}"->"${sourceName}";\n`;
          linkedSources.add(sourceName); // Mark this source as linked for the current modName
        }
      });
    });
    return result;
  }
}