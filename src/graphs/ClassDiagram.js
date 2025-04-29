import { GraphBase } from "../core/GraphBase.js";

/**
 * Generates a class diagram showing classes and their relationships
 */
export class ClassDiagram extends GraphBase {
  /**
   * @param {Array} exportList - List of exports to identify classes
   * @param {Array} dependencyList - List of dependencies to identify relationships
   */
  constructor(exportList, dependencyList) {
    super();
    this.exportList = exportList;
    this.dependencyList = dependencyList;
  }

  /**
   * Creates a class diagram
   * 
   * @returns {string} - DOT file content for class diagram
   */
  generate() {
    let result = this.digraph("Class Diagram");
    
    // Filter out classes from exportList
    this.classes = this.exportList.filter(exp => 
      exp.type === "ClassDeclaration" || 
      (exp.type === "ExportSpecifier" && exp.exported.endsWith("Class"))
    );
    
    // Create nodes for each class
    for (const classItem of this.classes) {
      result += this.createClassNode(classItem);
    }
    
    // Add relationships between classes
    result += this.createClassRelationships();
    
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
    const className = classItem.exported;
    let nodeContent = `"${className}" [shape=none, label=<<TABLE cellspacing="0" cellborder="1">\n`;
    
    // Class name header
    nodeContent += `<TR><TD bgcolor="lightblue" align="center"><B>${className}</B></TD></TR>\n`;
    
    // Properties section (placeholder - could be enhanced with property detection)
    nodeContent += `<TR><TD align="left">properties</TD></TR>\n`;
    
    // Methods section - find methods that belong to this class
    nodeContent += `<TR><TD align="left">\n`;
    
    // Look for methods in the export list that might belong to this class
    const classMethods = this.exportList.filter(exp => 
      exp.type === "FunctionDeclaration" && 
      (exp.name.includes(classItem.name) || exp.exported.startsWith(className))
    );
    
    for (const method of classMethods) {
      const methodName = method.exported;
      const params = method.params || "()";
      nodeContent += `${methodName}${params}<BR/>\n`;
    }
    
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
    for (const cls of this.classes) {
      classModuleMap.set(cls.exported, cls.name);
    }
    
    // Look for dependencies between modules containing classes
    for (const cls of this.classes) {
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