

/**
 * oupt to the console the json object.
 * @param {*} moduleList 
 * @param {*} exportList 
 * @param {*} dependencyList 
 * @param {*} importMap 
 */

export default function debug(moduleList, exportList, dependencyList, importMap) {
  console.log("-----------------------------modules-----------------------------");
  console.log(moduleList);
  console.log("-----------------------------exports-----------------------------");
  console.log(exportList);
  console.log("-----------------------------dependencies------------------------");
  console.log(dependencyList);
  console.log("-----------------------------imports-----------------------------");
  console.log(importMap);
}
