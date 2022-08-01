import fs from 'fs';

describe("graph tests", () => {
  test("test-graph", () => {
    let dep = JSON.parse(fs.readFileSync("./out/dependencyList.json"));
    const data = dep.filter(x => { return x.importSrc === "fs" });
    console.log(data);
    const key = 'import';
    const arrayUniqueByKey = [...new Map(data.map(item =>
      [item[key], item])).values()];

    console.log(arrayUniqueByKey);
  })



  
  test("filter-unique", () => {
    const array =
      [
        { "name": "Joe", "age": 17 },
        { "name": "Bob", "age": 17 },
        { "name": "Carl", "age": 35 }
      ]

    const key = 'age';


    const arrayUniqueByKey = [...new Map(array.map(item =>
      [item[key], item])).values()];

    console.log(arrayUniqueByKey);
  })


});




