import { moduleName } from "../utils/file-utils.js";
import estraverse from 'estraverse';
import { BaseProcessor } from "./BaseProcessor.js";

/**
 * @class ExportProcessor
 * @description Processes ASTs to extract exports
 */
export class ExportProcessor extends BaseProcessor {
  /**
   * Creates a new ExportProcessor
   * @param {string} baseLoc - Base location
   */
  constructor(baseLoc) {
    super(baseLoc);
    this.exportList = [];
  }

  /**
   * Traverses the AST to find exported declarations and creates an exportList
   * 
   * @param {Object} ast - The Abstract Syntax Tree of the file
   * @param {Object} mod - The module object
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
}
