import { GraphBase } from "../core/GraphBase.js";
import { cleanDirPath } from "../utils/file-utils.js";

/**
 * Generates a class diagram showing classes and their relationships
 */
export class ClassDiagram extends GraphBase {
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
    // Prepare the directory name for the diagram title
    let title = " base Class Diagram";
    if (dir != "")  title = `${dir} Class Diagram` 
  
    // Start the digraph
    let result = this.digraph(title);
    this.classList
      .filter(cls => {
        const clsDir = cleanDirPath(cls.filePath)
        return (clsDir === dir)
      })
      .forEach((cls) => {
        result += this.createClassNode(cls);
 //       result += this.createClassRelationships(cls);
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
    nodeContent += `<TR><TD bgcolor="lightblue" align="left"><B>${className}</B></TD></TR>\n`;
    nodeContent += `<TR><TD><B>methods</B><BR/>\n`;
     classItem.methods.forEach(method => {
      const methodName = method.name;
      const params = method.parameters || "()";
      nodeContent += `${(method.isPrivate) ? "-" : "+"} ${methodName} ${params}<BR/>\n`;
    });

    nodeContent += `</TD></TR>\n`;
    nodeContent += `</TABLE>>];\n\n`;

    return nodeContent;
  }

  /**
   * Creates relationships between classes
   * 
   * @returns {string} - DOT syntax for class relationships
   */
  createClassRelationships() {
    let relationships = "";

    // Create a map of class names to their modules
    const classModuleMap = new Map();
    for (const cls of this.classList) {
      classModuleMap.set(cls.exported, cls.name);
    }

    // Look for dependencies between modules containing classes
    for (const cls of this.classList) {
      const srcModule = cls.name;

      // Find dependencies where this class's module imports other class modules
      const dependencies = this.dependencyList.filter(dep =>
        dep.src.includes(srcModule)
      );

      for (const dep of dependencies) {
        // Check if the imported module contains a class
        for (const [className, moduleName] of classModuleMap.entries()) {
          if (dep.relSrcName.includes(moduleName) && cls.exported !== className) {
            // Found a relationship between classes
            relationships += `"${cls.exported}" -> "${className}" [arrowhead=vee];\n`;
          }
        }
      }
    }

    return relationships;
  }
}