const http = require("http");
const express = require("express");
const fs = require("fs");
const socketio = require("socket.io");
const app = express();
const staticDir = express.static;
const server = http.createServer(app);
const io = socketio(server);

const opts = {
  port: process.env.PORT || 8101,
  baseDir: process.env.BASEDIR || process.cwd() + "/static",
};

function getDirectories(path) {
  return fs.readdirSync(path).filter(function (file) {
    return fs.statSync(path + "/" + file).isDirectory();
  });
}

app.use(express.static(opts.baseDir));

// what are the presentations
app.get("/presentations/", (req, res) => {
  var dirs = getDirectories(opts.baseDir + "/presentations/");
  res.json(dirs);
  res.end();
});

io.on("connection", (socket) => {
  console.log("a user connected", { socket });
  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

server.listen(opts.port || null);
console.log(`Listening on ${opts.port} and serving ${opts.baseDir}`);
