import { readFileSync } from "fs";
// Remove Babel parser import
// import { parse as babelParse } from "@babel/parser";
import {
  removeExtension } from "./utils/file-utils.js";
import { getUsedByList } from "./utils/list-utils.js";
// Replace babel-walk with estraverse
// import * as walk from 'babel-walk';
import { parse as tsParser } from '@typescript-eslint/parser';
import estraverse from 'estraverse';
import path from "path";

/**
 * processes gets the ast for all the modules and creates the dependeciesList, exportList and importMap
 * @param {*} moduleMap Map of packages with modules key=directory, values=array[filename]
 */
export function processAST(moduleMap) {
  // list of dependencies between modules including the functions
  let dependencyList = [];
  // list of functions exported from modules/files
  let exportList = [];
  let errors = [];
  let usedList = [];

  moduleMap.forEach((mod) => {
    try {
      const result = readFileSync(mod.file, 'utf-8');
      // parse file using TypeScript parser instead of Babel
      const ast = tsParser(result, {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true
        },
        filePath: mod.file
      });
      
      const exps = parseExports(ast, mod.file);
      let deps = parseImports(ast, mod.file);

      // add exported source files as a dependency
      // know exported source as type starts with ./directory
      for (const ex of exps.filter(ex => ex.type.startsWith("."))) {
        deps.push({
          src: ex.name, 
          importSrc: ex.type, 
          relSrcPath: ex.type, 
          import: ex.exported
        });
      }

      mod.dependsOnCnt = deps.length;
      mod.exportCnt = exps.length;
      
      exportList.push(...exps);
      dependencyList.push(...deps);
    } catch (err) {
      errors.push({ 
        "file": mod.file, 
        "err": err, 
        "msg": err.message
      });
      console.error(`Error parsing file ${mod.file} :\n${err.message}`);
    }
  });

  // normalize dependencies by removing duplicate extensions
  dependencyList = normaliseDeps(dependencyList);

  // Update usage counts
  moduleMap.forEach((mod) => {
    usedList = getUsedByList(dependencyList, mod.file);
    mod.usedByCnt = usedList.length;
  });

  return [dependencyList, exportList, usedList, errors];
}

/**
 * Analyzes an AST to extract import statements and build a dependency list
 * 
 * This function traverses the AST and identifies ImportDeclaration nodes,
 * extracting information about what modules are being imported and how they're referenced.
 * 
 * @param {Object} ast - The Abstract Syntax Tree of the JavaScript/TypeScript file
 * @param {string} srcFile - The source file path being analyzed
 * @returns {Array<Object>} - Array of dependency objects with the following properties:
 *   - src: The source file that contains the import
 *   - importSrc: The raw import path as written in the code
 *   - relSrcPath: The normalized path relative to the project root
 *   - import: The name of the imported function/variable
 */
function parseImports(ast, srcFile) {
  let dependencies = [];

  estraverse.traverse(ast, {
    enter: function(node) {
      if (node.type === 'ImportDeclaration') {
        moduleDeclaration(node, srcFile);
      }
    }
  });
  
  function moduleDeclaration(node, srcFile) {
    for (const sp of node.specifiers) {
      let fnName;
      switch (sp.type) {
        case "ImportSpecifier": {
          fnName = sp.imported.name;
          break;
        }
        case "ImportDefaultSpecifier": {
          fnName = sp.local.name
          break;
        }
        default:
          // Skip handling for other import types like namespace imports
          continue;
      }
     dependencies.push({
        src: srcFile,
        importSrc: node.source.value,
        relSrcPath: getAbsolutePath(srcFile, node.source.value),
        import: fnName
      });
    }
  }

  return dependencies;
}

/**
 * Gets the absolute path for a relative import
 * 
 * @param {string} currentFilePath - Absolute path of the current file
 * @param {string} relativePath - Relative import path
 * @returns {string} Absolute path of the import
 */
function getAbsolutePath(currentFilePath, relativePath) {
  // Get the directory of the current file
  const currentDir = path.dirname(currentFilePath);

  // Resolve the relative path against the current directory
  const absolutePath = path.resolve(currentDir, relativePath).replaceAll("\\", "/");

  //console.log('Current file:', currentFilePath);
  //console.log('Relative import:', relativePath);
  //console.log('Resolved to:', absolutePath);

  return absolutePath;
}


/**
 * Traverses the ast to find exported declarations and creates an exportList
 * https://developer.mozilla.org/en-US/docs/web/javascript/reference/statements/export
 * @param {*} ast 
 * @param {*} srcFile 
 * @returns exportList 
 */
function parseExports(ast, srcFile) {
  let exportList = [];
  
  estraverse.traverse(ast, {
    enter: function(node) {
      if (node.type === 'ExportNamedDeclaration' || node.type === 'ExportDefaultDeclaration') {
        exportDeclaration(node);
      }
    }
  });

  return exportList;

  function exportDeclaration(node) {
    const addVal = (exp, params) => {
      exportList.push({
        name: srcFile,
        exported: exp,
        type: node.declaration?.type || 'Unknown',
        params: params
      });
    };

    if (node.source) {
      node.specifiers.map(e => {

        exportList.push({
          name: srcFile,
          exported: e.exported.name,
          type: getAbsolutePath(srcFile, node.source.value)
        });
      });
    } else if (node.declaration) {
      const declarationList = node.declaration?.declarations;
      if (declarationList) {
        declarationList.map(e => {
          // "-vr " +
          addVal(e.id.name);
        });
      } else if (node.declaration) {
        declNode(node.declaration);
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

    /**
     * Processes a declaration node
     * @param {*} decl
     */
    function declNode(decl) {
      switch (decl.type) {
        case "ClassDeclaration": {
          //"-cl " + 
          addVal(decl.id.name);
          break;
        }
        case "CallExpression": {
          // "-ce " + 
          if (decl.callee.name)
            addVal(decl.callee.name);
          else
            addVal(decl.callee.callee.name);
          break;
        }
        case "FunctionDeclaration": {
          // "-fn " + 
          if (decl.params) {
            let params = [];
            for (const param of decl.params) {
              switch (param.type) {
                case "Identifier": {
                  params.push(param.name);
                  break;
                }
                case "AssignmentPattern": {
                  (param.left.type === "Identifier") ?
                    params.push(param.left.name) :
                    params.push(" : " + param.type);
                  break;
                }
                case "ObjectPattern": {
                  let props = [];
                  for (const prop of param.properties) {
                    props.push(prop.key.name);
                  }
                  params.push("{" + props.join(", ") + "}");
                  break;
                }
                default: params.push(" : " + param.type);
              }
            }
            params = "(" + params.join(", ") + ")";
            addVal(decl.id.name, params);
          } else {
            addVal(decl.id.name);
          }

          break;
        }
        case "VariableDeclaration": {
          // "-vr " + 
          addVal(decl.id.name);
          break;
        }
        case "Identifier": {
          //"-id " + 
          addVal(decl.name);
          break;
        }
        case "ObjectExpression": {
          decl.properties.map(e => {
            // "-pr " + 
            addVal(e.key.name);
          });
          break;
        }
        case 'ArrowFunctionExpression': {
          if (decl.params) {
            let res = [];
            decl.params.map(e => {
              res.push(e.name);
            });
            // "-af " + 
            addVal("(" + res.join(", ") + ")");
          } else {
            addVal("???");
          }
          break;
        }
        case 'ConditionalExpression': {
          // "-cd " + 
          addVal(decl.test.name);
          break;
        }
        case 'TSTypeAliasDeclaration': {
          // Handle TypeScript type aliases
          addVal(decl.id.name);
          break;
        }
        case 'TSInterfaceDeclaration': {
          // Handle TypeScript interfaces
          addVal(decl.id.name);
          break;
        }
        case 'TSEnumDeclaration': {
          // Handle TypeScript enums
          addVal(decl.id.name);
          break;
        }
        default: {
          console.warn(`Export parse encounter unknown type: ${decl.type}`);
          addVal(`Unknown-${decl.type}`);
        }
      }
    }
  }
}

/**
 * Normalizes dependencies by standardizing import paths with or without extensions
 * 
 * JavaScript/TypeScript imports can be referenced with or without extensions.
 * This function ensures consistent references by converting imports with extensions
 * to match their extension-less counterparts when both exist.
 * 
 * @param {Array<Object>} deps - Array of dependency objects
 * @returns {Array<Object>} - Normalized dependency array
 */
function normaliseDeps(deps) {
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


