const { monitorName, token, secret } = JSON.parse(
  sessionStorage.getItem("monitor")
);
const qrcodeURL = `${window.location.origin}/presentations.html?m=${monitorName}`;
const isMonitor = window.location.pathname.includes("presentation_client.html");
window.socketID = token;
window.secret = isMonitor ? null : secret;
console.log("INIT ITNIT", {
  monitorName,
  token,
  secret,
  window: window.location,
});

const localMonitor = () => JSON.parse(sessionStorage.getItem("monitor"));

document.addEventListener("DOMContentLoaded", () => {
  const URL = window.location.origin;
  const socket = io(URL, { autoConnect: false });

  if (isMonitor) {
    let monitor = JSON.parse(sessionStorage.getItem("monitor"));
    if (!monitor)
      console.error(
        "on monitor presentation without monitor set, you want to resync"
      );
    socket.auth = { monitor };
    socket.connect();
    const slideBody = document.querySelector("div.reveal");
    var qrcode = document.createElement("canvas");
    qrcode.id = "qrcode-canvas";
    QRCode.toCanvas(qrcode, qrcodeURL, { width: 135, height: 135 }, (error) => {
      if (error) {
        console.log("error rendering qr code", { error, value: qrcodeURL });
      } else {
        console.log("qr code success!", { value: qrcodeURL });
      }
    });
    slideBody.appendChild(qrcode);

    socket.on("new token supplied", (sotw) => {
      thisMonitor = localMonitor();
      monitorState = sotw.find((m) => m.monitorID === thisMonitor.monitorID);
      if (monitorState) {
        sessionStorage.setItem("monitor", JSON.stringify(monitorState));
      } else {
        console.error("local monitor doesn't exist in sotw.", {
          thisMonitor,
          sotw,
        });
      }
    });

    socket.on("new monitor name assigned", (sotw) => {
      let monitorState = sotw.find((m) => m.token === localMonitor().token);
      console.log({ monitorState });
      if (monitorState) {
        sessionStorage.setItem("monitor", JSON.stringify(monitorState));
      }
    });

    socket.on("monitor presentation updated", (sotw) => {
      const monitorState = sotw.find(
        (m) => m.monitorName === localMonitor().monitorName
      );
      sessionStorage.setItem("monitor", JSON.stringify(monitorState));
      let presentationPath = `/presentations/${monitorState.presentation}/presentation_client.html`;
      if (window.location.pathname !== presentationPath) {
        window.location.href = `${window.location.origin}${presentationPath}`;
      }
    });
  } else {
    socket.connect();
    const slideBody = document.querySelector("div.reveal");
    const button = document.createElement("button");
    button.style.position = "absolute";
    button.style.top = "0";
    button.style.left = "0";
    button.textContent = "Go Back";
    button.addEventListener("click", () => (window.location.href = qrcodeURL));
    slideBody.appendChild(button);
    const controls = document.querySelector(".controls");
    const slides = document.querySelector(".slides");
    slides.style.filter = "blur(13px)";
    controls.style.fontSize = "calc(100vh / 16)";
    console.log({ controls, controlslayout: controls.dataset });
    controls.dataset.controlsLayout = "edges";

    socket.on("new token supplied", (sotw) => {
      sessionStorage.deleteItem("monitor");
      window.location.href = "https://ii.nz";
    });
  }
});
