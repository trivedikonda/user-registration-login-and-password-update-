const express = require("express");
const bcrypt = require("bcrypt");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "userData.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

//creating user registration api

const validatePassword = (password) => {
  return password.length > 4;
};

app.post("/register/", async (request, response) => {
  const { name, username, password, gender, location } = request.body;

  const hashedPassword = await bcrypt.hash(password, 10); //saltRounds = 10
  //checking for user in the database
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    //only single user that is you
    //create user in user table
    const createUserQuery = `
        INSERT INTO
            user (username, name, password, gender, location)
        VALUES
            (
            '${username}',
            '${name}',
            '${hashedPassword}',
            '${gender}',
            '${location}'  
            );`;

    if (validatePassword(password)) {
      await db.run(createUserQuery);
      response.send("User created successfully");
    } else {
      response.status(400);
      response.send("Password is too short");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

//user login api
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;

  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const dbUser = await db.get(selectUserQuery);

  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

// update password api 
app.put("/change-password/", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const checkForUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const dbUser = await db.get(checkForUserQuery);

  if (dbUser === undefined) {
    response.status(400);
    response.send("User not registered");
  } else {
    const isPasswordValid = await bcrypt.compare(oldPassword, dbUser.password);
    if (isPasswordValid === true) {
      const newPasswordLength = newPassword.length;
      if (newPasswordLength < 5) {
        response.status(400);
        response.send("Password is too short");
      } else {
        const encryptedPassword = await bcrypt.hash(newPassword, 10);

        const updatePasswordIntoUser = `UPDATE user SET 
                username = '${username}',
                password = '${encryptedPassword}';`;
        await db.run(updatePasswordIntoUser);
        response.send("Password updated");
      }
    } else {
      response.status(400);
      response.send("Invalid current password");
    }
  }
});

module.exports = app;
