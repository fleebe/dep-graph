import { getBaseDir, getImportList }  from "../src/file-fn";
import fs from "fs";
import path from "path";

describe("Get the base directory", () => {
  test("base-directory-file", () => {
    expect(getBaseDir(".\\src\\")).toBe("./src");
    expect(getBaseDir("./src/")).toBe("./src");
    expect(getBaseDir(".")).toBe("./");
    expect(getBaseDir(".\\src")).toBe("./src");
    expect(getBaseDir(".\\src\\cmd")).toBe("./src/cmd");
    expect(getBaseDir("./")).toBe("./");
    expect(getBaseDir(".\\")).toBe("./");
    expect(getBaseDir("..\\..\\Spoke_NZGreens\\src\\server")).toBe("../../Spoke_NZGreens/src/server");
  })

  test("directory-files", () => {
    let moduleList = getImportList("./src")
    for (let i = 0; i < moduleList.length; i++) {
      console.log(moduleList[i]);
     }
 })
});
