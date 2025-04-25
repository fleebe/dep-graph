import { Command } from 'commander';
import fs from "fs";
import path from "path";
import { processAST } from './ast.js';
import { createGraph, createRelationsGraph, createPackageGraph } from './commands/graph.js';
import { createModuleHtml } from './commands/html.js';
import { jsonOut, jsonIn } from './commands/json.js';
import { getFilename, getModuleArray, cleanPath } from "./file-utils.js";
import { fileURLToPath } from 'url';

// https://cheatcode.co/tutorials/how-to-build-a-command-line-interface-cli-using-node-js
// https://openbase.com/js/commander

export function runProgram() {

  /**
   * gets the version from package.json
   * @returns 
   */
  const getVersion = () => {
    // sets the filename global to this file
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const packageJSONPath = path.resolve(__dirname, "../package.json")
    const content = fs.readFileSync(packageJSONPath, { encoding: "utf8" })
    const config = JSON.parse(content)
    return config.version
  }

  const program = new Command();

  program.name("dep-graph")
    .version(getVersion())
    .description(`A cli to generate documentation for dependencies of a javascript file | directory.`)
//    .option("-g --graph", "produce package and dependencies .dot files that graphviz can use to generate a graph of the dependencies to output directory.")
    .option("-j --json", "produce .json object files of the dependencies to output directory.")
    .option("-o --output <dir>", "directory that the outputs are sent to.", "./out")
    .argument("<file | directory>");

  program.action((symbol, options) => {
    fs.lstat(symbol, (err, stat) => {
      if (err) {
        console.error(err); //Handle error
        return;
      }

      validateOptions(options);

      // a list of modules or files  from dir in the form  .dir/file.js list recursively walks the start directory
      let [srcDir, moduleArray] = getModuleArray(symbol, stat);
      srcDir = "./" + cleanPath(srcDir);
      // prefix for the output files
      let lastDir;
      if (stat.isDirectory()) {
        lastDir = getLastDir(srcDir);
      } else { // is a file
        lastDir = getFilename(symbol);
        lastDir = lastDir.split(".")[0];
      }

      let dependencyList = [];
      // list of functions exported from modules/files
      let exportList = [];
     // let importMap = new Map();
      let errors = [];
      const output = path.join(options.output, lastDir);
      // get the export list and dependency of each module/file
      [dependencyList, exportList, errors] = processAST(moduleArray, srcDir, output);
      let result = createModuleHtml(moduleArray, dependencyList, exportList);
      fs.writeFileSync(output + "ModuleArray.html", result, "utf8"); 
      result = createPackageGraph(moduleArray, dependencyList, srcDir);
      fs.writeFileSync(output + "Package.dot", result, "utf8");
      result = createRelationsGraph(dependencyList, moduleArray, srcDir);
      fs.writeFileSync(output + "Relations.dot", result, "utf8");

      // only do this if the -j option is set otherwise read from the output directory
        // a list of modules or files  from dir in the form  .dir/file.js list recursively walks the start directory
      if (options.json) {
          if (errors.length > 0) {
            jsonOut(output, "Errors", errors);
          }
          jsonOut(output, "ExportList", exportList);
          jsonOut(output, "DependencyList", dependencyList);
        // moduleArray is updated in the createRelationsGraph
          jsonOut(output, "ModuleArray", moduleArray);        
     } else {
        
        // read from output directory
        moduleArray = jsonIn(output + "ModuleArray.json");
        exportList = Array.from(jsonIn(output + "ExportList.json"));
        dependencyList = Array.from(jsonIn(output + "DependencyList.json"));
        const importMap = jsonIn(output + "ImportMap.json");     
        // create the graph file for packages or directories for all the modules. -g option

        if (options.graph) {
          result = createGraph(dependencyList, exportList, moduleArray, importMap);
          fs.writeFileSync(output + "Dependencies.dot", result, "utf8");

        }      
      }


       
    })
  });

  program.parse(process.argv);
}

/**
 * finds the last name in the path
 * @param {*} srcDir 
 * @returns 
 */
function getLastDir(srcDir) {
  let lastDir = srcDir.split("/").slice(-1).join("");
  (lastDir.startsWith(".")) ? lastDir = lastDir.slice(1) : lastDir;
  (lastDir.startsWith("/")) ? lastDir = lastDir.slice(1) : lastDir;
  (lastDir.startsWith("\\")) ? lastDir = lastDir.slice(1) : lastDir;
  return lastDir;
}

/**
 * validates the options passed
 * @param {*} options 
 */
function validateOptions(options) {
  if (!options.json && !options.graph) {
    console.error("Neither output format was specified.");
  }

  if (!fs.existsSync(options.output)) {
    fs.mkdirSync(options.output);
    console.log("created output directory ", options.output);
  }
}


