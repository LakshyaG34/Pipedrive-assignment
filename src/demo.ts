import dotenv from "dotenv"

dotenv.config();
const apiToken = process.env.PIPEDRIVE_API_KEY

async function getDomain(){
    const res = await fetch(`https://api.pipedrive.com/v1/users/me?api_token=${apiToken}`);
    const result = await res.json();

    if(result?.data?.company_domain)
    {
        console.log("The domain is:", result.data.company_domain);
    }
    else{
        console.log("The domain not found");
    }
}

getDomain();
