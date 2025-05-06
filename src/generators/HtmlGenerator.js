import { getUsedByList, getDependsOn, getNodeModuleList, getExportedList } from "../utils/list-utils.js";

/**
 *  @module commands/html
 *  @description
 * HTML Command Module
 * Provides functionality to generate HTML reports of module dependencies
 */

/**
 * Class responsible for generating HTML reports of module dependencies
 */
export class HtmlGenerator {

  #diagramHTML = 'diagrams.html'

constructor(diagramHTML) {
  this.diagramHTML = diagramHTML;
}

  /**
   * Creates an HTML report of module dependencies and relationships
   * @param {string} symbol - root directory where files are found.
   * @param {Array} moduleArray - Array of module objects with metadata
   *   Each object contains: {dir, file, dependsOnCnt, usedByCnt, exportCnt}
   * @param {Array} dependencyList - Array of dependencies
   *   Each object contains: {src, importSrc, import, relSrcName}
   * @param {Array} exportList - Array of exported functions/objects
   *   Each object contains: {name, exported, type, params}
   * @returns {string} - HTML document as a string
   */
  createModuleHtml(symbol, moduleArray, dependencyList, exportList) {
    let result = "<html><head><style>";
    result += "body { font-family: Arial, sans-serif; margin: 20px; }";
    result += ".svg-container { max-width: 100%; overflow: auto; margin: 20px 0; border: 1px solid #ddd; padding: 10px; }";
    result += "h1, h2, h3 { color: #333; }";
    result += "table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }";
    result += "th { background-color: #f2f2f2; }";
    result += "td, th { border: 1px solid #ddd; padding: 8px; }";
    result += "</style></head><body>\n";
    
    result += `<h1>${symbol}</h1>\n`;
    
    // Add links to the diagrams page instead of embedding SVGs
    result += `<h2>Diagrams</h2>\n`;
    result += `<p><a href="${this.#diagramHTML}" target="_blank">View all module diagrams</a></p>\n`;
    
    // Generate summary section
    result += this.generateSummarySection(moduleArray, dependencyList);
    
    // Generate details for each module
    result += this.generateModuleDetails(moduleArray, dependencyList, exportList);
    
    // Generate node modules section
    result += this.generateNodeModulesSection(dependencyList);
    
    result += "</body></html>";
    return result;
  }

  /**
   * Generates the summary section with counts and module lists
   * 
   * @param {Array} moduleArray - Array of module objects
   * @param {Array} dependencyList - Array of dependencies
   * @returns {string} - HTML for the summary section
   */
  generateSummarySection(moduleArray, dependencyList) {
    let result = "";
    const tblStyle = "<table border=1 cellpadding=5>\n";
    result += `<h1 id="mod_list">Module List</h1>\n`;

    // Get unique node modules
    const nodMods = this.getUniqueNodeModules(dependencyList);
    
    // Generate counts table
    result += tblStyle;
    result += `\t<tr><th>Type</th>`;
    result += `<th>Count</td></th></tr>\n`;
    result += `\t<tr><td><a href="#node_modules">Node Modules</a></td>`;
    result += `\t<td>${nodMods.length}</td></tr>\n`;
    result += `\t<tr><td>Application Modules</td>`;
    result += `\t<td>${moduleArray.length}</td></tr>\n`;
    
    // Count unused modules
    const unusedModules = moduleArray.filter(m => m.usedByCnt === 0);
    result += `\t<tr><td><a href="#unused">Unused Application Modules</a></td>`;
    result += `\t<td>${unusedModules.length}</td></tr>\n`;
    result += "</table><br>\n";

    // Generate modules summary table
    result += this.generateModuleSummaryTable(moduleArray);
    
    // Generate unused modules table
    result += this.generateUnusedModulesTable(unusedModules);
    
    return result;
  }

  /**
   * Generates a summary table of all modules
   * 
   * @param {Array} moduleArray - Array of module objects
   * @returns {string} - HTML table of modules
   */
  generateModuleSummaryTable(moduleArray) {
    let result = "<table border=1 cellpadding=5>\n";
    result += "\t<tr><th>Directory</th>";
    result += "<th>File</th>";
    result += "<th>Depends On</th>";
    result += "<th>Used By</th>";
    result += "<th>Exported</th></tr>\n";
    
    moduleArray.forEach(mod => {
      result += "\t<tr>";
      result += "<td>" + mod.dir + "</td>";
      result += `<td><a href="#${mod.file}">${mod.file}</a></td>`;
      result += "<td>" + mod.dependsOnCnt + "</td>";
      result += "<td>" + mod.usedByCnt + "</td>";
      result += "<td>" + mod.exportCnt + "</td>";
      result += "</tr>\n";
    });
    
    result += "</table>\n";
    return result;
  }

  /**
   * Generates a table of unused modules
   * 
   * @param {Array} unusedModules - Array of unused module objects
   * @returns {string} - HTML table of unused modules
   */
  generateUnusedModulesTable(unusedModules) {
    let result = `<h2 id="unused">Unused Application Modules</h2><a href="#mod_list">(top)</a>\n`;
    result += "<table border=1 cellpadding=5>\n";
    result += "\t<tr><th>Directory</th>";
    result += "<th>File</th>";
    result += "<th>Depends On</th>";
    result += "<th>Used By</th>";
    result += "<th>Exported</th></tr>\n";
    
    unusedModules.forEach(mod => {
      result += "\t<tr>";
      result += "<td>" + mod.dir + "</td>";
      result += `<td><a href="#${mod.file}">${mod.file}</a></td>`;
      result += "<td>" + mod.dependsOnCnt + "</td>";
      result += "<td>" + mod.usedByCnt + "</td>";
      result += "<td>" + mod.exportCnt + "</td>";
      result += "</tr>\n";
    });
    
    result += "</table>\n";
    return result;
  }

  /**
   * Generates detailed sections for each module
   * 
   * @param {Array} moduleArray - Array of module objects
   * @param {Array} dependencyList - Array of dependencies
   * @param {Array} exportList - Array of exported functions/objects
   * @returns {string} - HTML for all module details
   */
  generateModuleDetails(moduleArray, dependencyList, exportList) {
    let result = "";
    try {
      moduleArray.forEach(mod => {
        result += `<h2 id=${mod.file}>${mod.file}</h2> <a href="#mod_list">(top)</a>\n`;

        const usedList = getUsedByList(dependencyList, mod);
        
        // Generate three sections for each module
        result += this.generateExportsTable(exportList, usedList, mod.file);
        result += this.generateDependsOnTable(dependencyList, mod.file);
        result += this.generateUsedByTable(usedList, mod.file);
      });
    } catch (error) {
      console.error(`Error generating module details: ${error}`);
    }
    
    return result;
  }

  /**
   * Generates a table of exported functions/objects for a module
   * 
   * @param {Array} exportList - Array of exports for this module
   * @param {Array} usedList - Array of usage information
   * @param {string} fileName - Name of the file being analyzed
   * @returns {string} - HTML table of exports
   */
  generateExportsTable(exportList, usedList, fileName) {
    let result = `<h3>${fileName} Exports</h3>\n`;
    result += "<table border=1 cellpadding=5>\n";
    result += "\t<tr><th>Exported</th>";
    result += "<th>Export Declaration</th>";
    result += "<th>Parameters</th>";
    result += "<th>Used Count</th></tr>\n";

    // Get data for this module
    const exports = getExportedList(exportList, fileName);

    
    for (const exported of exports) {
      if (exported.type !== 'FunctionDeclaration')
        continue;
      
      result += `\t<tr><td>${exported.exported}</td>\n`;
      result += `\t<td>${exported.type}</td>\n`;
      result += `\t<td>${exported.params || ""}</td>\n`;
      
      // Count how many times this export is used
      const usedExp = usedList.filter(u => u.import === exported.exported);
      result += `\t<td>${usedExp.length}</td></tr>\n`;
    }
    
    result += `</table><br>\n`;
    return result;
  }

  /**
   * Generates a table of dependencies for a module
   * 
   * @param {Array} dependencyList - Array of all dependencies
   * @param {string} fileName - Name of the file being analyzed
   * @returns {string} - HTML table of dependencies
   */
  generateDependsOnTable(dependencyList, fileName) {
    let result = `<h3>${fileName} Depends On</h3>\n`;
    result += "<table border=1 cellpadding=5>\n";
    result += "\t<tr><th>File or <br>Node Module</th>";
    result += "<th>Import</th></tr>\n";

    const depsList = getDependsOn(dependencyList, fileName);
    
    for (const dep of depsList) {
      if (dep.relSrcName.startsWith(".")) { 
        // Local module with link
        // Extract just the file name from relative path
        const fileName = dep.relSrcName.split('/').pop();
        result += `\t<tr><td><a href="#${fileName}">${dep.relSrcName}</a></td>\n`;
      } else { 
        // Node module without link
        result += `\t<tr><td>${dep.relSrcName}</td>\n`;
      }
      result += `\t<td>${dep.import}</td></tr>\n`;
    }
    
    result += `</table><br>\n`;
    return result;
  }

  /**
   * Generates a table of modules that use this module
   * 
   * @param {Array} usedList - Array of usage information
   * @param {string} fileName - Name of the file being analyzed
   * @returns {string} - HTML table of module usage
   */
  generateUsedByTable(usedList, fileName) {
    let result = `<h3>${fileName} Used By</h3>\n`;
    result += "<table border=1 cellpadding=5>\n";
    result += "\t<tr><th>File or <br>Node Module</th>";
    result += "<th>Import</th></tr>\n";
    
    for (const dep of usedList) {
      result += `\t<tr><td><a href="#${dep.src}">${dep.src}</a></td>\n`;
      result += `\t<td>${dep.import}</td></tr>\n`;
    }
    
    result += `</table><br>\n`;
    return result;
  }

  /**
   * Generates the node modules section
   * 
   * @param {Array} dependencyList - Array of dependencies
   * @returns {string} - HTML for node modules section
   */
  generateNodeModulesSection(dependencyList) {
    let result = `<h2 id="node_modules">Node Modules</h2>  <a href="#mod_list">(top)</a>\n`;
    result += "<table border=1 cellpadding=5>\n";
    result += "\t<tr><th>File</th>";
    result += "<th>Node Module</th></tr>\n";
    
    const nodMods = this.getUniqueNodeModules(dependencyList);
    
    for (const dep of nodMods) {
      result += `\t<tr><td>${dep.importSrc}</td>\n`;
      result += `\t<td>${dep.import}</td></tr>\n`;
    }
    
    result += `</table><br>\n`;
    return result;
  }

  /**
   * Gets a list of unique node modules from the dependency list
   * 
   * @param {Array} dependencyList - Array of dependencies
   * @returns {Array} - Array of unique node modules
   */
  getUniqueNodeModules(dependencyList) {
    const objArray = getNodeModuleList(dependencyList);
    let uniqueObjArray = [...new Map(
      objArray.map((item) => [item.importSrc, item])
    ).values()];
    return uniqueObjArray;
  }
}

// Function for backward compatibility
export function createModuleHtml(symbol, moduleArray, dependencyList, exportList) {
  const htmlGenerator = new HtmlGenerator();
  return htmlGenerator.createModuleHtml(symbol, moduleArray, dependencyList, exportList);
}

/**
 * Module exports
 */
export default {
  createModuleHtml,
  HtmlGenerator
};

