/**
 * Very basic camel case to snake changer.
 *
 * @param  key Camel case text.
 */
const camelToUnderscore = (key) => {
  let result = key.replace(/([A-Z]+)/g, " $1").replace(/_ /g, "_");
  return result.trim().split(" ").join("_").toLowerCase();
};

// eslint-disable-next-line jsdoc/require-returns
/**
 * Converts MSSQL data type names to Postgres data type names.
 *
 * @param  dataType SQL data type name.
 * @param  length   Field length, if applicable.
 */
const tsqlToPostgresTypeConverter = (dataType, length) => {
  let newType = dataType;
  switch (dataType) {
    case "varchar":
    case "nvarchar":
      newType = -1 === length ? "text" : ["varchar", length];
      break;
    case "bit":
      newType = "boolean";
      break;
    case "datetime":
    case "datetime2":
      newType = "timestamp";
      break;
    case "tinyint":
      newType = "smallint";
      break;
    case "float":
      newType = "double precision";
      break;
  }
  return newType;
};

module.exports = {
  camelToUnderscore,
  tsqlToPostgresTypeConverter,
};
