const monitor = sessionStorage.getItem("sessionID")
const qrcodeURL= `${window.location.origin}/presentations.html?m=${monitor}`
const {socketID, secret} = JSON.parse(sessionStorage.getItem("token") || '{}')
window.socketID = socketID
window.secret = secret
console.log("INIT ITNIT", {socketID, secret})

document.addEventListener("DOMContentLoaded", () => {
    const URL = window.location.origin
    const socket = io(URL, {autoConnect: true});

    if (secret == null) {
      console.log("QRCODE RENDER")
      const slideBody = document.querySelector("div.reveal")
      var qrcode = document.createElement("canvas")
      qrcode.id = 'qrcode-canvas'
      QRCode.toCanvas(qrcode, qrcodeURL, {width: 135, height: 135}, (error) => {
          if (error) {
              console.log('error rendering qr code', {error, value: qrcodeURL});
          } else {
              console.log('qr code success!', {value: qrcodeURL});
          }
      })
      slideBody.appendChild(qrcode)
    } else {
        const slideBody = document.querySelector('div.reveal');
        const button = document.createElement("button");
        button.style.position = "absolute";
        button.style.top = "0";
        button.style.left = "0";
        button.textContent = "Go Back";
        button.addEventListener('click', () => window.location.href = qrcodeURL);
        slideBody.appendChild(button);
        const controls = document.querySelector('.controls');
        const slides = document.querySelector('.slides');
        slides.style.filter = "blur(13px)";
        controls.style.fontSize = "calc(100vh / 16)";
        console.log({controls, controlslayout: controls.dataset});
        controls.dataset.controlsLayout = "edges";
    }

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
        console.log("new token")
        console.table({ sessionID, socketID, secret })
        if (sessionID !== monitor) {
            console.log("no match", {monitor, sessionID})
            return
        } else {
            console.log("match!", {monitor, sessionID})
            sessionStorage.setItem("token", JSON.stringify({ socketID }))
            window.socketID = socketID
        }

        console.log("what happening", socket.auth)
    })
})
