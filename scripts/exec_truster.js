const {ethers} = require("hardhat");
const { getChainsWithoutChain, getDeployedOnChains, getContract } = require("./helper.js");






const trustRemotes = async (ctrt, chain, chainsWithoutChain) => {

    let trustedRemotePath;
  
    for(const chainWithoutChain in chainsWithoutChain)
    {
      trustedRemotePath = ethers.utils.solidityPack(
        ['address','address'],
        [chainsWithoutChain[chainWithoutChain].ctrt, ctrt.address]
      );
      
      let receipt;
      let trusted = false;
      while(!trusted)
      {
        try
        {
          receipt = await ctrt.setTrustedRemote(chainsWithoutChain[chainWithoutChain].id, trustedRemotePath);
        }
        catch(error)
        {
          if(error.toString().includes("transaction underpriced"))
          {
              console.log("Got an RPC error, retrying until success..");
              continue;
          }
          else
          {
            console.error(error);
            console.log(`Got unexpected error, skipping ${chainWithoutChain}`);
            break;
          }
        }
        
        trusted = true;
        console.log(`Successfully set trusted remote UA of ${chainWithoutChain} in UA of ${chain} at hash: ${receipt.hash}`);
      }
      
  
    }
  
}


const trustProcess = async () => {
    const envchain = hre.network.name;

    const envctrt = await getContract(envchain);
    if(envctrt == null)
    {
        console.error(`Attaching to deployed contract on ${envchain} failed!`);
        return;
    }

    const deployedOnChains = getDeployedOnChains();
    const chainsWithoutChain = await getChainsWithoutChain(envchain, deployedOnChains);
    await trustRemotes(envctrt, envchain, chainsWithoutChain);
}


trustProcess().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });