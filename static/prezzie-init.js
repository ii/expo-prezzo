import "/socket.io/socket.io.js"
import "/qrcode.min.js"
const sessionID = localStorage.getItem("sessionID")
const {socketID, secret} = JSON.parse(localStorage.getItem("token") || '{}')
console.log("INIT ITNIT", {socketID, secret})

const slideBody = document.querySelector("div.reveal")
var qrcode = document.createElement("canvas")
qrcode.id = 'qrcode-canvas'
slideBody.appendChild(qrcode)

function renderQRCode (val) {
    QRCode.toCanvas(qrcode, val, {width: 135, height: 135}, (error) => {
    if (error) {
      console.log('error rendering qr code', {error, value: val});
    } else {
      console.log('qr code success!', {value: val});
    }
  });
};

document.addEventListener("DOMContentLoaded", () => {
  const URL = window.location.origin
  const socket = io(URL, {autoConnect: false});

  renderQRCode(`${window.location.origin}/presentations.html?m=${sessionID}`);

  socket.on("set presentation", ({ presentation, sessionID }) => {
    const monitor = socket.auth.sessionID
    if (sessionID !== monitor) {
      return
    } else {
      prezzyLink = `${window.location.origin}/presentations/${presentation}/presentation_client.html`
      window.location.href = prezzyLink;
    }
  });
})

window.socketID = socketID
window.secret = secret
