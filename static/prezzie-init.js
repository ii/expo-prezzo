const { token, secret } = JSON.parse(
  sessionStorage.getItem("monitor")
);
const isMonitor = window.location.pathname.includes("presentation_client.html");
window.socketID = token;
window.secret = isMonitor ? null : secret;

let prezzoStyle = document.createElement('link')
prezzoStyle.rel = 'stylesheet'
prezzoStyle.type = 'text/css'
prezzoStyle.href = '/stylesheets/main.css'
document.head.appendChild(prezzoStyle)

function addQRCodeToDOM (monitorName) {
  const slideBody = document.querySelector("div.reveal");
  const qrcodeURL = `${window.location.origin}/presentations.html?m=${monitorName}`;
  let qrcode = document.createElement("canvas");
  qrcode.id = "qrcode-canvas";
  QRCode.toCanvas(qrcode, qrcodeURL, { width: 135, height: 135 }, (error) => {
    if (error) {
      console.log("error rendering qr code", { error, value: qrcodeURL });
    } else {
      console.log("qr code success!", { value: qrcodeURL });
    }
  });
  slideBody.appendChild(qrcode);
}

function addButtonsToDOM (monitorName) {
  const slideBody = document.querySelector("div.reveal");
  const button = document.createElement("button");
  const qrcodeURL = `${window.location.origin}/presentations.html?m=${monitorName}`;
  console.log({qrcodeURL})
  button.classList.add("presentation-return-button")
  button.textContent = "🔙 Return to ii.nz career options";
  button.addEventListener("click", () => (window.location.href = qrcodeURL));
  document.body.appendChild(button);

  let iiLink = document.createElement('button')
  iiLink.addEventListener('click', () => (window.location.href = 'https://ii.nz'))
  iiLink.textContent = 'Find out more about ii.nz ⏩'
  iiLink.classList.add("presentation-ii-link-button")
  document.body.appendChild(iiLink)

  const controls = document.querySelector(".controls");
  const slides = document.querySelector(".slides");

  slides.style.filter = "blur(13px)";
  controls.style.fontSize = "calc(100vh / 16)";
  controls.dataset.controlsLayout = "edges";
}

document.addEventListener("DOMContentLoaded", () => {
  const URL = window.location.origin;
  const socket = io(URL, { autoConnect: false });
  const deviceID = localStorage.getItem("device");

  if (isMonitor) {
    let monitor = JSON.parse(sessionStorage.getItem("monitor"));
    if (!monitor) {
      console.error("on monitor presentation without monitor set, you want to resync");
    }
    socket.auth = { monitor , deviceID };
    socket.connect();

    socket.emit("new name requested", monitor);
    socket.on("new monitor name", (monitor) => {
      sessionStorage.setItem("monitor", JSON.stringify(monitor));
      addQRCodeToDOM(monitor.monitorName);
    });

    socket.on("new presentation requested", monitor => {
      sessionStorage.setItem("monitor", JSON.stringify(monitor));
      window.location.href = `${URL}/presentations/${monitor.presentation}/presentation_client.html`;
    });
  } else {
    socket.auth = { deviceID };
    socket.connect();
    socket.on("new monitor name", (monitorName) => {
      console.log('time to head back', monitorName)
      addButtonsToDOM(monitorName)
    });
  }
});
