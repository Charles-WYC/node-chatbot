var sio = require('socket.io');
var Swagger = require('swagger-client');
var rp = require('request-promise');
var fs = require("fs");
var path = require("path");
var speechService = require('./speech-service.js');


var Duplex = require('stream').Duplex; 
function bufferToStream(buffer) { 
    var stream = new Duplex();
    stream.push(buffer);
    stream.push(null);
    return stream;
}
function streamToBuffer(stream) { 
     return new Promise(function(resolve, reject){
     var buffers = [];
     stream.on('error', reject);
     stream.on('data', function(data){buffers.push(data);});
     stream.on('end', function() {resolve(Buffer.concat(buffers));});
     });
}
module.exports = {
    connection : function(server){
         var sio = require("socket.io")(server);
         sio.sockets.on("connection", function(socket) {
            
            var flag = 0;
            // config items
            var pollInterval = 500;  // 查询发送问题间隔
            var sendInterval = 200;   // 查询答案响应间隔

            var waitTimeout = 30000;  // 若问题30s未回答，自动停止等待问题答案

            var waitAnswer = null;

            var directLineSecret = 'w1Sp253Z-Zo.cwA.ORg.lMGIiFXq9ps4AcPmJXI7u0nJu1BufwUgcA4Jdos6L6k';
            var directLineClientName = socket.id;
            var directLineSpecUrl = 'https://docs.botframework.com/en-us/restapi/directline3/swagger.json';

            var questions = new Array();
            //var socket = null;   // socket 变成全局变量故自动共享socket了。。。现在使用闭包

            var directLineClient = rp(directLineSpecUrl)
                .then(function (spec) {
                    // client
                    return new Swagger({
                        spec: JSON.parse(spec.trim()),
                        usePromise: true
                    });
                })
                .then(function (client) {
                    // add authorization header to client
                    client.clientAuthorizations.add('AuthorizationBotConnector', new Swagger.ApiKeyAuthorization('Authorization', 'Bearer ' + directLineSecret, 'header'));
                    return client;
                })
                .catch(function (err) {
                    console.error('Error initializing DirectLine client', err);
                });

            // once the client is ready, create a new conversation 
            directLineClient.then(function (client) {
                    client.Conversations.Conversations_StartConversation()                          // create conversation
                        .then(function (response) {
                            return response.obj.conversationId;
                        })                            // obtain id
                        .then(function (conversationId) {
                            sendMessages(client, conversationId);                        // start send question
                            pollMessages(client, conversationId);                        // start write qa pair
                        });
            });

            // Read question and send it to conversation using DirectLine client
            function sendMessages(client, conversationId) {
                // 从接受队列中读取问题，发送给bot进行处理
                setInterval(function(){
                    if(flag==0){  // use flag to wait for answering
                        if(questions.length == 0){
                            //console.log("wait for anwser");
                        } 
                        else {
                            question = questions.shift();
                            console.log("发送问题： "+ question);
                            
                            waitAnswer = setTimeout(function(){
                                flag=0;
                            },waitTimeout);

                            // send message
                            //console.log(directLineClientName);
                            client.Conversations.Conversations_PostActivity(
                            {
                                conversationId: conversationId,
                                activity: {
                                    textFormat: 'plain',
                                    text: question,
                                    type: 'message',
                                    from: {
                                        id: directLineClientName,
                                        name: directLineClientName
                                    }
                                }
                            }).catch(function (err) {
                                console.error('Error sending message:', err);
                            });
                            flag = 1;
                        }
                    }
                    },sendInterval);
            }

            // get anwser
            function pollMessages(client, conversationId) {
                var watermark = null;
                setInterval(function () {
                    client.Conversations.Conversations_GetActivities({ conversationId: conversationId, watermark: watermark })
                        .then(function (response) {
                            watermark = response.obj.watermark;    // use watermark so subsequent requests skip old messages 
                            return response.obj.activities;
                        })
                        .then(printMessages);
                }, pollInterval);
            }

            // send answer
            function printMessages(activities) {
            
                if (activities && activities.length && flag!=0) {
                    // ignore own messages
                    //console.dir(activities);
                    activities = activities.filter(function (m) { return m.from.id != directLineClientName });
                    //console.dir(activities);
                    if (activities.length) {
                        for(var i =0; i<activities.length;i++){
                            var activity = activities[i];
                            if (activity.text && activity.inputHint == 'acceptingInput') {
                                socket.emit('send answer',activity.text);
                                speechService.getAudioStreamFromText(activity.text)
                                    .then(function (blob) {
                                        socket.emit('send audio',blob);
                                    })
                                    .catch(function (error) {
                                        session.send('Oops! Something went wrong. Try again later.');
                                        console.error(error);
                                    });
                            console.log('anwser',activity.text);
                                flag = 0;
                                clearTimeout(waitAnswer);
                            }
                        }
                    }
                }
            }
            console.log('客户端建立连接');
            // 接收文本问题
            socket.on('get question',function(data){
                console.log(data);
                questions.push(data);
            });
            // 接收音频问题
            socket.on('get audio',function(blob){
                // var arrayBuffer = new Uint8Array(blob).buffer;
                // // var buffer = new Buffer( new Uint8Array(ab) );
                // console.log(arrayBuffer );
                // socket.emit('send audio',arrayBuffer );
    
                var stream = bufferToStream(blob);
                var stream1 = bufferToStream(blob);
                // custom speech api
                speechService.customStreamToText(stream)
                        .then(function(results) {
                            var text = results[0].name;
                            text=text.substring(0,text.length-1); //删除最后的句号 
                            console.log('置信度: ',results[0].confidence);
                            console.log('自定义语音识别: ',text);
                            socket.emit('get text',text);
                            questions.push(text);
                        })
                        .catch(function (error) {
                            session.send('Oops! Something went wrong. Try again later.');
                            console.error(error);
                        });

                speechService.getTextFromAudioStream(stream1)
                        .then(function (text) {
                            console.log('默认语音识别: ',text);
                            //socket.emit('get text',text);
                            //questions.push(text);
                        })
                        .catch(function (error) {
                            session.send('Oops! Something went wrong. Try again later.');
                            console.error(error);
                        });
               
            });
            });

        // socket = sio.listen(server);
        // socket.on('connection',function(socket){ // connection 监听 默认事件
        //     console.log('客户端建立连接');
        //     // 接收文本问题
        //     socket.on('get question',function(data){
        //         console.log(data);
        //         questions.push(data);
        //     });
        //     // 接收音频问题
        //     socket.on('get audio',function(blob){
        //         // var arrayBuffer = new Uint8Array(blob).buffer;
        //         // // var buffer = new Buffer( new Uint8Array(ab) );
        //         // console.log(arrayBuffer );
        //         // socket.emit('send audio',arrayBuffer );
    
        //         var stream = bufferToStream(blob);

        //         console.log('get blob');
        //         speechService.getTextFromAudioStream(stream)
        //                 .then(function (text) {
        //                     console.log(text);
        //                     socket.emit('get text',text);
        //                     questions.push(text);
        //                 })
        //                 .catch(function (error) {
        //                     session.send('Oops! Something went wrong. Try again later.');
        //                     console.error(error);
        //                 });
               
        //     });
        //     });
    }
}