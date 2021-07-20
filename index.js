const http = require("http");
const express = require("express");
const fs = require("fs");
const fetch = require("node-fetch");
const crypto = require("crypto");

const opts = {
  port: process.env.PORT || 8101,
  baseDir: process.env.BASEDIR || process.cwd() + "/static",
  url: process.env.URL || "https://node.bobymcbobs.pair.sharing.io/"
};

const app = express();
const server = http.createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: opts.url
  },
});

const monitorState = {
  monitorID: "",
  monitorName: "",
  presentation: "",
  controllerID: "",
  token: "",
  secret: "",
  dateOfBirth: "",
  lastUpdated: "",
};

let sotw = []; // the state of the app, will hold a list of MonitorStates;

const LIMIT = 300;

const randomID = () =>
      crypto.randomBytes(8).toString("hex");

const randomInLimit = () =>
      Math.floor(Math.random() * (LIMIT - 1));

// String => Hex
// encodes secret, s, into cryptographic hash
// we are using a deprecated, less secure method, but our threat model is v. low.
const createHash = (s) =>
  crypto.createCipher("blowfish", s).final("hex");

const getDirectories = (path) => (
  fs.readdirSync(path)
    .filter((file) => fs.statSync(`${path}/${file}`).isDirectory()));

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
    dateOfBirth: date,
    lastUpdated: date,
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
    token: createHash(secret)
  }
}

// string, monitorID, MonitorState => SOTW
// given a match type and matching value,
// update  matching monitor in SOTW with new MonitorState
function updateMonitorInSOTW(match, value, newState) {
  return sotw.map((m) => {
    return m[match] === value
      ? { ...m, ...newState }
      : m;
  });
}

app.use(express.static(opts.baseDir));

io.on("connection", (socket) => {
  if (socket.handshake.auth.monitor) {
    console.log(`[${sotw.length + 1}] monitor ${socket.handshake.auth.monitor.monitorName} connected`);
    // when developing, often the server restarts but the monitor sessions remain.
    // in these cases, the monitor will have an id and a name, but won't exist in the sotw.
    // here we check that and add it to the sotw
    const monitorInSOTW = sotw.find(m => m.monitorID === socket.handshake.auth.monitor.monitorID);
    if (!monitorInSOTW) {
      sotw = [...sotw, socket.handshake.auth.monitor];
    }
  } else {
    console.log(`[${sotw.length + 1}] client session ${socket.id} connected`);
  }

  socket.emit("connection initialized", socket.handshake.auth.monitor);

  socket.on("disconnect", () => {
    let monitor = socket.handshake.auth.monitor;
    if (monitor) {
      sotw = sotw.filter((m) => m.monitorID != monitor.monitorID);
      console.log(
        `[${sotw.length}] Monitor ${monitor.monitorName} disconnected`
      );
    } else {
      console.log(`[${sotw.length - 1}] user disconnected`);
    }
  });

  socket.on("new monitor", async () => {
    let monitor = await newMonitor();
    sotw = [...sotw, monitor];
    socket.emit("monitor added", monitor);
  });

  socket.on("new token requested", (monitorName) => {
    const monitor = sotw.find((m) => m.monitorName === monitorName);
    const { token, secret } = updateToken(monitor);
    if (typeof monitor === "undefined" || !monitor) {
      console.log("client trying to sync without a monitor", {monitorName, sotw});
      return;
    } else {
      console.log("new token requested");
      sotw = updateMonitorInSOTW(
        'monitorID', monitor.monitorID,
        {...monitor,
         token,
         secret
        }
      );
      io.emit("new token supplied", sotw);
    }
  });
  socket.on("new monitor name requested", async (monitor) => {
    const monitorState = sotw.find((m) => m.token === monitor.token);
    // generate new monitor name
    const monitorName = await newMonitorName();
    // update monitor state with that name
    sotw = updateMonitorInSOTW(
      'monitorID', monitorState.monitorID,
      {...monitorState,
       monitorName,
      }
    );
    io.emit("new monitor name assigned", sotw)
  })

  socket.on("presentations requested", () => {
    socket.emit("presentations supplied", {
      presentations: getDirectories(opts.baseDir + "/presentations/")
    });
  });

  socket.on("presentation selected", ({ presentation, monitorName }) => {
    sotw = updateMonitorInSOTW('monitorName', monitorName, { presentation })
    io.emit("monitor presentation updated", sotw);
  });
});

server.listen(opts.port || null);
console.log(`Listening on ${opts.port} and serving ${opts.baseDir}`);
