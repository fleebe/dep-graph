import { readFileSync } from "fs";
import { parse as babelParse } from "@babel/parser";
import { normalizePath, cleanPath } from "./utils/file-fn.js";
import addToMapArray from "./utils/map-fn.js";
import { fileURLToPath } from 'url';
import * as walk from 'babel-walk';

/**
 * processes gets the ast for all the modules and creates the dependeciesList, exportList and importMap
 * @param {*} moduleMap Map of packages with modules key=./directory, values=array[./directory/filename]
 * @param {*} root the root directory where the modules root is passed without the ./ 
 * @returns 
 */
export function processAST(moduleMap, root) {
  root = cleanPath(root);

  // list of dependencies between modules including the functions
  let dependencyList = [];
  // list of functions exported from modules/files
  let exportList = [];
  root = "./" + root;
  let errors = [];
  const __filename = fileURLToPath(import.meta.url);
  moduleMap.forEach((arr) => {
    arr.forEach(e => {
      const f = e.replace(".", root);
      const ext = getExtension(f).toLowerCase();
      if ([".js", ".jsx"].indexOf(ext) !== -1) {
        try {
          const result = readFileSync(f, 'utf-8');
          // parse file into ast handles js, jsx, and experimental exportDefaultFrom
          const ast = babelParse(result, { plugins: ["jsx", "exportDefaultFrom"], sourceType: "module" });
          const exp = parseExports(ast, e);
          const deps = parseImports(ast, e);
          //adds results of export and import parse to global lists
          exportList.push(...exp);
          dependencyList.push(...deps);
        } catch (err) {
 //         writeFileSync(output + ".ast", JSON.stringify(ast, null, 2), "utf8");
          errors.push({ "file": f, "err": err, "msg": err.message, "src": __filename });
          console.error(`file=${f}\nmodule=${e}\n${err.message}`);
          console.error(err);
        }
      } else {
        errors.push({
          "file": f, "err": null, "msg": "Can only parse javascript files at the moment.", "src": __filename
        });
        console.log("Can only parse javascript files at the moment. file=", f);
      }
    });

  });
  // remove .js imports if a non .js import exists.
  normaliseDeps(dependencyList);
  // map of imports key=module/file value=an array of functions.
  let importMap = getImportMap(dependencyList);
  return [dependencyList, exportList, importMap, errors];
}

export function getImportMap(dependencyList) {
  let importMap = new Map();
  for (let dep of dependencyList) {
    addToMapArray(importMap, dep.importSrc, dep.import);
  }
  return importMap;
}

/**
 * Walks the ast to find imports
 * @param {*} ast 
 * @param {*} symbol 
 * @returns dependency list of imports
 */
function parseImports(ast, symbol) {
  let dependencies = [];

  const visitors = walk.recursive({
    ImportDeclaration(node) {
      importDeclaration(node);
    }
  });
  visitors(ast);
  return dependencies;


  function importDeclaration(node) {
    for (var i = 0; i < node.specifiers.length; i++) {
      // prefix with a * if default import specifier
      const fnName = node.specifiers[i].type === "ImportSpecifier" ? node.specifiers[i].imported.name : "*" + node.specifiers[i].local.name;
      let dest = node.source.value;
      let src = symbol;
      if (dest.indexOf("..") !== -1) { // go up dirs in the importSrc
        dest = normalizePath(dest, src); 
      }

      dependencies.push({
        src: src,
        importSrc: dest,
        import: fnName
      });
    }
  }
}

/**
 * walks the ast to find exported declarations and creates an exportList
 * @param {*} ast 
 * @param {*} symbol 
 * @returns exportList 
 */
function parseExports(ast, symbol) {
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

    const addVal = (exp) => {
      exportList.push({
        name: symbol,
        exported: exp,
        type: node.declaration.type
      });
    };

    if (node.source) {
      node.specifiers.map(e => {
        exportList.push({
          name: symbol,
          exported: e.exported.name,
          type: "File"
        });
      });
    } else if (node.declaration) {       
      const declarationList = node.declaration?.declarations;
      if (declarationList) {
        declarationList.map(e => {
          addVal("-vr " + e.id.name);
        });
      } else if (node.declaration) {
        const decl = node.declaration;
        switch (decl.type) {
          case "ClassDeclaration": {
            addVal("-cl " + decl.id.name);
            break;
          }
          case "CallExpression": {
            if (decl.callee.name) 
              addVal("-ce " + decl.callee.name);
            else
              addVal("-ce " + decl.callee.callee.name);
            break;
          }
          case "FunctionDeclaration": {
            addVal("-fn " + decl.id.name);
            break;
          }
          case "VariableDeclaration": {
            addVal("-vr " + decl.id.name);
            break;
          }
          case "Identifier": {
            addVal("-id " + decl.name);
            break;
          }
          case "ObjectExpression": {
            decl.properties.map(e => {
              addVal("-pr " + e.key.name);
            });
            break;
          }
          case 'ArrowFunctionExpression': {
            if (decl.params) {
              let res = "(";
              decl.params.map(e => {
                res += e.name + ","
              })
              res = res.substring(0, res.length - 1) + ")";
              addVal("-af " + res);
            } else {
              addVal("???");
            }
            break;
          }
          case 'ConditionalExpression': {
            addVal("-cd " + decl.test.name);
            break;
          }
          default: {
            throw new Error(`TODO: Export parse failed\n ${JSON.stringify(node, null, 2)}`);
          }
        }
      }
    }
  }
}

/**
 * Some importSrc are named with .js on the end and others are not. Convert .js to merge with the non js one if it exists
 * @param {*} deps 
 * @returns deps changed to reference the non .js item
 */
function normaliseDeps(deps) {
  // get the dependencies with importSrc with a .js on the end
  let fndImp = [];
  // all the dependencies that end with .js
  const jsDeps = deps
    .filter(v => { return v.importSrc.endsWith(".js") === true; });
  for (const dep of jsDeps) {
    // remove the .js
    const nonJs = dep.importSrc.slice(0, -3);
    // if already found change the source
    if (fndImp.indexOf(nonJs) !== -1) {
      dep.importSrc = nonJs;
    } else {
    // find a non .js dependency
    deps.find((o) => {
      if (o.importSrc === nonJs) {
        fndImp.push(o.importSrc);
        dep.importSrc = nonJs;
        return true;
      }
    });
  }

  }
  return deps;
}

/**
 * gets the extension of the file
 * @param {*} filename 
 * @returns the extension
 */
function getExtension(filename) {
  const i = filename.lastIndexOf('.');
  return (i < 0) ? '' : filename.substring(i);
}
