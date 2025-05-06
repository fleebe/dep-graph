import path from 'path';

/**
 * Adds a value to an array stored in a Map, ensuring uniqueness
 * 
 * If the key doesn't exist in the map, creates a new array with the value.
 * If the key exists, adds the value to the existing array while maintaining uniqueness.
 * 
 * @param {Map<any, Array<any>>} map - The map to modify
 * @param {any} key - The key under which to store the array
 * @param {any|Array<any>} arrVal - A value or array of values to add
 * @returns {Map<any, Array<any>>} The updated map
 */
export function addToMapArray(map, key, arrVal) {
  if (!map.has(key)) {
    return map.set(key, [arrVal]);
  } else {
    const uniqueValues = new Set(map.get(key));

    if (Array.isArray(arrVal)) {
      // Add each item individually to avoid spread operator limitations
      if (arrVal.length > 0) {
        arrVal.forEach(item => uniqueValues.add(item));
      }
    } else {
      uniqueValues.add(arrVal);
    }

    return map.set(key, Array.from(uniqueValues));
  }
}

/**
 * Gets a list of files that use the specified file
 * 
 * Finds dependencies where the specified file is being imported/used by other files.
 * 
 * @param {Array<Object>} dependencyList - List of dependency objects
 * @param {string} file - The file path to check for usage
 * @returns {Array<Object>} List of dependencies where the specified file is being used
 */
export function getUsedByList(dependencyList, mod) {
  try {
  const file = path.join(mod.dir, mod.file).replaceAll("\\", "/");
    return dependencyList
      .filter(v => v.relSrcName === file)
      .sort((a, b) => a.src.localeCompare(b.src));
  } catch (error) {
    console.error(`Error in getUsedByList: ${mod} : ${error.message}`); // Log the error message
    return []; // Return an empty array in case of error
  } 
  
}

/**
 * Gets a list of files that the specified file depends on
 * 
 * Finds dependencies where the specified file is importing/using other files.
 * 
 * @param {Array<Object>} dependencyList - List of dependency objects
 * @param {string} file - The file path to check
 * @returns {Array<Object>} List of dependencies where the specified file is importing others
 */
export function getDependsOn(dependencyList, file) {
  return dependencyList
    .filter(v => v.src === file)
    .sort((a, b) => a.importSrc.localeCompare(b.importSrc));
}

/**
 * Gets a list of items exported by the specified file
 * 
 * @param {Array<Object>} exportList - List of export objects
 * @param {string} file - The file path to check for exports
 * @returns {Array<Object>} List of exports from the specified file
 */
export function getExportedList(exportList, file) {
  return exportList
    .filter(v => v.name === file)
    .sort((a, b) => {
      if (a && b && a.exported && b.exported) {
        return a.exported.localeCompare(b.exported);
      } else {
        //console.error(`Invalid export object: ${file} : ${JSON.stringify(a || b)}`);
        return 0 // equal
      }
     });
}

/**
 * Gets a list of external (node_modules) dependencies
 * 
 * Finds dependencies that are not relative imports (not starting with '.').
 * These are typically npm packages or node built-in modules.
 * 
 * @param {Array<Object>} dependencyList - List of dependency objects
 * @returns {Array<Object>} List of external dependencies
 */
export function getNodeModuleList(dependencyList) {
  return dependencyList
    .filter(v => !v.importSrc.startsWith("."))
    .sort((a, b) => a.importSrc.localeCompare(b.importSrc));
}

/**
 * Gets a list of unique node modules from the dependency list
 * 
 * @param {Array} dependencyList - Array of dependencies
 * @returns {Array} - Array of unique node modules
 */
export function getUniqueNodeModules(dependencyList) {
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
  addToMapArray,
  getUsedByList,
  getDependsOn,
  getExportedList,
  getUniqueNodeModules,
  getNodeModuleList
};

