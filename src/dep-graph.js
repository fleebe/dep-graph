// thiis is used to run it when used as a cli program
// #!/usr/bin/env node
import { Command } from 'commander';
import fs from "fs";
import path from "path";
import { processAST } from './ast.js';
import { createGraph, createPackageGraph } from './commands/graph.js';
import debug from './commands/debug.js';
import {jsonOut, jsonIn} from './commands/json.js';
import { getModuleMap } from "./utils/file-fn.js";

// https://cheatcode.co/tutorials/how-to-build-a-command-line-interface-cli-using-node-js
// https://openbase.com/js/commander

const program = new Command();

program.name("dep-graph")
  .version("1.0.0")
  .description(`A cli to generate documentation for dependencies of a javascript file | directory.`)
  .option("-g --graph", "produce a .dot file that graphviz can use to generate a graph of the dependencies to output directory.")
  .option("-j --json", "produce .json object files of the dependencies to output directory.")
  .option("-d --debug", "produce debug messages to console.", false)
  .option("-o --output <dir>", "directory that the outputs are sent to.", "./out")
  .argument("<file | directory>");

program.action((symbol, options) => {
  fs.lstat(symbol, (err, stats) => {
    if (err) {
      console.error(err); //Handle error
      return;
    }

    validateOptions(options);

    // a list of modules or files  from dir in the form  .dir/file.js list recursively walks the start directory
    let [moduleMap, srcDir] = getModuleMap(symbol); 

    // prefix for the output files
    const lastDir = removeDirChars(srcDir);
 
    let dependencyList = [];
    // list of functions exported from modules/files
    let exportList = [];
    let importMap = new Map();


      // get the export list and dependency of each module/file
      // only do this if the -j option is set otherwise read from the output directory
    if (options.json) {
      // a list of modules or files  from dir in the form  .dir/file.js list recursively walks the start directory
      [dependencyList, exportList, importMap] = processAST(moduleMap, srcDir);
      jsonOut(options.output, moduleMap, exportList, dependencyList, importMap, lastDir);
    } else {
      // read from output directory
      moduleMap = jsonIn(path.join(options.output, lastDir + "ModuleMap.json"));
      exportList = Array.from(jsonIn(path.join(options.output, lastDir + "ExportList.json")));
      dependencyList = Array.from(jsonIn(path.join(options.output, lastDir + "DependencyList.json")));
      importMap = jsonIn(path.join(options.output, lastDir + "ImportMap.json"));
    }

    // output the data structures to the screen. -d option
    if (options.debug) {
      debug(moduleMap, exportList, dependencyList, importMap);
    }

    // create the graph file for packages or directories for all the modules. -g option
    if (options.graph) {
      let result = createPackageGraph(moduleMap, dependencyList);
      const packFile = lastDir + "Package.dot";
      fs.writeFileSync(path.join(options.output, packFile), result, "utf8");

      result = createGraph(dependencyList, exportList, moduleMap, importMap);
      const depFile = lastDir + "Dependencies.dot";
      fs.writeFileSync(path.join(options.output, depFile), result, "utf8");
    }

  })
});

program.parse(process.argv);


function removeDirChars(srcDir) {
  let lastDir = srcDir.split("/").slice(-1).join("");
  (lastDir.startsWith(".")) ? lastDir = lastDir.slice(1) : lastDir;
  (lastDir.startsWith("/")) ? lastDir = lastDir.slice(1) : lastDir;
  (lastDir.startsWith("\\")) ? lastDir = lastDir.slice(1) : lastDir;
  return lastDir;
}

//-------------------------------------


function validateOptions(options) {
  if (!options.json && !options.graph) {
    console.error("Neither output format was specified.");
  }

  if (!fs.existsSync(options.output)) {
    fs.mkdirSync(options.output);
    console.log("created output directory ", options.output);
  }
}


