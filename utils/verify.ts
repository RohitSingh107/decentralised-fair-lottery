import { run } from "hardhat"

export const verify = async (contractAddress: string, args: any[]) => {
    console.log("Verifying Contract...")
    try {
        await run("verify:verify", {
            // No space after colon
            address: contractAddress,
            constructorArguments: args,
        })
    } catch (e: any) {
        if (e.message.toLowerCase().includes("already verified")) {
            console.log("Already verified!")
        } else {
            console.log(e)
        }
    }
}
