const { connection } = require("./connection");
const Request = require("tedious").Request;
const TYPES = require("tedious").TYPES;

const executeStatement = () => {
  //const request = new Request("exec sp_columns contact", err => {
  //const request = new Request("SELECT * FROM SYSOBJECTS WHERE xtype= 'U'", err => {
  const request = new Request(
    // "SELECT ROW_NUMBER() OVER(ORDER BY name ASC) AS Row#, name FROM SYSOBJECTS WHERE xtype= 'U' AND name not like '%_Old' ORDER BY name",
    //"SELECT name FROM SYSOBJECTS WHERE xtype= 'U' AND name not like '%_Old' ORDER BY name",

    "SELECT /* obj_table.NAME      AS 'table', \n" +
      "        columns.NAME        AS 'column',\n" +
      "        obj_Constraint.NAME AS 'constraint',\n" +
      "        obj_Constraint.type AS 'type',\n" +
      "        sss.name as 'schema',*/\n" +
      "        'ALTER TABLE [' + ltrim(rtrim(sss.name))+'].['+ltrim(rtrim(obj_table.name)) + '] DROP CONSTRAINT [' + obj_Constraint.NAME + '];' As 'Wrong_Implicit_Constraint',\n" +
      "        'ALTER TABLE [' + ltrim(rtrim(sss.name))+'].['+ltrim(rtrim(obj_table.name)) + '] ADD CONSTRAINT [' + CASE obj_Constraint.type \n" +
      "        WHEN 'D' THEN 'DF' WHEN 'F' THEN 'FK' \n" +
      "        WHEN 'U' THEN 'UX' WHEN 'PK' THEN 'PK' WHEN 'N' THEN 'NN' WHEN 'C' THEN 'CK' \n" +
      "        END + '_' + ltrim(rtrim(obj_table.name)) + '_' + columns.NAME + ']' +\n" +
      "        CASE obj_Constraint.type WHEN 'D' THEN ' DEFAULT (' + dc.definition +') FOR [' + columns.NAME + ']'\n" +
      "        WHEN 'C' THEN ' CHECK (' + cc.definition +')'\n" +
      "        ELSE '' END +\n" +
      "        ';' As 'Right_Explicit_Constraint'\n" +
      "    FROM   sys.objects obj_table \n" +
      "        JOIN sys.objects obj_Constraint ON obj_table.object_id = obj_Constraint.parent_object_id \n" +
      "        JOIN sys.sysconstraints constraints ON constraints.constid = obj_Constraint.object_id \n" +
      "        JOIN sys.columns columns ON columns.object_id = obj_table.object_id \n" +
      "            AND columns.column_id = constraints.colid \n" +
      "        left join sys.schemas sss on obj_Constraint.schema_id=sss.schema_id \n" +
      "        left join sys.default_constraints dc on dc.object_id = obj_Constraint.object_id\n" +
      "        left join sys.check_constraints cc on cc.object_id = obj_Constraint.object_id\n" +
      "    WHERE obj_Constraint.type_desc LIKE '%CONSTRAINT'\n" +
      "    AND RIGHT(obj_Constraint.name,10) LIKE '[_][_]________' --match double underscore + 8 chars of anything\n" +
      "    AND RIGHT(obj_Constraint.name,8) LIKE '%[A-Z]%'          --Ensure alpha in last 8\n" +
      "    AND RIGHT(obj_Constraint.name,8) LIKE '%[0-9]%'                 --Ensure numeric in last 8\n" +
      "    AND RIGHT(obj_Constraint.name,8) not LIKE '%[^0-9A-Z]%' --Ensure no special chars\n",

    (err) => {
      if (err) {
        console.log(err);
      }
    }
  );
  let result = "";
  request.on("row", (columns) => {
    columns.forEach((column) => {
      console.log(column);
      if (null === column.value) {
        // console.log('NULL');
      } else {
        result += '"' + column.value + '": {\n\t\n}\n' + " ";
      }
    });
    //console.log(result);
    result = "";
  });

  request.on("done", (rowCount, more) => {
    console.log(rowCount + " rows returned");
  });

  // Close the connection after the final event emitted by the request, after the callback passes
  request.on("requestCompleted", (rowCount, more) => {
    connection.close();
  });
  connection.execSql(request);
};

// Attempt to connect and execute queries if connection goes through
connection.on("connect", (err) => {
  if (err) {
    console.log(["error", err]);
  } else {
    console.log("Connected");
  }
  executeStatement();
});

connection.connect();
