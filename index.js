const http = require("http");
const express = require("express");
const fs = require("fs");
const fetch = require("node-fetch");
const crypto = require("crypto");
const basicAuth = require('express-basic-auth');

const opts = {
  port: process.env.PORT || 8101,
  baseDir: process.env.BASEDIR || process.cwd() + "/static",
  url: process.env.URL || "https://node.bobymcbobs.pair.sharing.io/",
};

const app = express();
const server = http.createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: opts.url,
  },
});

const rainbow = ["red", "orange", "yellow", "green", "blue", "indigo", "violet"];

const monitorState = {
  monitorID: "",
  monitorName: "",
  colour: "",
  presentation: "",
  controllerID: "",
  token: "",
  secret: "",
  dateOfBirth: "",
  lastUpdated: "",
};

let sotw = []; // the state of the app, will hold a list of MonitorStates;
let devices = [];
const LIMIT = 300;

const randomID = () => crypto.randomBytes(8).toString("hex");

const randomInLimit = () => Math.floor(Math.random() * (LIMIT - 1));

const randomInRange = (max) =>
      Math.floor(Math.random() * (max + 1));

const inRainbow = () =>
      rainbow[(sotw.length) % rainbow.length]

// const adminUsernames = process.env.APP_ADMIN_USERNAME.split(',') || ['ii']
const adminPassword = process.env.APP_ADMIN_PASSWORD || 'iiiscool'

// String => Hex
// encodes secret, s, into cryptographic hash
// we are using a deprecated, less secure method, but our threat model is v. low.
const createHash = (s) => crypto.createCipher("blowfish", s).final("hex");

const getDirectories = (path) =>
  fs
    .readdirSync(path)
    .filter((file) => fs.statSync(`${path}/${file}`).isDirectory());

async function newMonitorName() {
  const pokemons = await fetch(
    `https://pokeapi.co/api/v2/pokemon?limit=${LIMIT}&offset=${randomInLimit()}`
  );
  const pokemonData = await pokemons.json();
  const pokemon = pokemonData.results[randomInLimit()];
  const randomNumber = Math.floor(Math.random() * 9);
  return `${pokemon.name}${randomNumber}`;
}

async function newMonitor() {
  const date = new Date();
  const name = await newMonitorName();
  return {
    ...monitorState,
    monitorID: randomID(),
    monitorName: name,
    colour: inRainbow(),
    dateOfBirth: date,
    lastUpdated: date
  };
}

// => Token
// generate new token/secret pair
function updateToken() {
  const ts = new Date().getTime();
  // we are using reveal's encryption logic to make sure our tokens work with it.
  const rand = Math.floor(Math.random() * 9999999);
  const secret = ts.toString() + rand.toString();
  return {
    secret,
    token: createHash(secret),
  };
}

function updateDevices (device) {
  const existingDevice = devices.find(d => d.deviceID === device.deviceID)
  if (!existingDevice) {
    devices = [...devices, device]
  } else {
    devices = devices.map(d => (
      d.deviceId === device.deviceID
        ? {...d, device}
      : d
    ));
  }
}

// string, monitorID, MonitorState => SOTW
// given a match type and matching value,
// update  matching monitor in SOTW with new MonitorState
function updateMonitorInSOTW(match, value, newState) {
  return sotw.map((m) => {
    return m[match] === value ? { ...m, ...newState } : m;
  });
}

function getPresentations() {
  return getDirectories(opts.baseDir + "/presentations/").map(prezzie => {
    const rawData = fs.readFileSync(`${opts.baseDir}/presentations/${prezzie}/presentation.json`)
    const presentationJSON = JSON.parse(rawData)
    presentationJSON.folderName = prezzie
    return presentationJSON
  })
}

app.get('/admin.html', basicAuth({
  users: { 'ii': adminPassword },
  challenge: true
}), (req, res) => {
  res.sendFile(`${opts.baseDir}/admin.html`)
})

app.use(express.static(opts.baseDir));

io.use((socket, next) => {
  console.log({socket: socket.handshake})
  const deviceID = socket.handshake.auth.deviceID;
  if (deviceID) {
    // find existing session
    const device = devices.find(d => d.deviceID === deviceID);
    if (device) {
      socket.deviceID = deviceID;
      return next();
    }
  }
  // create new session
  socket.deviceID = randomId();
  next();
});

io.on("connection", (socket) => {
  if (socket.handshake.auth.monitor) {
    console.log(
      `[${sotw.length + 1}] monitor ${
        socket.handshake.auth.monitor.monitorName
      } connected`
    );
    // when developing, often the server restarts but the monitor sessions remain.
    // in these cases, the monitor will have an id and a name, but won't exist in the sotw.
    // here we check that and add it to the sotw
    const monitorInSOTW = sotw.find(
      (m) => m.monitorID === socket.handshake.auth.monitor.monitorID
    );
    socket.handshake.auth.monitor.lastUpdated = new Date()
    if (!monitorInSOTW) {
      sotw = [...sotw, socket.handshake.auth.monitor];
    } else {
      sotw = updateMonitorInSOTW(socket.handshake.auth.monitor)
    }
    socket.join(socket.handshake.auth.monitor.monitorID)
    socket.join(socket.deviceID);
    io.emit("SOTW updated", sotw);
  } else {
    console.log(`[${sotw.length + 1}] client device ${socket.deviceID} connected`);
    socket.join(socket.deviceID);
  }

  socket.emit("connection initialized", {
    monitor: socket.handshake.auth.monitor,
    device: socket.deviceID
  });

  socket.on("disconnect", async () => {
    let monitor = socket.handshake.auth.monitor;
    const matchingSockets = await  io.in(socket.deviceID).allSockets();
    const isDisconnected = matchingSockets.size === 0;
    if (isDisconnected) {
      const device = {deviceID: socket.deviceID, connected: false};
      updateDevices(device)
    }
    if (!monitor) {
      console.log(`[${sotw.length - 1}] ${device.deviceID} disconnected`);
      return
    }
    sotw = sotw.filter((m) => m.monitorID !== monitor.monitorID);
    console.log(
      `[${sotw.length}] Monitor ${monitor.monitorName} disconnected`
    );
    io.emit("SOTW updated", sotw)
  });

  socket.on("new monitor", async () => {
    let monitor = await newMonitor();
    sotw = [...sotw, monitor];
    socket.emit("monitor added", monitor);
    io.emit("SOTW updated", sotw)
  });

  socket.on("sync requested", (monitorName) => {
    let monitor = sotw.find(m=>m.monitorName === monitorName)
    if (!monitor) {
      console.log(`${monitorName} not found`, {sotw});
      socket.emit('expired token');
    } else {
      const { token, secret } = updateToken();
      monitor = {
        ...monitor,
        token,
        secret,
        controllerID: socket.deviceID
      }
      sotw = updateMonitorInSOTW('monitorID', monitor.monitorID, monitor);
      //to controller socket, since it sent the message
      socket.emit('synced with monitor', {
        token,
        secret,
        presentations: getPresentations()
      });
      //to the room defined by the monitor id, holding only the monitor
      socket.to(monitor.monitorID).emit('new connection', monitor)
    }
  });

  socket.on("presentation selected", ({ presentation, monitorName }) => {
    let monitor = sotw.find(m => m.monitorName === monitorName);
    if (!monitor) {
      socket.emit("error with presentation", {text: "monitor name not found", monitorName})
      return
    }
    monitor = {...monitor, presentation}
    sotw = updateMonitorInSOTW('monitorID', monitor.monitorID, monitor);
    socket.to(monitor.monitorID).emit("new presentation requested", monitor);
  });

  socket.on("state of the world requested", () => {
    if (!socket.handshake.headers.authorization) {
      console.log("no auth for", socket.handshake)
      return
    }
    socket.emit("SOTW updated", sotw)
  })
});

server.listen(opts.port || null);
console.log(`Listening on ${opts.port} and serving ${opts.baseDir}`);
