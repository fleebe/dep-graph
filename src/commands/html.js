


export function createModuleHtml(moduleArray, dependencyList, exportList) {
  let result = "<html>\n<h1>Module List</h1>\n";

  const nodMods = nodeModuleList();
  result += "<table border=1>\n";
  result += `\t<tr><th><a href="#node_modules">Node Modules</a></th>\n`;
  result += `\t<th>Count</th><th>${nodMods.length}</th></tr>\n`;
  result += "</table><br>\n";

  result += "<table border=1>\n";
  result += "\t<tr><th>Directory</th>";
  result += "<th>File</th>";
  result += "<th>Depends On</th>";
  result += "<th>Used By</th></tr>\n";

  moduleArray.forEach(mod => {
    result += "\t<tr>";
    result += "<td>" + mod.dir + "</td>";
    result += `<td><a href="#${mod.file}">${mod.file}</a></td>`;
    result += "<td>" + mod.dependsOnCnt + "</td>";
    result += "<td>" + mod.usedByCnt + "</td>";
    result += "</tr>\n";
  });

  result += "</table>\n";

  moduleArray.forEach(mod => {
    result += `<h2 id=${mod.file}>${mod.file}</h2>\n`;

    result += "<h3>Exported</h3>\n";
    result += "<table border=1>\n";
    for (const exported of exportList
      .filter(v => { return v.name === mod.file })
      .sort((a,b) => {return a.exported.localeCompare(b.exported)})) {
      result += `\t<tr><td>${exported.exported}</td>\n`;
      result += `\t<td>${exported.type}</td></tr>\n`;
    }
    result += `</table><br>\n`;

    // depends On  
    result += "<h3>Depends On</h3>\n";
    result += "<table border=1>\n";
    for (const dep of dependencyList
      .filter(v => { return v.src === mod.file; })
      .sort((a, b) => { return a.importSrc.localeCompare(b.importSrc) })) {
      result += `\t<tr><td>${dep.importSrc}</td>\n`;
      result += `\t<td>${dep.import}</td></tr>\n`;
    }
    result += `</table><br>\n`;

    // used By
    result += "<h3>Used By</h3>\n";
    result += "<table border=1>\n";
    for (const dep of dependencyList
      .filter(v => { return v.importSrc === mod.file })
      .sort((a, b) => { return a.src.localeCompare(b.src) })) {
      result += `\t<tr><td>${dep.src}</td>\n`;
      result += `\t<td>${dep.import}</td></tr>\n`;
    }
    result += `</table><br>\n`;

  });


  result += `<h2 id="node_modules">Node Modules</h2>\n`;
  result += "<table border=1>\n";
  
  for (const dep of nodMods) {
      result += `\t<tr><td>${dep.importSrc}</td>\n`;
      result += `\t<td>${dep.import}</td></tr>\n`;
    }
  result += `</table><br>\n`;

  result += "</html>";
  return result;

  function nodeModuleList() {
    const objArray = dependencyList
      .filter(v => { return v.importSrc.startsWith(".") === false; })
      .sort((a, b) => { return a.importSrc.localeCompare(b.importSrc); });
    let uniqueObjArray = [...new Map(objArray.map((item) => [item["importSrc"], item])).values()];
    return uniqueObjArray;
  }
}
