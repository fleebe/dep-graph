import { BaseProcessor } from "./BaseProcessor.js";

/**
 * @class ErrorCollector
 * @description Collects processing errors
 */
export class ErrorCollector extends BaseProcessor {
  /**
   * Creates a new ErrorCollector
   * @param {string} baseLoc - Base location
   */
  constructor(baseLoc) {
    super(baseLoc);
    this.errors = [];
  }

  /**
   * Adds an error to the collection
   * 
   * @param {string} file - File where error occurred
   * @param {Error} err - The error object
   */
  addError(file, err) {
    this.errors.push({
      "file": file,
      "err": err,
      "msg": err.message
    });
    console.error(`Error parsing file ${file} :\n${err.message}`);
  }
}