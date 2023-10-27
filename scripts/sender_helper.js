const {ethers} = require("hardhat");
const { getChainsWithoutChain, getDeployedOnChains, getContract } = require("./helper.js");
const { waitForMessageReceived } = require("@layerzerolabs/scan-client");





const getTotalToBeSent = async (envctrt, destID, amountBeSent, serviceFee) => {
    try
    {
        const sendFees = (await envctrt.estimateTravelCost(destID, amountBeSent))[0];
        console.log(`L0 send fee: ${ethers.utils.formatEther(sendFees)}`);

        const parsedServiceFee = ethers.utils.parseEther(serviceFee);

        return sendFees.add(parsedServiceFee);
    }
    catch(error)
    {
        console.error(error);
        console.log("Could not calculate total to be sent, check logs for details!");
        return null;
    }
    
}

const getTotalToBePaid = async (envctrt, destID, amountToReceive, totalToBeSent) => {
    
    const gasPrice = (await envctrt.provider.getGasPrice());
    let gasUnits;
    try
    {
        gasUnits = await envctrt.estimateGas.travelWithGas(destID, amountToReceive, {value: totalToBeSent});
    }
    catch(error)
    {
        console.error(error);
        console.log("Could not estimate send tx, check logs for detail!");
        return null;
    }
    
    const gasFee = gasPrice.mul(gasUnits);
    return totalToBeSent.add(gasFee);
}


const checkBalance = async (toBePaid) => {
    const signer = (await ethers.getSigners())[0];
    return toBePaid.lt(await signer.getBalance());
}


const sendGas = async (envctrt, destID, amountToReceive, totalToBeSent) => {
    try
    {
        return envctrt.travelWithGas(destID, amountToReceive, {value: totalToBeSent});
    }
    catch(error)
    {
        console.log("Send failed, retrying 1 time");
        console.error(error);
        try
        {
            return envctrt.travelWithGas(destID, amountToReceive, {value: totalToBeSent});
        }
        catch(error2)
        {
            console.error(error2);
            console.log("Send failed again, skipping!");
            return null;
        }
    }
}


const sendProcess = async (source=null, dest=null, amount=null) => {
    
    const envchain = source == null ? hre.network.name : source;
    
    const deployedOnChains = getDeployedOnChains();
    let chainsWithoutChain = await getChainsWithoutChain(envchain, deployedOnChains);
    
    const singleSend = envchain != null && dest != null && amount != null;
    
    if(singleSend)
    {
        console.log("Detected a potential configured send, checking..!");
        if(!(dest in chainsWithoutChain))
        {
            console.log("Given destination chain is not found in deployed on chain");
        }
        else if(isNaN(amount))
        {
            console.log("Given amount is not a valid number");
        }
        else
        {
            console.log("Valid parameters, configuring execution for a single send process..");
            let temp = {};
            temp[dest] = chainsWithoutChain[dest];
            chainsWithoutChain = temp;
            chainsWithoutChain[dest].amountToReceive = amount;
            console.log("Done, let's go!");
        }

    }

    const envctrt = await getContract(envchain, singleSend);
    if(envctrt == null)
    {
        console.error(`Attaching to deployed contract on ${envchain} failed!`);
        return;
    }



    for(const chain in chainsWithoutChain)
    {
        console.log(`\n+++++ Sending gas message from ${envchain} to ${chain} +++++`);
        
        const amountToReceive = ethers.utils.parseEther(chainsWithoutChain[chain].amountToReceive);
        console.log(`Amount to receive: ${ethers.utils.formatEther(amountToReceive)} ${chainsWithoutChain[chain].currency}`);
        const totalToBeSent = await getTotalToBeSent(envctrt, chainsWithoutChain[chain].id, amountToReceive, deployedOnChains[envchain].serviceFee);
        if(totalToBeSent == null)
        {
            continue;
        }
        console.log(`Total to be sent: ${ethers.utils.formatEther(totalToBeSent)} = amount to be sent + L0 fees + service fees`);
        const totalToBePaid = await getTotalToBePaid(envctrt, chainsWithoutChain[chain].id, amountToReceive, totalToBeSent);
        

        if(totalToBePaid != null)
        {
            console.log(`Total to be paid: ${ethers.utils.formatEther(totalToBePaid)} = total to be sent + gas fees`);
            if(checkBalance(totalToBePaid))
            {
                let receipt = await sendGas(envctrt, chainsWithoutChain[chain].id, amountToReceive, totalToBeSent);
                if(receipt == null)
                {
                    continue;
                }
                console.log(`Sent ${envchain} gas message with tx hash: ${receipt.hash}`);
                if(singleSend)
                {
                    waitForMessageReceived(deployedOnChains[envchain].id, receipt.hash)
                    .then((message) => {
                        console.log(`Message arrived at ${chain} with tx hash: ${message.dstTxHash}`);
                    });
                }
                
            }
            else
            {
                console.log(`Signer balance ${ethers.utils.formatEther(await envctrt.signer.getBalance())} is not enough, need at least ${ethers.utils.formatEther(totalToBePaid)}`);
                continue;
            }
        }

        
    }
}


module.exports = {sendProcess};