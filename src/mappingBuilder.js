const { connection } = require("./connection");
const { camelToUnderscore, tsqlToPostgresTypeConverter } = require("./common");
const fs = require("fs");
const { Request } = require("tedious");

class MappingBuilder {
  constructor(connection) {
    this.connection = connection;
    this.connection.on(
      "connect",
      function (err) {
        if (err) {
          console.log(["error", err]);
          return;
        }
        this.build();
      }.bind(this)
    );
  }
  build() {
    console.log("Building a map");
    let map = {};
    //let alltypes = [];
    const tables = new Request(
      "SELECT DISTINCT t.name, isc.column_name, isc.data_type, CAST(CASE isc.is_nullable WHEN 'YES' THEN 1 ELSE 0 END AS BIT), isc.character_maximum_length, isc.ORDINAL_POSITION " + //, chk.definition " +
        "FROM sys.sysobjects as t " +
        "LEFT JOIN information_schema.columns as isc ON t.name = isc.table_name " +
        //"LEFT JOIN sys.columns as sc ON isc.column_name = sc.name " +
        //"LEFT JOIN sys.check_constraints chk ON sc.object_id = chk.parent_object_id " +
        "WHERE t.xtype = 'U' AND t.name not like '%_Old' " +
        "ORDER BY t.name, isc.ORDINAL_POSITION",
      (err) => err && console.log(err)
    )
      .on("row", (columns) => {
        let [table, column, data_type, nullable, char_len] = columns;
        //alltypes.push(char_len.value ? `${data_type.value}(${char_len.value})` : data_type.value);
        //console.log([table.value, column.value, data_type.value]);
        map[table.value] = {
          ...map[table.value],
          gat_table: camelToUnderscore(table.value),
          column_names: {
            ...map[table.value]?.column_names,
            [column.value]: camelToUnderscore(column.value),
          },
          column_types: {
            ...map[table.value]?.column_types,
            [column.value]: [
              char_len.value
                ? `${data_type.value}(${char_len.value})`
                : data_type.value,
              tsqlToPostgresTypeConverter(data_type.value, char_len.value),
            ],
          },
        };
        if (!nullable.value) {
          map[table.value] = {
            ...map[table.value],
            column_notnull: {
              ...map[table.value]?.column_notnull,
              [column.value]: !nullable.value,
            },
          };
        }
        // if (constraint.value) {
        //   console.log(constraint);
        //   map[table.value] = {
        //     ...map[table.value],
        //     column_constraint: {
        //       ...map[table.value]?.column_constraint,
        //       [column.value]: (
        //         map[table.value]?.column_constraint[column.value] || []
        //       ).push(constraint.value),
        //     },
        //   };
        // }
      })
      .on("requestCompleted", (rowCount, more) => {
        //console.dir(map, { depth: 10 });
        //console.log([...new Set(alltypes)]);
        this.connection.close();

        fs.writeFileSync("rawmap.json", JSON.stringify(map, null, 2), "utf-8");
      });

    this.connection.execSql(tables);
  }
}

connection.connect();
new MappingBuilder(connection);
