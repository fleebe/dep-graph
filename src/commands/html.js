import { cleanPath } from "../utils/file-utils.js";
import { getUsedByList, getDependsOn, getNodeModuleList, getExportedList } from "../utils/list-utils.js";

/**
 * HTML Command Module
 * Provides functionality to generate HTML reports of module dependencies
 */

/**
 * Creates an HTML report of module dependencies and relationships
 * 
 * @param {Array} moduleArray - Array of module objects with metadata
 *   Each object contains: {dir, file, dependsOnCnt, usedByCnt, exportCnt}
 * @param {Array} dependencyList - Array of dependencies
 *   Each object contains: {src, importSrc, import, relSrcPath}
 * @param {Array} exportList - Array of exported functions/objects
 *   Each object contains: {name, exported, type, params}
 * @returns {string} - HTML document as a string
 */
export function createModuleHtml(moduleArray, dependencyList, exportList) {
  let result = "<html><body>\n";
  
  // Generate summary section
  result += generateSummarySection(moduleArray, dependencyList);
  
  // Generate details for each module
  result += generateModuleDetails(moduleArray, dependencyList, exportList);
  
  // Generate node modules section
  result += generateNodeModulesSection(dependencyList);
  
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
function generateSummarySection(moduleArray, dependencyList) {
  let result = "";
  const tblStyle = "<table border=1 cellpadding=5>\n";
  result += `<h1 id="mod_list">Module List</h1>\n`;

  // Get unique node modules
  const nodMods = getUniqueNodeModules(dependencyList);
  
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
  result += generateModuleSummaryTable(moduleArray);
  
  // Generate unused modules table
  result += generateUnusedModulesTable(unusedModules);
  
  return result;
}

/**
 * Generates a summary table of all modules
 * 
 * @param {Array} moduleArray - Array of module objects
 * @returns {string} - HTML table of modules
 */
function generateModuleSummaryTable(moduleArray) {
  let result = "<table border=1 cellpadding=5>\n";
  result += "\t<tr><th>Directory</th>";
  result += "<th>File</th>";
  result += "<th>Depends On</th>";
  result += "<th>Used By</th>";
  result += "<th>Exported</th></tr>\n";
  
  moduleArray.forEach(mod => {
    result += "\t<tr>";
    result += "<td>" + mod.dir + "</td>";
    result += `<td><a href="#${mod.file}">${cleanPath(mod.file.replace(mod.dir, "."))}</a></td>`;
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
function generateUnusedModulesTable(unusedModules) {
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
    result += `<td><a href="#${mod.file}">${cleanPath(mod.file.replace(mod.dir, "."))}</a></td>`;
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
function generateModuleDetails(moduleArray, dependencyList, exportList) {
  let result = "";
  try {
  moduleArray.forEach(mod => {
    result += `<h2 id=${mod.file}>${mod.file}</h2> <a href="#mod_list">(top)</a>\n`;

    // Get data for this module
    const exports = getExportedList(exportList, mod.file);
    const usedList = getUsedByList(dependencyList, mod.file);
    const depsList = getDependsOn(dependencyList, mod.file);
    
    // Generate three sections for each module
    result += generateExportsTable(exports, usedList);
    result += generateDependsOnTable(depsList);
    result += generateUsedByTable(usedList);
  });
} catch (error) {
    console.error(`Error generating module details: ${error}`);
  }
  // Add a link to the node modules section
  
  return result;
}

/**
 * Generates a table of exported functions/objects for a module
 * 
 * @param {Array} exports - Array of exports for this module
 * @param {Array} usedList - Array of usage information
 * @returns {string} - HTML table of exports
 */
function generateExportsTable(exports, usedList) {
  let result = "<h3>Exported</h3>\n";
  result += "<table border=1 cellpadding=5>\n";
  result += "\t<tr><th>Exported</th>";
  result += "<th>Export Declaration</th>";
  result += "<th>Parameters</th>";
  result += "<th>Used Count</th></tr>\n";
  
  for (const exported of exports) {
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
 * @param {Array} depsList - Array of dependencies for this module
 * @returns {string} - HTML table of dependencies
 */
function generateDependsOnTable(depsList) {
  let result = "<h3>Depends On</h3>\n";
  result += "<table border=1 cellpadding=5>\n";
  result += "\t<tr><th>File or <br>Node Module</th>";
  result += "<th>Import</th></tr>\n";
  
  for (const dep of depsList) {
    if (dep.relSrcPath.startsWith(".")) { 
      // Local module with link
      result += `\t<tr><td><a href="#${dep.relSrcPath}">${dep.relSrcPath}</a></td>\n`;
    } else { 
      // Node module without link
      result += `\t<tr><td>${dep.relSrcPath}</td>\n`;
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
 * @returns {string} - HTML table of module usage
 */
function generateUsedByTable(usedList) {
  let result = "<h3>Used By</h3>\n";
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
function generateNodeModulesSection(dependencyList) {
  let result = `<h2 id="node_modules">Node Modules</h2>  <a href="#mod_list">(top)</a>\n`;
  result += "<table border=1 cellpadding=5>\n";
  result += "\t<tr><th>File</th>";
  result += "<th>Node Module</th></tr>\n";
  
  const nodMods = getUniqueNodeModules(dependencyList);
  
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
function getUniqueNodeModules(dependencyList) {
  const objArray = getNodeModuleList(dependencyList);
  let uniqueObjArray = [...new Map(
    objArray.map((item) => [item.importSrc, item])
  ).values()];
  return uniqueObjArray;
}

/**
 * Module exports
 */
export default {
  createModuleHtml
};

