/*
 * A forum software for use in a school in China.
 * Copyright (C) 2023-2024 Fustigate & YZ9551(YXZ)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

const express = require('express');
const cors = require('cors');

// require("dotenv").config()
// const mongoClient = require("mongodb").MongoClient
// const connectionString = process.env.DB_STRING
//
// mongoClient.connect(connectionString)
//     .then(client => {
//       console.log("Connected to Database in app.js")
//       const db = client.db("forum-posts")
//       const titleCollection = db.collection("post-title")
//     })
//     .catch(error => {
//       console.log(error)
//     })

const bodyParser = require('body-parser');



const app = express();
const port = 3000;

app.use(cors()); // Enable CORS before defining routes
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const routes = require('./routes');

app.use('/api', routes);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
