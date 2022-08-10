# Description

A cli program to generate dependency .dot files for use with [Graphviz](https://graphviz.org/).

It can process a file or a directory recursively.

## Options

|     |     |     |
|----- | --- | --- |
|-V |--version |  output the version number
|-g |--graph   |produce a .dot file that graphviz can use to generate a graph of the dependencies to output directory.
|-j |--json    |produce .json object files of the dependencies to output directory.
|-o |--output \<dir\> | directory that the outputs are sent to. (default: "./out")
|-h |--help |         display help for command
