import { GraphBase } from "./GraphBase.js";
import { cleanDirPath } from "../utils/file-utils.js";

/**
 * Generates a class diagram showing classes and their relationships
 */
export class ClassDiagram extends GraphBase {
  #classList = []
  #dependencyList = []

  /**
   * @param {Array} classList 
   * @param {Array} dependencyList - List of dependencies to identify relationships
   */
  constructor(dependencyList, classList) {
    super();
    this.classList = classList;
    this.dependencyList = dependencyList;
  }

  /**
   * Creates a class diagram
   * 
   * @param {string} [dir] - directory name to include in diagram title
   * @returns {string} - DOT file content for class diagram
   */
  generate(dir) {
    const dirClassList = this.classList
      .filter(cls => {
        const clsDir = cleanDirPath(cls.filePath)
        return (clsDir === dir)
      })

    if (dirClassList.length < 1)
      return null

    // Prepare the directory name for the diagram title
    let title = " base Class Diagram";
    if (dir != "") title = `${dir} Class Diagram`

    // Start the digraph
    let result = this.digraph(title);
    dirClassList
      .forEach((cls) => {
        result += this.createClassNode(cls);
        // Add inheritance relationship if a superclass exists
        if (cls.superClass) {
          // Draw an edge from subclass to superclass with an empty arrow for inheritance
          result += `"${cls.name}"->"${cls.superClass}" [arrowhead=empty];\n`;
        }
        result += `\n`
      });

    // Close the graph
    result += '}\n';
    return result;
  }

  /**
   * Creates a single class node for the diagram
   * 
   * @param {Object} classItem - The class export item
   * @returns {string} - DOT syntax for class node
   */
  createClassNode(classItem) {
    const className = classItem.name;
    let nodeContent = `"${className}" [shape=none, label=<<TABLE cellspacing="0" cellborder="1" align="left">\n`;

    // Class name header
    const superClass = (classItem.superClass) ? ":" + classItem.superClass : ""
    nodeContent += `<TR><TD bgcolor="lightblue" align="left"><B>`
    nodeContent += `${className}${superClass}</B></TD></TR>\n`;
 
    nodeContent += `<TR><TD align="left"><B>properties</B><BR/>\n`;
    classItem.properties.forEach(prop => {
      nodeContent += `${(prop.isPrivate) ? "-" : "+"} ${prop.name}<BR/>\n`;
    });
    nodeContent += `</TD></TR>\n`;

    nodeContent += `<TR><TD align="left"><B>methods</B><BR/>\n`;
    classItem.methods.forEach(method => {
      const params = method.parameters || "()";
      nodeContent += `${(method.isPrivate) ? "-" : "+"} ${method.name} ${params}<BR/>\n`;
    });
    nodeContent += `</TD></TR>\n`;

    nodeContent += `</TABLE>>];\n`;
    return nodeContent;
  }

}