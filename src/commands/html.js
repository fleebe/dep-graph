import { getUsedByList, getDependsOn, getNodeModuleList, getExportedList } from "../utils/list-utils.js";

/**
 *  @module commands/html
 *  @description
 * HTML Command Module
 * Provides functionality to generate HTML reports of module dependencies
 */

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
export function createModuleHtml(symbol, moduleArray, dependencyList, exportList) {
  let result = "<html><head><style>";
  result += "body { font-family: Arial, sans-serif; margin: 20px; }";
  result += ".svg-container { max-width: 100%; overflow: auto; margin: 20px 0; border: 1px solid #ddd; padding: 10px; }";
  result += "h1, h2, h3 { color: #333; }";
  result += "table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }";
  result += "th { background-color: #f2f2f2; }";
  result += "td, th { border: 1px solid #ddd; padding: 8px; }";
  result += "</style></head><body>\n";
  
  result += `<h1>${symbol}</h1>\n`;
  
  // Add the SVG visualizations at the top
  result += `<h2>Package Dependency Graph</h2>\n`;
  result += `<div class="svg-container">\n`;
  result += `<object data="Package.svg" type="image/svg+xml" width="100%" height="600px">`;
  result += `Your browser does not support SVG - <a href="Package.svg">View Package Graph</a>`;
  result += `</object>\n`;
  result += `</div>\n`;
  
  result += `<h2>Module Relations Graph</h2>\n`;
  result += `<div class="svg-container">\n`;
  result += `<object data="Relations.svg" type="image/svg+xml" width="100%" height="600px">`;
  result += `Your browser does not support SVG - <a href="Relations.svg">View Relations Graph</a>`;
  result += `</object>\n`;
  result += `</div>\n`;

  result += `<h2>Graph</h2>\n`;
  result += `<div class="svg-container">\n`;
  result += `<object data="Graph.svg" type="image/svg+xml" width="100%" height="600px">`;
  result += `Your browser does not support SVG - <a href="Graph.svg">View Relations Graph</a>`;
  result += `</object>\n`;
  result += `</div>\n`;


  
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
function generateModuleDetails(moduleArray, dependencyList, exportList) {
  let result = "";
  try {
  moduleArray.forEach(mod => {
    result += `<h2 id=${mod.file}>${mod.file}</h2> <a href="#mod_list">(top)</a>\n`;

    const usedList = getUsedByList(dependencyList, mod);
    
    // Generate three sections for each module
    result += generateExportsTable(exportList, usedList, mod.file);
    result += generateDependsOnTable(dependencyList, mod.file);
    result += generateUsedByTable(usedList, mod.file);
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
function generateExportsTable(exportList, usedList, fileName) {
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
 * @param {Array} depsList - Array of dependencies for this module
 * @returns {string} - HTML table of dependencies
 */
function generateDependsOnTable(dependencyList, fileName) {
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
 * @returns {string} - HTML table of module usage
 */
function generateUsedByTable(usedList, fileName) {
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

