import json
from channels.generic.websocket import AsyncWebsocketConsumer

class BoardcastsConsumer(AsyncWebsocketConsumer):
    #function when client connect to consumer
    async def connect(self):
        self.room_group_name = 'Room'

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    #function for leave the room
    async def disconnect(self, close):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name

        )
        print("disconnect");

    #function for receive websocket msg
    async def receive(self, text_data):
        #load json data
        msg = json.loads(text_data);
        
        action = msg['action'];

        if (action == 'new-offer' ) or (action == 'new-answer'):
            
            channelname = msg['message']['channelname']
            msg['message']['channelname'] = self.channel_name

            await self.channel_layer.send(
            channelname,
            {
                "type":'send.sdp',
                "msg":msg,
            }
        )
            return

        msg['message']['channelname'] = self.channel_name;

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type":'send.sdp',
                "msg":msg,
            }
        )
    #funciton send websocket msg 
    async def send_sdp(self, event):
        msg = event['msg']
        #save the msg into json format
        await self.send(text_data = json.dumps(msg))

        
