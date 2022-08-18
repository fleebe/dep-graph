/**
 * checks if the given val is a key in the map
 * @param {*} map 
 * @param {*} val 
 * @returns boolean
 */
const findInMap = (map, val) => {
  for (let [key] of map) {
    if (key === val) {
      return true;
    }
  }
  return false;
}

/**
 * Adds the arrVal to the map with the passed key 
 * if the key exists then adds the arrVal to the array if it does not exist in it already.
 * @param {*} map 
 * @param {*} key 
 * @param {*} arrVal primitive | array
 * * @returns map with arrVal added to the array specified by the key
 */
export function addToMapArray(map, key, arrVal) {
  if (!findInMap(map, key)) {
    return map.set(key, [arrVal]);
  } else {
    let uniq = new Set(map.get(key));
    if (arrVal instanceof Array) {
      if (arrVal.length > 0) {
        uniq.add(...arrVal);
      }
    } else {
      uniq.add(arrVal);
    }
    return map.set(key, Array.from(uniq));
  }
}

/**
 * file may have an extension but the importSrc does not
    the importSrc is still used by the file
 * @param {*} file the file
 * @param {*} dependencyList 
 * @returns a list of files that are used by the mod
 */

export function getUsedByList(dependencyList, file) {
  //  const imp = removeExtension(file);
  // used By
  const usedList = dependencyList
    .filter(v => { return (v.relSrcPath === file || v.importSrc === file) })
    //|| v.importSrc === imp); })
    .sort((a, b) => { return a.src.localeCompare(b.src); });
  return usedList;
}



export function getDependsOn(dependencyList, file) {
  return dependencyList
    .filter(v => { return v.src === file; })
    .sort((a, b) => { return a.importSrc.localeCompare(b.importSrc); });
}

export function getExportedList(exportList, file) {
  return exportList
    .filter(v => { return v.name === file })
    .sort((a, b) => { return a.exported.localeCompare(b.exported) });
}



export function getNodeModuleList(dependencyList) {
  return dependencyList
    .filter(v => { return v.importSrc.startsWith(".") === false; })
    .sort((a, b) => { return a.importSrc.localeCompare(b.importSrc) });

}

