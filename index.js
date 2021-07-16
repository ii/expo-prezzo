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

const monitorState = {
  monitorID: '',
  monitorName: '',
  presentation: '',
  controllerID: '',
  token: '',
  secret: '',
  dateOfBirth:'',
  lastUpdated:'',
}

let sotw = [];

session = sotw;

// find session
// session.find(item => item.monitorID === '')

async function newMonitor () {
  const date = new Date();
  const pokemons =  await fetch(`https://pokeapi.co/api/v2/pokemon?limit=${LIMIT}&offset=${randomInLimit()}`);
  const pokemonData = await pokemons.json();
  const pokemon = pokemonData.results[randomInLimit()];
  return {
    ...monitorState,
    monitorID: randomID(),
    monitorName: pokemon.name,
    dateOfBirth: date,
    lastUpdated: date
  }
}

// MonitorState => MonitorState
// return monitor with token and secret added
function updateToken (monitor) {
  const ts = new Date().getTime();
  // we are using reveal's encryption logic to make sure our tokens work with it.
  const rand = Math.floor(Math.random()*9999999);
  const secret = ts.toString() + rand.toString();
  const token = createHash(secret)
  return {...monitor, token, secret};
}

// monitorID, MonitorState => SOTW
function updateMonitor (id, newState) {
  return sotw.map(m => {
    return m.monitorID === id
      ? {...m, ...newState}
    : m
  })
}

// sotw = updateMonitor(id, newState)

const opts = {
  port: process.env.PORT || 8101,
  baseDir: process.env.BASEDIR || process.cwd() + "/static",
};

const randomID = () =>
      crypto.randomBytes(8).toString("hex");

const randomInLimit = () =>
      Math.floor(Math.random() * (LIMIT - 1));

const createHash = secret => {
  let cipher = crypto.createCipher('blowfish', secret);
  return cipher.final('hex');
};

function getDirectories(path) {
  return fs
    .readdirSync(path)
    .filter((file) => fs.statSync(`${path}/${file}`).isDirectory());
}

// function findSession (monitorName) {
//   return monitorState.filter(obj => )
// }

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

function getPresentations() {
  return getDirectories(opts.baseDir + "/presentations/");
}

app.use(express.static(opts.baseDir));

// io.use((socket, next) => {
//   const monitor = socket.handshake.auth.monitor;
//   if (monitor) {
//     console.log("found monitor: ", monitor.monitorID)

//     const session = sessionStore.findSession(sessionID);
//     if (session) {
//       console.log("found session: ");
//       socket.sessionID = sessionID;
//       socket.isMonitor = session.isMonitor;
//       socket.monitorName = session.monitorName;
//       return next();
//     }
//   }
//   socket.sessionID = randomID();
//   socket.isMonitor = false;
//   console.log("new session:", socket.sessionID)
//   next();
// });

io.on("connection", (socket) => {
  if (socket.handshake.auth.monitor) {
    console.log(`[${sotw.length+1}] session ${socket.handshake.auth.monitor.monitorID} connected`);
  } else {
    console.log(`[${sotw.length+1}] client session ${socket.id} connected`);
  }
  newState = updateMonitor(socket.handshake.auth.monitor);
  sotw = newState

  socket.emit("connection initialized", socket.handshake.auth.monitor);

  socket.on("disconnect", () => {
    let monitor = socket.handshake.auth.monitor;
    if (monitor) {
      sotw = sotw.filter(m => m.monitorID != monitor.monitorID);
      console.log(`[${sotw.length}] Monitor ${monitor.monitorName} disconnected`)
      console.log({sotw})
    } else {
      console.log(`[${sotw.length-1}] user disconnected`);
    }
  });

  socket.on("new monitor", async () => {
    let monitor = await newMonitor();
    sotw = [...sotw, monitor];
    socket.emit('monitor added', monitor);
  })

  socket.on("get token", (monitorName) => {
    console.log('get token request')
    let monitor = sotw.find(m => m.monitorName === monitorName);
    console.log({monitor, sotw, monitorName});
    if (typeof monitor === "undefined" || !monitor) {
      console.log("client trying to sync without a monitor")
      return
    }
    monitor = updateToken(monitor);
    sotw = updateMonitor(monitor.monitorID, monitor);
    io.emit('new token', monitor);
  })

  io.emit("hello", { name: "Zach", adjective: "cool" });

  socket.on("get presentations", () => {
    console.log("Get presentations")
    socket.emit("presentation list", { presentationsNames: getPresentations() })
  })

  socket.on("presentation request", ({ presentation , sessionID }) => {
    console.log("oooooh, presentation", {presentation, sessionID });
    io.emit("set presentation", {presentation, sessionID });
  });
});


server.listen(opts.port || null);
console.log(`Listening on ${opts.port} and serving ${opts.baseDir}`);

// socket.on('add monitor', () => {
//   monitor = newMonitor();
//   sotw = [...sotw, monitor]
//   io.emit('monitor added', monitor);
// })
