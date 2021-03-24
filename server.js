const express = require("express");
const app = express();

const port = 4000;

const http = require("http");
const server = http.createServer(app);

app.use(express.static(__dirname + "/public"));

app.get('/', function (req, res) {
  res.sendFile("public/index.html", {root: __dirname});
});

server.listen(port, () => console.log(`Server is running on port ${port}`));
