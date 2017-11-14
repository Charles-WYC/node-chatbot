

var $messages = $('.messages-content'),
    d, h, m,
    i = 0;

$(window).load(function() {
  $messages.mCustomScrollbar();
});

function updateScrollbar() {
  $messages.mCustomScrollbar("update").mCustomScrollbar('scrollTo', 'bottom', {
    scrollInertia: 10,
    timeout: 0
  });
}

function setDate(){
  d = new Date()
  if (m != d.getMinutes()) {
    m = d.getMinutes();
    $('<div class="timestamp">' + d.getHours() + ':' + m + '</div>').appendTo($('.message:last'));
  }
}
function newMap(mapName, startAddress, endAddress) {
  var map = new BMap.Map(mapName);
  map.centerAndZoom(new BMap.Point(121.442614,31.031583), 22);
  var walking = new BMap.WalkingRoute(map, {renderOptions:{map: map, autoViewport: true}});
  walking.search(startAddress, endAddress);
}

function insertMessage() {
  msg = $('.message-input').val();
  if ($.trim(msg) == '') {
    return false;
  }
  socket.emit('get question',msg);
  $('<div class="message message-personal">' + msg + '</div>').appendTo($('.mCSB_container')).addClass('new');
  setDate();
  $('.message-input').val(null);
  $('<div class="message loading new"><figure class="avatar"><img src="https://c1.staticflickr.com/5/4331/36518609605_4ff8556cbb.jpg" /></figure><span></span></div>').appendTo($('.mCSB_container'));
  updateScrollbar();
  // socket.emit('get question',msg);
  // mapNum = Math.ceil(Math.random()*1000);
  // mapId = "map_"+mapNum;
  // $('<div class="message message-personal"><div id="'+mapId+'" style="height: 200px; width:200px; border-radius:10px;"></div></div>').appendTo($('.mCSB_container')).addClass('new');
  // setDate();
  // newMap(mapId, "东上院", "新图书馆");
  // $('.message-input').val(null);
  // updateScrollbar();

}

$('.message-submit').click(function() {
  insertMessage();
});

$(window).on('keydown', function(e) {
  if (e.which == 13) {
    insertMessage();
    return false;
  }
  if (e.which == 32) {
    recorderClick();
    return false;
  }
});

// 监听问题语音识别的结果
socket.on('get text',function(msg){
  console.log(msg);
  if ($.trim(msg) == '') {
    return false;
  }
  $('.message.message-personal.loading').remove();
  $('<div class="message message-personal">' + msg + '</div>').appendTo($('.mCSB_container')).addClass('new');
  setDate();
  $('.message-input').val(null);
  $('<div class="message loading new"><figure class="avatar"><img src="https://c1.staticflickr.com/5/4331/36518609605_4ff8556cbb.jpg" /></figure><span></span></div>').appendTo($('.mCSB_container'));
  updateScrollbar();
});

// 当Bot返回结果为寻路时，以map的形式告诉User
function sendMap(startAddress, endAddress){
  console.log(startAddress,endAddress);
  mapNum = Math.ceil(Math.random()*1000);
  mapId = "map_"+mapNum;
  $('<div class="message new"><figure class="avatar"><img src="https://c1.staticflickr.com/5/4331/36518609605_4ff8556cbb.jpg" /></figure><div id="'+mapId+'" style="height: 200px; width:200px; border-radius:10px;"></div></div>').appendTo($('.mCSB_container')).addClass('new');
  setDate();
  newMap(mapId, startAddress, endAddress);
  updateScrollbar();
  i++;
}

function CardButtonClick_AskQ(question){
  socket.emit('get question',question);
}

function getHeroCard(content){
  var CardContainer = '<div class="ac-container" style="padding: 0px; box-sizing: border-box; background-color: rgba(0, 0, 0, 0);">';
  var intervalDiv = '<div style="height: 8px;"></div>';
  //console.log(content.images)
  for(var i = 0;i<content.images.length;i++){
    var image = content.images[i];
    //console.log(image);
    var imageSrc = image.url;
    var imageDiv = '<div class="ac-image" style="display: flex; box-sizing: border-box; justify-content: flex-start; align-items: flex-start;"><img style="width: 100%; max-height: 100%;" src="'+imageSrc+'"></div>';
    CardContainer = CardContainer + imageDiv + intervalDiv;
  }
  var titleDiv = '<div style="text-align: left; color: rgb(0, 0, 0); line-height: 19.95px; font-family: "Segoe UI",sans-serif; font-size: 15px; font-weight: 700; white-space: nowrap; box-sizing: border-box;"><p style="width: 100%; overflow: hidden; margin-top: 0px; margin-bottom: 0px; text-overflow: ellipsis;">'+content.title+'</p></div>';
  var subTitleDiv = '';
  if(content.subtitle)
    subTitleDiv = '<div style="text-align: left; color: rgb(128, 140, 149); line-height: 17.29px; font-family: "Segoe UI",sans-serif; font-size: 13px; font-weight: 400; word-wrap: break-word; box-sizing: border-box;"><p style="width: 100%; margin-top: 0px; margin-bottom: 0px;">'+content.subtitle+'</p></div>';
  var textDiv = '';
  if(content.text)
    textDiv = '<div style="text-align: left; color: rgb(0, 0, 0); line-height: 17.29px; font-family: "Segoe UI",sans-serif; font-size: 13px; font-weight: 400; word-wrap: break-word; box-sizing: border-box;"><p style="width: 100%; margin-top: 0px; margin-bottom: 0px;">'+content.text+'</p></div>';
  CardContainer =  CardContainer + titleDiv + subTitleDiv + intervalDiv + textDiv +'</div>';
  CardContainer = '<div class="ac-container" style="padding: 8px; box-sizing: border-box; background-color: rgba(0, 0, 0, 0);">' + CardContainer;
  if(content.buttons){
    for(var i=0;i<content.buttons.length;i++){
      var button = content.buttons[i];
      //console.log(button.type)
      var buttonDiv;
      if(button.type == "openUrl"){
        var buttonDiv = '<div><div style="overflow: hidden;"><div style="display: flex; flex-direction: column; align-items: flex-start;"><button class="ac-pushButton" onclick=window.open(\'' + button.value + '\') style="flex:0 1 auto; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">'+button.title+'</button></div></div><div style="background-color: rgba(0, 0, 0, 0);"></div></div>';
      }
      else{
        var buttonDiv = '<div><div style="overflow: hidden;"><div style="display: flex; flex-direction: column; align-items: flex-start;"><button class="ac-pushButton" onclick=CardButtonClick_AskQ("' + button.value + '") style="flex:0 1 auto; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">'+button.title+'</button></div></div><div style="background-color: rgba(0, 0, 0, 0);"></div></div>';
      }
      CardContainer = CardContainer + intervalDiv + buttonDiv; 
    }
  }
  CardContainer = '<div class="wc-card wc-adaptive-card hero" style="width: 200px;">' + CardContainer +'</div></div>';
  return CardContainer;
}

function getAudioCard(content){
  var intervalDiv = '<div style="height: 8px;"></div>';
  var titleDiv = '<div style="text-align: left; color: rgb(0, 0, 0); line-height: 19.95px; font-family: "Segoe UI",sans-serif; font-size: 15px; font-weight: 700; white-space: nowrap; box-sizing: border-box;"><p style="width: 100%; overflow: hidden; margin-top: 0px; margin-bottom: 0px; text-overflow: ellipsis;">'+content.title+'</p></div>';
  var subTitleDiv = '<div style="text-align: left; color: rgb(128, 140, 149); line-height: 17.29px; font-family: "Segoe UI",sans-serif; font-size: 13px; font-weight: 400; word-wrap: break-word; box-sizing: border-box;"><p style="width: 100%; margin-top: 0px; margin-bottom: 0px;">'+content.subtitle+'</p></div>';
  var textDiv = '<div style="text-align: left; color: rgb(0, 0, 0); line-height: 17.29px; font-family: "Segoe UI",sans-serif; font-size: 13px; font-weight: 400; word-wrap: break-word; box-sizing: border-box;"><p style="width: 100%; margin-top: 0px; margin-bottom: 0px;">'+content.text+'</p></div>';
  var CardContainer = '<div class="ac-container" style="padding: 0px; box-sizing: border-box; background-color: rgba(0, 0, 0, 0);">'+ titleDiv + subTitleDiv + intervalDiv + textDiv +'</div>';
  CardContainer = '<div class="ac-container" style="padding: 8px; box-sizing: border-box; background-color: rgba(0, 0, 0, 0);">' + CardContainer;
  if(content.buttons){
    for(var i=0;i<content.buttons.length;i++){
      var buttonDiv;
      var button = content.buttons[i];
      if(button.type == "openUrl"){
        var buttonDiv = '<div><div style="overflow: hidden;"><div style="display: flex; flex-direction: column; align-items: flex-start;"><button class="ac-pushButton" onclick=window.open(\'' + button.value + '\') style="flex:0 1 auto; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">'+button.title+'</button></div></div><div style="background-color: rgba(0, 0, 0, 0);"></div></div>';
      }
      else{
        var buttonDiv = '<div><div style="overflow: hidden;"><div style="display: flex; flex-direction: column; align-items: flex-start;"><button class="ac-pushButton" onclick=CardButtonClick_AskQ("' + button.value + '") style="flex:0 1 auto; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">'+button.title+'</button></div></div><div style="background-color: rgba(0, 0, 0, 0);"></div></div>';
      }
      CardContainer = CardContainer + intervalDiv + buttonDiv; 
    }
  }
  CardContainer = CardContainer + '</div';
  var audioDiv = '<div class="non-adaptive-content"><audio src="'+content.media[0].url+'" controls="" type="audio" style="width: 100%;"></audio></div>'
  CardContainer = '<div class="wc-card wc-adaptive-card audio" style="width: 200px;">' + audioDiv + CardContainer +'</div>';
  return CardContainer;
}

// 当Bot返回结果为Card时
socket.on('send hero card', function(content){
  //console.log(content)
  var CardContainer = getHeroCard(content);
  CardContainer = '<div class="wc-list">' + CardContainer + '</div>';
  var bubble = '<div class="message new"><figure class="avatar"><img src="https://c1.staticflickr.com/5/4331/36518609605_4ff8556cbb.jpg" /></figure>' + CardContainer + '</div>';

  $(bubble).appendTo($('.mCSB_container')).addClass('new');  
  setDate();
  updateScrollbar();
  i++;
});

socket.on('send audio card', function(content){
  var CardContainer = getAudioCard(content);
  CardContainer = '<div class="wc-list">' + CardContainer +'</div>';
  var bubble = '<div class="message new"><figure class="avatar"><img src="https://c1.staticflickr.com/5/4331/36518609605_4ff8556cbb.jpg" /></figure>' + CardContainer + '</div>';
  $(bubble).appendTo($('.mCSB_container')).addClass('new');  
  setDate();
  updateScrollbar();
  i++;
});

socket.on('send cards', function(activity){
  var attachments = activity.attachments;
  //console.log(attachments)
  var lis = '';
  for(var i=0;i<attachments.length;i++){
    //console.log(i);
    var attachment = attachments[i];
    var CardContainer;
    if(attachment.contentType == "application/vnd.microsoft.card.audio"){
      CardContainer = getAudioCard(attachment.content);
    }
    else if(attachment.contentType == "application/vnd.microsoft.card.hero"){
      CardContainer = getHeroCard(attachment.content);
    }
    else{
      console.log("unknow Card type")
    }
    lis = lis + '<li class="wc-carousel-item">' + CardContainer + '</li>';
  }
  var carouselDiv = '<div class="wc-carousel" style="width: 270px;"><div class="wc-hscroll-outer"><div class="wc-hscroll" style="margin-bottom: -12px;"><ul>' + lis + '</ul></div></div></div>';

  var bubble = '<div class="message new"><figure class="avatar"><img src="https://c1.staticflickr.com/5/4331/36518609605_4ff8556cbb.jpg" /></figure>' + carouselDiv + '</div>';
  $(bubble).appendTo($('.mCSB_container')).addClass('new');  
  setDate();
  updateScrollbar();
  i++;
});

// 监听问题回答的结果
socket.on('send answer',function(msg){
  console.log(msg);
  $('.message.loading').remove();
  if(msg.indexOf("From:")!=-1 && msg.indexOf(";To:")!=-1){
    var addressArray = msg.split(";");
    var startAddress = addressArray[0].substring(5,addressArray[0].length);
    var endAddress = addressArray[1].substring(3,addressArray[1].length);
    // var startAddress = "上海交通大学思源门";
    // var endAddress = "上海交通大学图书馆主馆";
    sendMap(startAddress,endAddress);
  }
  else{
    //console.log(msg);
    $('.message.loading').remove();
    $('<div class="message new"><figure class="avatar"><img src="https://c1.staticflickr.com/5/4331/36518609605_4ff8556cbb.jpg" /></figure>' + msg + '</div>').appendTo($('.mCSB_container')).addClass('new');
    setDate();
    updateScrollbar();
    i++;
  }
});
