import { Command } from 'commander';
import fs from "fs";
import path from "path";
import ProcessAST from './ast/ASTProcessor.js';
import { createExportGraph, createRelationsGraph, createPackageGraph, createClassDiagram } from './commands/graph.js';
import { createModuleHtml } from './commands/html.js';
import { jsonOut} from './commands/json.js';
import { getModuleArray, safeWriteFile } from "./utils/file-utils.js";
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

/**
 * @class DependencyGraphGenerator
 * @description Main class for analyzing and generating dependency graphs
 */
export class DependencyGraphGenerator {
  /**
   * Creates a new DependencyGraphGenerator instance
   */
  constructor() {
    this.program = this.setupProgram();
  }

  /**
   * gets the version from package.json
   * @returns {string} The version from package.json
   */
  getVersion() {
    // sets the filename global to this file
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const packageJSONPath = path.resolve(__dirname, "../package.json");
    const content = fs.readFileSync(packageJSONPath, { encoding: "utf8" });
    const config = JSON.parse(content);
    return config.version;
  }

  /**
   * Creates and configures the CLI program
   * @returns {Command} The configured Commander program
   */
  setupProgram() {
    const program = new Command();

    program.name("dep-graph")
      .version(this.getVersion())
      .description(`A CLI to generate documentation for dependencies of a JavaScript file or directory.`)
      .option("-j --json", "produce .json object files of the dependencies to output directory.")
      .option("-g --graph", "produce package and dependencies .dot files that graphviz can use to generate a graph of the dependencies to output directory.")
      .option("-c --class", "produce a class diagram .dot file for any classes in the codebase.")
      .option("-o --output <dir>", "directory that the outputs are sent to.", "./docs")
      .option("-d --jsdoc", "generate JSDoc documentation in the output directory.")
      .option("--jsdoc-config <file>", "path to JSDoc configuration file.", "./jsdoc.json")
      .argument("<file | directory>", "JavaScript file or directory to analyze");

    return program;
  }

  /**
   * Runs the CLI program
   */
  runProgram() {
    this.program.action((symbol, options) => {
      // make the symbol an absolute path
      if (!path.isAbsolute(symbol)) {
        symbol = path.resolve(process.cwd(), symbol);
        console.log(`Converted to absolute path: ${symbol}`);
      }
      this.processFileOrDirectory(symbol, options);
    });

    this.program.parse(process.argv);
  }

  /**
   * Process a file or directory to analyze dependencies
   * @param {string} baseLoc - File or directory path to analyze
   * @param {object} options - CLI options
   */
  processFileOrDirectory(baseLoc, options) {
    try {
      baseLoc = this.validateOptions(options, baseLoc);
      // symbol will be full path to the file or directory
      // Get file/directory stats
      const stat = fs.statSync(baseLoc);

      // Get module information
      const [moduleArray] =  getModuleArray(baseLoc, stat);

      // Process and output results
      // eslint-disable-next-line no-unused-vars
      const [dependencyList, exportList, usedList, errors] = ProcessAST(moduleArray, baseLoc);

      let outputDir = options.output;
      if (!path.isAbsolute(outputDir)) {
        outputDir = path.resolve(process.cwd(), outputDir);
        console.log(`Converted to absolute path: ${outputDir}`);
      }

         
      // Generate and write output files
      this.generateOutputFiles(outputDir, baseLoc, moduleArray, dependencyList, exportList);

      // Generate HTML output
      const modHtml = createModuleHtml(outputDir, moduleArray, dependencyList, exportList);
      safeWriteFile(outputDir, "ModuleArray.html", modHtml);

    } catch (error) {
      console.error(`Error processing ${baseLoc}: ${error.message}`);
    }
  }

  /**
   * Generate JSDoc documentation for the provided source
   * @param {string} source - Source file or directory to document
   * @param {string} outputDir - Directory to output JSDoc documentation
   * @param {string} configFile - Path to JSDoc configuration file (optional)
   */
  generateJSDoc(source, outputDir, configFile) {
    if (configFile) {
      // Read the config file
      const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
      
      // Set the source to the absolute path
      config.source.include = [path.resolve(source)];
      
      // Set the destination to absolute path
      const jsdocOutput = path.resolve(outputDir, 'jsdoc');
      // Ensure the destination directory exists
      fs.mkdirSync(jsdocOutput, { recursive: true });
      // Set the destination
      config.opts.destination = jsdocOutput;
      
      // Write the modified config to a temp file
      const tempConfigPath = path.join(outputDir, 'temp-jsdoc-config.json');
      fs.writeFileSync(tempConfigPath, JSON.stringify(config, null, 2));
      
      // Use the temp config
      configFile = tempConfigPath;
    }
    
    // Pass ONLY the config file to JSDoc, not the source path
    const args = ['--configure', configFile];
    
    console.log(`Running JSDoc with args: ${args.join(' ')}`);
    const jsdocProcess = spawn('jsdoc', args, { 
      stdio: ['inherit', 'pipe', 'pipe'] 
    });

    jsdocProcess.stdout.on('data', (data) => {
      console.log(`JSDoc: ${data}`);
    });

    jsdocProcess.stderr.on('data', (data) => {
      console.error(`JSDoc Error: ${data}`);
    });
    
    jsdocProcess.on('error', (err) => {
      if (err.code === 'ENOENT') {
        console.error(`Error: JSDoc command not found. Please ensure JSDoc is installed globally (npm install -g jsdoc) or as a dependency in your project.`);
      } else {
        console.error(`Error running JSDoc: ${err.message}`);
      }
    });

    jsdocProcess.on('close', (code) => {
      if (code === 0) {
        console.log(`JSDoc documentation successfully generated in ${path.resolve(outputDir, 'jsdoc')}`);
      } else {
        console.error(`JSDoc process exited with code ${code}`);
      }
    });
  }

  /**
   * Generate standard output files (HTML and DOT)
   * ModuleArray.html, Package.dot, Relations.dot
   * @param {string} outputDir - Output directory
   * @param {Array} moduleArray - Array of modules
   * @param {Array} dependencyList - List of dependencies
   * @param {Array} exportList - List of exports
   */
  generateOutputFiles(outputDir, baseLoc, moduleArray, dependencyList, exportList) {
    // Generate Package.dot
    const pgkGraph = createPackageGraph(moduleArray, dependencyList, baseLoc);
    safeWriteFile(outputDir, "Package.dot", pgkGraph);
    // Generate Package.svg using command-line Graphviz
    this.generateSvgFromDot(path.join(outputDir, "Package.dot"), path.join(outputDir, "Package.svg"));

    // Generate Relations.dot
    const RelGraph = createRelationsGraph(dependencyList, moduleArray);
    safeWriteFile(outputDir, "Relations.dot", RelGraph);
    
    // Generate Relations.svg using command-line Graphviz
    this.generateSvgFromDot(path.join(outputDir, "Relations.dot"), path.join(outputDir, "Relations.svg"));

    // Add class diagram generation if option is specified
    if (this.program.opts().class) {
      const classGraph = createClassDiagram(exportList, dependencyList);
      safeWriteFile(outputDir, "ClassDiagram.dot", classGraph);
      this.generateSvgFromDot(path.join(outputDir, "ClassDiagram.dot"), path.join(outputDir, "ClassDiagram.svg"));
    }

    // create the graph file for packages or directories for all the modules. -g option
    if (this.program.opts().graph) {
      const depGraph = createExportGraph(dependencyList, exportList, moduleArray);
      safeWriteFile(outputDir, "ExportGraph.dot", depGraph);
      // Generate Package.svg using command-line Graphviz
      this.generateSvgFromDot(path.join(outputDir, "ExportGraph.dot"), path.join(outputDir, "ExportGraph.svg"));
    }

    // Run JSDoc if requested
    if (this.program.opts().jsdoc) {
      this.generateJSDoc(baseLoc, this.program.opts().output, this.program.opts().jsdocConfig);
    }


  }

  /**
   * Generate SVG file from DOT file using Graphviz CLI
   * @param {string} dotFilePath - Path to the DOT file
   * @param {string} svgFilePath - Path where the SVG should be saved
   */
  generateSvgFromDot(dotFilePath, svgFilePath) {
    console.log(`Generating SVG from ${dotFilePath}...`);
    
    try {
      const graphvizProcess = spawn('dot', ['-Tsvg', dotFilePath, '-o', svgFilePath]);
      
      graphvizProcess.on('error', (err) => {
        if (err.code === 'ENOENT') {
          console.error('Error: Graphviz dot command not found. Please ensure Graphviz is installed on your system.');
        } else {
          console.error(`Error running Graphviz: ${err.message}`);
        }
      });
      
      graphvizProcess.on('close', (code) => {
        if (code === 0) {
          console.log(`SVG file successfully generated: ${svgFilePath}`);
        } else {
          console.error(`Graphviz process exited with code ${code}`);
        }
      });
    } catch (error) {
      console.error(`Error generating SVG: ${error.message}`);
    }
  }

  /**
   * Generate JSON output files if requested
   * @param {string} outputDir - Output directory
   * @param {Array} moduleArray - Array of modules
   * @param {Array} dependencyList - List of dependencies
   * @param {Array} exportList - List of exports
   * @param {Array} usedList - List of used items
   * @param {Array} errors - List of errors
   */
  generateJsonOutput(outputDir, moduleArray, dependencyList, exportList, usedList, errors) {
    if (errors.length > 0) {
      jsonOut(outputDir, "Errors", errors);
    }
    jsonOut(outputDir, "ExportList", exportList);
    jsonOut(outputDir, "DependencyList", dependencyList);
    jsonOut(outputDir, "ModuleArray", moduleArray);
    jsonOut(outputDir, "UsedList", usedList);
  }

  /**
   * validates the options passed
   * @param {object} options - CLI options
   * @param {string} symbol - Path to analyze
   * @returns {string} Validated symbol path
   */
  validateOptions(options, symbol) {
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
      return symbol;
    }

    // Since graph option is commented out in the program definition,
    // we shouldn't check for it in validation
    if (options.json === undefined) {
      console.warn("No output format was specified. Using default outputs only.");
    }
    return symbol;
  }
}

/**
 * Entry point function that creates and runs the dependency graph generator
 */
export function runProgram() {
  const generator = new DependencyGraphGenerator();
  generator.runProgram();
}


