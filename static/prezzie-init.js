const monitor = localStorage.getItem("sessionID")
const qrcodeURL= `${window.location.origin}/presentations.html?m=${monitor}`
const {socketID, secret} = JSON.parse(localStorage.getItem("token") || '{}')
window.socketID = socketID
window.secret = secret
console.log("INIT ITNIT", {socketID, secret})

document.addEventListener("DOMContentLoaded", () => {
    const URL = window.location.origin
    const socket = io(URL, {autoConnect: true});

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
            localStorage.setItem("token", JSON.stringify({ socketID }))
            window.socketID = socketID
        }

        console.log("what happening", socket.auth)
    })
})
