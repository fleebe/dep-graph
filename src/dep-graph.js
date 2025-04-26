import { Command } from 'commander';
import fs from "fs";
import path from "path";
import { processAST } from './ast.js';
import { createGraph, createRelationsGraph, createPackageGraph } from './commands/graph.js';
import { createModuleHtml } from './commands/html.js';
import { jsonOut, jsonIn } from './commands/json.js';
import { getModuleArray } from "./utils/file-utils.js";
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

/**
 * https://cheatcode.co/tutorials/how-to-build-a-command-line-interface-cli-using-node-js
 * https://openbase.com/js/commander
 *
 * @export
 */

/**
 * gets the version from package.json
 * 
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

/**
 * Creates and configures the CLI program
 * 
 * @returns {Command} The configured Commander program
 */
function setupProgram() {
  const program = new Command();

  program.name("dep-graph")
    .version(getVersion())
    .description(`A CLI to generate documentation for dependencies of a JavaScript file or directory.`)
    .option("-j --json", "produce .json object files of the dependencies to output directory.")
    .option("-g --graph", "produce package and dependencies .dot files that graphviz can use to generate a graph of the dependencies to output directory.")
    .option("-o --output <dir>", "directory that the outputs are sent to.", "./docs")
    .option("-d --jsdoc", "generate JSDoc documentation in the output directory.")
    .option("--jsdoc-config <file>", "path to JSDoc configuration file.", "./jsdoc.json")
    .argument("<file | directory>", "JavaScript file or directory to analyze");

  return program;
}

export function runProgram() {
  // Get version and setup program configuration
  const program = setupProgram();

  program.action((symbol, options) => {
    processFileOrDirectory(symbol, options);
  });

  program.parse(process.argv);
}

/**
 * Process a file or directory to analyze dependencies
 * 
 * @param {string} symbol - File or directory path to analyze
 * @param {object} options - CLI options
 */
function processFileOrDirectory(symbol, options) {
  try {
    symbol = validateOptions(options, symbol);
    // symbol will be full path to the file or directory
    // Get file/directory stats
    const stat = fs.statSync(symbol);

    // Get module information
    const [moduleArray] = getModuleArray(symbol, stat);

    // Process and output results not using usedList yet
    const [dependencyList, exportList,, errors] = processAST(moduleArray);

    let outputDir = options.output;
    if (!path.isAbsolute(outputDir)) {
      outputDir = path.resolve(process.cwd(), outputDir);
      console.log(`Converted to absolute path: ${outputDir}`);
    }

    // Generate and write output files
    generateOutputFiles(outputDir, moduleArray, dependencyList, exportList);

    // Handle JSON outputs if requested
    if (options.json) {
      generateJsonOutput(outputDir, moduleArray, dependencyList, exportList, errors);
    }

    // create the graph file for packages or directories for all the modules. -g option
    if (options.graph) {
      const importMap = jsonIn(outputDir + "ImportMap.json");
      const depGraph = createGraph(dependencyList, exportList, moduleArray, importMap);
      safeWriteFile(path.join(outputDir, "Dependencies.dot"), depGraph);

    }

    // Run JSDoc if requested
    if (options.jsdoc) {
      generateJSDoc(symbol, options.output, options.jsdocConfig);
    }
  } catch (error) {
    console.error(`Error processing ${symbol}: ${error.message}`);
  }
}

/**
 * Generate JSDoc documentation for the provided source
 * 
 * @param {string} source - Source file or directory to document
 * @param {string} outputDir - Directory to output JSDoc documentation
 * @param {string} configFile - Path to JSDoc configuration file (optional)
 */
function generateJSDoc(source, outputDir, configFile) {
  const jsdocOutput = path.join(outputDir, 'jsdoc');
  fs.mkdirSync(jsdocOutput, { recursive: true });

  console.log(`Generating JSDoc documentation in ${jsdocOutput}...`);

  // Build JSDoc command arguments
  const args = [
    '--destination', jsdocOutput,
    source
  ];

  // Use config file if provided
  if (configFile) {
    if (!fs.existsSync(configFile)) {
      console.error(`JSDoc config file not found: ${configFile}`);
      return;
    }
    args.unshift('--configure', configFile);
  }

  // Run JSDoc command
  const jsdocProcess = spawn('jsdoc', args, { stdio: 'inherit' });

  jsdocProcess.on('error', (err) => {
    if (err.code === 'ENOENT') {
      console.error(`Error: JSDoc command not found. Please ensure JSDoc is installed globally (npm install -g jsdoc) or as a dependency in your project.`);
    } else {
      console.error(`Error running JSDoc: ${err.message}`);
    }
  });

  jsdocProcess.on('close', (code) => {
    if (code === 0) {
      console.log(`JSDoc documentation successfully generated in ${jsdocOutput}`);
    } else {
      console.error(`JSDoc process exited with code ${code}`);
    }
  });
}

/**
 * Generate standard output files (HTML and DOT)
 * ModuleArray.html, Package.dot, Relations.dot
 */
function generateOutputFiles(outputDir, moduleArray, dependencyList, exportList) {
  let result = createModuleHtml(moduleArray, dependencyList, exportList);
  safeWriteFile(path.join(outputDir, "ModuleArray.html"), result);

  result = createPackageGraph(moduleArray, dependencyList);
  safeWriteFile(path.join(outputDir, "Package.dot"), result);

  result = createRelationsGraph(dependencyList, moduleArray);
  safeWriteFile(path.join(outputDir, "Relations.dot"), result);
}

/**
 * Generate JSON output files if requested
 * ExportList.json, DependencyList.json, ModuleArray.json 
 */
function generateJsonOutput(outputDir, moduleArray, dependencyList, exportList, errors) {
  if (errors.length > 0) {
    jsonOut(outputDir, "Errors", errors);
  }
  jsonOut(outputDir, "ExportList", exportList);
  jsonOut(outputDir, "DependencyList", dependencyList);
  jsonOut(outputDir, "ModuleArray", moduleArray);
}

/**
 * Helper function for safe file writing
 * 
 * @param {string} filePath - Path to the file
 * @param {string} content - Content to write
 */
function safeWriteFile(filePath, content) {
  try {
    fs.writeFileSync(filePath, content, "utf8");
  } catch (error) {
    console.error(`Error writing file ${filePath}: ${error.message}`);
  }
}

/**
 * finds the last name in the path
 * @param {*} srcDir 
 * @returns last name in the path
 */
/*
function getLastDir(srcDir) {
  let lastDir = srcDir.split("/").slice(-1).join("");
  (lastDir.startsWith(".")) ? lastDir = lastDir.slice(1) : lastDir;
  (lastDir.startsWith("/")) ? lastDir = lastDir.slice(1) : lastDir;
  (lastDir.startsWith("\\")) ? lastDir = lastDir.slice(1) : lastDir;
  return lastDir;
}
*/
/**
 * validates the options passed
 * @param {*} options 
 */
function validateOptions(options, symbol) {
  // Validate path is absolute (full path)
  if (!path.isAbsolute(symbol)) {
    // Instead of throwing an error, let's convert to absolute path
    symbol = path.resolve(process.cwd(), symbol);
    console.log(`Converted to absolute path: ${symbol}`);
  }

  // Verify the path exists
  if (!fs.existsSync(symbol)) {
    throw new Error(`Path does not exist: ${symbol}`);
  }


  // Create output directory if it doesn't exist
  if (!fs.existsSync(options.output)) {
    fs.mkdirSync(options.output, { recursive: true });
    console.log("Created output directory:", options.output);
    return;
  }

  // Since graph option is commented out in the program definition,
  // we shouldn't check for it in validation
  if (options.json === undefined) {
    console.warn("No output format was specified. Using default outputs only.");
  }
  return symbol;
}


