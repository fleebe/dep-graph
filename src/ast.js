import { readFileSync } from "fs";
import { parse as babelParse } from "@babel/parser";
import {
  normalizePath, cleanPath, hasExtension, getUsedByList,
  removeExtension, validateImportFile
} from "./utils.js";
import { fileURLToPath } from 'url';
import * as walk from 'babel-walk';
import { EXT_LIST } from "./globals.js"

/**
 * processes gets the ast for all the modules and creates the dependeciesList, exportList and importMap
 * @param {*} moduleMap Map of packages with modules key=./directory, values=array[./directory/filename]
 * @param {*} root the root directory where the modules root is passed without the ./ 
 * @returns 
 */
export function processAST(moduleArray, root) {
  root = "./" + cleanPath(root);

  // list of dependencies between modules including the functions
  let dependencyList = [];
  // list of functions exported from modules/files
  let exportList = [];
  let errors = [];
  const thisFile = fileURLToPath(import.meta.url);

  moduleArray.forEach((mod) => {
    // convert relative path mod.file to absolute path
    const srcFile = mod.file.replace(".", root);
    if (hasExtension(srcFile, EXT_LIST)) {
      try {
        const result = readFileSync(srcFile, 'utf-8');
        // parse file into ast handles js, jsx, and experimental exportDefaultFrom
        const ast = babelParse(result, { plugins: ["jsx", "exportDefaultFrom"], sourceType: "module" });
        const exps = parseExports(ast, mod.file, root);
        const deps = parseImports(ast, mod.file, root);
        mod.dependsOnCnt = deps.length;
        mod.exportCnt = exps.length;
        //adds results of export and import parse to global lists
        exportList.push(...exps);
        dependencyList.push(...deps);
      } catch (err) {
        //         writeFileSync(output + ".ast", JSON.stringify(ast, null, 2), "utf8");
        errors.push({ "file": srcFile, "err": err, "msg": err.message, "src": thisFile });
        console.error(`file=${srcFile}\nmodule=${mod.file}\n${err.message}`);
        console.error(err);
      }
    } else {
      errors.push({
        "file": srcFile, "err": null,
        "msg": "Can only parse javascript files at the moment.",
        "src": thisFile
      });
      console.log("Can only parse javascript files at the moment. file=", srcFile);
    }
  });

  // remove .js imports if a non .js import exists.
  normaliseDeps(dependencyList);

  moduleArray.forEach((mod) => {
    const usedList = getUsedByList(dependencyList, mod.file);
    mod.usedByCnt = usedList.length;
  });

  return [dependencyList, exportList, errors];
}

/**
 * Walks the ast to find imports
 * @param {*} ast 
 * @param {*} srcFile 
 * @param {*} root allows the validation in the file system of the imported file.
 * @returns dependency list of imports
 */
function parseImports(ast, srcFile, root) {
  let dependencies = [];

  const visitors = walk.recursive({
    ImportDeclaration(node) {
      moduleDeclaration(node, srcFile, root);
    }
  });
  visitors(ast);
  
  function moduleDeclaration(node, srcFile, root) {
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
      }

      const relImportSrcFile = normalizePath(node.source.value, srcFile);
      const validSrc = validateImportFile(relImportSrcFile, root);

      dependencies.push({
        src: srcFile,
        importSrc: node.source.value,
        relSrcPath: validSrc,
        import: fnName
      });
    }
  }

  return dependencies;
 
}



/**
 * walks the ast to find exported declarations and creates an exportList
 * https://developer.mozilla.org/en-US/docs/web/javascript/reference/statements/export
 * @param {*} ast 
 * @param {*} srcFile 
 * @returns exportList 
 */
function parseExports(ast, srcFile, root) {
  let exportList = [];
  const visitors = walk.recursive({
    ExportNamedDeclaration(node) {
      exportDeclaration(node);
    },

    ExportDefaultDeclaration(node) {
      exportDeclaration(node);
    },
  });

  visitors(ast);
  return exportList;

  function exportDeclaration(node) {
    const addVal = (exp, params) => {
      exportList.push({
        name: srcFile,
        exported: exp,
        type: node.declaration.type,
        params: params
      });
    };

    if (node.source) {
      node.specifiers.map(e => {
        const relSrcFile = normalizePath(node.source.value, srcFile);
        const validSrc = validateImportFile(relSrcFile, root);

        exportList.push({
          name: srcFile,
          exported: e.exported.name,
          type: validSrc
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
        default: {
          throw new Error(`TODO: Export parse failed\n ${JSON.stringify(node, null, 2)}`);
        }
      }
    }
  }
}

/**
 * Some importSrc are named with .js on the end and others are not. 
 * Convert .js to merge with the non js one if it exists
 * @param {*} deps 
 * @returns deps changed to reference the non .js item
 */
function normaliseDeps(deps) {
  // get the dependencies with importSrc with a .js on the end
  let fndImp = [];
  // all the dependencies that end with .js or jsx
  const jsDeps = deps
    .filter(v => { return (v.importSrc.endsWith(".js") || v.importSrc.endsWith(".jsx")) });

  for (const dep of jsDeps) {
    // remove the .js or .jsx extensions
    const nonJs = removeExtension(dep.importSrc);
    // if already found change the source
    if (fndImp.indexOf(nonJs) !== -1) {
      dep.importSrc = nonJs;
    } else {
      // find a non .js dependency
      deps.find((o) => {
        if (o.importSrc === nonJs) {
          fndImp.push(nonJs);
          dep.importSrc = nonJs;
          return true;
        }
      });
    }
  }

  return deps;
}


