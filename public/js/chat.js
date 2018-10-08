//storage for the app
var storage = window.localStorage

//get a random id
var ID = storage.getItem('userid') != undefined ? 
                storage.getItem('userid'):getRandom(0,4000) + getRandom(0,2000) + getRandom(0,3000) + Math.random().toString(36).substring(2)
//store username
var username = storage.getItem('username') != undefined ? 
                storage.getItem('username'): ""
//store id of selected chat
var chatid = ""
//list of ids to usernames
var users = {}
//store id of socket
var socket
//notification sounds
var mainchataudio = new Audio('/audio/sisfus.mp3')
var sidechataudio = new Audio('/audio/decay.mp3')

$(document).ready(function(){
     //change the modal background

     /*Event Handlers
      *
      */
    //set event to send messages
    document.getElementById("sendBtn").addEventListener('click',function(e){
        sendMessage()
    })

    //enter event on the input
    document.querySelector(".message-area").addEventListener('keyup',function(e){
       if(e.keyCode === 13){
          sendMessage()
       }
    })

    //checks if username is availabe then sets it
    document.querySelector(".ch-btn").addEventListener('click',function(event){
       event.preventDefault() 
       var name = document.querySelector("#username").value
       if(name.trim() != ""){
          $("#username").removeClass("danger")
          socket.emit('checkname',name)
       }else{
          swal("Enter username","Username cannot be empty!","error")
       }
    })

    //if user searches for chats
    document.querySelector("#usersearch").addEventListener('keyup',function(){
       searchContacts()
    })

    //Press enter in the choose name input
    document.querySelector("#username").addEventListener('keyup',function(e){
      if(e.keycode == 13){
        var name = document.querySelector("#username").value
        $(this).removeClass("danger")
         socket.emit('checkname',name)
      } 
    })
     
    //logout for user
    document.querySelector("#logout").addEventListener('click',function(){
        swal({
          title: "Logout ?",
          text: "Do you wish to logout",
          icon: "warning",
          buttons: true,
          dangerMode: true,
      })
      .then((willDelete) => {
        if (willDelete) {
           //remove all chats
           LockableStorage.lock('bongachat',function(){
             storage.clear()
           })        
          $(".message-area").empty()
          $(".contacts-list").empty()

          swal("Logged Out !!", {
            icon: "success",
          })

          //reload page
          window.location.assign(window.location.href) 
        } 
      })
    })


    //clear all chats
    document.querySelector('#clearchats').addEventListener('click',function(){
      swal({
          title: "Are you sure?",
          text: "Will Delete all chats",
          icon: "warning",
          buttons: true,
          dangerMode: true,
      })
      .then((willDelete) => {
        if (willDelete) {
           //remove all chats
           LockableStorage.lock('bongachat',function(){
             storage.setItem('bongachat',"{}")
           })

           $(".messages ul").empty()
          swal("Chats are deleted !!", {
            icon: "success",
          });
        } else {
          swal("Chats are safe!");
        }
      })

    })
    
     //get socket io conection 
     socket = io()

    //if no userdata open modal    
    if(username == ""){
      $('#modal').modal() //open up the name modal
    }else{
      //use data from store
        if(selectedimg == "")selectedimg = "images/man.png"
             var user = {
                id : ID,
                name : username,
                avatar:selectedimg
             }
           
             //send user details to server
             socket.emit('id',JSON.stringify(user))
             
             //request for logged in users
             socket.emit('online')

             //setup profile image
             $("#profile-img").attr('src',selectedimg)
             //setup profile name
             $("#usernameplace").html(username)
      } 
    
    //setup sockets
    setupSocket()
})    
     
  /*functions
   *
   */
   //setup socket
  function setupSocket(){
             
        //when message is received
        socket.on('message',function(msg){
           var ms = JSON.parse(msg) 
         
           if(ms.from == chatid){
              setMessage(ms.text,'replies',users[chatid].avatar)  //add meassage to chat box
              mainchataudio.play()
           }else{
               var elid =  "id-"+ms.from
               $("#"+elid).remove()       //remove old item
               addToContactList(users[ms.from].name,ms.from,ms.text,false,users[ms.from].avatar)  //add new item to list
               sidechataudio.play()
           }

            messageStore(ms.text,'replies',ms.from)  //store message
            //add message to list in array
            users[ms.from].preview = getPreview(ms.text)

        })
          
        //when user logs in and details sent
        socket.on('loggeduser',function(data){
          var user = JSON.parse(data)
          if(user.name != username.trim()){
                addToContactList(user.name,user.id,"",true,user.avatar)
                 //add to users list
                 users[user.id] = {
                        name : user.name,
                        preview: "",
                        seen: true,
                        avatar:user.avatar
                      }

              LockableStorage.lock('bongachat',function(){
                    //setup chat storage
                 var messages = JSON.parse(storage.getItem('bongachat'))
                 messages[user.id] = []
                 storage.setItem('bongachat',JSON.stringify(messages))
              })
                   

                  $.notify({
                     title: user.name + ' Online!',
                     message : ""
                  },{
                    delay: 1                   
                  })
            }
        })

        //when user logs off
        socket.on('useroff',function(data){
          var user = JSON.parse(data)
          delete users[user.id]
          $("#id-"+user.id).remove()

          //alert logged off
          $.notify({
             title: user.name + ' Logged Off!',
             message : ""
          },{
            delay: 1
          })

          //delete chat
          LockableStorage.lock('bongachat',function(){
             var messages = JSON.parse(storage.getItem('bongachat'))
             delete messages[user.id]
             storage.setItem('bongachat',JSON.stringify(messages))
          })

        
        })
         
        //if username result is back  
        socket.on('nameresult',function(ans){
           if(ans.trim() == "no"){
            swal("Not Available","Already Taken!","error")
             $("#username").addClass("danger")
           }else{

             username =  $("#username").val()
             $("#usernameplace").html(username)
             if(selectedimg == "")selectedimg = "images/man.png"
             var user = {
                id : ID,
                name : username,
                avatar:selectedimg
             }

             //send user details to server
             socket.emit('id',JSON.stringify(user))
             
             //request for logged in users
             socket.emit('online')

             //setup profile image
             $("#profile-img").attr('src',selectedimg)

             //Set up new storage
             storage.setItem('bongachat',"{}")
             storage.setItem('userid',ID)
             storage.setItem('username',username)
             storage.setItem('avatar',selectedimg) 
           
           }
        })

        //event to receive list of online users
        socket.on('online',function(data){
          $("#modal").modal('hide')
          var list = JSON.parse(data)
          
          for(tmpid in list){
             name = list[tmpid].name
             if(name != username.trim() && users[tmpid] == undefined){
               addToContactList(name,tmpid,"",true,list[tmpid].avatar)
                //add to users list
                 users[tmpid]= {
                    name : name,
                    preview : "",
                    seen : true,
                    avatar: list[tmpid].avatar
                  }
                 //setup chat storage

              LockableStorage.lock('bongachat',function(){
                 //setup chat storage
                 var messages = JSON.parse(storage.getItem('bongachat'))
                 messages[tmpid] = []
                 storage.setItem('bongachat',JSON.stringify(messages))
              })

         
                 
             }
        }
     })

  }

  
  //gets the message from the inputbox and sends it 
  function sendMessage(){
       var input = document.querySelector(".message-area")
       var sent = input.value
       if(sent.trim() != ""){
         if(chatid != ""){
            input.value = ""
            var msg = {
                text : sent.trim(),
                to : chatid.trim(),
                from : ID.trim()
              }  
            setMessage(sent,'sent',selectedimg)
            socket.emit('message',msg)
            messageStore(sent,'sent',chatid)

        }else{
           $(".notify-alert").remove()
            $.notify({
               title : "Select User to Send to!",
               message: ""
            },{
              delay :1,
              type:'danger'
            })
      }
    }
  }

  //set the messages on the chat space
  function setMessage(text,type,avatar){
       $(".messages ul").append(`
          <li class="${type}">
             <img src="${avatar}" alt="" />
              <p>${text}</p>
          </li>
        `) 
  }
  
  //set the contact list
  function addToContactList(name,id,text,append,avatar){
     if(name != username.trim()){
              var element = document.createElement('li')

              //classes to add to span
              var classes = "contact-status"
              //if prepend then its a new message set class to online for green dot
              if(!append)classes += " online"  

              element.setAttribute("class","contact")
              var elid = "id-"+id
              element.setAttribute("id",elid)
              element.innerHTML = `
                    <div class="wrap">

                      <span class="${classes}"></span>    
                      <img class="contact-img" src="${avatar}" alt="" />
                       
                       <ul id="drop-${id}" class="contact-drop">
                            <li>${name}</li>
                            <li>${getPreview(text)}</li>
                      </ul>
                      <div class="meta">
                        <p class="name">${name}</p>
                        <p class="preview">${getPreview(text)}</p>
                      </div>
                   </div>
                `
                if(append){
                   document.querySelector("#contacts-list").appendChild(element)
                 }else{
                    $(document.querySelector("#contacts-list")).prepend(element)
                     //set users seen to false
                     users[id].seen = false
                 }
                setContactEvent(elid)   
          }
  }

  //stores the text to users localstorage index
  function messageStore(text,type,id){
     //add message to users message store
      var add = {
          type : type,
          text : text
        }
    
      LockableStorage.lock('bongachat',function(){
          //setup chat storage
          var messages = JSON.parse(storage.getItem('bongachat'))
          if(messages[id] == undefined) messages[id] = []
          messages[id].push(add)
          storage.setItem('bongachat',JSON.stringify(messages))
        })
  
  } 

  //Event to handle contact click 
  function setContactEvent(id){
     document.getElementById(id).addEventListener('click',function(){
        chatid = id.split('-')[1].trim()
        var name = $("#"+id+" .wrap .meta .name").html()

        //remove online class from span to show message read set seen value to true
         $("#"+id+" .wrap span").removeClass('online')
         $("#selecteduser").html(name)
         $("#selecteduser").siblings('img').attr('src',users[chatid].avatar)
         users[chatid].seen = true 
           
         //clear the message area
         $(".messages ul").empty()

         //set the messages from users store
         messages = JSON.parse(storage.getItem('bongachat'))
         if(messages[chatid] == undefined){
            messages[chatid] == []  
          }
        
         
         messages[chatid].forEach((message) => {
           var avatar = message.type == 'sent'? selectedimg : users[chatid].avatar;
           setMessage(message.text,message.type,avatar)
         })
     })
  }
   
   //search the contacts
   function searchContacts(){
     var keyword = $("#usersearch").val()
     //remove all the contacts
     $("#contacts-list").empty()
     if(keyword.trim() != ""){
        for(id in users){
           if(users[id].name.search(keyword.trim()) >= 0){
             addToContactList(users[id].name,id,users[id].preview,users[id].seen,users[id].avatar)     
           }
        } 
     }else{
        for(id in users){
             addToContactList(users[id].name,id,users[id].preview,users[id].seen,users[id].avatar)     
         }              
     }
   }

   //get random ineteger number  
   function getRandom(min, max) {
      min = Math.ceil(min)
      max = Math.floor(max)
      return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
    }

    //gets preview text from full text
    function getPreview(text){
       if(text.length > 30){
         return text.substr(0,30)+"..."
       }else{
         return text
       }
    }