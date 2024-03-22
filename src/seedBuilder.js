const { connection } = require("./connection");
const fs = require("fs");
const { Request } = require("tedious");

class SeedBuilder {
  constructor(connection) {
    this.connection = connection;
    this.connection.on("connect", async (err) => {
      if (err) {
        console.log(["error", err]);
        return;
      }
      let masterMap = JSON.parse(
        fs.readFileSync("data/masterMap.json", "utf8")
      );
      await this.build(masterMap);
    });

    this.connection.connect();
  }

  async build(masterMap) {
    for (const [originTableName, tableDetails] of Object.entries(masterMap)) {
      const result = await this.magicTable(originTableName, tableDetails);
    }
    this.connection.close();
  }

  async magicTable(tableName, tableDetails) {
    const {
      gat_table: newTableName,
      column_names: columnNames,
      column_types: columnTypes,
      column_notnull: columnNotNull,
    } = tableDetails;
    console.dir(["***TABLE***", tableName]);
    const writeStream = fs.createWriteStream(`data/seeds/${newTableName}.dat`);
    writeStream.write(`${newTableName}\n`);
    writeStream.write(
      JSON.stringify(Object.entries(columnNames).map(([key, value]) => value)) +
        "\n"
    );
    const selectColumns = this.columnsForSelect(columnNames);
    return new Promise((resolve, reject) => {
      const request = new Request(
        `SELECT ${selectColumns} FROM ${tableName}`,
        (err) => err && console.log(err)
      );

      request.on("row", (columns) => {
        //console.dir(columns);
        const result = columns.map((value) => value.value);
        writeStream.write(JSON.stringify(result) + "\n");
      });

      // Close the connection after the final event emitted by the request, after the callback passes
      request.on("requestCompleted", (rowCount, more) => {
        writeStream.end();
        resolve(rowCount);
      });
      connection.execSql(request);
    }); //*/
  }

  columnsForSelect(columnNames) {
    const result = Object.entries(columnNames).map(([key, value]) => {
      return `${key} as [${value}]`;
    });
    return result.join(", ");
  }
}

new SeedBuilder(connection);
