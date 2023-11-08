const express = require("express");
const cors = require("cors");
require('dotenv').config()
const cookieParser = require('cookie-parser')
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

app.use(cors({
  origin:['http://localhost:5173'],
  credentials:true
}));
app.use(express.json());
app.use(cookieParser());


const uri =
  `mongodb+srv://${process.env.SECRET_USER}:${process.env.SECRET_PASS}@cluster0.rhsqxdw.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});


const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  console.log(token)
     if(!token){
        return res.status(401).send({message:'unauthorize access'})
     }
     jwt.verify(token, process.env.SECRET_TOKEN, (error, decode) => {
          if(error){
            return res.status(401).send({message:'unauthorize access'})
          }
          req.user2 = decode;
          
          next();  
     })
    
     
}


async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
         
    const assignmentCollection = client.db('assignmentEleven').collection('assignment');
    const submitAssignmentCollection = client.db('assignmentEleven').collection('submitAssignment');


  app.post('/jwt', async(req, res) => {
       const email = req.body
       
       const token = jwt.sign(email, process.env.SECRET_TOKEN , {expiresIn:'1h'})
       res
       .cookie('token', token, {
        httpOnly: true,
        secure: true,
        sameSite:'none'
       })
       .send({success:true})
  })

  app.post('/logout', async(req, res) =>{
      const user = req.body;
      res.clearCookie('token', {maxAge: 0}).send({success: true})
  })


  app.get('/assignmentCount', async(req, res) => {
    const result = await assignmentCollection.estimatedDocumentCount()
    res.send({result})
 })
    
    app.post('/assignment',verifyToken, async(req, res) => {
        const assignment = req.body.assignment;
        if(assignment.user !== req.user2.email){
          return res.status(403).send({message: 'forbidden access'});
        }
        
        const result = await assignmentCollection.insertOne(assignment);
        res.send(result)
    })

    app.get('/allAssignment', async(req, res) => {
        const difficult = req.query.query;
        const data = req.query;
        const page = parseInt(data.page);
        const size = parseInt(data.size);
        let query = {}
        if(difficult){
            query = {difficulty:difficult}
        }
        const result = await assignmentCollection.find(query).skip(page * size).limit(size).toArray()
        res.send(result)
    })

    app.get('/assignment/:id', async(req, res) => {
         const id = req.params.id;
         const query = {_id: new ObjectId(id)};
         const result = await assignmentCollection.findOne(query);
         res.send(result)
    })

    app.put('/update-assignment/:id', async(req, res) =>{
        const {updateInfo} = req.body;
        const id = req.params.id;
        const query = {_id: new ObjectId(id)};
        const options = { upsert: true };
        const update = {
            $set:{
              title: updateInfo.title,
              description: updateInfo.description,
              marks: updateInfo.marks,
              thumbnailURL: updateInfo.thumbnailURL,
              difficulty: updateInfo.difficulty,
              dueDate: updateInfo.dueDate
            }
        }

        const result = await assignmentCollection.updateOne(query,update,options);
        res.send(result)
    })


    app.post('/submitted-assignment', async(req, res) => {
         const data = req.body.allData;
         const result = await submitAssignmentCollection.insertOne(data);
         res.send(result)
    })

    app.get('/load-submitData',verifyToken, async(req, res) => {
        const email = req.query;
        if(email.email !== req.user2.email){
          return res.status(403).send({message: 'forbidden access'});
        }
         const query = {status:'submitted'};
         const result = await submitAssignmentCollection.find(query).toArray();
         res.send(result);
    })


    app.get('/modal-data/:id', async(req, res) => {
          const id = req.params.id;
          const query = {_id: new ObjectId(id)};
          const result = await submitAssignmentCollection.findOne(query);
          res.send(result)
    })

    app.patch('/marking-assignment/:id', async(req, res) => {
            const id  = req.params.id;
            const newData = req.body
            const query = {_id: new ObjectId(id)};
            const options = { upsert: true };
            const doc = {
              $set:{
                status: newData.status,
                givenMarks: newData.givenMarks,
                feedback: newData.feedback

              }
            }

            const result = await submitAssignmentCollection.updateOne(query,doc,options);
            res.send(result);
    })


    app.get('/my-assignment', verifyToken, async(req, res) => {
          const email = req.query.email
          if(req.user2.email !== req.query.email){
            return res.status(403).send({message: 'forbidden access'});
          }
          
          const query = {status:'completed', submittedUser: email};
          const result = await submitAssignmentCollection.find(query).toArray();
          res.send(result);
    })


    app.delete('/delete-assignment/:id', async(req, res) => {
         const id = req.params.id;
         const email = req.query.query;
         if(!email){
            return res.send({message:'forbidden access!'})
         }
         const query = {_id: new ObjectId(id), user: email};
         const result = await assignmentCollection.deleteOne(query);
         res.send(result)
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("app is running on the server");
});

app.listen(port, () => {
  console.log(`app is running on port ${port}`);
});
