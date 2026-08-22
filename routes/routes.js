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

    const songList = [
        {"id": 1, "title": "phoenix", "createdBy": "Froggie"},
        {"id": 2, "title": "time I get to", "createdBy": "Mark"}
    ];

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

    if (!id) {
        song = {
            "title": "",
            "tracks": [],
            "createdBy": req.session.username
        }
    } else {
        // fetch the song metadata from Mongo and load the song page
        // const { dbInstance } = await connectToDatabase(process.env.DB_NAME);
        // song = await dbInstance.collection("songs").find({"_id": toId(id)});
        song = {
            "id": id,
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
        "song": song
    });
});


export default router;
