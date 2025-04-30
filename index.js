#! /usr/bin/env node

import { runProgram } from "./src/dep-graph.js";

// from root directory where this file is.
// install for testing `npm i -g .`
// uninstall `npm uninstall -g dep-graph`
// command line running `node . -g -j ./src`
// help `node . --help`
// testing `yarn test`

// https://hackernoon.com/publishing-a-nodejs-cli-tool-to-npm-in-less-than-15-minutes


runProgram();
