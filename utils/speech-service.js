var uuid = require('uuid');
var request = require('request');
var fs = require('fs');
var xmlbuilder = require('xmlbuilder');
var SPEECH_API_KEY = 'ca4a5e57009c470fab236774e1c81b0d';

// The token has an expiry time of 10 minutes https://www.microsoft.com/cognitive-services/en-us/Speech-api/documentation/API-Reference-REST/BingVoiceRecognition
var TOKEN_EXPIRY_IN_SECONDS = 400;

var speechApiAccessToken = '';

// bing speech api
exports.getTextFromAudioStream = function (stream) {
    return new Promise(
        function (resolve, reject) {
            if (!speechApiAccessToken) {
                try {
                    authenticate(function () {
                        streamToText(stream, resolve, reject);
                    });
                } catch (exception) {
                    reject(exception);
                }
            } else {
                streamToText(stream, resolve, reject);
            }
        }
    );
};

exports.getAudioStreamFromText = function (text) {
    return new Promise(
        function (resolve, reject) {
            if (!speechApiAccessToken) {
                try {
                    authenticate(function () {
                        textToStream(text, resolve, reject);
                    });
                } catch (exception) {
                    reject(exception);
                }
            } else {
                textToStream(text, resolve, reject);
            }
        }
    );
};


function authenticate(callback) {
    var requestData = {
        url: 'https://api.cognitive.microsoft.com/sts/v1.0/issueToken',
        headers: {
            'content-type': 'application/x-www-form-urlencoded',
            'Ocp-Apim-Subscription-Key': SPEECH_API_KEY
        }
    };

    request.post(requestData, function (error, response, token) {
        if (error) {
            console.error(error);
        } else if (response.statusCode !== 200) {
            console.error(token);
        } else {
            speechApiAccessToken = 'Bearer ' + token;

            // We need to refresh the token before it expires.
            setTimeout(authenticate, (TOKEN_EXPIRY_IN_SECONDS - 60) * 1000);
            if (callback) {
                callback();
            }
        }
    });
}

// 老 bing speech api，也可以用
// function streamToText(stream, resolve, reject) {
//     var speechApiUrl = [
//         'https://speech.platform.bing.com/recognize?scenarios=smd',
//         'appid=D4D52672-91D7-4C74-8AD8-42B1D98141A5',
//         'locale=zh-CN',
//         'device.os=wp7',
//         'version=3.0',
//         'format=json',
//         'form=BCSSTT',
//         'instanceid=0F8EBADC-3DE7-46FB-B11A-1B3C3C4309F5',
//         'requestid=' + uuid.v4()
//     ].join('&');

//     var speechRequestData = {
//         url: speechApiUrl,
//         headers: {
//             'Authorization': speechApiAccessToken,
//             'content-type': 'audio/wav; codec=\'audio/pcm\'; samplerate=16000'
//         }
//     };

//     stream.pipe(request.post(speechRequestData, function (error, response, body) {
//         if (error) {
//             reject(error);
//         } else if (response.statusCode !== 200) {
//             reject(body);
//         } else {
//             resolve(JSON.parse(body).header.name);
//         }
//     }));
// }

// 新API
function streamToText(stream, resolve, reject) {

    var speechApiUrl = [
        'https://speech.platform.bing.com/speech/recognition/conversation/cognitiveservices/v1?language=zh-CN',
        'format=simple',
        'requestid=' + uuid.v4()
    ].join('&');

    var speechRequestData = {
        url: speechApiUrl,
        headers: {
            'Authorization': speechApiAccessToken,
            'content-type': 'audio/wav; codec=\'audio/pcm\'; samplerate=16000'
        }
    };
    stream.pipe(request.post(speechRequestData, function (error, response, body) {
        if (error) {
            reject(error);
        } else if (response.statusCode !== 200) {
            reject(body);
        } else {
            resolve(JSON.parse(body).DisplayText);
        }
    }));
}

function textToStream(msg, resolve, reject){
     var ssml_doc = xmlbuilder.create('speak')
        .att('version', '1.0')
        .att('xml:lang', 'zh-CN')
        .ele('voice')
        .att('xml:lang', 'zh-CN')
        .att('xml:gender', 'Female')
        .att('name', 'Microsoft Server Speech Text to Speech Voice (zh-CN, Yaoyao, Apollo)')
        .txt(msg)
        .end();
    var post_speak_data = ssml_doc.toString();
    request.post({
            url: 'https://speech.platform.bing.com/synthesize',
            body: post_speak_data,
            headers: {
                'content-type' : 'application/ssml+xml',
                'X-Microsoft-OutputFormat' : 'riff-16khz-16bit-mono-pcm',
                'Authorization': 'Bearer ' + speechApiAccessToken,
                'X-Search-AppId': '07D3234E49CE426DAA29772419F436CA',
                'X-Search-ClientID': '1ECFAE91408841A480F00935DC390960',
                'User-Agent': 'TTSNodeJS'
            },
            encoding: null
        }, function (err, resp, speak_data) {
            if (err || resp.statusCode != 200) {
                console.log(err, resp.body);
            } else {
                try {
                    resolve(speak_data);                    
                } catch (e) {
                    console.log(e.message);
                }
            }
        });   
}

// custom speech api
exports.customStreamToText = function(stream) {
    return new Promise(
        function (resolve, reject) {
            var apiKey = '9fbe1d10df014d888bfa4659dbb07196';
            request.post({
                url: 'https://westus.api.cognitive.microsoft.com/sts/v1.0/issueToken',
                headers: {
                    'Ocp-Apim-Subscription-Key' : apiKey
                }
            }, function (err, resp, access_token) {
                if (err || resp.statusCode != 200) {
                    console.log(err, resp.body);
                } else {
                    try {
                        var speechRequestData = {
                            url: 'https://7629b0300d254e419411c9ff3db3cc4f.api.cris.ai/cris/speech/query',
                            headers: {
                                'Authorization': access_token,
                                'content-type': 'audio/wav; codec=\'audio/pcm\'; samplerate=16000'
                            }
                        };
                        stream.pipe(request.post(speechRequestData, function (error, response, body) {
                            if (error) {
                                reject(error);
                            } else if (response.statusCode !== 200) {
                                reject(body);
                            } else {
                                resolve(JSON.parse(body).results);
                                // results = JSON.parse(body).results;
                                // if(results.length>0){
                                //     console.log(JSON.parse(body).results[0].name);
                                //     console.log(JSON.parse(body).results[0].confidence);                           
                                
                                // }else{
                                //     console.log('null');
                                // }
                            }
                        }));
                    } catch (e) {
                        console.log(e.message);
                    }
                }
    });
    });
}

// speaker recognition api
var profileIds = '60c07a63-c9eb-4ea7-b302-f3817cb2019b,cba6dd25-5d0f-480a-b159-88f50d553fa5,df622f1e-4c25-44d6-bc55-bc708c4b45a5,bb23215c-2ed5-44b0-9b5f-d1ab1daeb85f'

var names ={
    '60c07a63-c9eb-4ea7-b302-f3817cb2019b': '王哲',
    'cba6dd25-5d0f-480a-b159-88f50d553fa5': '张霄远',
    'df622f1e-4c25-44d6-bc55-bc708c4b45a5': '超超',
	'bb23215c-2ed5-44b0-9b5f-d1ab1daeb85f': '容嘉'
};
var speaker_apiKey = '5be52522bae74b69babd27d5a79733a4';
exports.speaker_identification = function(stream) {
    return new Promise(
        function (resolve, reject) {
            var speechApiUrl = [
                'https://westus.api.cognitive.microsoft.com/spid/v1.0/identify?identificationProfileIds=' + profileIds,
                'shortAudio=true'
            ].join('&');
            try {
                var speechRequestData = {
                    url: speechApiUrl,
                    headers: {
                        'Ocp-Apim-Subscription-Key' : speaker_apiKey,
                        'content-type': 'application/octet-stream'
                    }
                };
                stream.pipe(request.post(speechRequestData, function (error, response, body) {
                    if (error) {
                        reject(error);
                    } else if (response.statusCode == 202) {
                        var operationId = response.headers['operation-location'];
                        //console.log(operationId);
                        var flag = 0;
                        var operationInterval = setInterval(function(){
                            flag = flag + 1;
                            console.log('尝试读取识别结果: ',flag);
                            speaker_getOperationStatus(operationId,function(data){
                                if(data.hasOwnProperty('processingResult')){
                                    var id = data['processingResult']["identifiedProfileId"];
                                    var confidence = data['processingResult']["confidence"];
                                    console.log(id,confidence);
                                    if(names.hasOwnProperty(id)){
                                        resolve(names[id]);
                                    }
                                    else{
                                        resolve('未知');
                                    }
                                    clearInterval(operationInterval);
                                }
                            });

                        },3000);

                       var operationTimeout = setTimeout(function(){
                            clearInterval(operationInterval);
                        },10000); 
                    } else {
                        reject(body);
                    }
                }));
            } catch (e) {
                console.log(e.message);
            }
        });
}

function speaker_getOperationStatus(operationId,callback){
    var requestData = {
        url: operationId,
        headers: {
            'Ocp-Apim-Subscription-Key': speaker_apiKey
        }
    };

    request.get(requestData, function (error, response, body) {
        if (error) {
            console.error(error);
        } else if (response.statusCode !== 200) {
            console.error(body);
        } else {
            callback(JSON.parse(body));
        }
    });
}

module.exports.speaker_getOperationStatus = speaker_getOperationStatus;