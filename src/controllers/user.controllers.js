import fs from "fs";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.models.js";
import { uploadOnClodinary } from "../utils/cloundinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";



const generateAccessandRefreshTokens = async(userId)=>{
    try {
       const user = await User.findById(userId);
       const accessToken = user.generateAccessToken()
       const refreshToken = user.generateRefreshToken()


    user.refreshToken = refreshToken
    await user.save({validateBeforeSave: false})

    return{accessToken, refreshToken}
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token")
    }
};

const registerUser = asyncHandler(async (req, res) => {
    // console.log("Controller Hit");
    // console.log(req.body);
    // console.log(req.files);

//    get users details from frontend
//    validation - not empty
//    check if user already exsits
//    check for images, check for avatar
//    upload them to cloudinary, avatar
//    create user object - create entry in db
//    remove password and refresh token from response
//    check for user creation 
//    return response

    const { fullName, email, username, password } = req.body;

    if ([fullName, email, username, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All Fields are required");
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    });

    if (existedUser) {
        throw new ApiError(409, "User with email and username already exists");
    }

    const avatarLocalPath = req.files?.avatar?.[0]?.path;
   // const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
    // or
   let coverImageLocalPath;
   if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files?.coverImage[0]?.path;
   }

    // console.log("Avatar Path:", avatarLocalPath);
    // console.log("Cover Path:", coverImageLocalPath);
    // console.log("Avatar Exists:", fs.existsSync(avatarLocalPath));
    // console.log("Cover Exists:", coverImageLocalPath ? fs.existsSync(coverImageLocalPath) : "No Cover");

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required");
    }

    const avatar = await uploadOnClodinary(avatarLocalPath);
    const coverImage = await uploadOnClodinary(coverImageLocalPath);

    console.log("Avatar Response:", avatar);
    console.log("Cover Response:", coverImage);

    if (!avatar) {
        throw new ApiError(400, "Avatar is required");
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase(),
    });

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering user");
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully!!")
    );
});

const loginUser = asyncHandler(async(req,res) => {
    // req.body -> data
    // username or email
    // find the user
    // password check
    // access and refresh token
    // send cookie

    const {email, password,username} = req.body

    if (!(username || email)) {
        throw new ApiError(400, "Username or email is required")
    }
    
    // checking by username or email so that we know the user is registered or not
    const user = await User.findOne({
        $or : [{username},{email}]
    })

    if (!user) {
        throw new ApiError(404, "user not exist");
    }

   const isPasswordValid = await user.isPasswordCorrect(password)
   if (!isPasswordValid) {
        throw new ApiError(401, "password not valid");
    }

    const {refreshToken, accessToken} =
     await generateAccessandRefreshTokens(user._id)

     const loggedInUser = await User.findById(user._id).
     select("-password -refreshToken")

     const options = {
        httpOnly: true,
        secure: true
     }

     return res.status(200)
     .cookie("accessToken", accessToken, options)
     .cookie("refreshToken", refreshToken, options)
     .json(
        new ApiResponse(
            200
            ,{user: loggedInUser, accessToken, refreshToken}
            ,"User loggedin successfully"
        )
     )
});

const logoutUser = asyncHandler(async(req, res)=>{
   await User.findByIdAndUpdate(
        req.user._id,
        {
          $set: {
            refreshToken: undefined
          }
        },
        {
            new: true
        }
    ) 

    const options = {
        httpOnly: true,
        secure: true
     }

     return res
     .status(200)
     .clearCookie("accessToken", options)
     .clearCookie("refreshToken", options)
     .json(new ApiResponse(200, {}, " User Logged out"))
})


const refreshAccessToken = asyncHandler(async (req,res)=>{
   const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

   if(!incomingRefreshToken){
    throw new ApiError(401, "Unauthorized Request");
   }

   try {
     const decodedToken = jwt.verify(
        incomingRefreshToken,
        process.env.REFRESH_TOKEN_SECRET
    )
 
    const uder = await User.findById(decodedToken?._id)
 
    if(!user){
     throw new ApiError(401, " Invalid refresh Token")
    }
 
 
    if(incomingRefreshToken !== user?.refreshToken){
     throw new ApiError(401, "Refresh token is expired");
    }
 
    const options ={
     httpOnly: truw,
     secure: true
    }
 
   const {accessToken, newrefreshToken} = await 
   generateAccessandRefreshTokens(user._id)
 
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
         200,
         {accessToken, refreshToken: newrefreshToken},
         "Access Token refreshed"
        )
    )
   } catch (error) {
      throw new ApiError(401, error?.message || 
        "Invalid refresh Token")
   }
})


const changeCurrentPassword = asyncHandler(async(req,res)=>{
    const {oldPassword, newPassword} = req.body

   const user = await User.findById(req.user?._id)
   const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

   if (!isPasswordCorrect) {
      throw new ApiError(400, "Invalid old password");
   }

   user.password = newPassword;
  await user.save({validateBeforeSave:false})

  return res
  .status(200)
  .json(new ApiResponse(200, {}, "Password reset successfully"))
})


const getCurrentUser = asyncHandler(async(req,res)=>{
    return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched"))
})

const updateAccountDetails = asyncHandler(async(req, res)=>{
   const {fullName, email} = req.body

   if (!(fullName || email)) {
       throw new ApiError(400, "All fields are required")
   }

   const user =  User.findByIdAndUpdate(
    req.user?._id,
    {
        $set: {
            fullName: fullName,
            email: email
        }
    },
    {new: true}

   ).select("-password")

   return res
   .status(200)
   .json(new ApiResponse(200, user, "Account updated successfully !!"))
})

const updateUSerAvavtar = asyncHandler(async(req, res)=>{
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing");
    }

   const avatar = await uploadOnClodinary(avatarLocalPath)
   
   if (!avatar.url) {
    throw new ApiError(400, "Wrror while uploading on avatar");
   }

    const user = await User.findByIdAndUpdate(
        req.user?._id,

        {
            $set:{
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")

     return res.status(200).json(
        new ApiResponse(200, user, "Avatar image updated successfully!!")
    )
})

const updateUSerCoverImage = asyncHandler(async(req, res)=>{
    const coverLocalPath = req.file?.path

    if (!coverLocalPath) {
        throw new ApiError(400, "cover file is missing");
    }

   const coverImage = await uploadOnClodinary(coverLocalPath)
   
   if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading on avatar");
   }

    const user = await User.findByIdAndUpdate(
        req.user?._id,

        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res.status(200).json(
        new ApiResponse(200, user, "Cover image updated successfully!!")
    )
})

const getUserChannelProfile = asyncHandler(async(req, res)=>{
    const {username} = req.params

    if(!username?.trim()){
        throw new ApiError(400, "username is missing");
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField:"_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },

        {
            $lookup: {
                from: "subscriptions",
                localField:"_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields:{
               subscribersCount: {
                 $size: "$subscribers"
               },
               channelsSubscribedTo : {
                $size: "$subscribedTo"
               },
               isSubscribed:{
                  $cond:{
                    if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                    then: true,
                    else: false
                  }
               }
            }
        },
       {
        $project:{
            fullName: 1,
            username: 1,
            subscribersCount: 1,
            channelsSubscribedTo: 1,
            avatar: 1,
            coverImage: 1,
            email: 1
        }
       }

    ])

    if (!channel?.length) {
        throw new ApiError(404, "channel does not exists")
    }

    return res.status(200).json(
        new ApiResponse(200, channel[0], "user details fetched succesfully")
    )

    console.log(channel);
})

const getWatchHistory = asyncHandler(async (req, res)=>{
    const user = await User.aggregate([

        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup:{
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as : "owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullName: 1,
                                        username:1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                // retrieve first value from the array
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(new ApiResponse
        (
            200, user[0].WatchHistory,
            "Watch history fetched successfully"
        ))
})

export { 
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUSerAvavtar,
    updateUSerCoverImage ,
    getUserChannelProfile,
    getWatchHistory
 };