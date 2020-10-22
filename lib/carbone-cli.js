#!/usr/bin/env node

const yargonaut = require("yargonaut").style("blue");
const yargs = require("yargs");
const fs = require("fs");
const carbone = require("../lib/index");
const figlet = require("figlet");
const printgenericfields = require("./printgenericfields");
const get = require("lodash/get");
const chalk = yargonaut.chalk();

const options = yargs
  .usage(
    chalk.red(figlet.textSync("KEEP SOLUTIONS")) +
      "\n\n" +
      chalk.blue("CARBONE by David Grealund") +
      "\n\n" +
      "Generate reports (odt, docx, txt, pdf, ods, xlsx, csv) via a template (odt, docx, xlsx, csv)." +
      "\n\nUsage\n -d <json data> -t <path to template> -o <json with options> -r <path of the file to render>"
  )
  .option("d", {
    alias: "data",
    describe: "path to json with data",
    type: "string",
    demandOption: true,
  })
  .option("t", {
    alias: "template",
    describe: "path to document template",
    type: "string",
    demandOption: true,
  })
  .option("r", {
    alias: "render",
    describe: "path to render the new file",
    type: "string",
    demandOption: true,
  })
  .option("o", {
    alias: "options",
    describe: "path to json with options",
    type: "string",
    demandOption: false,
  })
  .option("l", {
    alias: "language",
    describe: "the language code",
    type: "string",
    demandOption: false,
  })
  .version().argv;

let rawdata = fs.readFileSync(options.data);
let data = JSON.parse(rawdata);

let rawoptions = options.options ? fs.readFileSync(options.options) : null;
let carboneoptions = rawoptions ? JSON.parse(rawoptions) : "";
carboneoptions.lang = options.language || carboneoptions.lang || "en";

// Process the data if there are genericOptions
if (carboneoptions.generic) {
  let genericFields = carboneoptions.generic.fields;

  if (data.record) {
    let fields = [];
    genericFields.map((genericField) => {
      let value = get(data.record, genericField.field);
      let label = genericField.label[carboneoptions.lang];

      fields.push({
        label: label,
        value: printgenericfields.print(genericField, value, carboneoptions.lang),
      });
    });

    data.generic = { record: { fields: fields } };
  } else if (data.records) {
    let fields = [];

    data.records.map((record) => {
      let recordFields = [];
      genericFields.map((genericField) => {
        let value = get(record, genericField.field);
        let label = genericField.label[carboneoptions.lang];

        recordFields.push({
          label: label,
          value: printgenericfields.print(genericField, value, carboneoptions.lang),
        });
      });
      fields.push({fields: recordFields});
    });

    data.generic = { records: fields };
  }
}

// Generate a report using the sample template provided by carbone module
// This LibreOffice template contains "Hello {d.firstname} {d.lastname} !"
// Of course, you can create your own templates!
carbone.render(options.template, data, carboneoptions, function (err, result) {
  if (err) {
    return console.log(err);
  }
  // write the result
  fs.writeFileSync(options.render, result);
  console.log(chalk.green("File generated in " + options.render));
  process.exit();
});
