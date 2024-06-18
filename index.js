// Import required modules
const jsonServer = require("json-server");
const fs = require("fs");
const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");

// Create JSON Server instance
const whisperwall = jsonServer.create();

// Read and parse existing db.json
console.log("Reading db.json");
let db = JSON.parse(fs.readFileSync("db.json", "utf-8"));
// console.log(db);

// Create middleware to convert JSON to JS
const middleware = jsonServer.defaults();

// Use middleware in the server
whisperwall.use(middleware);
whisperwall.use(bodyParser.json());

// Define endpoint for user registration
whisperwall.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const existingUser = db.users.find((user) => user.email === email);

    if (existingUser) {
      return res.status(401).json("User already exists");
    }

    // Hash password using bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      id: db.users.length + 1,
      username,
      email,
      password: hashedPassword,
    };

    db.users.push(newUser);

    // Save updated db.json
    saveDatabase();

    return res.status(201).json(newUser);
  } catch (error) {
    console.error("Error registering user:", error);
    return res.status(500).json("Internal server error");
  }
});

//define endpoint for user login
whisperwall.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const existingUser = db.users.find((user) => user.email === email);
    if (existingUser) {
      bcrypt.compare(password, existingUser.password).then(function (result) {
        if (result) {
          const token = jwt.sign({ userId: existingUser.id }, "secretsuperkey");
          res.status(200).json({ token, existingUser });
        } else {
          res.status(401).json("Can't find the user");
        }
      });
    }
  } catch (error) {
    res.status(400).json(error);
  }
});

whisperwall.post("/userMessages", (req, res) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  const { message } = req.body;

  try {
    // Verify JWT token
    const jwtResponse = jwt.verify(token, "secretsuperkey");
    console.log(jwtResponse);
    // Extract user ID from payload
    const userId = jwtResponse.userId;
    console.log(userId);

    const existingUser = db.users.find((user) => user.id === userId);
    console.log(existingUser);

    const newUser = {
      id: db.message.length + 1,
      username: existingUser.username,
      message: message,
    };
    db.message.push(newUser);

    // Save updated db.json
    saveDatabase();
    res.status(200).json("Message Added Successfully");
  } catch (error) {
    // If JWT verification fails, return authorization error
    res.status(401).json(`Authorization failed due to ${error.message}`);
  }
});

// Define endpoint to retrieve all users (GET /users)
whisperwall.get("/users", (req, res) => {
  res.json(db.users);
});
whisperwall.get("/message", (req, res) => {
  res.json(db.message);
});
// Define function to save database changes to db.json
function saveDatabase() {
  fs.writeFileSync("db.json", JSON.stringify(db, null, 2));
}

// Set server port
const PORT = process.env.PORT || 4000;

// Start server
whisperwall.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
