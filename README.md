# MSSQL-converter

Connects to the upstream PMO database, retrieves data, and prepares it for import into the GDX Agreements Tracker.

## Prerequisites

### Install the MSSQL driver and tools

```bash
brew tap microsoft/mssql-release https://github.com/Microsoft/homebrew-mssql-release
BREW_NO_ENV_FILTERING=1 ACCEPT_EULA=Y brew install msodbcsql17
brew install mssql-tools
```

### Install OpenSSL 1.1 using brew:

```bash
brew uninstall openssl@3 --ignore-dependencies
brew install openssl@1.1
```

With OpenSSL 3 gone, things are left dangling; ensure OpenSSL 1.1 is used for things:

```bash
 ln -sfn /opt/homebrew/Cellar/openssl@1.1/1.1.1w /opt/homebrew/opt/openssl
```

### Test the connection:

- All database connections require a VPN connection.
- Password can be found in Code Talk Teams channel file `IT Site Support` OneNote under PMO.

```bash
sqlcmd -S dev.sql.sdlc.gcpe.bcgov -U PMORead -d Gcpe.PmoDB -Q 'SELECT * FROM contact'

```

## Setup of this tool

```bash
npm i
cp env.example .env
```

Fill in the fields in `.env`:

```bash
MSSQL_USER=PMORead
MSSQL_PASSWORD=password
MSSQL_DATABASE=Gcpe.PmoDB
MSSQL_HOST=dev.sql.sdlc.gcpe.bcgov
```

## Usage

### Maps

#### Prod Data Tables

Get on the VPN, then;


## Note!
Make sure you are using node version 16 before you go any further!!!!!


```bash
npm run makemap
# It is likely that there is already a masterMap.json in this repo, so this is now just for reference. Do not rebuild this file, simply edit the masterMap now.
#cp rawmap.json data/masterMap.json
```

Modify masterMap.json as you see fit, then;

```bash
npm run makemigrations
npm run makeseeds
```

---

**The default seed export only exports 5 rows per table. To remove the limit, remove `TOP 5` from `seedBuilder.js`.**

---

Copy the production seed data files and migrations to your project folder.

```bash
cp migrations/*.js ../gdx-agreements-tracker/backend/src/database/migrations/
cp seeds/*.dat ../gdx-agreements-tracker/backend/src/database/production_seeds/
```

Run the migration and seeder to load the data.

```bash
cd ../gdx-agreements-tracker/backend
npx knex migrate:up
npx knex seed:run --specific=999_production_seeder.js
```

#### Form Field Table

Get on the VPN, then;

```bash
npm run makeForm
# It is likely that there is already a masterFormsMap.json in this repo, so this is now just for reference. Do not rebuild this file, simply edit the masterMap now.
```

If it doesn't exist, run `cp rawForms.json data/masterFormsMap.json` to create a proper master seed file

#### modify form mapping

Modify the formBuilder.js file accordingly and then run through the Form Field Table steps again

---

Copy the masterFormsMap.json to the ./src/database/seeds folder in your local PMO application.
Run the seed to load the form data.

```bash
cd ../gdx-agreements-tracker/backend
npx knex seed:run --specific=09_form_layouts.js
```

## Details

- The original database is an MSSQL database, and this tool suite helps get the data out of the old database and into the new one.

---

- The `makemap` tool as run above simply exports metadata about the production database into a JSON "map" file that tells the remaining tools what the new table and column names will be in the new database.
  - When you run the makemap tool, it creates a file called `rawmap.json` in the tool's root directory. It puts this file here so that the `masterMap.json` file is not at risk of being overwritten.
  - The `masterMap.json` in the `data` directory was copied from `rawmap.json` early on, and now `masterMap.json` is the core file that dictates exportation by the tool. You should never need to copy `rawmap.json` to it ever again. Only update `masterMap.json` from now on.
  - The `makemap` tool determined what the new datatypes should be in Postgres vs what they were in MSSQL, but you can change them if you need to.

---

- The `makemigrations` tool as run above reads `masterMap.json` and builds a migration file based upon it.
  - `masterMap.json` has the following format:

```json
{
  "OriginalMSSQLTableName": {
    "gat_table": "new_postgres_table_name",
    "column_names": {
      "OriginalColumnName": "new_column_name",
      "AnotherOriginalColumnName": "another_new_column_name",
      "AndSoOn": "and_so_on"
    },
    "column_types": {
      "OriginalColumnName": [
        "originaltype",
        "newtype"
      ],
      "AnotherOriginalColumnName": [
        "nvarchar(50)",
        "varchar",
        length
      ],
      "AndSoOn": [
        "nvarchar(50)",
        "varchar",
        50
      ]
    },
    "column_notnull": {
      "OriginalColumnName": true,
      "AnotherOriginalColumnName": true
    }
  },
  "AnotherOriginalMSSQLTableName": {
    ...
  }
}
```

- The `column_names` section is the key part of each table section.
  - If you omit an original column from this list, it will not end up in the new database.
    - There is no penalty to leaving a removed (from `column_names`) column's `column_type` or `column_notnull` definition in place
    - There is a penalty for having a `column_names` entry with no corresponding `column_type` entry.
- The `makemigrations` tool will use the new table name, column name, and column type definition to build the migrations from.
  - The output of the tool is a single migration file that creates the data schema, and all of the new tables.
    - All of the new tables are created in a single `migrate:up` operation.
    - All of the new tables are destroyed in a single `migrate:down` operation.

---

- The `makeseeds` tool queries the old database based upon the original database's table names and columns, retrieves the data, and outputs the data into `.dat` files corresponding to the new table names that will be in the new database.
  - The `.dat` files have the following format:

```text
new_postgres_table_name
["id","new_column_name","another_new_column_name","and_so_on"]
[1,"Value for this column","value for next column","etc"]
[2,"Another value for this column","value for next column","etc"]
[3,"Yet another value for this column","value for next column","etc"]
[ ... and so on for as many rows of data ... ]
```

- The first 2 lines are a header:
  - Line 1: new table name.
  - Line 2: a JSON array of new column names.
- The remaining lines are the data:
  - A JSON array corresponding to the values for the columns listed in Line 2.
- A single seeder file (found in the gdx-agreements-tracker repo) reads each of the `.dat` files, and imports the data therein to the corresponding table, for each file.
  - Once all data has been loaded, the seeder gets Postgres to update the ID sequence for all of the data tables based on the maximum value of the id field of the now-imported table.

---

## Future

- A `makeforms` utility that makes a `formsMap.json` file based on the `column_names` and `column_types` section of each table in `masterMap.json`, taking each column type, and mapping it to the closest JSX tag for that data type.
  - The `formsMap.json` can then be:
    - Edited by hand to pick a more exact/appropriate field element.
    - Loaded into a `forms` table via a special seeder (ala `makeseeds` loader seed) for use by any page that has a form corresponding to a table.
  - For each table
    - Create a new form definition corresponding to the table name
      - Add each column from `column_names` to the definition
        - Based on the corresponding `column_type` map a corresponding element type to the column name.
