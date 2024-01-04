const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

require("dotenv").config()
const mongoClient = require("mongodb").MongoClient
const { ObjectId } = require("mongodb")
const connectionString = process.env.DB_STRING
const jwtSecret = process.env.JWT_SECRET

mongoClient.connect(connectionString)
    .then(client => {
        console.log("Connected to Database in routes.js")
        const db = client.db("Forum")
        const postCollection = db.collection("Post")
        const commentCollection = db.collection("Comment")
        const userCollection = db.collection("User")
        const voteCollection = db.collection("Vote")
        
        async function userExists(username) {
            const users = await userCollection.find({username: username}).toArray()
            return users.length !== 0
        }

        router.get("/version", async (req, res) => {
            res.send(process.env.npm_package_version)
        })

        router.get("/auth/user/exists/:username", async (req, res) => {
            const result = await userExists(req.params.username)
            res.send(result)
        })

        router.post("/auth/user/signup", async (req, res) => {
            // make sure that the user does not exist
            if (await userExists(req.body.username)) {
                res.send(false)
            }
            const saltRounds = 10
            req.body.password = await bcrypt.hash(req.body.password, saltRounds)
            userCollection.insertOne(req.body)
                .then(result => {
                    res.send(result)
                })
                .catch(error => {
                    console.error("Error: ", error)
                    res.send(error)
                })
        })

        router.post("/auth/user/signin", async (req, res) => {
            // make sure that the user exists
            const { username, password } = req.body;
            const user = await userCollection.find({username: username}).toArray()
            if (user.len() === 0) {
                res.send(false)
            }
            const passwordMatch = await bcrypt.compare(password, user[0].password);
            if (!passwordMatch){
                res.send(false)
            }
            const token = jwt.sign({ userId: user[0]._id, username: user[0].username }, jwtSecret, { expiresIn: '1d' })
            res.send({token})
            
        })

        router.post("/auth/user/details", async (req, res) => {
            const token = req.body.token
            // console.log(token)
            jwt.verify(token, jwtSecret, (err, decoded) => {
                if (err){
                    res.send(false)
                }
                // console.log(decoded)
                res.send({ "username": decoded.username })
            })
        })

        // TODO: this endpoint exposes all user data including username and hashed password
        // find where this is used and change the code
        router.get("/auth/user/getUser/:userId", async (req, res) => {
            const userId = req.params.userId
            const user = await userCollection.find({_id: new ObjectId(userId)}).toArray()
            res.send(user)
        })

        // TODO: all posts are send to the frontend(user) consider only querying the top
        router.get("/posts", async (req, res) => {
            const postsList = await postCollection.find({}).toArray()
            res.send(postsList)
        });

        router.get("/posts/:postId", async (req, res) => {
            const postId = req.params.postId
            const post = await postCollection.find({_id: new ObjectId(postId)}).toArray()
            if (!post){
                res.send({"status": `Post with id ${postId} not found`})
            }else{
                res.send(post)
            }
        })

        // TODO: user-controlled userid, use token instead
        router.post("/posts/add", (req, res) => {
            // req.body.userId = new ObjectId(req.body.userId)
            console.log(req.body)
            postCollection.insertOne(req.body)
                .then(result => {
                    res.send(result)
                })
                .catch(error => {
                    console.log("Error!")
                    console.log(error)
                    res.send(error)
                })
        });

        // TODO: similar to getting posts, the client could be flooded, but should be less dire
        router.get("/posts/comments/:postId", async (req, res) => {
            const postId = req.params.postId
            const comments = await commentCollection.find({parentPost: true, parentId: new ObjectId(postId)}).toArray()
            commentUsernames = []
            for (const comment of comments) {
                commentUsernames.push(comment.username)
            }
            res.send({
                "comments": comments,
                "commentUsernames": commentUsernames
                })
        })

        // TODO: same as posts, user-controlled userid
        router.post("/posts/comments/add", (req, res) => {
            req.body.parentId = new ObjectId(req.body.parentId)
            commentCollection.insertOne(req.body)
                .then(result => {
                    res.send(result)
                })
                .catch(error => {
                    console.log(error)
                })
        })

        // TODO: add validation for deletions
        router.delete("/posts/del/:postId", async (req, res) => {
            const postId = req.params.postId
            const deletedPost = await postCollection.findOneAndDelete({_id: new ObjectId(postId)})
            res.send(deletedPost)
        })

        router.delete("/posts/comments/del/:commentId", async (req, res) => {
            const commentId = req.params.commentId
            const deletedComment = await commentCollection.findOneAndDelete({_id: new ObjectId(commentId)})
            res.send(deletedComment)
        })



        router.get("/votes/posts/:postId", async (req, res) => {
            const postId = req.params.postId
            const upvotes = await voteCollection.find({postId: new ObjectId(postId), type: 1}).toArray()
            const downvotes = await voteCollection.find({postId: new ObjectId(postId), type: 0}).toArray()
            res.send({"upvotes": upvotes, "downvotes": downvotes})
        })

        router.get("/votes/comments/:commentId", async (req, res) => {
            const commentId = req.params.commentId
            const upvotes = await voteCollection.find({postId: new ObjectId(commentId), type: 1}).toArray()
            const downvotes = await voteCollection.find({postId: new ObjectId(commentId), type: 0}).toArray()
            res.send({"upvotes": upvotes, "downvotes": downvotes})
        })

        router.delete("/votes/posts/del/:username/:postId", async (req, res) => {
            const postId = req.params.postId
            const username = req.params.username
            const deletedVote = await voteCollection.findOneAndDelete({postId: new ObjectId(postId), username: username})
            res.send(deletedVote)
        })

        router.delete("/votes/comments/del/:username/:commentId", async (req, res) => {
            const commentId = req.params.commentId
            const username = req.params.username
            const deletedVote = await voteCollection.findOneAndDelete({commentId: new ObjectId(commentId), username: new ObjectId(username)})
            res.send(deletedVote)
        })

        router.post("/votes/add", async (req, res) => {
            req.body.postId = new ObjectId(req.body.postId)
            const vote = await voteCollection.insertOne(req.body)
                .then(result => {
                    res.send(result)
                })
                .catch(error => {
                    console.log(error)
                })
        })

        router.get("/votes/:username/:postId", async (req, res) => {
            const postId = new ObjectId(req.params.postId)
            const username = req.params.username
            const vote = await voteCollection.find({username: username, postId: postId}).toArray()
            res.send(vote)
        })

    })
    .catch(error => {
      console.log(error)
    })

module.exports = router;
