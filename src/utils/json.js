import fs from "fs";
import { safeWriteFile } from "./file-utils.js";

/**
 * Saves data structures to JSON files
 * Maps are automatically converted to objects since they can't be directly stringified
 * 
 * @param {string} output - Output directory path
 * @param {string} title - Base filename for the JSON file
 * @param {Map|Array|Object} obj - Data to save (Map, Array, or Object)
 * @throws {Error} - If writing to file fails
 */
export function jsonOut(output, title, obj) {
  try {
    const filePath = `${title}.json`;
    
    let dataToSave = obj;
    
    // Convert Maps to Objects if necessary
    if (obj instanceof Map) {
      dataToSave = strMapToObj(obj);
    }
    
    // Write to file with pretty formatting (2 space indentation)
    safeWriteFile(output, filePath, JSON.stringify(dataToSave, null, 2), "utf8");
  } catch (error) {
    console.error(`Error writing JSON file ${title}: ${error.message}`);
    throw error;
  }
}

/**
 * Reads and parses JSON data from a file
 * Automatically converts objects back to Maps if the filename contains "map.json"
 * 
 * @param {string} file - Path to the JSON file
 * @returns {Map|Object|Array} - Parsed data, as Map if filename contains "map.json"
 * @throws {Error} - If reading or parsing fails
 */
export function jsonIn(file) {  
  try {
    const content = fs.readFileSync(file, "utf-8");
    const data = JSON.parse(content);
    
    // Convert back to Map if the filename indicates it was a Map
    const isMapFile = file.toLowerCase().includes("map.json");
    return isMapFile ? objToStrMap(data) : data;
  } catch (error) {
    console.error(`Error reading JSON file ${file}: ${error.message}`);
    throw error;
  }
}

/**
 * Converts a Map to a plain JavaScript object
 * 
 * @param {Map} strMap - Map to convert to object
 * @returns {Object} - Plain JavaScript object
 * @private
 */
function strMapToObj(strMap) {
  if (!(strMap instanceof Map)) {
    console.warn("Expected a Map instance, but received a different type");
    return strMap; // Return as-is if not a Map
  }
  
  const obj = Object.create(null);
  for (const [key, value] of strMap) {
    // Note: This doesn't escape the key '__proto__'
    // which could cause problems on older engines
    obj[key] = value;
  }
  return obj;
}

/**
 * Converts a plain JavaScript object to a Map
 * 
 * @param {Object} obj - Object to convert to Map
 * @returns {Map} - New Map instance with the object's keys and values
 * @private
 */
function objToStrMap(obj) {
  if (typeof obj !== 'object' || obj === null) {
    console.warn("Expected an object, but received a different type");
    return new Map(); // Return empty Map for non-objects
  }
  
  const strMap = new Map();
  for (const key of Object.keys(obj)) {
    strMap.set(key, obj[key]);
  }
  return strMap;
}

/**
 * Module exports
 */
export default {
  jsonOut,
  jsonIn
};
