import { readFileSync } from "fs";
import { getUsedByList } from "../utils/list-utils.js";
import { parse as tsParser } from '@typescript-eslint/parser';
import path from "path";
import { ImportProcessor } from "./ImportProcessor.js";
import { ExportProcessor } from "./ExportProcessor.js";
import { ClassProcessor } from "./ClassProcessor.js";
import { ErrorCollector } from "./ErrorCollector.js";
import { UsageProcessor } from "./UsageProcessor.js";

/**
 * @class ASTProcessor
 * @description Main orchestrator for AST processing using specialized processors
 */
class ASTProcessor {
  #importProcessor = null;
  #exportProcessor = null;
  #classProcessor = null;
  #errorCollector = null;
  #usageProcessor = null;
  #baseLoc = '';

  /**
   * Creates a new ASTProcessor instance
   * @param {string} baseLoc - The base directory or file to create dependency graphs from
   */
  constructor(baseLoc) {
    this.baseLoc = baseLoc;
    this.importProcessor = new ImportProcessor(baseLoc);
    this.exportProcessor = new ExportProcessor(baseLoc);
    this.classProcessor = new ClassProcessor(baseLoc);
    this.errorCollector = new ErrorCollector(baseLoc);
    this.usageProcessor = new UsageProcessor(baseLoc);
  }

  /**
   * Processes ASTs for all modules and creates dependency lists, export lists and import maps
   * @param {Array} moduleMap - Array of module objects with dir and file properties
   * @returns {Array} - Arrays of [dependencyList, exportList, usedList, errors, classList]
   */
  processModules(moduleMap) {
    moduleMap.forEach((mod) => {
      try {
        const fileloc = path.join(this.baseLoc, mod.dir, mod.file);
        const result = readFileSync(fileloc, 'utf-8');
        const ast = tsParser(result, {
          ecmaVersion: 'latest',
          sourceType: 'module',
          ecmaFeatures: {
            jsx: true
          },
          filePath: fileloc
        });

        // Parse exports
        const exps = this.exportProcessor.parseExports(ast, mod);
        this.exportProcessor.exportList.push(...exps);
        
        // Parse dependencies
        let deps = this.importProcessor.parseImports(ast, mod);
        
        // Parse class information
        const classes = this.classProcessor.parseClasses(ast, mod);
        if (classes.length > 0)
          this.classProcessor.classList.push(...classes);

        // Add exported source files as dependencies
        for (const ex of exps.filter(ex => ex.type.startsWith("."))) {
          deps.push({
            src: ex.name,
            importSrc: ex.type,
            relSrcName: ex.type,
            import: ex.exported
          });
        }

        // Count unique dependencies by source module
        const uniqueDepSources = new Set(deps.map(dep => dep.importSrc));
        mod.dependsOnCnt = uniqueDepSources.size;
        mod.exportCnt = exps.length;

        this.importProcessor.dependencyList.push(...deps);
      } catch (err) {
        console.error(`Error processing ${mod.dir}/${mod.file}: ${err}`);
        console.error(`${err.stack}`);
        this.errorCollector.addError(mod.file, err);
      }
    });

    // Normalize dependencies
    this.importProcessor.dependencyList = 
      this.importProcessor.normalizeDeps(this.importProcessor.dependencyList);

    // Update usage counts
    moduleMap.forEach((mod) => {
      const modUsedList = getUsedByList(this.importProcessor.dependencyList, mod);
      // Count unique dependencies by source module
      const uniqueUsedList = new Set(modUsedList.map(dep => dep.src));
      mod.usedByCnt = uniqueUsedList.size;
      this.usageProcessor.usedList.push(...modUsedList);
    });

    return [
      this.importProcessor.dependencyList,
      this.exportProcessor.exportList,
      this.usageProcessor.usedList,
      this.errorCollector.errors,
      this.classProcessor.classList
    ];
  }
}

/**
 * Processes ASTs for all modules and creates the dependency lists
 * @param {Array} moduleMap - Array of module objects
 * @param {string} baseLoc - The base directory or file
 * @returns {Array} - Arrays of [dependencyList, exportList, usedList, errors, classList]
 */
export default function processAST(moduleMap, baseLoc) {
  const processor = new ASTProcessor(baseLoc);
  return processor.processModules(moduleMap);
}


