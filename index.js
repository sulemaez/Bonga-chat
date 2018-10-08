const express = require('express')
const app = express()
const path = require('path')
const PORT = process.env.PORT || 5000
const socketIO = require('socket.io')
const avatars =require('./store/avatar.js')

//set up app engine and paths
var server = app.set('views', path.join(__dirname, 'views'))
  .get('/', (req, res) => res.render('index'))
  .get('/avatars',(req,res) => {
     if(req.query.pos > avatars.size){
       res.send("end")
     }else{
        var msg = req.query.pos+".png"
        if(avatars.avatarsJpeg.includes(parseInt(req.query.pos))){
           msg = req.query.pos+".jpg"
        }
        res.send("images/avatars/"+msg)  
     }
      
  })
  .use(express.static('public'))
  .set('view engine', 'ejs')
  .listen(PORT, () => console.log(`Listening on ${ PORT }`)) 
  
  
//to store user id and socket id
let conns = {}
//store user id and username
let users = {}

const io = socketIO(server)

//when new connection is established
io.on('connection',(socket) => {
   console.log("Client connected ==> "+socket.id) 
   
   //Event to check if username if available 
   socket.on('checkname',(name) => {
       try{
          var answer = "yes"
          for(id in users){
          if(users[id].name == name.trim()){
             answer = "no"
             break
         } 
       }
       socket.emit('nameresult',answer)
      }catch(err){
        console.log(err)
      }
      
     })
     

   //client sends details 
   socket.on('id',function(user){
      try{
         var details = JSON.parse(user)
         conns[details.id] = socket.id 
         users[details.id] = {
           name:details.name,
           avatar:details.avatar 
         } 
         console.log("got details => id "+socket.id +" userid =>  "+details.id+ " name => "+users[details.id].name)
         io.emit('loggeduser',JSON.stringify(details))
      }catch(err){
         console.log(err)
      }
   })

   //set on disconnnet event
   socket.on('disconnect',function(){
        try{
          var id
          for(tmpid in conns){
             if(conns[tmpid] == socket.id){
               id = tmpid 
               console.log("Deleted id => "+socket.id+" user_id =>"+id)
               delete conns[tmpid]
             }
          }
          delete conns[id] 
          if(users[id] != undefined){
             var name = users[id].name
             delete users[id]

             var user = {
               id : id,
              name : name
             }

            //tell all this user is logged of
            io.emit('useroff',JSON.stringify(user))
          }
          
          console.log("disconnect id =>"+socket.id+" userid =>"+id+" name => "+name)
       
        }catch(err){
          console.log(err)
        }
      
	 })
   
   //when client sends message  
   socket.on('message',function(msg){
      try{
         var id = conns[msg.to]
         var socket = io.sockets.sockets[id]
         var meso = { text : msg.text,from : msg.from }
         var s = JSON.stringify(meso)
         socket.send(s)
      }catch(err){
         console.log(err)
      }
   })

   //send list of all connected  users
   socket.on('online',function(){
     socket.emit('online',JSON.stringify(users))
   })


})








