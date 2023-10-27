const { ethers } = require("hardhat");
const { CHAINS, CONFIGURATION_FOLDER, SUPPORTED_CHAINS_FILE, getDeployedOnChains } = require("./helper.js");
const fs = require("fs");
const { Contract } = require("ethers");






const ENDPOINT_ABI = JSON.parse(fs.readFileSync("scripts/abis/endpoint.json"));
const ULN_ABI = JSON.parse(fs.readFileSync("scripts/abis/uln.json"));
const RELAYER_ABI = JSON.parse(fs.readFileSync("scripts/abis/relayer.json"));


const storeInFile = (envchain, value) => {
    CHAINS[envchain]["maxAllowedToReceive"] = value
    fs.writeFileSync(CONFIGURATION_FOLDER + "/" + SUPPORTED_CHAINS_FILE, JSON.stringify(CHAINS, null, 2));
}


const main = async () => {

    const envchain = hre.network.name;
    if(typeof envchain === 'undefined')
    {
        console.log("No chain has been provided in runtime!");
        return;
    }

    const deployedOnChains = getDeployedOnChains();
    const endpoint = deployedOnChains[envchain].endpoint;

    
    const signer = (await ethers.getSigners())[0];
    const endCtrt = new Contract(endpoint, ENDPOINT_ABI, signer);
    const ulnCtrt = new Contract(await endCtrt.defaultReceiveLibraryAddress(), ULN_ABI, signer);
    const relayer = (await ulnCtrt.defaultAppConfig(deployedOnChains[envchain].id)).relayer;
    const relayerCtrt = new Contract(relayer, RELAYER_ABI, signer);

    const setDstEvents = await relayerCtrt.queryFilter(relayerCtrt.filters.SetDstConfig());
    const filteredEvents = setDstEvents.filter(event => event.args[0] == deployedOnChains[envchain].id);
    if(filteredEvents.length > 0)
    {
        const maxAllowed = ethers.utils.formatEther(filteredEvents[filteredEvents.length - 1].args[2]);
        console.log("Max allowed: " + maxAllowed + " " + deployedOnChains[envchain].currency);
        storeInFile(envchain, maxAllowed);
    }
    else console.log("No SetDstConfig event found!");

  

}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});