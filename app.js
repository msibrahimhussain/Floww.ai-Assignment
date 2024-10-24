const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const databasePath = path.join(__dirname, "transactionsList.db");

const app = express();

app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

function authenticateToken(request, response, next) {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
}

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const databaseUser = await database.get(selectUserQuery);
  if (databaseUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      password,
      databaseUser.password
    );
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

app.post("/transactions/", authenticateToken, async (request, response) => {
  const { id, type, category, amount, date, description } = request.body;
  const postTransactionQuery = `
  INSERT INTO
    district (id, type, category, amount, date, description)
  VALUES
    (${id}, '${type}', ${category}, ${amount}, ${date}, ${description});`;
  await database.run(postTransactionQuery);
  response.send("transaction Successfully Added");
});

app.get("/transactions/", authenticateToken, async (request, response) => {
  const getTransactionsQuery = `
    SELECT
      *
    FROM
      transactions;`;
  const transactionsArray = await database.all(getTransactionsQuery);
  response.send(transactionsArray);
});

app.get("/transactions/:id/", authenticateToken, async (request, response) => {
  const { id } = request.params;
  const getTransactionQuery = `
    SELECT 
      *
    FROM 
      transactions 
    WHERE 
      id = ${id};`;
  const transaction = await database.get(getTransactionQuery);
  response.send(transaction);
});
/*
const createTransactionsTableQuery = `
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount INTEGER,
  date DATE NOT NULL
);`;

const createTransactionTable = async () => {
  try {
    await db.run(createTransactionsTableQuery);
    console.log("transactions table created successfully.");
  } catch (error) {
    console.error(`Error creating transactions table: ${error.message}`);
  }
};

createTransactionTable();

const createCategoryTableQuery = `
CREATE TABLE IF NOT EXISTS category (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
);`;

const createCategoryTable = async () => {
  try {
    await db.run(createCategoryTableQuery);
    console.log("category table created successfully.");
  } catch (error) {
    console.error(`Error creating category table: ${error.message}`);
  }
};

createCategoryTable();


*/
