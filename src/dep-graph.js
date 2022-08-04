// thiis is used to run it when used as a cli program
// #!/usr/bin/env node
import { Command } from 'commander';
import fs from "fs";
import { processAST } from './ast.js';
import { createGraphs } from './commands/graph.js';
import debug from './commands/debug.js';
import {jsonOut} from './commands/json.js';
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
    const [moduleList, dir] = getModuleMap(symbol); 

// get the export list and dependency of each module/file
    [dependencyList, exportList, importMap] = processAST(moduleList, dir);

    // output the data structures to the screen. -d option
    if (options.debug) {
      debug(moduleList, exportList, dependencyList, importMap);
    }

    // create the graph file for packages or directories for all the modules. -g option
    // output the graph file
    if (options.graph) {
      createGraphs(moduleList, exportList, dependencyList, importMap, options.output);
    }
 
// save data structures to json files. Cannot stringify a Map so need to convert it to an object.
    if (options.json) {
      jsonOut(options, moduleList, exportList, dependencyList, importMap);
    }

  })
});

program.parse(process.argv);
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


