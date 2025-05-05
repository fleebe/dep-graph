
import estraverse from 'estraverse';
import path from "path";
/**
 * @class BaseProcessor
 * @description Base class for AST processors with common utility methods
 */
export class BaseProcessor {
  #baseLoc = '';
   /**
   * Creates a new BaseProcessor instance
   * @param {string} baseLoc - The base directory or file
   */
  constructor(baseLoc) {
    this.baseLoc = baseLoc;
  }

  /**
   * Gets the parent node of a given node in the AST
   * 
   * @param {Object} ast - The full AST
   * @param {Object} targetNode - The node to find parent for
   * @returns {Object|null} - The parent node or null if not found
   */
  getParentNode(ast, targetNode) {
    let parentNode = null;

    estraverse.traverse(ast, {
      enter: function (node, parent) {
        if (node === targetNode) {
          parentNode = parent;
          return this.break();
        }
      }
    });

    return parentNode;
  }

  skipNode(nodeType) {
    // Skip JSX and common TS types estraverse doesn't know by default
    if (nodeType === 'JSXElement' ||
      nodeType === 'JSXFragment' ||
      nodeType === 'TSInterfaceDeclaration' ||
      nodeType === 'TSTypeAliasDeclaration' ||
      nodeType === 'TSAsExpression' ||
      nodeType === 'TSEnumDeclaration') {
      return estraverse.VisitorOption.Skip;
    }
    return null
  }

  /**
   * Gets the absolute path for a relative import
   * 
   * @param {string} currentFilePath - Absolute path of the current file
   * @param {string} relativePath - Relative import path
   * @returns {string} Absolute path of the import
   */
  getAbsolutePath(currentFilePath, relativePath) {
    const currentDir = path.dirname(currentFilePath);
    return path.resolve(currentDir, relativePath).replaceAll("\\", "/");
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
   * Calculates relative source file path
   * 
   * @param {string} src - Source file
   * @param {string} relSrcPath - Relative source path
   * @returns {string} - Calculated relative source file
   */
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
      return relSrcPath;
    }
  }

  /**
   * Counts occurrences of a substring in a string
   * 
   * @param {string} str - String to search in
   * @param {string} subStr - Substring to count
   * @returns {number} - Number of occurrences
   */
  countSubstrings(str, subStr) {
    let count = 0;
    let i = 0;

    while ((i = str.indexOf(subStr, i)) !== -1) {
      count++;
      i += subStr.length;
    }

    return count;
  }

  /**
   * Replaces occurrences of a substring with elements from a reversed array
   * 
   * @param {string} str - String to modify
   * @param {string} subStr - Substring to replace
   * @param {Array} arr - Array of replacement values
   * @param {number} cnt - Count of replacements
   * @returns {string} - Modified string
   */
  replaceWithReversedArray(str, subStr, arr, cnt) {
    const reversedArr = [...arr].reverse();
    let index = cnt;
    while (str.includes(subStr) && index < reversedArr.length) {
      str = str.replace(subStr, reversedArr[index] + '/');
      index++;
    }
    return str;
  }
}