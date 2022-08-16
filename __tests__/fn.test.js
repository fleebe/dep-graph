/* eslint-disable no-undef */
import { addToMapArray, getBaseDir, getModuleArray, hasExtension, removeExtension, } from "../src/utils/file-fn.js";
import { getImportMap } from "../src/ast.js";
import { jsonIn } from '../src/commands/json.js';
import path from "path";
import { fileURLToPath } from 'url';
import fs from "fs";

/**
 * node <path-to-jest> -i <you-test-file> -c <jest-config> -t "<test-block-name>"
 * node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand --detectOpenHandles",
* yarn test -i fn -t "file-fn" 
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
  });

  it("extensions", () => {
    expect(hasExtension("mydir/myfile.js", [".js", ".jsx"])).toBe(true);
    expect(hasExtension("./mydir/myfile", [".js", ".jsx"])).toBe(false);
    expect(hasExtension("mydir/myfile.txt", [".js", ".jsx"])).toBe(false);
    expect(hasExtension("mydir/myfile.j", [".js", ".jsx"])).toBe(false);
    expect(hasExtension("mydir/myfile.test.js", [".js"])).toBe(true);
    expect(hasExtension("mydir/myfile.test.js", [])).toBe(false);

    expect(removeExtension("mydir/myfile.js")).toBe("mydir/myfile");
    expect(removeExtension("mydir/myfile")).toBe("mydir/myfile");
    expect(removeExtension("mydir/myfile.test.js")).toBe("mydir/myfile.test");
  });
});


describe("moduleMap", () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  console.log(__dirname);
  console.log(process.cwd());
  //  process.chdir("..");
  //  console.log(process.cwd());

  it("map-file", () => {
    let mm1;
    let root;
    let symbol = "./src/commands/graph.js";
    fs.stat(symbol, (err, stat) => {
      // for some reason the fs.lstat doesn't work when this is first called
      // it gets called later where it does work so cannot figure out how to test.
      [mm1, root] = getModuleArray(symbol, stat);


      let map = new Map([
        ["./src/commands", [
          "./graph.js"
        ]]
      ]);
      expect(mm1).toEqual(map);
      //    [mm1, root] = getModuleMap("src/commands/graph.js");
      expect(root).toEqual("./src/commands");
      //    expect(mm1).toEqual(map);
    });

  });
});


describe("map-fn", () => {

  it("addToMapArray", () => {
    //   const output = "./out";
    const input = "./__tests__";


    const map = new Map([
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