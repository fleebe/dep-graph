/* eslint-disable no-undef */
import { getModuleMap } from "../src/utils/file-fn.js";
import { processAST} from "../src/ast.js"
import fs from "fs";
import path from "path";
import { jsonOut, jsonIn } from '../src/commands/json.js';
import { createGraph } from '../src/commands/graph.js';

const deps = [
  {
    "src": "./routes.jsx",
    "importSrc": "react-router",
    "import": "IndexRoute"
  },
  {
    "src": "./client/index.jsx",
    "importSrc": "./routes",
    "import": "*makeRoutes"
  },
  {
    "src": "./routes.jsx",
    "importSrc": "react-router",
    "import": "IndexRedirect"
  },
  {
    "src": "./routes.jsx",
    "importSrc": "./components/App",
    "import": "*App"
  },
  {
    "src": "./components/App.jsx",
    "importSrc": "prop-types",
    "import": "*PropTypes"
  },
  {
    "src": "./components/App.jsx",
    "importSrc": "react",
    "import": "*React"
  },
  {
    "src": "./server/lib/http-request.js",
    "importSrc": "node-fetch",
    "import": "*originalFetch"
  },
  {
    "src": "./server/lib/http-request.js",
    "importSrc": "node-abort-controller",
    "import": "*AbortController"
  },
  {
    "src": "./server/lib/http-request.js",
    "importSrc": "node-abort-controller",
    "import": "*AbortController"
  },
  {
    "src": "./server/lib/http-request.js",
    "importSrc": "./lib",
    "import": "log"
  },
  {
    "src": "./server/lib/http-request.js",
    "importSrc": "./workers/lib",
    "import": "sleep"
  },
];



describe("unit-tests", () => {
  const output = "./out";
  const input = "./__tests__";

  beforeAll(() => {
  
  });

  test("ast", () => {
    const symbol = "./src";
    // list of dependencies between modules including the functions
    let dependencyList = [];
    // list of functions exported from modules/files
    let exportList = [];

    let importMap = new Map();
    const [moduleMap, dir] = getModuleMap(symbol);
    [dependencyList, exportList, importMap] = processAST(moduleMap, dir);

    jsonOut(output, moduleMap, exportList, dependencyList, importMap);
   // debug(moduleMap, exportList, dependencyList, importMap);
/*
    const modelModuleMap = jsonIn(path.join(input, "moduleMap.json"));
    const modelExportList = Array.from(jsonIn(path.join(input, "exportList.json")));
    const modelDependencyList = Array.from(jsonIn(path.join(input, "dependencyList.json")));
    const modelImportMap = jsonIn(path.join(input, "importMap.json"));

    expect(modelDependencyList).toEqual(dependencyList);
    expect(modelExportList).toEqual(exportList);
    expect(modelImportMap).toEqual(importMap);
    expect(modelModuleMap).toEqual(moduleMap);
*/
  })

  test("graph", () => {
    const moduleMap = jsonIn(path.join(input, "moduleMap.json"));
    const exportList = jsonIn(path.join(input, "exportList.json"));
    const dependencyList = jsonIn(path.join(input, "dependencyList.json"));
    const importMap = jsonIn(path.join(input, "importMap.json"));
    
    createGraph(moduleMap, exportList, dependencyList, importMap, output);
    const packageGraph = fs.readFileSync(path.join(output, "package.dot"), "utf-8");
    const dependencyGraph = fs.readFileSync(path.join(output, "dependencies.dot"), "utf-8");

    const modelPackageGraph = fs.readFileSync(path.join(input, "package.dot"), "utf-8");
    const modelDependencyGraph = fs.readFileSync(path.join(input, "dependencies.dot"), "utf-8");

    expect(packageGraph).toEqual(modelPackageGraph);
    expect(dependencyGraph).toEqual(modelDependencyGraph);

  })


/*
  test("moduleMap", () => {
  })


  test("json", () => {
  })

  test("debug", () => {
  })
*/
/*
  test("dir-files", () => {
    const dirArr = getDirectoriesRecursive("./src");
    const arr2 = dirArr.map((e) => { return e.replaceAll('\\', "/") });
    expect(arr2.length).toBe(3);
  })
*/
});
