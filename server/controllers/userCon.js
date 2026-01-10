const {clerkClient}=require('@clerk/express')
const getUser=async(uid)=>{
    const user=await clerkClient.users.getUser(uid);
    return user;
}
//TODO
module.exports={getUser}