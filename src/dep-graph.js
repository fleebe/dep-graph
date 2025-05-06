/**
 * @fileoverview Command-line interface for the Dependency Graph Generator
 * @description This module provides the command-line interface for generating
 * dependency documentation, graphs, and analysis for JavaScript projects.
 * @requires commander
 * @requires fs
 * @requires path
 * @requires url
 * @requires ./DependencyGraphGenerator
 */

import { Command } from 'commander';
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import { DependencyGraphGenerator } from './DependencyGraphGenerator.js';

/**
 * Retrieves the package version from package.json
 * @returns {string} The version string from package.json
 * @throws {Error} If package.json cannot be read or parsed
 */
function getVersion() {
  // sets the filename global to this file
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const packageJSONPath = path.resolve(__dirname, "../package.json");
  const content = fs.readFileSync(packageJSONPath, { encoding: "utf8" });
  const config = JSON.parse(content);
  return config.version;
}

/**
 * Initializes and runs the CLI program
 * @returns {void}
 * @description Sets up the command-line interface with all available options
 * and executes the dependency graph generator based on provided arguments
 */
export function runProgram() {
  console.log("Command-line arguments:", process.argv); // Log the arguments
  const program = new Command();

  program.name("dep-graph")
    .version(getVersion())
    .description(`A CLI to generate documentation for dependencies of a JavaScript file or directory.`)
    .option("-j, --json", "produce .json object files of the dependencies to output directory.")
    .option("-g, --graph", "produce package and dependencies .dot files that graphviz can use to generate a graph of the dependencies to output directory.")
    .option("-c, --class", "produce a class diagram .dot file for any classes in the codebase.")
    .option("-d, --jsdoc", "generate JSDoc documentation in the output directory.")
    .option("-o, --output <dir>", "directory that the outputs are sent to.")
    .option("--jsdoc-config <file>", "path to JSDoc configuration file.", "./jsdoc.json")
    .option("--config <config-file>", "path to configuration JSON file with all options")
    .argument("<file | directory>", "JavaScript file or directory to analyze");
  try {
     program.action((symbol, options) => {
      // make the symbol an absolute path
      if (!path.isAbsolute(symbol)) {
        symbol = path.resolve(process.cwd(), symbol);
      }

      // If config file provided, read options from it
      if (options.config) {
        try {
          const configPath = path.isAbsolute(options.config)
            ? options.config
            : path.resolve(process.cwd(), options.config);

          console.log(`Reading configuration from: ${configPath}`);
          const configContent = fs.readFileSync(configPath, { encoding: "utf8" });
          const configOptions = JSON.parse(configContent);

          // Start with config file options
          const mergedOptions = { ...configOptions };

          // Only override with command line options that were explicitly provided
          // Get the explicitly provided options from command line (not default values)
          const explicitOptions = program.opts();
          const providedOptionNames = program.options
            .filter(opt => opt.short || opt.long)
            .map(opt => opt.attributeName())
            .filter(name => explicitOptions[name] !== undefined &&
              process.argv.some(arg =>
                arg === `--${name}` ||
                arg === `-${program.options.find(o => o.attributeName() === name)?.short?.replace('-', '')}`
              )
            );

          // Only override with explicitly provided options
          providedOptionNames.forEach(name => {
            mergedOptions[name] = explicitOptions[name];
          });

          // Use the merged options
          options = mergedOptions;
        } catch (error) {
          console.error(`Error reading config file: ${error.message}`);
          process.exit(1);
        }
      }

      const dp = new DependencyGraphGenerator(symbol, options)
      dp.generate();
    });

    program.parse(process.argv);


  }
  catch (error) {
    console.error(`Error parsing command line arguments: ${error.message}`);
    process.exit(1);
  }
}




