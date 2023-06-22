require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const {
  verifyUserLogin,
  dataNumbers,
  allFollowers,
  allFollowing,
  getProfileData,
  getMyProfileData,
  findUsers,
  findShorts,
  updateUserData,
  checkIfUsernameIsNotTaken,
  getVideoData,
  getCommentsData,
  postCommentOnVideo,
  likeDislikeComment,
  subUnSubToUser,
  likeDislikeVideo,
  allRequests,
  acceptDeclineRequest,
  refreshUserData,
  insertVideoDataIntoDB,
  updatePath,
  getPath,
  createNewAccount,
  deleteVideo,
  getCommunityVideos,
} = require("./services/userService");
const multer = require("multer");
const fs = require("fs");
const ostofitDB = require("./ostofitDB");
const bodyParser = require("body-parser");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const testDb = async () => {
  try {
    await ostofitDB.authenticate();
    app.listen(5000);
    console.log("Connection has been established successfully.");
  } catch (error) {
    console.error("Unable to connect to the database:", error);
    process.exit();
  }
};

app.use(cors());

app.post("/createNewAccount", async (req, res) => {
  const { firstName, lastName, username, password } = req.body;
  const data = await createNewAccount(firstName, lastName, username, password);
  return res.json({ status: data });
});

app.get("/profile", async (req, res) => {
  const { username } = req.query;
  const userData = await getMyProfileData(username);
  if (userData) {
    return res.json({ status: "success", videos: userData.videos });
  }
  return res.json({
    status: "error",
    data: { message: "User cannot be found!" },
  });
});

app.get("/profile/:username", async (req, res) => {
  const { username } = req.params;
  const { id } = req.query;
  const userData = await getProfileData(username, id);
  if (userData) {
    return res.json({ status: "success", userData });
  }
  return res.json({
    status: "error",
    data: { message: "User cannot be found!" },
  });
});

app.get("/login", async (req, res) => {
  const { username, password } = req.query;
  const userData = await verifyUserLogin(username, password);
  if (userData === false) {
    return res.json({ status: "false" });
  }
  return res.json({ status: "success", data: { userData } });
});

app.get("/refreshUserData", async (req, res) => {
  const { username } = req.query;
  const userData = await refreshUserData(username);
  if (userData === false) {
    return res.json({ status: "false" });
  }
  return res.json({ status: "success", data: { userData } });
});

app.get("/home", async (req, res) => {
  const { id } = req.query;
  const data = await dataNumbers(id);
  return res.json({ status: "success", data });
});

app.get("/requests", async (req, res) => {
  const { id } = req.query;
  const data = await allRequests(id);
  return res.json({ status: "success", data });
});

app.get("/followers", async (req, res) => {
  const { id } = req.query;
  const data = await allFollowers(id);
  return res.json({ status: "success", data });
});

app.get("/following", async (req, res) => {
  const { id } = req.query;
  const data = await allFollowing(id);
  return res.json({ status: "success", data });
});

app.get("/findUsers", async (req, res) => {
  const { username, id } = req.query;
  const data = await findUsers(username, id);
  return res.json({ status: "success", data });
});

app.get("/findShorts", async (req, res) => {
  const { id } = req.query;
  const data = await findShorts(id);
  return res.json({ status: "success", data });
});

app.post("/updateUserData", async (req, res) => {
  const { username, profilePic, description, id } = req.body;
  const data = await updateUserData(username, profilePic, description, id);
  return res.json({ status: data });
});

// app.post("/updateUserDataWithoutUsername", async (req, res) => {
//   const { profilePic, id } = req.body;
//   const data = await updateUserDataWithoutUsername(profilePic, id);
//   return res.json({ status: data });
// });

app.get("/checkIfUsernameIsNotTaken", async (req, res) => {
  const { username } = req.query;
  const data = await checkIfUsernameIsNotTaken(username);
  return res.json({ status: data });
});

app.get("/getVideoData", async (req, res) => {
  const { videoID, myID } = req.query;
  const data = await getVideoData(videoID, myID);
  return res.json({ status: "success", data });
});

app.get("/getCommentsData", async (req, res) => {
  const { videoID, myID } = req.query;
  const data = await getCommentsData(videoID, myID);
  return res.json({ status: "success", data });
});

app.post("/postComment", async (req, res) => {
  const { comment, videoID, myID } = req.body;
  const data = await postCommentOnVideo(comment, videoID, myID);
  return res.json({ status: data.status });
});

app.post("/likeDislikeComment", async (req, res) => {
  const { identifier, status, commentID, myID } = req.body;
  const data = await likeDislikeComment(identifier, status, commentID, myID);
  return res.json({ status: data.status });
});

app.post("/subUnSubToUser", async (req, res) => {
  const { isSubscribed, myID, userUsername, requestSent } = req.body;
  const data = await subUnSubToUser(
    isSubscribed,
    myID,
    userUsername,
    requestSent
  );
  return res.json({ status: data.status });
});

app.post("/likeDislikeVideo", async (req, res) => {
  const { videoID, myID, liked } = req.body;
  const data = await likeDislikeVideo(videoID, myID, liked);
  return res.json({ status: data.status });
});

app.post("/acceptDeclineRequest", async (req, res) => {
  const { action, myID, userID } = req.body;
  const data = await acceptDeclineRequest(action, myID, userID);
  return res.json({ status: data.status });
});

// -------------------------------------------------------------------------------------------------------------------------

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const username = req.headers.token;
    const directory = "./ostofit_data";
    if (!fs.existsSync(directory + `/${username}`)) {
      fs.mkdirSync(directory + `/${username}`);
    }
    cb(null, directory + `/${username}`);
  },
  filename: async (req, file, cb) => {
    const username = req.headers.token;
    const title = req.headers.title;
    const directory = "./ostofit_data/";
    const insertIntoDBAndGetID = await insertVideoDataIntoDB(username, title);
    cb(null, insertIntoDBAndGetID + "_" + file.originalname);
    const fullPath =
      directory +
      username +
      "/" +
      insertIntoDBAndGetID +
      "_" +
      file.originalname;
    await updatePath(insertIntoDBAndGetID, fullPath);
    return;
  },
});

const upload = multer({ storage: storage });

app.post("/uploadVideo", upload.single("file"), async (req, res) => {
  return res.json({ status: "success" });
});

app.get("/video", async (req, res) => {
  const { videoID } = req.query;
  const range = req.headers.range;
  if (!range) {
    return res.status(400).send("Requires Range header");
  }

  const videoPath = await getPath(videoID);

  const videoSize = fs.statSync(videoPath).size;

  const CHUNK_SIZE = 10 ** 6;
  const start = Number(range.replace(/\D/g, ""));
  const end = Math.min(start + CHUNK_SIZE, videoSize - 1);

  const contentLength = end - start + 1;
  const headers = {
    "Content-Range": `bytes ${start}-${end}/${videoSize}`,
    "Accept-Ranges": "bytes",
    "Content-Length": contentLength,
    "Content-Type": "video/mp4",
  };

  res.writeHead(206, headers);

  const videoStream = fs.createReadStream(videoPath, { start, end });

  videoStream.pipe(res);
});

app.post("/deleteVideo", async (req, res) => {
  const { videoID } = req.body;
  const response = await deleteVideo(videoID);

  if (response === "success") {
    return res.json({ status: "success" });
  }
  return res.json({ status: "error" });
});

app.get("/getCommunityVideos", async (req, res) => {
  const { myID, filterNum } = req.query;
  const data = await getCommunityVideos(myID, filterNum);
  return res.json({ status: "success", data });
});

http: testDb();
