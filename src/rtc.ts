export default function CreateWebCall() {
    const pc1 = new RTCPeerConnection()
    const pc2 = new RTCPeerConnection()

    pc1.createOffer().then(d => {
        console.log(`Offer Created by pc1 as ${d}`)
        return pc1.setLocalDescription()
    })
        .then(() => pc2.setRemoteDescription(pc1.localDescription!))
        .then(() => pc2.createAnswer().then(d => {
            console.log(`Offer Created by pc2 as ${d}`)
            return pc2.setLocalDescription(d)
        }))
        .then(() => pc1.setRemoteDescription(pc2.localDescription!))
}