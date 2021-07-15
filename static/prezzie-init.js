import "/socket.io/socket.io.js"
import "/qrcode.min.js"
const monitor = localStorage.getItem("sessionID")
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
  const socket = io(URL, {autoConnect: true});

  renderQRCode(`${window.location.origin}/presentations.html?m=${monitor}`);

  socket.on("set presentation", ({ presentation, sessionID }) => {
    console.log("setting presentation to", {presentation, sessionID})
    if (monitor !== sessionID) {
      return
    } else {
      const prezzyLink = `${window.location.origin}/presentations/${presentation}/presentation_client.html`
      window.location.href = prezzyLink;
    }
  });
  socket.on("new token", ({ sessionID, socketID, secret }) => {
    console.log({ sessionID, socketID, secret })
    if (sessionID !== monitor) {
      console.log("no match", {monitor, sessionID})
      return
    } else {
      console.log("match!", {monitor, sessionID})
      localStorage.setItem("token", JSON.stringify({ socketID }))
      window.socketID = socketID
    }

    console.log("what happening", socket.auth)
  })

})

window.socketID = socketID
window.secret = secret
