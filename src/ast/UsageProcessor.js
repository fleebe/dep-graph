import { BaseProcessor } from "./BaseProcessor.js";

/**
 * @class UsageProcessor
 * @description Processes ASTs to collect usage information
 */
export class UsageProcessor extends BaseProcessor {
  /**
   * Creates a new UsageProcessor
   * @param {string} baseLoc - Base location
   */
  constructor(baseLoc) {
    super(baseLoc);
    this.usedList = [];
  }
}