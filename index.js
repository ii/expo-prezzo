const http = require("http");
const express = require("express");
const fs = require("fs");
const fetch = require('node-fetch');
const crypto = require("crypto");
const { InMemorySessionStore } = require('./session-store');


const LIMIT = 300;

const app = express();
const server = http.createServer(app);
const sessionStore = new InMemorySessionStore();
const io = require("socket.io")(server,{
  cors: {
    origin: "https://node.bobymcbobs.pair.sharing.io/"
  }
});

const opts = {
  port: process.env.PORT || 8101,
  baseDir: process.env.BASEDIR || process.cwd() + "/static",
};

const randomID = () =>
      crypto.randomBytes(8).toString("hex");

const randomInLimit = () =>
      Math.floor(Math.random() * (LIMIT - 1));


function getDirectories(path) {
  return fs
    .readdirSync(path)
    .filter((file) => fs.statSync(`${path}/${file}`).isDirectory());
}

function saveSesh (sessionID, vals) {
  const session = sessionStore.findSession(sessionID)
  if (session) {
    sessionStore.saveSession(sessionID, {
      ...session,
      ...vals
    });
  } else {
    console.log("couldn't find session");
  }
}

app.use(express.static(opts.baseDir));

// what are the presentations
app.get("/presentations/", (req, res) => {
  var dirs = getDirectories(opts.baseDir + "/presentations/");
  res.json(dirs);
  res.end();
});



io.use((socket, next) => {
  const sessionID = socket.handshake.auth.sessionID;
  if (sessionID) {
    console.log("found session id: ", sessionID)
    const session = sessionStore.findSession(sessionID);
    if (session) {
      console.log("found session: ");
      socket.sessionID = sessionID;
      socket.isMonitor = session.isMonitor;
      socket.monitorName = session.monitorName;
      return next();
    }
  }
  socket.sessionID = randomID();
  socket.isMonitor = false;
  next();
});

io.on("connection", (socket) => {
  console.log(`session ${socket.sessionID} connected`);
  sessionStore.saveSession(socket.sessionID, {
    userID: socket.sessionID,
    isMonitor: socket.isMonitor || false,
    monitorName: socket.monitorName || '',
    presentation: socket.Presentation || '',
    connected: true,
  });
  socket.emit("session", {
    sessionID: socket.sessionID,
    isMonitor: socket.isMonitor,
    monitorName: socket.monitorName
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });

  socket.on("monitor set", async () => {
    socket.isMonitor = true;
    const pokemons =  await fetch(`https://pokeapi.co/api/v2/pokemon?limit=${LIMIT}&offset=${randomInLimit()}`);
    const pokemonData = await pokemons.json();
    const pokemon = pokemonData.results[randomInLimit()];
    saveSesh(socket.sessionID, {isMonitor: true, monitorName: pokemon.name});
    io.emit("monitor go!", {monitorName: pokemon.name});
  });

  io.emit("hello", { name: "Zach", adjective: "cool" });
});

server.listen(opts.port || null);
console.log(`Listening on ${opts.port} and serving ${opts.baseDir}`);
