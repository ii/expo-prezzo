const { token, secret } = JSON.parse(sessionStorage.getItem("monitor"));
const isMonitor = window.location.pathname.includes("presentation_client.html");
const URL = window.location.origin;
const socket = io(URL, { autoConnect: false });
const deviceID = localStorage.getItem("device");
window.socketID = token;
window.secret = isMonitor ? null : secret;

let prezzoStyle = document.createElement("link");
prezzoStyle.rel = "stylesheet";
prezzoStyle.type = "text/css";
prezzoStyle.href = "/stylesheets/main.css";
document.head.appendChild(prezzoStyle);

function addQRCodeToDOM(monitorName) {
  const slideBody = document.querySelector("div.reveal");
  const qrcodeURL = `${window.location.origin}/presentations.html?m=${monitorName}`;
  const monitor = JSON.parse(sessionStorage.getItem("monitor"));
  const colour = monitor.colour || "green";
  let prezzieInfoDiv = document.createElement("div");
  prezzieInfoDiv.classList.add("monitor-qrcode");
  prezzieInfoDiv.classList.add(colour);
  let prezzieInfoText = document.createElement("p");
  prezzieInfoText.textContent = `Scan to take control`;
  let qrcode = document.createElement("canvas");
  qrcode.id = "qrcode-canvas";
  QRCode.toCanvas(qrcode, qrcodeURL, { width: 135, height: 135 }, (error) => {
    if (error) {
      console.log("error rendering qr code", { error, value: qrcodeURL });
    } else {
      console.log("qr code success!", { value: qrcodeURL });
    }
  });
  prezzieInfoDiv.appendChild(qrcode);
  prezzieInfoDiv.appendChild(prezzieInfoText);
  slideBody.appendChild(prezzieInfoDiv);
}

function addButtonsToDOM(monitorName) {
  const { colour } = JSON.parse(sessionStorage.getItem("monitor"));
  const slideBody = document.querySelector("div.reveal");
  const button = document.createElement("button");
  const qrcodeURL = `${window.location.origin}/presentations.html?m=${monitorName}`;
  console.log({ qrcodeURL });
  button.classList.add("presentation-return-button");
  button.classList.add(colour);
  button.textContent = "🔙 Return to ii.nz career options";
  button.addEventListener("click", () => (window.location.href = qrcodeURL));
  document.body.appendChild(button);

  let iiLink = document.createElement("button");
  iiLink.addEventListener(
    "click",
    () => (window.location.href = "https://ii.nz")
  );
  iiLink.textContent = "Find out more about ii.nz ⏩";
  iiLink.classList.add("presentation-ii-link-button");
  iiLink.classList.add(colour);
  document.body.appendChild(iiLink);

  const controls = document.querySelector(".controls");
  const slides = document.querySelector(".slides");

  slides.style.filter = "blur(13px)";
  controls.style.fontSize = "calc(100vh / 16)";
  controls.dataset.controlsLayout = "edges";
  controls.dataset.controls = "false";
}

if (isMonitor) {
  socket.on("new monitor name", (m) => {
    sessionStorage.setItem("monitor", JSON.stringify(m));
    addQRCodeToDOM(m.monitorName);
  });

  socket.on("reset all monitors requested", () => {
    console.log("resetting monitor");
    sessionStorage.clear();
    window.location.href = `${window.location.origin}/monitor.html`;
  });

  socket.on("new presentation requested", (m) => {
    sessionStorage.setItem("monitor", JSON.stringify(m));
    window.location.href = `${URL}/presentations/${m.presentation}/presentation_client.html`;
  });

  let monitor = JSON.parse(sessionStorage.getItem("monitor"));
  // monitorDebug.textContent = 'is a monitor ' + monitor.monitorName;
  // deviceDebug.textContent = 'and the device ' + monitor.controllerID;
  if (!monitor) {
    console.error(
      "on monitor presentation without monitor set, you want to resync"
    );
  }
  socket.auth = { monitor, deviceID };
  socket.connect();
  socket.emit("new name requested", monitor);
} else {
  console.log({ deviceID });
  console.log("i am a phone");
  socket.on(
    "synced with monitor",
    ({ token, secret, colour, presentations }) => {
      sessionStorage.setItem(
        "monitor",
        JSON.stringify({ token, secret, colour })
      );
    }
  );
  socket.on("new monitor name", (monitorName) => {
    // monitorDebug.textContent = "got a ping from the monitor"
    console.log("time to head back", monitorName);
    // monitorDebug.textContent = "new monitor name "  = monitorName
    addButtonsToDOM(monitorName);
  });
  console.log("i am still a phone");
  socket.on("monitor name supplied", (monitorName) => {
    // monitorDebug.textContent = "monitor name suppplied to me"
    addButtonsToDOM(monitorName);
  });
  socket.auth = { deviceID };
  socket.connect();
  socket.emit("get monitor name for controller");
}
