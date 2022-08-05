import { getBaseDir  } from "../src/utils/file-fn.js";
import addToMapArray from "../src/utils/map-fn.js";
import {getImportMap} from "../src/ast.js";
import { jsonOut, jsonIn } from '../src/commands/json.js';
import path from "path";

/**
 * node <path-to-jest> -i <you-test-file> -c <jest-config> -t "<test-block-name>"
 */

describe("file-fn", () => {
  it("getBaseDir", () => {
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


describe("map-fn", () => {

  it("addToMapArray", () => {
    const output = "./out";
    const input = "./__tests__";


    const map =  new Map([
      ["./", [
        "./ast.js",
        "./cmd-test.js",
        "./dep-graph.js",
        "./json-package.js"
      ]],
        ["./commands", [
          "./commands/debug.js",
          "./commands/graph.js",
          "./commands/json.js"
        ]],
          ["./utils", [
            "./utils/file-fn.js",
            "./utils/map-fn.js"
          ]
    ]]);
    const map_b = new Map([
      ["./", [
        "./ast.js",
        "./cmd-test.js",
        "./dep-graph.js",
        "./json-package.js"
      ]],
      ["./commands", [
        "./commands/debug.js",
        "./commands/graph.js",
        "./commands/json.js",
        "./commands/new.js",
      ]],
      ["./utils", [
        "./utils/file-fn.js",
        "./utils/map-fn.js"
      ]
      ]]);
      let map_a = map; 
//    const map = new Map(JSON.parse(map_a));
    const modelDependencyList = jsonIn(path.join(input, "modelDependencyList.json"));
    const modelImportMap = jsonIn(path.join(input, "modelImportMap.json"));
    let importMap = getImportMap(modelDependencyList);
    expect(importMap).toEqual(modelImportMap);

    expect(addToMapArray(modelImportMap, "./commands", [])).toEqual(modelImportMap);
    expect(addToMapArray(modelImportMap, "./commands", "")).toEqual(modelImportMap);
    expect(addToMapArray(modelImportMap, "./commands", undefined)).toEqual(modelImportMap);
    expect(addToMapArray(modelImportMap, "./commands", null)).toEqual(modelImportMap);
    expect(addToMapArray(map_a, "./commands", ["./commands/debug.js"])).toEqual(map);
    expect(addToMapArray(map_a, "./commands", "./commands/debug.js")).toEqual(map);
    expect(addToMapArray(map_a, "./commands", ["./commands/new.js"])).toEqual(map_b);
    expect(addToMapArray(map_a, "./commands", "./commands/new.js")).toEqual(map_b);
  })
});