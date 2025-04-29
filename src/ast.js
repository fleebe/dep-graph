import { readFileSync } from "fs";
import { removeExtension, moduleName } from "./utils/file-utils.js";
import { getUsedByList } from "./utils/list-utils.js";
import { parse as tsParser } from '@typescript-eslint/parser';
import estraverse from 'estraverse';
import path from "path";

/**
 * @class ASTProcessor
 * @description Processes Abstract Syntax Trees for JavaScript/TypeScript files to analyze dependencies and exports
 */
class ASTProcessor {
  /**
   * Creates a new ASTProcessor instance
   * @param {string} baseLoc - The base directory or file to create dependency graphs from
   */
  constructor(baseLoc) {
    this.baseLoc = baseLoc;
    this.dependencyList = [];
    this.exportList = [];
    this.errors = [];
    this.usedList = [];
  }

  /**
   * Processes ASTs for all modules and creates dependency lists, export lists and import maps
   * @param {Array} moduleMap - Array of module objects with dir and file properties
   * @returns {Array} - Arrays of [dependencyList, exportList, usedList, errors]
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

        const exps = this.parseExports(ast, mod);
        let deps = this.parseImports(ast, mod);

        // Add exported source files as a dependency
        // Know exported source as type starts with ./directory
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

        this.exportList.push(...exps);
        this.dependencyList.push(...deps);
      } catch (err) {
        this.errors.push({
          "file": mod.file,
          "err": err,
          "msg": err.message
        });
        console.error(`Error parsing file ${mod.file} :\n${err.message}`);
      }
    });

    // Normalize dependencies by removing duplicate extensions
    this.dependencyList = this.normalizeDeps(this.dependencyList);

    // Update usage counts
    moduleMap.forEach((mod) => {
      const modUsedList = getUsedByList(this.dependencyList, mod);
      // Count unique dependencies by source module
      const uniqueUsedList = new Set(modUsedList.map(dep => dep.src));
      mod.usedByCnt = uniqueUsedList.size;
      this.usedList.push(...modUsedList);
    });

    return [this.dependencyList, this.exportList, this.usedList, this.errors];
  }

  /**
   * Analyzes an AST to extract import statements and build a dependency list
   * 
   * @param {Object} ast - The Abstract Syntax Tree of the JavaScript/TypeScript file
   * @param {Object} mod - The module object containing dir and file properties
   * @returns {Array<Object>} - Array of dependency objects
   */
  parseImports(ast, mod) {
    const dependencies = [];
    const srcFile =moduleName(mod);

    estraverse.traverse(ast, {
      enter: (node) => {
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
          // Skip handling for other import types like namespace imports
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

  countSubstrings(str, subStr) {
    let count = 0;
    let i = 0;

    while ((i = str.indexOf(subStr, i)) !== -1) {
      count++;
      i += subStr.length;
    }

    return count;
  }

  replaceWithReversedArray(str, subStr, arr, cnt) {
    const reversedArr = [...arr].reverse();
    let index = cnt;
    while (str.includes(subStr) && index < reversedArr.length) {
      str = str.replace(subStr, reversedArr[index] + '/');
      index++;
    }

    return str;
  }

  calRelSrcFile(src, relSrcPath) {
    const cnt = this.countSubstrings(relSrcPath, '../')
    if (cnt > 0) {
        const srcDirs = path.dirname(src).split('/');
        if (cnt >= srcDirs.length) {
          return relSrcPath.replaceAll("../", ""); 
        }
        const ret = this.replaceWithReversedArray(relSrcPath, "../", srcDirs, cnt);
        return ret;
   
    } else if (relSrcPath.startsWith('./')) {
      return relSrcPath.replace("./", "");
    } else {
      // If it's not a relative path, return it as is
      return relSrcPath;
    }

  }
  /**
   * Gets the absolute path for a relative import
   * 
   * @param {string} currentFilePath - Absolute path of the current file
   * @param {string} relativePath - Relative import path
   * @returns {string} Absolute path of the import
   */
  getAbsolutePath(currentFilePath, relativePath) {
    // Get the directory of the current file
    const currentDir = path.dirname(currentFilePath);

    // Resolve the relative path against the current directory
    return path.resolve(currentDir, relativePath).replaceAll("\\", "/");
  }

  /**
   * Traverses the AST to find exported declarations and creates an exportList
   * 
   * @param {Object} ast - The Abstract Syntax Tree of the JavaScript/TypeScript file 
   * @param {Object} mod - The module object containing dir and file properties
   * @returns {Array} - Array of export objects
   */
  parseExports(ast, mod) {
    const exportList = [];
    const srcFile = moduleName(mod);

    estraverse.traverse(ast, {
      enter: (node) => {
        if (node.type === 'ExportNamedDeclaration' || node.type === 'ExportDefaultDeclaration') {
          this.processExportDeclaration(node, srcFile, exportList, mod);
        }
      }
    });

    return exportList;
  }

  /**
   * Process an export declaration node to extract exports
   * 
   * @param {Object} node - The ExportDeclaration AST node
   * @param {string} srcFile - The source file path
   * @param {Array} exportList - The array to add exports to
   * @param {Object} mod - The module object
   */
  processExportDeclaration(node, srcFile, exportList, mod) {
    const addVal = (exp, params) => {
      exportList.push({
        name: srcFile,
        exported: exp,
        type: node.declaration?.type || 'Unknown',
        params: params
      });
    };

    if (node.source) {
      node.specifiers.forEach(e => {
        exportList.push({
          name: srcFile,
          exported: e.exported.name,
          type: this.getAbsolutePath(mod.file, node.source.value)
        });
      });
    } else if (node.declaration) {
      const declarationList = node.declaration?.declarations;
      if (declarationList) {
        declarationList.forEach(e => {
          addVal(e.id.name);
        });
      } else if (node.declaration) {
        this.processDeclarationNode(node.declaration, addVal);
      }
    } else if (node.specifiers) {
      for (const sp of node.specifiers) {
        exportList.push({
          name: srcFile,
          exported: sp.exported.name,
          type: sp.type
        });
      }
    }
  }

  /**
   * Processes a declaration node to extract exported items
   * 
   * @param {Object} decl - The declaration AST node
   * @param {Function} addVal - Function to add values to the export list
   */
  processDeclarationNode(decl, addVal) {
    switch (decl.type) {
      case "ClassDeclaration": {
        addVal(decl.id.name);
        break;
      }
      case "CallExpression": {
        if (decl.callee.name)
          addVal(decl.callee.name);
        else
          addVal(decl.callee.callee.name);
        break;
      }
      case "FunctionDeclaration": {
        if (decl.params) {
          let params = this.formatFunctionParams(decl.params);
          addVal(decl.id.name, params);
        } else {
          addVal(decl.id.name);
        }
        break;
      }
      case "VariableDeclaration": {
        addVal(decl.id.name);
        break;
      }
      case "Identifier": {
        addVal(decl.name);
        break;
      }
      case "ObjectExpression": {
        decl.properties.forEach(e => {
          addVal(e.key.name);
        });
        break;
      }
      case 'ArrowFunctionExpression': {
        if (decl.params) {
          let res = [];
          decl.params.forEach(e => {
            res.push(e.name);
          });
          addVal("(" + res.join(", ") + ")");
        } else {
          addVal("???");
        }
        break;
      }
      case 'ConditionalExpression': {
        addVal(decl.test.name);
        break;
      }
      case 'TSTypeAliasDeclaration': {
        addVal(decl.id.name);
        break;
      }
      case 'TSInterfaceDeclaration': {
        addVal(decl.id.name);
        break;
      }
      case 'TSEnumDeclaration': {
        addVal(decl.id.name);
        break;
      }
      default: {
        console.warn(`Export parse encounter unknown type: ${decl.type}`);
        addVal(`Unknown-${decl.type}`);
      }
    }
  }

  /**
   * Formats function parameters for display
   * 
   * @param {Array} params - Array of parameter AST nodes
   * @returns {string} - Formatted parameter string
   */
  formatFunctionParams(params) {
    let formattedParams = [];

    for (const param of params) {
      switch (param.type) {
        case "Identifier": {
          formattedParams.push(param.name);
          break;
        }
        case "AssignmentPattern": {
          (param.left.type === "Identifier") ?
            formattedParams.push(param.left.name) :
            formattedParams.push(" : " + param.type);
          break;
        }
        case "ObjectPattern": {
          let props = [];
          for (const prop of param.properties) {
            props.push(prop.key.name);
          }
          formattedParams.push("{" + props.join(", ") + "}");
          break;
        }
        default:
          formattedParams.push(" : " + param.type);
      }
    }

    return "(" + formattedParams.join(", ") + ")";
  }

  /**
   * Normalizes dependencies by standardizing import paths with or without extensions
   * 
   * @param {Array<Object>} deps - Array of dependency objects
   * @returns {Array<Object>} - Normalized dependency array
   */
  normalizeDeps(deps) {
    // Track non-js import paths we've already found
    const nonJsImportPaths = new Set();

    // First pass: collect all non-js import paths
    deps.forEach(dep => {
      if (!dep.importSrc.endsWith('.js') && !dep.importSrc.endsWith('.jsx') &&
        !dep.importSrc.endsWith('.ts') && !dep.importSrc.endsWith('.tsx')) {
        nonJsImportPaths.add(dep.importSrc);
      }
    });

    // Second pass: normalize js/ts imports to match non-js/ts imports when available
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

/**
 * Processes ASTs for all modules and creates the dependency lists
 * @param {Array} moduleMap - Array of module objects
 * @param {string} baseLoc - The base directory or file
 * @returns {Array} - Arrays of [dependencyList, exportList, usedList, errors]
 */
export default function processAST(moduleMap, baseLoc) {
  const processor = new ASTProcessor(baseLoc);
  return processor.processModules(moduleMap);
}


