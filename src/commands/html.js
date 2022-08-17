import { getUsedByList, cleanPath, getDependsOn, getNodeModuleList, getExportedList } from "../utils.js";


export function createModuleHtml(moduleArray, dependencyList, exportList) {
  let result = "<html><body>\n";
  result += `<h1 id="mod_list">Module List</h1>\n`;

  const nodMods = nodeModuleList();
  result += "<table border=1>\n";
  result += `\t<tr><th>Type</th>`;
  result += `<th>Count</td></th></tr>\n`;
  result += `\t<tr><td><a href="#node_modules">Node Modules</a></td>`;
  result += `\t<td>${nodMods.length}</td></tr>\n`;
  result += `\t<tr><td>Application Modules</td>`;
  result += `\t<td>${moduleArray.length}</td></tr>\n`;
  result += `\t<tr><td><a href="#unused">Unused Application Modules</a></td>`;
  result += `\t<td>${moduleArray.filter(m => m.usedByCnt === 0).length}</td></tr>\n`;
  result += "</table><br>\n";

  // summary
  result += "<table border=1>\n";
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

// unused
  result += `<h2 id="unused">Unused Application Modules</h2><a href="#mod_list">(top)</a>\n`;
  result += "<table border=1>\n";
  result += "\t<tr><th>Directory</th>";
  result += "<th>File</th>";
  result += "<th>Depends On</th>";
  result += "<th>Used By</th>";
  result += "<th>Exported</th></tr>\n";
  moduleArray.filter(m => m.usedByCnt === 0).forEach(mod => {
    result += "\t<tr>";
    result += "<td>" + mod.dir + "</td>";
    result += `<td><a href="#${mod.file}">${cleanPath(mod.file.replace(mod.dir, "."))}</a></td>`;
    result += "<td>" + mod.dependsOnCnt + "</td>";
    result += "<td>" + mod.usedByCnt + "</td>";
    result += "<td>" + mod.exportCnt + "</td>";
    result += "</tr>\n";
  });
  result += "</table>\n";




  moduleArray.forEach(mod => {
    result += `<h2 id=${mod.file}>${mod.file}</h2> <a href="#mod_list">(top)</a>\n`;

    // Exported
    result += "<h3>Exported</h3>\n";
    result += "<table border=1>\n";
    const exports = getExportedList(exportList, mod.file);
    const usedList = getUsedByList(dependencyList, mod.file);
    for (const exported of exports) {
      result += `\t<tr><td>${exported.exported}</td>\n`;
      result += `\t<td>${exported.type}</td>\n`;
      const usedExp = usedList.filter(u => { return (u.import === exported.exported) });
      const listLen = usedExp.length
      result +=`\t<td>${listLen}</td></tr>\n`;
    }
    result += `</table><br>\n`;

    // depends On  
    result += "<h3>Depends On</h3>\n";
    result += "<table border=1>\n";
    const depsList = getDependsOn(dependencyList, mod.file);
    for (const dep of depsList) {
      if (dep.relSrcPath.startsWith(".")) { 
      result += `\t<tr><td><a href="#${dep.relSrcPath}">${dep.relSrcPath}</a></td>\n`;
      } else { // node module
        result += `\t<tr><td>${dep.relSrcPath}</td>\n`;
      }
      result += `\t<td>${dep.import}</td></tr>\n`;
    }
    result += `</table><br>\n`;

    //used by
    result += "<h3>Used By</h3>\n";
    result += "<table border=1>\n";
    for (const dep of usedList) {
      result += `\t<tr><td><a href="#${dep.src}">${dep.src}</a></td>\n`;
      result += `\t<td>${dep.import}</td></tr>\n`;
    }
    result += `</table><br>\n`;

  });

  // node modules
  result += `<h2 id="node_modules">Node Modules</h2>  <a href="#mod_list">(top)</a>\n`;
  result += "<table border=1>\n";
  for (const dep of nodMods) {
    result += `\t<tr><td>${dep.importSrc}</td>\n`;
    result += `\t<td>${dep.import}</td></tr>\n`;
  }
  result += `</table><br>\n`;

  result += "</body></html>";
  return result;

  function nodeModuleList() {
    const objArray = getNodeModuleList(dependencyList);
    let uniqueObjArray = [...new Map(
      objArray.map((item) => 
        [item["importSrc"], item]
      )
    ).values()];
    return uniqueObjArray;
  }
}

