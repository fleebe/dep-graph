import path from "path";
import { cleanPath, moduleName} from "../utils/file-utils.js";
import { getUsedByList, getDependsOn, getNodeModuleList, getExportedList } from "../utils/list-utils.js";

/**
 *
 * @module commands/graph  
 * @description  Graph command module providing various graph generation functions
 */

/**
 * Class responsible for generating various dependency graphs
 */
class GraphGenerator {
  /**
   * Creates a graphviz .dot file of package dependencies
   * 
   * @param {Array} moduleArray - Array of module objects with metadata {dir, file, dependsOnCnt, usedByCnt}
   * @param {Array} dependencyList - Array of dependencies where src depends on importSrc
   * @param {string} [srcDir=""] - Source directory for labeling the graph
   * @returns {string} - DOT file content as string
   */
  createPackageGraph(moduleArray, dependencyList, srcDir) {
    let result = this.digraph();

    // Add packages to the graph
    result += this.createPackageNodes(moduleArray);

    // Create the dependencies for the package map
    result += this.createPackageDependencies(dependencyList, srcDir);

    result += '}\n';
    return result;
  }

  isNodeModule(dep) {
    return dep.importSrc === dep.relSrcName
  }

  inSameDirectory(dep) {
    const src = cleanPath(path.dirname(dep.src));
    return ((src !== '') && (dep.importSrc.startsWith('./')))
  }  

  /**
   * Creates package dependency relationships for the graph
   * 
   * @param {Array} dependencyList - List of dependencies
   * @returns {string} - DOT syntax for package dependencies
   */
  createPackageDependencies(dependencyList) {
    let depArr = [];
    let result = "";

    for (const dep of dependencyList) {
      const src = cleanPath(path.dirname(dep.src));
      const dest = cleanPath(path.dirname(dep.relSrcName));

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
      let ln = `"${src}"->"${dest}"\n`;

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
   * @param {Array} moduleArray - Array of module objects
   * @returns {string} - DOT syntax for package nodes
   */
  createPackageNodes(moduleArray) {
    let result = "";

    // Get unique set of directories
    const dirList = new Set(moduleArray.map(a => a.dir));

    // For each directory, create a node with its files
    for (const directory of dirList) {
      let nodeContent = `"${directory}" [label="{${directory}|\n`;

      // Add each file in the directory to the node
      const filesInDir = moduleArray.filter(a => directory === a.dir);
      for (const dirFile of filesInDir) {
        nodeContent += `\t${dirFile.file}\\l\n`;
      }

      result += nodeContent + '}"];\n\n';
    }

    return result;
  }

  /**
   * Creates a graph file for modules, showing exports and imports
   * 
   * @param {Array} dependencyList - List of imports and their sources
   * @param {Array} exportList - List of files and exported functions
   * @param {Array} moduleArray - List of files to graph
   * @returns {string} - DOT file content for dependencies graph
   */
  createGraph(dependencyList, exportList, moduleArray) {
    let result = this.digraph();
    let modList = [];

    // Create nodes for each module
    moduleArray.forEach((mod) => {
      const modName = moduleName(mod);
      modList.push(modName);
      const exp = getExportedList(exportList, modName);
      result += this.createModuleNode(mod, exp, dependencyList);
    });

      // Add graph footer
    result += '}\n';
    return result;
  }

  /**
   * Creates a node for a single module
   * 
   * @param {Object} mod - Module object
   * @param {Array} exportList - List of exported functions
   * @param {Array} dependencyList - List of dependencies
   * @returns {string} - DOT syntax for module node
   */
  createModuleNode(mod, exportList, dependencyList) {

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

    const depsOn = getDependsOn(dependencyList, modName);
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

  /**
   * Creates nodes for imports that aren't already represented in module nodes
   * 
   * @param {Map} importMap - Map of imports
   * @param {Array} modList - List of modules already added to the graph
   * @returns {string} - DOT syntax for import nodes
   */
  createNodes(importMap, modList) {
    let result = "";

    for (const imp of importMap.keys()) {
      // Skip if this import is already in the module list
      if (modList.indexOf(imp) === -1) {
        let nodeContent = `"${imp}" [label="{${imp}|\n`;

        // Add each imported function
        for (const fn of importMap.get(imp)) {
          nodeContent += `\t${fn}\\l\n`;
        }

        result += nodeContent + '}"];\n\n';
      }
    }

    return result;
  }

  /**
   * Creates a graph showing module relationships (depends on/used by)
   * 
   * @param {Array} dependencyList - List of dependencies
   * @param {Array} moduleArray - List of modules to graph
   * @param {string} [srcDir=""] - Source directory for graph label
   * @returns {string} - DOT file content for relations graph
   */
  createRelationsGraph(dependencyList, moduleArray) {
    let result = this.digraph();
    let nodeModuleDependents = new Set();

    // Process each module
    moduleArray.forEach((mod) => {
      result += this.createModuleRelationNode(mod, dependencyList, nodeModuleDependents);
    });

    // Add node_modules section
    result += this.createNodeModulesSection(dependencyList, nodeModuleDependents);

    result += '}\n';
    return result;
  }

  /**
   * Creates a node showing a module's relationships
   * 
   * @param {Object} mod - Module object
   * @param {Array} dependencyList - List of dependencies
   * @param {Set} nodeModuleDependents - Set to collect modules depending on node_modules
   * @returns {string} - DOT syntax for module relation node
   */
  createModuleRelationNode(mod, dependencyList, nodeModuleDependents) {
    // Node header with module name
    const modName = moduleName(mod);
    let nodeContent = `"${modName}" [label="{ ${modName}\\n\n`;

    // First section: dependency counts
    nodeContent += `Depend On : ${mod.dependsOnCnt}\\l\n`;
    nodeContent += `Used By : ${mod.usedByCnt}\\l\n`;

    // Second section: modules this depends on
    let dependsOnSection = "|\n";
    let prevDependency = "";
    let result = "";

    const depsOn = getDependsOn(dependencyList, modName);
    for (const dep of depsOn) {
      if (prevDependency !== dep.relSrcName) {
        prevDependency = dep.relSrcName;
        // Handle node_module vs local module dependencies
        if (this.isNodeModule(dep)) {
          // This is a node_module dependency
          nodeModuleDependents.add(mod.file);
        } else {
          if (this.inSameDirectory(dep)) {
            const src = path.join(cleanPath(path.dirname(dep.src)), dep.relSrcName);
            prevDependency = src.replaceAll("\\", "/");
          }

          // not a local module dependency
          if (dep.src !== prevDependency) {
            result += `"${dep.src}"->"${prevDependency}"\n`;
          }
        }

        dependsOnSection += `\t\t${prevDependency}\\l\n`;
      }
    }
    // Third section: modules that use this module
    let usedBySection = "|\n";
    prevDependency = "";

    const usedList = getUsedByList(dependencyList, mod);
    for (const dep of usedList) {
      if (prevDependency !== dep.src) {
        prevDependency = dep.src;
        usedBySection += `\t\t${prevDependency}\\l\n`;
      }
    }

    // Complete the node
    return nodeContent + dependsOnSection + usedBySection + `}"];\n\n` + result;
  }

  /**
   * Creates the node_modules section of the graph
   * 
   * @param {Array} dependencyList - List of dependencies
   * @param {Set} nodeModuleDependents - Set of modules depending on node_modules
   * @returns {string} - DOT syntax for node_modules section and relationships
   */
  createNodeModulesSection(dependencyList) {
    // Create node_modules node
    let nodeContent = `"node-modules" [label="{node-modules\\n | \n `;
    let prevModule = "";

    // Add each unique node module
    const nodeMods = getNodeModuleList(dependencyList);
    for (const dep of nodeMods) {
      if (prevModule !== dep.importSrc) {
        prevModule = dep.importSrc;
        nodeContent += `\t\t${prevModule}\\l\n`;
      }
    }
    nodeContent += `}"];\n`;

    // Optionally add connections from modules to node-modules
    let relationships = "";
    /*
    // Currently disabled as it would create too many links
    for (const module of nodeModuleDependents) {
      relationships += `"${module}"->"node-modules"\n`;
    }
    */

    return nodeContent + relationships;
  }

  /**
   * Creates the standard header for a graphviz digraph
   * 
   * @param {string} [srcDir=""] - Source directory to use as graph title
   * @returns {string} - Formatted digraph header
   */
  digraph(srcDir = "") {
    let result = "digraph {\n";

    if (srcDir) {
      result += `label="${srcDir}";\n`;
      result += `labelloc="t";\n`;
    }

    result += "node [shape=record];\n";
    return result;
  }
}

// Create a singleton instance
const graphGenerator = new GraphGenerator();

// Export public methods while maintaining backward compatibility
export const createPackageGraph = (moduleArray, dependencyList, srcDir = "") => 
  graphGenerator.createPackageGraph(moduleArray, dependencyList, srcDir);

export const createGraph = (dependencyList, exportList, moduleArray) => 
  graphGenerator.createGraph(dependencyList, exportList, moduleArray);

export const createRelationsGraph = (dependencyList, moduleArray, srcDir = "") => 
  graphGenerator.createRelationsGraph(dependencyList, moduleArray, srcDir);

// Export the class and default object
export { GraphGenerator };

export default {
  createPackageGraph,
  createGraph,
  createRelationsGraph
};

