import { writeFileSync, readFileSync, fstat } from "fs";
import { parse as acparse } from "acorn";
import { simple } from "acorn-walk";
import { normalizePath } from "./utils/file-fn.js";
import addToMapArray from "./utils/map-fn.js";
import { assert } from "console";
import path from "path";
import { fileURLToPath } from 'url';


function getExtension(filename) {
  var i = filename.lastIndexOf('.');
  return (i < 0) ? '' : filename.substring(i);
}

/**
 * processes gets the ast for all the modules and creates the dependeciesList, exportList and importMap
 * @param {*} moduleMap Map of packages with modules key=./directory, values=array[./directory/filename]
 * @param {*} root the root directory where the modules root is passed without the ./ 
 * @returns 
 */
export function processAST(moduleMap, root) {
  if (root.startsWith(".")) root = root.substring(1, root.length);
  if (root.startsWith("/")) root = root.substring(1, root.length);
  if (root.startsWith("\\")) root = root.substring(1, root.length);
  
  // list of dependencies between modules including the functions
  let dependencyList = [];
  // list of functions exported from modules/files
  let exportList = [];
  root = "./" + root;
  let errors = [];
  moduleMap.forEach((arr, k) => {
    arr.forEach(e => {
      const f = e.replace(".", root);
      const ext = getExtension(f).toLowerCase();
      if (ext === ".js") {
        try {
          const ast = parseAST(f);
          const exp = parseExports(ast, e);
          const deps = parseImports(ast, e);
          exportList.push(...exp);
          dependencyList.push(...deps);
        } catch (err) {
          const lineno = new Error().lineNumber;
          const __filename = fileURLToPath(import.meta.url);
          errors.push({ "file": f, "err": err, "msg": err.message, "src": __filename, "lineno": lineno});
          console.error(`file=${f}\nmodule=${e}\n${err.message}`);
          console.error(err);
        }
      } else {
        console.log("Can only parse javascript files at the moment. file=", f);
      }
    });
  });
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
 *
 * @param {*} symbol the file to get the ast from
  * @returns ast object struture for parsing
 */
function parseAST(symbol) {
  const result = readFileSync(symbol, 'utf-8');
  //      console.log(`Retrieving file ast information for ${symbol}`);
  //const ast = parse(result, { sourceType: "module" });


  return acparse(result, { ecmaVersion: 2020, sourceType: "module" });
}

function parseImports(ast, symbol) {
  let dependencies = [];
  simple(ast, {
    ImportDeclaration(node) {
      //          let im: ImportDeclaration;
      //          im = node as ImportDeclaration;
      // console.log(`Found a import: ${node.source.value} type : ${typeof im.specifiers}  length : ${im.specifiers.length}`);
      for (var i = 0; i < node.specifiers.length; i++) {
        const name = node.specifiers[i].type === "ImportSpecifier" ? node.specifiers[i].imported.name : "*" + node.specifiers[i].local.name;
        //            console.log(name);
        let dest = node.source.value;
        let src = symbol;
        if (dest.indexOf("..") !== -1) { // up dirs in the importSrc
          dest = normalizePath(dest, src); // + getFilename(node.source.value);
        }

        dependencies.push({
          src: src,
          importSrc: dest,
          import: name
        });
      }
    }
  });
  return dependencies;

}

function parseExports(ast, symbol) {
  let exportList = [];
  simple(ast, {
    ExportNamedDeclaration(node) {
      exportDeclaration(node);
    }
  });

  simple(ast, {
    ExportDefaultDeclaration(node) {
      exportDeclaration(node);
    }
  });

  return exportList;

  function exportDeclaration(node) {
    if (node.source) {
      node.specifiers.map(e => {
        exportList.push({
          name: symbol,
          exported: e.exported.name,
          type: "File"
        });
      });
    } else if (node.declaration) {
      const addVal = (exp) => {
        exportList.push({
          name: symbol,
          exported: exp,
          type: node.declaration.type
        });
      };
      const declarationList = node.declaration?.declarations;
      if (declarationList) {
        declarationList.map(e => {
          addVal(e.id.name);
        });
      } else if (node.declaration) {
        const decl = node.declaration;
        if (decl.id) {
          addVal(decl.id.name);
        } else if (decl.properties) {
          /**
            export default {
              local: setupLocalAuthPassport,
              auth0: setupAuth0Passport,
              slack: setupSlackPassport
            };
            e.g.
              e.value.name = setupLocalAuthPassport
              e.key.name = local
          */
          decl.properties.map(e => {
            addVal(e.key.name);
          });
        } else if (decl.name) {
          addVal(decl.name);
        } else if (decl.type === 'ArrowFunctionExpression') {
          if (decl.params) {
            let res = "(";
            decl.params.map(e => {
              res += e.name + ","})
            res = res.substring(0, res.length - 1) + ")";
            addVal(res);
          } else {
            addVal("???");
          }
        } else if (decl.type === 'ConditionalExpression') {
          addVal(decl.test.name);
        } else {
          throw new Error(`TODO: Export parse failed\n ${node}`);
        }
      }
    }
  }
}

  //      var visitor = new Visitor();
  //      visitor.visitNode(ast);
/*
      for (let token of tokenizer(result, { ecmaVersion: 2020, sourceType: "module" })) {
        // iterate over the tokens
      }
 
*/

