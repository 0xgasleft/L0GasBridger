const { spawnSync } = require('child_process');
const { CHAINS, CONFIGURATION_FOLDER, SUPPORTED_CHAINS_FILE, isCorrectlyConfiguredChain, getDeployedOnChains } = require("./helper.js");
const fs = require("fs");
const { sendProcess } = require("./sender_helper.js");
const hre = require("hardhat");

const cleanConfigDir = () => {
    if(fs.existsSync(CONFIGURATION_FOLDER))
    {
        let configDirContent = fs.readdirSync(CONFIGURATION_FOLDER);
        if(configDirContent.includes(SUPPORTED_CHAINS_FILE))
        {
            configDirContent.splice(configDirContent.indexOf(SUPPORTED_CHAINS_FILE), 1);
        }
        for(const content of configDirContent)
        {
            fs.rmSync(CONFIGURATION_FOLDER + "/" + content);
        }
        
    }
}



const deployAll = async () => {

    for(const chain in CHAINS)
    {
        let deployed = false;
        console.log(`+++++++ Deploying on ${chain} +++++++`);

        if(isCorrectlyConfiguredChain(chain))
        {
            while(!deployed)
            {
                const execution = spawnSync('npx.cmd', ['hardhat', 'run', 'scripts/exec_deployer.js', '--network', chain]);
                console.log(execution.stdout.toString());
                console.log(execution.stderr.toString());
                if(execution.stderr.toString().includes("transaction underpriced"))
                {
                    console.log("Got an RPC error, retrying until success..");
                    continue;
                }
                deployed = true;
            }
        }
        else
        {
            console.error(`Configuration validation failed for ${chain}, won't deploy on it!`); 
        }
    }
    
}


const requestAll = async (deployedOnChains) => {

    for(const chain in deployedOnChains)
    {
        console.log(`++++++++++++++++++++++++++++ REQUESTING MAX ALLOWED IN ${chain} ++++++++++++++++++++++++++++`);

        const execution = spawnSync('npx.cmd', ['hardhat', 'run', 'scripts/exec_requester.js', '--network', chain]);
        console.log(execution.stdout.toString());
        console.log(execution.stderr.toString());
    }
}



const trustAll = async (deployedOnChains) => {
    
    for(const chain in deployedOnChains)
    {
        console.log(`+++++++ Trusting remotes on ${chain} +++++++`);

        const execution = spawnSync('npx.cmd', ['hardhat', 'run', 'scripts/exec_truster.js', '--network', chain]);
        console.log(execution.stdout.toString());
        console.log(execution.stderr.toString());

    }

}


const sendAll = async (deployedOnChains, dest=null, amount=null) => {

    for(const chain in deployedOnChains)
    {
        console.log(`++++++++++++++++++++++++++++ Messages from ${chain} ++++++++++++++++++++++++++++`);

        let cmd = (dest != null && amount != null) ? ['hardhat', 'run', 'scripts/exec_sender.js', '--network', chain, dest, amount] : ['hardhat', 'run', 'scripts/exec_sender.js', '--network', chain];
        const execution = spawnSync('npx.cmd', cmd);
        console.log(execution.stdout.toString());
        console.log(execution.stderr.toString());
    }
}



const getMode = () => {
    const allowedModes = ["all", "cleanConfigDir", "deployOnSupported", "requestMaxCapsOnSupported", "sendOnSupported"];
    if(process.argv.length > 2)
    {
        const mode = process.argv[2];
        if(allowedModes.includes(mode))
        {
            switch(mode) {
                case "sendOnSupported":
                    if(process.argv.length == 4)
                    {
                        return {"mode": mode, "submode": process.argv[3]};
                    }
                    else if(process.argv.length == 7)
                    {
                        return {"mode": mode, "submode": process.argv[3], "source": process.argv[4], "dest": process.argv[5], "amount": process.argv[6]};
                    }
                    else
                    {
                        console.log("Usage of mono sendOnSupported feature: sendOnSupported mono from_blockchain to_blockchain amount_in_dest_currency");
                        console.log("Usage of multi sendOnSupported feature: sendOnSupported multi");
                    }
                    
                default:
                    return {"mode": mode};
                    
            }
        }
    }
    
    console.log(`Usage: node ${__filename} ${allowedModes}`);
    return null;
}


const main = async () => {
    
    const modeData = getMode();
    if(modeData == null) return;

    const mode = modeData["mode"];
    if(mode == "all" || mode == "cleanConfigDir")
    {
        console.log("----------------------------------------- INITIALIZATION ------------------------------------------");
        console.log(`Cleaning configuration folder`);
        cleanConfigDir();
    }

    
    if(mode == "all" || mode == "deployOnSupported")
    {
        console.log("------------------------------------------- DEPLOYMENTS -------------------------------------------");
        await deployAll();

        console.log("------------------------------------------ TRUST REMOTES ------------------------------------------");
        
        if(!fs.existsSync(CONFIGURATION_FOLDER))
        {
        console.error(`${CONFIGURATION_FOLDER} is missing!`);
        return;
        }
        const deployedOnChains = getDeployedOnChains();
        await trustAll(deployedOnChains);
    }

    if(mode == "all" || mode == "requestMaxCapsOnSupported")
    {
        const deployedOnChains = getDeployedOnChains();
        console.log("------------------------------------------- REQUEST MAX CAPS -------------------------------------------");
        if(deployedOnChains.length == 0)
        {
            console.log("No deployed on chain!");
        }
        else
        {
            await requestAll(deployedOnChains);
        }
        
    }

    if(mode == "all" || mode == "sendOnSupported")
    {
        const deployedOnChains = getDeployedOnChains();
        
        if(deployedOnChains.length < 1)
        {
            console.log("Deployed on chains should be more than one!");
        }
        else
        {
            if(modeData["submode"] == "mono")
            {
                if(!(modeData["source"] in CHAINS) || !(modeData["dest"] in CHAINS))
                {
                    console.log(`Source chain ${modeData["source"]} and/or destination chain ${modeData["dest"]} not supported!`)
                }
                else if(modeData["source"] == modeData["dest"])
                {
                    console.log("Source & destination blockchain cannot be the same!");
                }
                else if(isNaN(modeData["amount"]))
                {
                    console.log("Given amount is not a valid number!");
                }
                else if (!("maxAllowedToReceive" in CHAINS[modeData["dest"]]))
                {
                    console.log("'maxAllowedToReceive' not configured yet, please use requestMaxCapsOnSupported mode first!");
                }
                else
                {
                    const maxAllowed = parseFloat(CHAINS[modeData["dest"]].maxAllowedToReceive);
                    const toBeSent = parseFloat(modeData["amount"]);
                    if(maxAllowed < toBeSent)
                    {
                        console.log(`Desired amount: ${toBeSent} is greater than allowed: ${maxAllowed} for ${modeData["dest"]}`);
                    }
                    else
                    {
                        console.log("--------------------------------------------- SENDING ---------------------------------------------");
                        await sendProcess(modeData["source"], modeData["dest"], modeData["amount"]);
                    }
                    
                }
            }
            else if(modeData["submode"] == "multi")
            {
                console.log("--------------------------------------------- SENDING ---------------------------------------------");
                await sendAll(deployedOnChains);
            }
            
        }
    }
}


main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});