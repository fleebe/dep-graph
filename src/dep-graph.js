/**
 * @fileoverview Command-line interface for the Dependency Graph Generator
 * @description This module provides the command-line interface for generating
 * dependency documentation, graphs, and analysis for JavaScript projects.
 * @module dep-graph
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
  const program = new Command();

  program.name("dep-graph")
    .version(getVersion())
    .description(`A CLI to generate documentation for dependencies of a JavaScript file or directory.`)
    .option("-j --json", "produce .json object files of the dependencies to output directory.")
    .option("-g --graph", "produce package and dependencies .dot files that graphviz can use to generate a graph of the dependencies to output directory.")
    .option("-c --class", "produce a class diagram .dot file for any classes in the codebase.")
    .option("-o --output <dir>", "directory that the outputs are sent to.", "./docs")
    .option("-d --jsdoc", "generate JSDoc documentation in the output directory.")
    .option("--jsdoc-config <file>", "path to JSDoc configuration file.", "./jsdoc.json")
    .argument("<file | directory>", "JavaScript file or directory to analyze");

  program.action((symbol, options) => {
    // make the symbol an absolute path
    if (!path.isAbsolute(symbol)) {
      symbol = path.resolve(process.cwd(), symbol);
      console.log(`Converted to absolute path: ${symbol}`);
    }

    const dp = new DependencyGraphGenerator(symbol, options)
    dp.generate();
  });

  program.parse(process.argv);
}




