
import { removeExtension, moduleName } from "../utils/file-utils.js";
import estraverse from 'estraverse';
import { BaseProcessor } from "./BaseProcessor.js";

/**
 * @class ImportProcessor
 * @description Processes ASTs to extract import dependencies
 */
export class ImportProcessor extends BaseProcessor {
  /**
   * Creates a new ImportProcessor
   * @param {string} baseLoc - Base location
   */
  constructor(baseLoc) {
    super(baseLoc);
    this.dependencyList = [];
  }

  /**
   * Analyzes an AST to extract import statements and build a dependency list
   * 
   * @param {Object} ast - The Abstract Syntax Tree of the file
   * @param {Object} mod - The module object
   * @returns {Array<Object>} - Array of dependency objects
   */
  parseImports(ast, mod) {
    const dependencies = [];
    const srcFile = moduleName(mod);

    estraverse.traverse(ast, {
      enter: (node) => {
        // Use the base class helper to skip nodes estraverse doesn't know
        const skip = this.skipNode(node.type);
        if (skip) return skip;

        if (node.type === 'ImportDeclaration') {
          this.processImportDeclaration(node, srcFile, dependencies);
        }
      }
    });

    return dependencies;
  }

  /**
   * Process an import declaration node to extract dependencies
   * 
   * @param {Object} node - The ImportDeclaration AST node
   * @param {string} srcFile - The source file path
   * @param {Array} dependencies - The array to add dependencies to
   */
  processImportDeclaration(node, srcFile, dependencies) {
    for (const sp of node.specifiers) {
      let fnName;
      switch (sp.type) {
        case "ImportSpecifier": {
          fnName = sp.imported.name;
          break;
        }
        case "ImportDefaultSpecifier": {
          fnName = sp.local.name;
          break;
        }
        default:
          continue;
      }

      dependencies.push({
        src: srcFile,
        importSrc: node.source.value,
        relSrcName: this.calRelSrcFile(srcFile, node.source.value),
        import: fnName
      });
    }
  }

  /**
   * Normalizes dependencies by standardizing import paths
   * 
   * @param {Array<Object>} deps - Array of dependency objects
   * @returns {Array<Object>} - Normalized dependency array
   */
  normalizeDeps(deps) {
    const nonJsImportPaths = new Set();

    deps.forEach(dep => {
      if (!dep.importSrc.endsWith('.js') && !dep.importSrc.endsWith('.jsx') &&
        !dep.importSrc.endsWith('.ts') && !dep.importSrc.endsWith('.tsx')) {
        nonJsImportPaths.add(dep.importSrc);
      }
    });

    deps.forEach(dep => {
      if (dep.importSrc.endsWith('.js') || dep.importSrc.endsWith('.jsx') ||
        dep.importSrc.endsWith('.ts') || dep.importSrc.endsWith('.tsx')) {
        const nonJsPath = removeExtension(dep.importSrc);
        if (nonJsImportPaths.has(nonJsPath)) {
          dep.importSrc = nonJsPath;
        }
      }
    });

    return deps;
  }
}
