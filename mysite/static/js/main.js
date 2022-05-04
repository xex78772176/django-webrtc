//Hello everyone 





var usernameInput = document.querySelector('#username');
var joinButton = document.querySelector('#joinButton');

//to discrimate the user and also used for speicify the signal belong to which user(sdp)
var username;
var AllPeers = {};
//function receive the message from json when receive message
function webSocketOnMessage(event){
    var receivedData = JSON.parse(event.data);
    //store peer data
    var peerUsername =receivedData['peer']
    var action =receivedData['action']
    if(username==peerUsername){
        return;

    }
    var channelname = receivedData['message']['channelname']
    //receive the create new peer action then create offer sdp
    if(action =='new-peer'){
        //call the offer function define on our own
        createOfferFunction(peerUsername,channelname);
    }

    // if it receive a offer, it will be need to send a ans back
    if(action =='new-offer'){
        var offer = receivedData['message']['sdp'];

         //call the ans function define on our own
        createAnswerFunction(offer, peerUsername, channelname)
        return;
    }

    if(action =='new-answer'){

        //if it receive the ans, then 
        var answer = receivedData['message']['sdp'];

        var peer = AllPeers[peerUsername][0];


        peer.setRemoteDescription(answer);

        return;
        
    }
}


//onclick function for join button
joinButton.addEventListener('click', () =>{
    username = usernameInput.value;
    
    console.log('username: ',username);
    if(username == ''){
        return;
    }
    
    //get the username if it is not null
    usernameInput.value = '';
    usernameInput.disabled = true;
    usernameInput.style.visibility = 'hidden';

    joinButton.disabled = true;
    joinButton.style.visibility = 'hidden';

    var labelUsername = document.querySelector('#label-username');
    labelUsername.innerHTML = username;



    var loc = window.location;
    var wsStart = 'ws://';

    //secure the web socket if the protocal is https
    if(loc.protocol == 'https:'){
        wsStart = 'wss://';

    }

   
    //url to connect consumer
    var endPoint = wsStart + loc.host + loc.pathname;
    console.log('endPoint: ',endPoint);

    //create new websocket for new instance to the boardcast consumer
    webSocket = new WebSocket(endPoint);


    //onece the connection is done, send log message 
    webSocket.addEventListener('open',(e) => {
        console.log('connect opened!');

        //call offer function
        sendSignal('new-peer',{});
    });

   
    webSocket.addEventListener('message',webSocketOnMessage);


    //console checking
    webSocket.addEventListener('close',(e) => {
        console.log('connect closed!');

    });
    //console checking
    webSocket.addEventListener('error',(e) => {
        console.log('error occur!');

    });
});

//get the local media
var localStream = new MediaStream();


const constraints = {
    'video':true,
    'audio': true
};


const localVideo = document.querySelector('#local-video');

const Audiobutton = document.querySelector('#audiobutton');
const Videobutton = document.querySelector('#videobutton');

var videores1 = document.querySelector('#res1button');
var videores2 = document.querySelector('#res2button');


videores1.addEventListener('click', videores1Onclick );
videores2.addEventListener('click', videores2Onclick );






function videores1Onclick(){

    var videoList = document.getElementsByTagName("video");

    for(index in videoList){
        videoList[index].className = 'videolow';
    }
    return;
}

function videores2Onclick(){
    var videoList = document.getElementsByTagName("video");

    for(index in videoList){
        videoList[index].className = 'videomid';
    }
    return;
}









var userMedia = navigator.mediaDevices.getUserMedia(constraints)
    .then(stream =>{
        localStream=stream;
        localVideo.srcObject = localStream;
        localVideo.muted = true;

        var audioTracks = stream.getAudioTracks();
        var videoTracks = stream.getVideoTracks();

        audioTracks[0].enabled = true;
        videoTracks[0].enabled = true;

        Audiobutton.addEventListener('click', () =>{
            audioTracks[0].enabled =!audioTracks[0].enabled;

            if(audioTracks[0].enabled){
                Audiobutton.innerHTML = 'Audio Mute';

                return;
            }
            Audiobutton.innerHTML = 'Audio UnMute';
        });

        Videobutton.addEventListener('click', () =>{
            videoTracks[0].enabled =!videoTracks[0].enabled;

            if(videoTracks[0].enabled){
                Videobutton.innerHTML = 'Video off';

                return;
            }
            Videobutton.innerHTML = 'Video on';
        });






    })
    .catch(error =>{
        console.log('Error occur on media',error);
    })
    
var msgbutton = document.querySelector('#sendmsgbutton');
var inputMessage =  document.querySelector('#msg');
var msgList = document.querySelector('#message-list');


msgbutton.addEventListener('click', MsgButtonOnclick );

function MsgButtonOnclick(){

    var msg = inputMessage.value;

    var li = document.createElement('li');
    li.appendChild(document.createTextNode('Me: '+ msg));
    msgList.appendChild(li);

    var dataChannels = getDataChannels();

    msg = username+ ': ' + msg;

    for(index in dataChannels){
        dataChannels[index].send(msg);
    }
    inputMessage.value = '';
}
  
//send sdp to server
function sendSignal(action, message){
    var jsonStr = JSON.stringify({
            'peer': username,
            'action': action,
            'message': message,
            
        });
    webSocket.send(jsonStr);
}

//establish peer connection
function createOfferFunction(peerUsername,channelname){
    var peer = new RTCPeerConnection(null);

    //add the audio and video to peer connection
    addLocalTracks(peer);

    var datachannel = peer.createDataChannel('channel');
    datachannel.addEventListener('open',() => {
        console.log('connection opened')
    });

    datachannel.addEventListener('message', datachannelOnMessage);

    //create remote video element
    var remoteVideo = createVideo(peerUsername);
    //assigned the track the remote stream
    setOnTrack(peer,remoteVideo);

    AllPeers[peerUsername] = [peer,datachannel];

    //function when the peer disconnected
    peer.addEventListener('iceconnectionstatechange', ()=>{
        var iceConnectionState = peer.iceConnectionState;

        if(iceConnectionState === 'failed' || iceConnectionState ==='disconnected' || iceConnectionState ==='closed'){
            delete AllPeers[peerUsername];
            if(iceConnectionState !='closed'){
                peer.close();
            } 

            removeVideo(remoteVideo);
        }
    });
    //receive icecandiate function
    peer.addEventListener('icecandidate',(event)=>{
        if(event.candidate){
            console.log('new ice candidate;', JSON.stringify(peer.localDescription));
            return;
        }
        //send the offer sdp to new peer
        sendSignal('new-offer', {
            'sdp': peer.localDescription,
            'channelname': channelname,
        });
    });


    peer.createOffer()
    .then(o => peer.setLocalDescription(o))
    .then(()=> {
        console.log('local description set successfully.');
    });
}


function createAnswerFunction(offer, peerUsername, channelname){
    var peer = new RTCPeerConnection(null);

    //add the audio and video to peer connection
    addLocalTracks(peer);


    //create remote video element
    var remoteVideo = createVideo(peerUsername);
    //assigned the track the remote stream
    setOnTrack(peer,remoteVideo);

    peer.addEventListener('datachannel', e=>{
        peer.datachannel= e.channel;

        peer.datachannel.addEventListener('open',() => {
            console.log('connection opened')
        });
    
        peer.datachannel.addEventListener('message', datachannelOnMessage);

        AllPeers[peerUsername] = [peer,peer.datachannel];
    })

    

    //function when the peer disconnected
    peer.addEventListener('iceconnectionstatechange', ()=>{
        var iceConnectionState = peer.iceConnectionState;

        if(iceConnectionState === 'failed' || iceConnectionState ==='disconnected' || iceConnectionState ==='closed'){
            delete AllPeers[peerUsername];
            if(iceConnectionState !='closed'){
                peer.close();
            } 

            removeVideo(remoteVideo);
        }
    });
    //receive icecandiate function
    peer.addEventListener('icecandidate',(event)=>{
        if(event.candidate){
            console.log('new ice candidate;', JSON.stringify(peer.localDescription));
            return;
        }
        //send the ans sdp to sender
        sendSignal('new-answer', {
            'sdp': peer.localDescription,
            'channelname': channelname,
        });
    });


    peer.setRemoteDescription(offer)
        .then(() =>{
            console.log('remote description set successfully for %s.', peerUsername);

            return peer.createAnswer();
        })
        .then(a =>{
            console.log('ans created');

            peer.setLocalDescription(a);
        })
}



function addLocalTracks(peer){
    //get everytrack from localstream to added to peer connection

    
    localStream.getTracks().forEach(track =>{
        peer.addTrack(track,localStream)
    });

    return;
}
var messageList = document.querySelector('#message-list');
function datachannelOnMessage(event){
    var message = event.data;

    var li = document.createElement('li');
    li.appendChild(document.createTextNode(message));
    messageList.appendChild(li);

}


//create the video element for incoming peer in html page
function createVideo(peerUsername){
    var videoContainer = document.querySelector('#video-container');

    var remoteVideo = document.createElement('video');

    remoteVideo.id = peerUsername +'-video';
    remoteVideo.autoplay = true;
    remoteVideo.playsInline = true;
    remoteVideo.className = localVideo.className;

    var videoWrapper = document.createElement('div');

    videoContainer.appendChild(videoWrapper);

    videoWrapper.appendChild(remoteVideo);

    return remoteVideo;
}

//add the remote video
function setOnTrack(peer,remoteVideo){
    var remoteStream = new MediaStream();

    //remote own video
    remoteVideo.srcObject = remoteStream;


    //on tracking function for receive the track from peer
    peer.addEventListener('track', async(event) =>{
        //assigned the track to remote stream
        remoteStream.addTrack(event.track,remoteStream);

    });

}

//remove the video normal like remote video
function removeVideo(Video){

    var videoWrapper = Video.parentNode;

    videoWrapper.parentNode.removeChild(videoWrapper);
}

function getDataChannels(){
    var dataChannels = [];

    //loop for all the user 
    for(peerUsername in AllPeers){
        var dataChannel = AllPeers[peerUsername][1];
        dataChannels.push(dataChannel);

    }

    return dataChannels;
}