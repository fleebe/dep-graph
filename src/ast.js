import { readFileSync } from "fs";
import { parse as acparse } from "acorn";
import { simple } from "acorn-walk";


let exportList = [];
let dependencyList = [];

function getExtension(filename) {
  var i = filename.lastIndexOf('.');
  return (i < 0) ? '' : filename.substring(i);
}

export function processAST(symbol, dir) {
  const ext = getExtension(symbol).toLowerCase();
  if (ext === ".js") {
    try {
      const ast = parseAST(symbol, dir);
      const e = parseExports(ast, symbol);
      const deps = parseImports(ast, symbol);
      exportList.push(...e);
      dependencyList.push(...deps);
    } catch (err) {
      console.log("------------------");
      console.log("file=", symbol);
      console.log(err);
      console.log("------------------");

    }
  } else {
    console.log("Can only parse javascript files at the moment. file=", symbol);
  }

  let importList = [];
  return [dependencyList, exportList];
}


function parseAST(symbol, dir) {
  let f;
  (dir) ? f = symbol.replace('.', dir): f = symbol;
  const result = readFileSync(f, 'utf-8');
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
        const name = node.specifiers[i].type === "ImportSpecifier" ? node.specifiers[i].imported.name : node.specifiers[i].local.name;
        //            console.log(name);
        let impSrc = node.source.value;
        dependencies.push({
          src: symbol,
          importSrc: impSrc,
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
      try {
        if (node.source) {
          console.log(`TODO: Found a source export: ${node.source.value}`);
        } else if (node.declaration) {
          const declarationList = node.declaration?.declarations;
          if (declarationList) {
            for (var i = 0; i < declarationList.length; i++) {
              exportList.push({
                name: symbol,
                exported: declarationList[i].id.name,
                type: node.declaration.type
              });
            }
          } else if (node.declaration?.id) {
            exportList.push({
              name: symbol,
              exported: node.declaration.id.name,
              type: node.declaration.type
            });
          } else {
            console.log(`TODO: Export parse failed`);
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
  });
  return exportList;
}


  //      var visitor = new Visitor();
  //      visitor.visitNode(ast);
/*
      for (let token of tokenizer(result, { ecmaVersion: 2020, sourceType: "module" })) {
        // iterate over the tokens
      }
 
*/

