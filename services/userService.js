const { QueryTypes } = require("sequelize");
const ostofitDB = require("../ostofitDB");
const fs = require("fs");

exports.createNewAccount = async (firstName, lastName, username, password) => {
  const query = `
  DECLARE @UserCreatedID int;

  INSERT INTO user_details (first_name, last_name, username, date_created) VALUES (:firstName, :lastName, :username, GETDATE())
  SET @UserCreatedID = (SELECT SCOPE_IDENTITY())
  INSERT INTO users (id, password) VALUES (@UserCreatedID, :password)

  SELECT 'success' 'status' 
  `;
  const [accountCreated] = await ostofitDB.query(query, {
    replacements: { firstName, lastName, username, password },
    type: QueryTypes.RAW,
  });

  if (accountCreated[0].status === "success") {
    return "success";
  }
  return "error";
};

exports.verifyUserLogin = async (username, password) => {
  const query = `SELECT TOP 1 u.id from users u
  INNER JOIN user_details u1 ON u.id = u1.id WHERE u1.username = :username AND u.password = :password`;
  const [verify] = await ostofitDB.query(query, {
    replacements: { username, password },
    type: QueryTypes.RAW,
  });
  if (verify.length === 0) {
    return false;
  }

  const query_2 = `
  DECLARE @Year VARCHAR(20) = (SELECT YEAR(date_created) from user_details ud WHERE username = :username)
	DECLARE @Month VARCHAR(20) = (SELECT SUBSTRING((SELECT DATENAME(month, date_created) from user_details ud WHERE username = :username),1 ,3))
	

  SELECT 
  u1.id, 
  u1.username,
  u1.first_name 'firstName', 
  u1.last_name 'lastName', 
  u1.date_created 'dateCreated', 
  @Month + ', ' + @Year 'shortDate',
  u1.profile_pic,
  u1.description,
  u1.is_verified 'isVerified'
  
  from users u INNER JOIN user_details u1 ON u.id = u1.id WHERE u1.username = :username AND password = :password
`;
  const [data] = await ostofitDB.query(query_2, {
    replacements: { username, password },
    type: QueryTypes.RAW,
  });
  return data[0];
};

exports.refreshUserData = async (username) => {
  const query = `
  DECLARE @Year VARCHAR(20) = (SELECT YEAR(date_created) from user_details ud WHERE username = :username)
	DECLARE @Month VARCHAR(20) = (SELECT SUBSTRING((SELECT DATENAME(month, date_created) from user_details ud WHERE username = :username),1 ,3))
	

  SELECT 
  u1.id, 
  u1.username,
  u1.first_name 'firstName', 
  u1.last_name 'lastName', 
  u1.date_created 'dateCreated', 
  @Month + ', ' + @Year 'shortDate',
  u1.profile_pic,
  u1.description,
  u1.is_verified 'isVerified'
  
  from users u INNER JOIN user_details u1 ON u.id = u1.id WHERE u1.username = :username
  `;

  const [data] = await ostofitDB.query(query, {
    replacements: { username },
    type: QueryTypes.RAW,
  });
  return data[0];
};

exports.dataNumbers = async (id) => {
  const query = `DECLARE @TempTable TABLE (
    followers int,
    following int,
    requests int
  )

insert into @TempTable 
(
followers,
following,
requests
)

values 

(
  (SELECT  COUNT(*) as 'followers' FROM followers WHERE follows_id_user = :id),
  (SELECT  COUNT(*) as 'following' FROM followers WHERE id_user = :id),
  (SELECT  COUNT(*) as 'requests' FROM request_to_follow WHERE request_id_user = :id)
)	


SELECT * FROM @TempTable`;

  const [data] = await ostofitDB.query(query, {
    replacements: { id },
    type: QueryTypes.RAW,
  });
  return data;
};

exports.allRequests = async (id) => {
  const query = `
  SELECT	
  ud.id,
  ud.username,
  ud.profile_pic 'profilePicUrl'

  FROM user_details ud 
  INNER JOIN request_to_follow rtf ON rtf.id_user = ud.id
  WHERE rtf.request_id_user = :id
  `;

  const [data] = await ostofitDB.query(query, {
    replacements: { id },
    type: QueryTypes.RAW,
  });

  if (data.length >= 1) {
    return data;
  }

  return [];
};

exports.acceptDeclineRequest = async (action, myID, userID) => {
  const query = `
  DECLARE @ACTION VARCHAR(10) = :action
  DECLARE @myID int = :myID
  DECLARE @userID int = :userID

  IF @ACTION = 'accept' 
	  BEGIN
		  INSERT INTO followers (id_user, follows_id_user) VALUES (@userID, @myID)
		  DELETE FROM request_to_follow WHERE id_user = @userID AND request_id_user = @myID
	  END

  IF @ACTION = 'decline'
	  BEGIN
		  DELETE FROM request_to_follow WHERE id_user = @userID AND request_id_user = @myID
	  END

  select 'success' 'status'
  `;

  const [data] = await ostofitDB.query(query, {
    replacements: { action, myID, userID },
    type: QueryTypes.RAW,
  });
  return data;
};

exports.allFollowers = async (id) => {
  const query = `
  SELECT 
  u.id,
  u.username,
  u.profile_pic
  FROM user_details u
  INNER JOIN followers r ON r.id_user = u.id
  WHERE r.follows_id_user = :id`;

  const [data] = await ostofitDB.query(query, {
    replacements: { id },
    type: QueryTypes.RAW,
  });
  return data;
};

exports.allFollowing = async (id) => {
  const query = `SELECT 
	u.id,
	u.username,
	u.profile_pic
  FROM user_details u
  INNER JOIN followers r ON r.follows_id_user = u.id
  WHERE r.id_user = :id`;

  const [data] = await ostofitDB.query(query, {
    replacements: { id },
    type: QueryTypes.RAW,
  });
  return data;
};

exports.getProfileData = async (username, id) => {
  const query = `
  DECLARE @UserID int = (SELECT TOP 1 ud.id FROM user_details ud WHERE ud.username = :username)
  DECLARE @Year VARCHAR(20) = (SELECT YEAR(date_created) from user_details ud WHERE username = :username)
	DECLARE @Month VARCHAR(20) = (SELECT SUBSTRING((SELECT DATENAME(month, date_created) from user_details ud WHERE username = :username),1 ,3))

  SELECT 
	ud.profile_pic,
  ud.is_verified 'isVerified',
  ud.description,
  @Month + ', ' + @Year 'shortDate',
  uv.id 'videoID',
	uv.video_url,
	uv.title,
	(  SELECT COUNT (*) FROM user_details ud

  INNER JOIN followers f ON f.follows_id_user = ud.id 
  WHERE f.id_user = :id AND ud.username = :username ) 'isSubscribed',
  (SELECT COUNT (*) FROM request_to_follow WHERE id_user = :id  AND request_id_user = @UserID) 'requestSent',
  ud.is_verified  'isVerified',
  (select count (*) from video_likes v where v.id_video = uv.id) 'videoLikesAmount',
  ISNULL((select 1 from video_likes vl where vl.id_user = :id and vl.id_video = uv.id), 0) 'liked',
  (select count (*) from video_comments vic where vic.id_video = uv.id) 'videoCommentsAmount'


  FROM user_details ud
  LEFT JOIN user_videos uv ON uv.id_user = ud.id
  WHERE ud.username = :username`;

  const [data] = await ostofitDB.query(query, {
    replacements: { id, username },
    type: QueryTypes.RAW,
  });

  if (data.length === 0) {
    return false;
  }

  return {
    username: username,
    profile_pic: data[0].profile_pic || "",
    isVerified: data[0].isVerified,
    shortDate: data[0].shortDate,
    description: data[0].description,
    isSubscribed: data[0].isSubscribed,
    requestSent: data[0].requestSent,
    videos: data
      .map((video) => {
        return {
          videoID: video.videoID,
          title: video.title,
          url: video.video_url,
          videoLikesAmount: video.videoLikesAmount,
          liked: video.liked,
          videoCommentsAmount: video.videoCommentsAmount,
        };
      })
      .filter((video) => video.url !== null),
  };
};

exports.getMyProfileData = async (username) => {
  const query = `
  DECLARE @MyID int = (SELECT TOP 1 ud.id FROM user_details ud WHERE ud.username = :username)

  SELECT 
  uv.id 'videoID',
	uv.video_url,
	uv.title,
  (select count (*) from video_likes v where v.id_video = uv.id) 'videoLikesAmount',
  ISNULL((select 1 from video_likes vl where vl.id_user = @MyID and vl.id_video = uv.id), 0) 'liked',
	(select count (*) from video_comments vic where vic.id_video = uv.id) 'videoCommentsAmount'

  FROM user_details ud
  INNER JOIN user_videos uv ON uv.id_user = ud.id
  WHERE ud.username = :username`;

  const [data] = await ostofitDB.query(query, {
    replacements: { username },
    type: QueryTypes.RAW,
  });

  return {
    videos: data.map((video) => {
      return {
        videoID: video.videoID,
        title: video.title,
        url: video.video_url,
        videoLikesAmount: video.videoLikesAmount,
        liked: video.liked,
        videoCommentsAmount: video.videoCommentsAmount,
      };
    }),
  };
};

exports.findUsers = async (username, id) => {
  const query = `SELECT 

	ud.username,
	ud.profile_pic

  FROM user_details ud WHERE username LIKE :username AND ud.id NOT IN (:id)`;

  const [data] = await ostofitDB.query(query, {
    replacements: { username: `${username}%`, id },
    type: QueryTypes.RAW,
  });

  return data;
};

exports.findShorts = async (id) => {
  const query = `
      DECLARE @TempTable TABLE 
    (
      userID int,
      username varchar(MAX),
      profilePicUrl varchar(max),
      isVerified smallint,
      videoID int,
      url varchar(MAX),
      title varchar(MAX),
      seconds bigint,
      videoLikesAmount int,
      liked smallint,
      videoCommentsAmount int
    )

    INSERT INTO @TempTable

    SELECT 
      ud.id 'userID',
      ud.username,
      ud.profile_pic as 'profilePicUrl',
      ud.is_verified as 'isVerified',
      uv.id 'videoID',
      uv.video_url as 'url',
      uv.title,
      (SELECT DATEDIFF(second, date_posted, GETDATE())) AS 'seconds',
      (select count (*) from video_likes v where v.id_video = uv.id) 'videoLikesAmount',
      ISNULL((select 1 from video_likes vl where vl.id_user = :id and vl.id_video = uv.id), 0) 'liked',
      (select count (*) from video_comments vic where vic.id_video = uv.id) 'videoCommentsAmount'


      FROM user_details ud

      INNER JOIN user_videos uv ON uv.id_user = ud.id
      INNER JOIN followers f ON f.follows_id_user = ud.id
      LEFT JOIN video_likes vl ON vl.id_user = ud.id
      WHERE f.id_user = :id


      select
      userID
      ,username 
      ,profilePicUrl
      ,isVerified 
      ,videoID 
      ,url 
      ,title 
      ,(CASE
                WHEN CAST(seconds as int) <3 THEN 'just now'
                WHEN CAST(seconds as int) BETWEEN 3 AND 59 THEN cast(seconds as varchar) + ' second(s) ago'
                WHEN CAST(seconds/60 as int) BETWEEN 1 AND 59 THEN cast(seconds/60 as varchar) + ' minute(s) ago'
                WHEN CAST(seconds/3600 as int) BETWEEN 1 AND 24 THEN cast(seconds/3600 as varchar) + ' hour(s) ago'
                WHEN CAST(seconds/86400 as int) BETWEEN 1 AND 6 THEN cast(seconds/86400 as varchar) + ' day(s) ago'
                WHEN CAST(seconds/86400 as int) BETWEEN 7 AND 28 THEN cast(seconds/604800 as varchar) + ' week(s) ago'
                WHEN CAST(seconds/86400 as int) > 30 THEN cast(seconds/2592000 as varchar) + ' month(s) ago'
                WHEN CAST(seconds/86400 as int) > 365 THEN cast(seconds/31536000 as varchar) + ' year(s) ago'
                END) 'date_posted'
      ,videoLikesAmount 
      ,liked 
      ,videoCommentsAmount 
      from @temptable ORDER by seconds ASC
    `;

  const [data] = await ostofitDB.query(query, {
    replacements: { id },
    type: QueryTypes.RAW,
  });

  return data;
};

exports.updateUserData = async (username, profilePic, description, id) => {
  const query = `
    UPDATE user_details SET username = :username, profile_pic = :profilePic, description = :description WHERE id = :id
    SELECT 'success' 'status'
  `;
  const [data] = await ostofitDB.query(query, {
    replacements: { username, profilePic, description, id },
    type: QueryTypes.RAW,
  });

  if (data[0].status === "success") {
    return "success";
  }

  return "error";
};

exports.updateUserDataWithoutUsername = async (profilePic, id) => {
  const query = `
  UPDATE user_details SET profile_pic = :profilePic WHERE id = :id
  SELECT 'success' 'status'
  `;
  const [data] = await ostofitDB.query(query, {
    replacements: { profilePic, id },
    type: QueryTypes.RAW,
  });

  if (data[0].status === "success") {
    return "success";
  }

  return "error";
};

exports.checkIfUsernameIsNotTaken = async (username) => {
  const query = `
  SELECT TOP 1 * FROM user_details WHERE username = :username
  `;
  const [data] = await ostofitDB.query(query, {
    replacements: { username },
    type: QueryTypes.RAW,
  });
  if (data.length === 0) {
    return "success";
  }
  return "error";
};

exports.getVideoData = async (videoID, myID) => {
  const query = ` 
  DECLARE @UserID varchar(max) = (SELECT ud.username from user_details ud 
    INNER JOIN user_videos uv ON uv.id_user = ud.id
    WHERE uv.id = :videoID)
  
     DECLARE @TempTable TABLE 
      (
        id int,
        username varchar(MAX),
        profilePicUrl varchar(max),
        isVerified smallint,
        videoID int,
        url varchar(MAX),
        title varchar(MAX),
        seconds bigint,
      isSubscribed smallint,
        videoLikesAmount int,
        liked smallint,
        videoCommentsAmount int
      )
  
      INSERT INTO @TempTable
  
    SELECT
    ud.id,
    ud.username,
    ud.profile_pic as 'profilePicUrl',
    ud.is_verified as 'isVerified',
    uv.id as 'videoID',
    uv.video_url as 'url',
    uv.title,
    (SELECT DATEDIFF(second, date_posted, GETDATE())) AS 'seconds',
    (  SELECT COUNT (*) FROM user_details ud
  
    INNER JOIN followers f ON f.follows_id_user = ud.id
    WHERE f.id_user = :myID AND ud.username = @UserID) as isSubscribed,
    (select count (*) from video_likes v where v.id_video = uv.id) 'videoLikesAmount',
    ISNULL((select 1 from video_likes vl where vl.id_user = :myID and vl.id_video = uv.id), 0) 'liked',
    (select count (*) from video_comments vic where vic.id_video = uv.id) 'videoCommentsAmount'
  
  
    FROM user_details ud
  
    INNER JOIN user_videos uv ON uv.id_user = ud.id
    WHERE uv.id = :videoID
  
    SELECT
     id,
     username,
     profilePicUrl,
     isVerified,
     videoID ,
     url,
     title,
      (CASE
                  WHEN CAST(seconds as int) <3 THEN 'just now'
                  WHEN CAST(seconds as int) BETWEEN 3 AND 59 THEN cast(seconds as varchar) + ' second(s) ago'
                  WHEN CAST(seconds/60 as int) BETWEEN 1 AND 59 THEN cast(seconds/60 as varchar) + ' minute(s) ago'
                  WHEN CAST(seconds/3600 as int) BETWEEN 1 AND 24 THEN cast(seconds/3600 as varchar) + ' hour(s) ago'
                  WHEN CAST(seconds/86400 as int) BETWEEN 1 AND 6 THEN cast(seconds/86400 as varchar) + ' day(s) ago'
                  WHEN CAST(seconds/86400 as int) BETWEEN 7 AND 28 THEN cast(seconds/604800 as varchar) + ' week(s) ago'
                  WHEN CAST(seconds/86400 as int) > 30 THEN cast(seconds/2592000 as varchar) + ' month(s) ago'
                  WHEN CAST(seconds/86400 as int) > 365 THEN cast(seconds/31536000 as varchar) + ' year(s) ago'
                  END) 'date_posted',
     isSubscribed,
     videoLikesAmount ,
     liked ,
     videoCommentsAmount 
    FROM @TempTable`;

  const [data] = await ostofitDB.query(query, {
    replacements: { videoID, myID },
    type: QueryTypes.RAW,
  });

  if (data.length === 1) {
    return data;
  }
  return "error";
};

exports.getCommentsData = async (videoID, myID) => {
  const query = `
  DECLARE @TempTable TABLE  
  (
    username VARCHAR(MAX),
    profile_pic VARCHAR(MAX),
    is_verified int,
    id_comment int,
    comment VARCHAR(MAX),
    comment_likes int,
    seconds int,
    MyComment int,
    liked_comment bit
  )
  
  INSERT INTO @TempTable
  
  SELECT
    ud.username,
    ud.profile_pic,
    ud.is_verified,
    vc.id,
    vc.comment,
    ISNULL(vc.comment_likes, 0),
    (SELECT DATEDIFF(second, comment_date, GETDATE())) AS 'seconds',
    (case when ud.id = :myID then 1 else 0 end) 'MyComment',
   (SELECT 
    lc.liked_disliked 
    
    FROM liked_comments lc
    WHERE lc.id_comment = vc.id AND lc.id_user = :myID) 'liked_disliked'
  
    FROM video_comments vc
    LEFT JOIN user_details ud ON ud.id = vc.id_user
  
    WHERE vc.id_video = :videoID
  
    SELECT
          username ,
          profile_pic ,
          is_verified,
    id_comment,
    comment,
    comment_likes,
          (CASE
            WHEN CAST(seconds as int) <3 THEN 'just now'
            WHEN CAST(seconds as int) BETWEEN 3 AND 59 THEN cast(seconds as varchar) + ' second(s) ago'
            WHEN CAST(seconds/60 as int) BETWEEN 1 AND 59 THEN cast(seconds/60 as varchar) + ' minute(s) ago'
            WHEN CAST(seconds/3600 as int) BETWEEN 1 AND 24 THEN cast(seconds/3600 as varchar) + ' hour(s) ago'
            WHEN CAST(seconds/86400 as int) BETWEEN 1 AND 6 THEN cast(seconds/86400 as varchar) + ' day(s) ago'
            WHEN CAST(seconds/86400 as int) BETWEEN 7 AND 28 THEN cast(seconds/604800 as varchar) + ' week(s) ago'
            WHEN CAST(seconds/86400 as int) > 30 THEN cast(seconds/2592000 as varchar) + ' month(s) ago'
            WHEN CAST(seconds/86400 as int) > 365 THEN cast(seconds/31536000 as varchar) + ' year(s) ago'
            END) 'time',
          MyComment, liked_comment FROM @TempTable
    ORDER BY MyComment DESC, seconds ASC
  `;

  const [data] = await ostofitDB.query(query, {
    replacements: { videoID, myID },
    type: QueryTypes.RAW,
  });

  if (data.length === 1 || data.length > 1) {
    return data;
  }
  return "error";
};

exports.postCommentOnVideo = async (comment, videoID, myID) => {
  const query = `
  INSERT INTO video_comments
	(
	 id_user, 
	 id_video, 
	 comment, 
	 comment_date
	 )

	 VALUES 

	 (
	 :myID,
	 :videoID,
	 :comment,
	 GETDATE()
	 )

SELECT 1 'success'
 `;

  const [data] = await ostofitDB.query(query, {
    replacements: { comment, videoID, myID },
    type: QueryTypes.RAW,
  });

  if (data.length === 1) {
    return "success";
  }
  return "error";
};

exports.likeDislikeComment = async (identifier, status, commentID, myID) => {
  const query = `
  DECLARE @Identifier VARCHAR(10) = :identifier
  DECLARE @Status VARCHAR (20) = :status
 
  
  IF @Identifier = '1' AND @Status = 'liked'
  BEGIN
    DELETE FROM liked_comments WHERE id_user = :myID AND id_comment = :commentID
    UPDATE video_comments SET comment_likes = ISNULL(comment_likes, 0) - 1 WHERE id = :commentID
  END

IF @Identifier = '0' AND @Status = 'disliked'
  BEGIN
    DELETE FROM liked_comments WHERE id_user = :myID AND id_comment = :commentID
    UPDATE video_comments SET comment_likes = ISNULL(comment_likes, 0) + 1 WHERE id = :commentID
  END

 IF @Identifier = '1' AND @Status <> 'liked'
  BEGIN
    DELETE FROM liked_comments WHERE id_user = :myID AND id_comment = :commentID
    
    INSERT INTO liked_comments (id_user, id_comment, liked_disliked) VALUES (:myID,:commentID,'0')
    UPDATE video_comments SET comment_likes = ISNULL(comment_likes, 0) - 2 WHERE id = :commentID
  END

IF @Identifier = '0' AND @Status <> 'disliked'
  BEGIN
    DELETE FROM liked_comments WHERE id_user = :myID AND id_comment = :commentID
    
    INSERT INTO liked_comments (id_user, id_comment, liked_disliked) VALUES (:myID,:commentID,'1')
    UPDATE video_comments SET comment_likes = ISNULL(comment_likes, 0) + 2 WHERE id = :commentID
  END

  IF @Identifier IS NULL
  BEGIN
  
    IF @Status = 'liked'
    BEGIN
      INSERT INTO liked_comments (id_user, id_comment, liked_disliked) VALUES (:myID,:commentID,'1')
      UPDATE video_comments SET comment_likes = ISNULL(comment_likes, 0) + 1 WHERE id = :commentID
    END
    
    ELSE 
    BEGIN
      INSERT INTO liked_comments (id_user, id_comment, liked_disliked) VALUES (:myID,:commentID,'0')
      UPDATE video_comments SET comment_likes = ISNULL(comment_likes, 0) - 1 WHERE id = :commentID
    END
   END
  
  SELECT 1
 `;

  const [data] = await ostofitDB.query(query, {
    replacements: { identifier, status, commentID, myID },
    type: QueryTypes.RAW,
  });

  if (data.length === 1) {
    return "success";
  }
  return "error";
};

exports.subUnSubToUser = async (
  isSubscribed,
  myID,
  userUsername,
  requestSent
) => {
  const query = `
	DECLARE @isSubscribed bit = :isSubscribed
	DECLARE @myID int = :myID
	DECLARE @userID int = (SELECT TOP 1 ud.id FROM user_details ud WHERE ud.username = :userUsername)
  DECLARE @requestSent int = :requestSent
  
  IF @isSubscribed = '0' AND @requestSent = '1'
    BEGIN
      DELETE FROM request_to_follow WHERE id_user = @myID AND request_id_user = @userID
    END

	IF @isSubscribed = '1' 
		BEGIN
			DELETE FROM followers WHERE id_user = @myID AND follows_id_user = @userID
		END

	IF @isSubscribed = '0' AND @requestSent <> '1'
		BEGIN
			INSERT INTO request_to_follow (id_user, request_id_user) VALUES (@myID, @userID)
		END

  SELECT 'success' 'status'
 `;

  const [data] = await ostofitDB.query(query, {
    replacements: { isSubscribed, myID, userUsername, requestSent },
    type: QueryTypes.RAW,
  });

  if (data.length === 1) {
    return data;
  }
  return "error";
};

exports.likeDislikeVideo = async (videoID, myID, liked) => {
  const query = `
  DECLARE @videoID int = :videoID
  DECLARE @myID int = :myID
  DECLARE @liked bit = :liked

  IF @liked = '0'
    BEGIN
      INSERT INTO video_likes (id_user, id_video) VALUES (@myID, @videoID)
      UPDATE user_videos SET video_likes = ISNULL(video_likes, 0) + 1 WHERE id = @videoID
    END

  ELSE
    BEGIN
    DELETE FROM video_likes WHERE id_user = @myID AND id_video = @videoID
    UPDATE user_videos SET video_likes = ISNULL(video_likes, 0) - 1 WHERE id = @videoID
    END


	SELECT 'success' 'status'
 `;

  const [data] = await ostofitDB.query(query, {
    replacements: { videoID, myID, liked },
    type: QueryTypes.RAW,
  });

  if (data.length === 1) {
    return data;
  }
  return "error";
};

exports.insertVideoDataIntoDB = async (username, title) => {
  const query = `
    DECLARE @userID int = (SELECT TOP 1 ud.id FROM user_details ud WHERE username = :username)

    INSERT INTO user_videos (id_user, video_url, title, date_posted) values (@userID, 'https://assets.codepen.io/6093409/river.mp4', :title, GETDATE())

    SELECT SCOPE_IDENTITY() 'id'
  `;

  const [data] = await ostofitDB.query(query, {
    replacements: { username, title },
    type: QueryTypes.RAW,
  });

  if (data.length === 1) {
    return data[0].id;
  }
  return "error";
};

exports.updatePath = async (videoID, fullPath) => {
  const query = `
  UPDATE user_videos SET video_path = :fullPath WHERE id = :videoID
  SELECT 'success' 'status'
`;

  const [data] = await ostofitDB.query(query, {
    replacements: { videoID, fullPath },
    type: QueryTypes.RAW,
  });

  if (data.length === 1) {
    return data[0].status;
  }
  return "error";
};

exports.getPath = async (videoID) => {
  const query = `
  SELECT TOP 1 video_path FROM user_videos WHERE id = :videoID
`;

  const [data] = await ostofitDB.query(query, {
    replacements: { videoID },
    type: QueryTypes.RAW,
  });

  return data[0].video_path;
};

exports.deleteVideo = async (videoID) => {
  const query = `
  SELECT video_path FROM user_videos WHERE id = :videoID

  DELETE FROM user_videos WHERE id = :videoID
  DELETE FROM liked_comments WHERE id_comment IN ((SELECT vc.id FROM video_comments vc INNER JOIN liked_comments lc ON lc.id_comment = vc.id WHERE vc.id_video = :videoID))
  DELETE FROM video_comments WHERE id_video = :videoID
  DELETE FROM video_likes WHERE id_video = :videoID
`;

  const [data] = await ostofitDB.query(query, {
    replacements: { videoID },
    type: QueryTypes.RAW,
  });

  const videoPath = data[0].video_path;

  if (fs.existsSync(videoPath)) {
    fs.rmSync(videoPath);
  } else {
    console.log("Does not exists.");
    return "error";
  }
  return "error";
};

exports.getCommunityVideos = async (myID, filterNum) => {
  const query = `
  DECLARE @filterNum int = :filterNum

  SELECT
  uv.id 'videoID'
  
  FROM user_details ud

  INNER JOIN user_videos uv ON uv.id_user = ud.id
  WHERE ud.id <> :myID AND  date_posted >= DATEADD(day, -@filterNum, GETDATE())
  `;
  const [data] = await ostofitDB.query(query, {
    replacements: { myID, filterNum },
    type: QueryTypes.RAW,
  });

  if (data.length >= 1) {
    return data;
  }
  return [];
};
