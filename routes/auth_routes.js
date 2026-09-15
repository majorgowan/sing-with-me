import express from "express";
import bcrypt from 'bcrypt';
import { connectToDatabase, toId } from "../utils/db.js";

const router = express.Router();

router.get("/logout", (req, res) => {
    // destroy session object
    req.session.destroy((err) => {
        if (err) return res.status(500).json({"error": `logout error ${err}`});

        // clear browser cookie
        res.clearCookie("connect.sid");

        res.redirect("/login");
    });
});


router.get("/login", (req, res) => {
    const csrfToken = req.csrfToken();
    res.render("authenticate",
        {
            "type": "login",
            "csrfToken": csrfToken,
        });
});


router.post("/login", async (req, res) => {
    const { dbInstance } = await connectToDatabase(process.env.DB_NAME);
    const { username, password } = req.body;

    // compare password to hashed value
    const user = await dbInstance.collection("users").findOne({ "username": username });
    console.log(user);
    if (!user) {
        res.render("authenticate",
            {
                "csrfToken": req.csrfToken(),
                "message": "username not found"
            });
    } else {
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            res.render("authenticate",
                {
                    "csrfToken": req.csrfToken(),
                    "type": "login",
                    "message": "password does not match"
                });
        } else {
            // user logged in, create session
            req.session.username = user.username;

            // make sure session saves before redirect
            req.session.save((err) => {
                if (err) console.error(err);

                return res.redirect("/songlist");
            });
        }
    }
});


router.get("/register", (req, res) => {
    const csrfToken = req.csrfToken();
    const exists = !!req.query.exists;
    const message = exists ? "Username exists" : "";
    res.render("authenticate",
        {
            "csrfToken": csrfToken,
            "type": "register",
            "message": message
        });
});


router.post("/register", async (req, res) => {
    const { dbInstance } = await connectToDatabase(process.env.DB_NAME);
    const { password, confirm, username } = req.body;

    // TODO: check that password and confirm match

    // check for existing user
    if (await dbInstance.collection("users").findOne({ "username": username })) {
        res.redirect("/register?exists=true");
    } else {

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await dbInstance.collection('users').insertOne({
            "username": username,
            "password": hashedPassword,
            "joined": new Date()
        });
        console.log(result);

        res.redirect("/login");
    }
});


export default router;
