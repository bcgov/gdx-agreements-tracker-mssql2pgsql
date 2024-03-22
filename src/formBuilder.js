const fs = require("fs");

class MigrationBuilder {
  constructor() {
    this.allObjects = [];
    this.build();
  }

  build() {
    console.log("Building...");

    let masterMap = JSON.parse(fs.readFileSync("data/masterMap.json", "utf8"));
    Object.entries(masterMap).forEach(([originTableName, tableDetails]) => {
      this.i = 0;
      //console.log(tableDetails);
      const {
        gat_table: newTableName,
        column_names: columnNames,
        column_types: columnTypes,
        column_notnull: columnNotNull,
      } = tableDetails;

      //console.dir(tableDetails, { depth: 10 });

      let outputObject = {
        associated_table: newTableName,
        definition: {},
        description: this.humanize(newTableName) + " Form",
        title: this.humanize(newTableName),
      };

      Object.entries(columnNames).forEach(
        ([originColumnName, newColumnName]) => {
          let column = this.dumbResolveColumnType(
            newColumnName,
            columnTypes[originColumnName][1],
            columnNotNull[originColumnName]
          );
          outputObject.definition = {
            ...outputObject.definition,
            ...column,
          };
        }
      );
      this.allObjects.push(outputObject);
    });
    //console.dir(this.allObjects, { depth: 10 });

    const writeStream = fs.createWriteStream(`rawForms.json`);
    writeStream.write(JSON.stringify(this.allObjects, null, 2));

    console.log("Done.");
  }

  dumbResolveColumnType(columnName, columnType, columnNotNull) {
    if ("id" === columnName) return {};

    let result = {};
    let convertResult = {};
    if (Array.isArray(columnType)) {
      let columnLength = columnType[1];
      columnType = columnType[0];

      convertResult = this.postgresToJsxTypeConverter(columnType, columnLength);
    } else {
      convertResult = this.postgresToJsxTypeConverter(columnType);
    }

    result = {
      ...result,
      ...convertResult,
      title: this.humanize(columnName),
      order: this.i++,
      label: columnName,
    };

    if (columnNotNull) {
      result = {
        ...result,
        notNull: true,
      };
    }

    return { [columnName]: result };
  }

  postgresToJsxTypeConverter(dataType, length) {
    //https://www.enterprisedb.com/blog/microsoft-sql-server-mssql-vs-postgresql-comparison-details-what-differences
    let newType = dataType;
    switch (dataType) {
      case "varchar":
      case "text":
        newType = -1 === length ? "text" : { type: "text", maxLength: length };
        break;
      case "boolean":
        newType = { type: "boolean" };
        break;
      case "timestamp":
        newType = { type: "date" };
        break;
      case "integer":
      case "int":
      case "smallint":
      case "bigint":
        newType = { type: "number" };
        break;
      case "numeric":
      case "double precision":
        newType = { type: "decimal", decimalPlaces: 2 };
        break;
      case "money":
        newType = { type: "money", moneySymbol: "" };
        break;
    }
    return newType;
  }

  humanize(str) {
    var i,
      frags = str.split("_");
    for (i = 0; i < frags.length; i++) {
      frags[i] = frags[i].charAt(0).toUpperCase() + frags[i].slice(1);
    }
    return frags.join(" ");
  }
}

new MigrationBuilder();
