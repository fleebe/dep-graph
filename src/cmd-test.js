import {Command} from 'commander';
const program = new Command();
/*
program
.name('split)
  .option('--first')
  .option('-s, --separator <char>')
  .usage('-s / --first a/b/c');

program.parse();

const options = program.opts();
const limit = options.first ? 1 : undefined;
console.log(program.args[0].split(options.separator, limit));
*/

/*
program
  .name('string-util')
  .description('CLI to some JavaScript string utilities')
  .version('0.8.0');

program.command('split')
  .description('Split a string into substrings and display as an array')
  .argument('<string>', 'string to split')
  .option('--first', 'display just the first substring')
  .option('-s, --separator <char>', 'separator character', ',')
  .action((str, options) => {
    const limit = options.first ? 1 : undefined;
    console.log(str.split(options.separator, limit));
  });
*/

program
  .name("dep-graph")
  .description(`
A cli to generate documentation for dependencies of a javascript file | directory`)
  .option("-o --output", "directory that the outputs are sent to.", "./out")
  .option('-d, --debug', 'display some debugging', false)  
  //.option("-g --graph", "produce a .dot file that graphviz can use to generate a graph of the dependencies ")
  //.option("-o --objects", "produce .json object files of the dependencies.")
  
  .argument("<file | directory>");

program.command("graph", "produce a .dot file that graphviz can use to generate a graph of the dependencies.")
  .action((str, options, cmd) => { console.log(str, "**", options, "**", cmd) });

program.command("objects", "produce.json object files of the dependencies.")
  .action((str, options, cmd) => { console.log(str, "**", options, "**", cmd) });

program.parse(process.argv); 


/*
program
  .argument('<name>')
  .option('-t, --title <honorific>', 'title to use before name')
  .option('-d, --debug', 'display some debugging')
  .action((name, options, command) => {
    if (options.debug) {
      console.error('Called %s with options %o', command.name(), options);
    }
    const title = options.title ? `${options.title} ` : '';
    console.log(`Thank-you ${title}${name}`);
  });
*/
//program.parse();
