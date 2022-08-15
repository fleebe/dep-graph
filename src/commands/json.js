import fs from "fs";

/**
 * save data structures to json files. Cannot stringify a Map so need to convert it to an object.
 * @param {*} output path and unique identifier
 * @param {*} title file name
 * @param {*} obj Map | Array to save to file
 */
export function jsonOut(output, title, obj) {
  switch (title) {
    case "ModuleMap": case "ImportMap": {
      const map = strMapToObj(obj);
      fs.writeFileSync(output + title + ".json", JSON.stringify(map, null, 2), "utf8");
      break;
    }
    case "ExportList": case "DependencyList": case "Errors": case "ModuleArray": {
      fs.writeFileSync(output + title + ".json", JSON.stringify(obj, null, 2), "utf8");
      break;
    }
    default:
      break
  }
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
