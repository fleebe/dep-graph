import { getBaseDir, getModuleMap, getDirectoriesRecursive } from "../src/utils/file-fn.js";
import { processAST} from "../src/ast.js"
import fs from "fs";
import path from "path";
import debug from '../src/commands/debug.js';
import { jsonOut, jsonIn } from '../src/commands/json.js';
import { createGraphs } from '../src/commands/graph.js';

describe("Get the base directory", () => {
  test("base-directory-file", () => {
    expect(getBaseDir(".\\src\\")).toBe("src");
    expect(getBaseDir("./src/")).toBe("src");
    expect(getBaseDir(".")).toBe("");
    expect(getBaseDir(".\\src")).toBe("src");
    expect(getBaseDir(".\\src\\cmd")).toBe("src/cmd");
    expect(getBaseDir("./")).toBe("");
    expect(getBaseDir(".\\")).toBe("");
    try {
      expect(getBaseDir("..\\..\\Spoke_NZGreens\\src\\server")).toThrow("Cannot handle .. in the path name");
    } catch (e) {
      expect(e.message).toBe("Cannot handle .. in the path name");
    }
  })
});

describe("unit tests", () => {

  const output = "./out";
  const input = "./tests";

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

    const modelModuleMap = jsonIn(path.join(input, "moduleMap.json"));
    const modelExportList = Array.from(jsonIn(path.join(input, "exportList.json")));
    const modelDependencyList = Array.from(jsonIn(path.join(input, "dependencyList.json")));
    const modelImportMap = jsonIn(path.join(input, "importMap.json"));
/*
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
    
    createGraphs(moduleMap, exportList, dependencyList, importMap, output);
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