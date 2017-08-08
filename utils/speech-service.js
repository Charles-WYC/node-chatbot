var uuid = require('node-uuid'),
    request = require('request');
var fs = require('fs');
var xmlbuilder = require('xmlbuilder');
var SPEECH_API_KEY = 'ca4a5e57009c470fab236774e1c81b0d';

// The token has an expiry time of 10 minutes https://www.microsoft.com/cognitive-services/en-us/Speech-api/documentation/API-Reference-REST/BingVoiceRecognition
var TOKEN_EXPIRY_IN_SECONDS = 400;

var speechApiAccessToken = '';

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
                            url: 'https://5e6e04d2d0b44d14bf23d2491569390c.api.cris.ai/cris/speech/query',
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