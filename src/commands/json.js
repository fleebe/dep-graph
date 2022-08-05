import fs from "fs";
import path from "path";

/**
 * save data structures to json files. Cannot stringify a Map so need to convert it to an object.
 * @param {*} output 
 * @param {*} moduleList 
 * @param {*} exportList 
 * @param {*} dependencyList 
 * @param {*} importMap 
 */
export function jsonOut(output, moduleMap, exportList, dependencyList, importMap, lastDir) {
  let obj = strMapToObj(moduleMap); 
  fs.writeFileSync(path.join(output, lastDir + "ModuleMap.json"), JSON.stringify(obj, null, 2), "utf8");
  fs.writeFileSync(path.join(output, lastDir + "ExportList.json"), JSON.stringify(exportList, null, 2), "utf8");
  fs.writeFileSync(path.join(output, lastDir + "DependencyList.json"), JSON.stringify(dependencyList, null, 2), "utf8");
  obj = strMapToObj(importMap);
  fs.writeFileSync(path.join(output, lastDir + "ImportMap.json"), JSON.stringify(obj, null, 2), "utf8");
}

export function jsonIn(file) {  
  const obj = JSON.parse(fs.readFileSync(file, "utf-8"));
  const exp = /map\.json/i;
  if (file.toLowerCase().search(exp) !== -1) {
    return objToStrMap(obj);
  }
  return obj;
}

// https://2ality.com/2015/08/es6-map-json.html
function strMapToObj(strMap) {
  let obj = Object.create(null);
  for (let [k, v] of strMap) {
    // We don’t escape the key '__proto__'
    // which can cause problems on older engines
    obj[k] = v;
  }
  return obj;
}

// https://2ality.com/2015/08/es6-map-json.html
function objToStrMap(obj) {
  let strMap = new Map();
  for (let k of Object.keys(obj)) {
    strMap.set(k, obj[k]);
  }
  return strMap;
}
