import express from "express";
import { connectToDatabase, toId } from "../utils/db.js";

const router = express.Router();


router.get("/", async (req, res) => {
    return res.render("index", {
        "csrfToken": req.csrfToken()
    });
});


router.post("/login", async (req, res) => {
    const { username } = req.body;
    req.session.username = username;
    return res.redirect("/songlist");
});


router.get("/songlist", async (req, res) => {
    if (!req.session.username) {
        return res.redirect("/");
    }

    // fetch songlist from Mongo
    const { dbInstance } = await connectToDatabase(process.env.DB_NAME);
    const songList = await dbInstance.collection("songs").find(
        {
        },
        {
            "_id": 1,
            "title": 1,
            "createdBy": 1,
            "dateCreated": 1
        }
    ).toArray();

    console.log(songList);

    return res.render("songlist", {
        "csrfToken": req.csrfToken(),
        "user": req.session.username,
        "songList": songList
    });
    //return res.json({"user": req.session.username, "songs": [{"title": "phoenix"}, {"title": "time I get to"}]});
});


router.get("/song", async (req, res) => {
    if (!req.session.username) {
        return res.redirect("/");
    }
    const { id } = req.query;

    let song;
    let song0;

    if (!id) {
        song = {
            "title": "",
            "tracks": [],
            "bpm": 100,
            "timeSignature": 4,
            "createdBy": req.session.username,
            "date": new Date()
        }
    } else {
        // fetch the song metadata from Mongo and load the song page
        const { dbInstance } = await connectToDatabase(process.env.DB_NAME);
        // const song = await dbInstance.collection("songs").find({"_id": toId(id)});
        //
        // console.log(song);

        song0 = {
            "id": id,
            "title": "By the Time I Get to Phoenix",
            "bpm": 100,
            "timeSignature": 4,
            "tracks": [
                {
                    "id": 1,
                    "description": "track 1",
                    "createdBy": "Mark",
                    "filename": "recording-1787261502629.webm"
                },
                {
                    "id": 2,
                    "description": "track 2",
                    "createdBy": "Mathieu",
                    "filename": "recording-1787261502629.webm"
                }
            ],
            "createdBy": "Mark"
        }
    }

    return res.render("song", {
        "csrfToken": req.csrfToken(),
        "user": req.session.username,
        "song": song0
    });
});


export default router;
