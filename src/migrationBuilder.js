const fs = require("fs");

class MigrationBuilder {
  constructor() {
    const currentdate = new Date();
    this.migrationSerial = BigInt(
      "" +
        currentdate.getFullYear() +
        (currentdate.getMonth() + 1 < 10 ? "0" : "") +
        (currentdate.getMonth() + 1) +
        (currentdate.getDate() < 10 ? "0" : "") +
        currentdate.getDate() +
        (currentdate.getHours() < 10 ? "0" : "") +
        currentdate.getHours() +
        "0000"
    );
    this.build();
  }

  build() {
    console.log("Building...");
    const writeStream = fs.createWriteStream(
      `data/migrations/${this.migrationSerial}_autocreate_pmo_import.js`
    );
    writeStream.write(
      "exports.up = function (knex) {\n" +
        '  return knex.raw("CREATE SCHEMA IF NOT EXISTS data").then(function () {\n' +
        "    return knex.schema\n" +
        '      .withSchema("data")'
    );
    let masterMap = JSON.parse(fs.readFileSync("data/masterMap.json", "utf8"));
    Object.entries(masterMap).forEach(([originTableName, tableDetails]) => {
      //console.log(tableDetails);
      const {
        gat_table: newTableName,
        column_names: columnNames,
        column_types: columnTypes,
        column_notnull: columnNotNull,
      } = tableDetails;
      let tableResult =
        `\n      .createTable("${newTableName}", function (table) {\n` +
        "        table.increments();\n";
      //console.dir(tableDetails, { depth: 10 });
      Object.entries(columnNames).forEach(
        ([originColumnName, newColumnName]) => {
          tableResult += this.dumbResolveColumnType(
            newColumnName,
            columnTypes[originColumnName][1],
            columnNotNull[originColumnName]
          );
        }
      );
      tableResult += "      })";

      this.migrationSerial += 1n;
      writeStream.write(tableResult);
    });
    writeStream.write(
      ";\n" +
        "  });\n" +
        "};\n\n" +
        "exports.down = function (knex) {\n" +
        "  return knex.raw(\n" +
        "    \"SET session_replication_role = 'replica'; DROP SCHEMA data CASCADE; SET session_replication_role = 'origin';\"\n" +
        "  );\n" +
        "};"
    );
    console.log("Done.");
  }

  smartResolveColumnType(columnName, columnType, columnNotNull) {
    if ("id" === columnName) return;

    let result = "table.";
    let columnLength = 0;
    if (Array.isArray(columnType)) {
      columnLength = columnType[1];
      columnType = columnType[0];
    }
    switch (columnType) {
      case "text":
        result += `string("${columnName}")`;
        break;
      case "varchar":
        result += `string("${columnName}")`;
        break;
    }
    result += ";";
    return result;
  }

  dumbResolveColumnType(columnName, columnType, columnNotNull) {
    if ("id" === columnName) return "";

    let result = `        table.specificType("${columnName}", "`;
    if (Array.isArray(columnType)) {
      let columnLength = columnType[1];
      columnType = columnType[0];
      result += `${columnType}(${columnLength})`;
    } else {
      result += columnType;
    }
    result += '")';
    if (columnNotNull) {
      result += ".notNullable()";
    }
    result += ";\n";
    return result;
  }
}

new MigrationBuilder();
