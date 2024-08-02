import BN from "bn.js";
import * as web3 from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMint,
  mintTo,
  getOrCreateAssociatedTokenAccount,
  getAccount,
  transfer,
} from "@solana/spl-token";
import { Opool } from "../target/types/opool";

import {
  clusterApiUrl,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

import { createCreateMetadataAccountV3Instruction } from "@metaplex-foundation/mpl-token-metadata";
import {
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { web3 } from "@project-serum/anchor";import type { Opool } from "../target/types/opool";

// Configure the client to use the local cluster
anchor.setProvider(anchor.AnchorProvider.env());

const program = anchor.workspace.Opool as anchor.Program<Opool>;



const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
let token_programId = TOKEN_PROGRAM_ID;
let associated_token_programId = ASSOCIATED_TOKEN_PROGRAM_ID;

//当前连接的钱包账户地址
let user = program.provider.publicKey;
//当前连接的钱包账户keypair
let signer = program.provider.wallet.payer;

//test
// let newTokenMes = new web3.Keypair();
//定义的池子spl token组
let tokenGroup=[];
const allowTokenGroup= tokenGroup.map(
  (address) => new PublicKey(address)
);

// Generate keypair for the new account
let initStateAccount = new web3.Keypair();
console.log("initStateAccount:", initStateAccount.publicKey.toString());

//Initialize
let thisOwner :PublicKey = user;
let thisFee = new anchor.BN(0);
let thisFeeReceiver :PublicKey = user;
let lock = false;

//new 设置新的相关内容
let thisNewFee = new anchor.BN(0);
let thisNewFeeReceiver = user;
let thisNewOwner = user;
let paused = false;

//set maker list 设置maker
const makerValidAccount = new web3.Keypair();
console.log("makerValidAccount:", makerValidAccount.publicKey.toString());
//maker地址组
let newMakerListGroup = [];
const newMakerGroup = newMakerListGroup.map(
  (address) => new PublicKey(address)
);
//maker地址组对应的bool
let newMakerBoolListGroup = [];
const newMakerBoolGroup = newMakerBoolListGroup.map(
  (address) => new PublicKey(address)
);

//set Token Receiver
const newTokenReceiverAccount = new web3.Keypair();
console.log(
  "newTokenReceiverAccount:",
  newTokenReceiverAccount.publicKey.toString()
);
//接收者token地址组
let newTokenReceiverListGroup = [];
const newTokenReceiverGroup = newTokenReceiverListGroup.map(
  (address) => new PublicKey(address)
);
//接收者地址组
let newReceiverListGroup = [];
const newReceiverGroup = newReceiverListGroup.map(
  (address) => new PublicKey(address)
);

//Set Manager List
const newTokenManagerAccount = new web3.Keypair();
console.log(
  "newTokenManagerAccount:",
  newTokenManagerAccount.publicKey.toString()
);
//管理token地址组
let newManagerTokenListGroup = [];
const newManagerTokenGroup = newManagerTokenListGroup.map(
  (address) => new PublicKey(address)
);
//管理员地址组
let newManagerListGroup = [];
const newManagerGroup = newManagerListGroup.map(
  (address) => new PublicKey(address)
);

console.log("User pubkey:", user.toString());
// console.log("newTokenMes:", newTokenMes.publicKey.toString());

// const metadataData = {
//   name: "SunRise Rainbow Token",
//   symbol: "SRT",
//   uri: "https://arweave.net/1234",
//   sellerFeeBasisPoints: 0,
//   creators: null,
//   collection: null,
//   uses: null,
// };


// async function requestAirdrop(user: PublicKey, connection: Connection) {
//   try {
//     const airdropSignature = await connection.requestAirdrop(
//       user,
//       2 * web3.LAMPORTS_PER_SOL // Requesting 2 SOL
//     );

//     // Confirm the transaction
//     await connection.confirmTransaction(airdropSignature);
//     console.log("Airdrop successful!");
//   } catch (err) {
//     console.error("Airdrop failed:", err);
//   }
// }

// // Request SOL for the user
// await requestAirdrop(user, connection);

// Function to check the SOL balance
async function getBalance(checkAddress: PublicKey) {
  try {
    const balance = await connection.getBalance(checkAddress);
    return balance;
  } catch (err) {
    console.error("Failed to get balance:", err);
  }
}

let userSolBalance = await getBalance(user);
console.log(`userSolBalance: ${userSolBalance / web3.LAMPORTS_PER_SOL} SOL`);

//createMint
// async function create_mint() {
//   const tokenMint = await createMint(
//     connection,
//     signer,
//     user,
//     null,
//     6,
//     newTokenMes,
//     null,
//     token_programId
//   );
//   console.log("tokenMint:", tokenMint.toString());
// }
// await create_mint();

//Make some token metadata
// Generate a new keypair for the mint
// async function make_metadata() {
//   const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
//     "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
//   );

//   const metadataPDAAndBump = PublicKey.findProgramAddressSync(
//     [
//       Buffer.from("metadata"),
//       TOKEN_METADATA_PROGRAM_ID.toBuffer(),
//       newTokenMes.publicKey.toBuffer(),
//     ],
//     TOKEN_METADATA_PROGRAM_ID
//   );

//   const metadataPDA = metadataPDAAndBump[0];
//   console.log("metadataPDA success");
//   const transaction = new Transaction();

//   const createMetadataAccountInstruction =
//     createCreateMetadataAccountV3Instruction(
//       {
//         metadata: metadataPDA,
//         mint: newTokenMes.publicKey,
//         mintAuthority: user,
//         payer: user,
//         updateAuthority: user,
//       },
//       {
//         createMetadataAccountArgsV3: {
//           collectionDetails: null,
//           data: metadataData,
//           isMutable: true,
//         },
//       }
//     );

//   transaction.add(createMetadataAccountInstruction);

//   // send
//   try {
//     const metadataTxHash = await program.provider.connection.sendTransaction(transaction, [
//       signer,
//     ]);
//     console.log(`Transaction sent`);
//     // confirm
//     const metadataConfirmation = await program.provider.connection.confirmTransaction(
//       metadataTxHash
//     );
//     console.log(
//       `Transaction confirmed: ${metadataTxHash}`,
//       metadataConfirmation
//     );
//   } catch (error) {
//     console.error("Error sending transaction:", error);
//   }
// }
// await make_metadata();

//Create an Associated Token Account to store the tokens
async function createAssociatedToken(
  splTokenKey: PublicKey,
  createAssociateAccount: PublicKey
) {
  const userAssociatedTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    signer,
    splTokenKey,
    createAssociateAccount,
    true,
    null,
    null,
    token_programId,
    associated_token_programId
  );
  return userAssociatedTokenAccount.address;
}

//user token associated
// let userAssociatedAccount = await createAssociatedToken(
//   newTokenMes.publicKey,
//   user
// );
// console.log(
//   "userAssociatedAccount:",
//   userAssociatedAccount.toString(),
//   "owner:",
//   user.toString()
// );

// let testReceiver = new web3.Keypair();
// let destinationTokenAccount = await createAssociatedToken(
//   newTokenMes.publicKey,
//   testReceiver.publicKey
// );
// console.log(
//   "destinationTokenAccountInfo:",
//   destinationTokenAccount.toString(),
//   "owner:",
//   testReceiver.publicKey.toString()
// );

//mint to
// async function mint_to(newToken: PublicKey, receiver: PublicKey) {
//   const init_amount = 10000000000;
//   try {
//     const mintToTx = await mintTo(
//       connection,
//       signer,
//       newToken,
//       receiver,
//       user,
//       init_amount,
//       [signer],
//       null,
//       token_programId
//     );
//     console.log("mintToTx:", mintToTx);
//   } catch (e) {
//     console.log("Mint to error:", e);
//   }
// }
// await mint_to(newTokenMes.publicKey, userAssociatedAccount);

//token balance
async function getTokenBalance(checkAddress: PublicKey) {
  try {
    const tokenAccountInfo = await getAccount(connection, checkAddress);
    console.log(`This Account Token balance: ${tokenAccountInfo.amount}`);
  } catch (err) {
    console.error("Failed to get token balance:", err);
  }
}
// await getTokenBalance(userAssociatedAccount);

//Transfer token to user
// async function transfer_to(receiverAssociatedAccount: PublicKey) {
//   try {
//     const TransferTokenSignature = await transfer(
//       connection,
//       signer,
//       userAssociatedAccount,
//       receiverAssociatedAccount,
//       user,
//       10000,
//       [signer],
//       null,
//       token_programId
//     );
//     console.log("TransferTokenSignature:", TransferTokenSignature);
//   } catch (e) {
//     console.log("Transfer error:", e);
//   }
// }
// await transfer_to(destinationTokenAccount);

//PDA
let [powerUserAuthority, powerUserBump] = await PublicKey.findProgramAddress(
  [Buffer.from("power_user_pda"), user.toBuffer()],
  program.programId
);
console.log("powerUserAuthority:", powerUserAuthority.toString());
console.log("powerUserBump:", powerUserBump);

//Initialize
async function Initialize(this_owner, this_fee, this_feeReceiver, this_lock) {
  try {
    const initialize = await program.methods
      .initialize(this_owner, this_fee, this_feeReceiver, this_lock)
      .accounts({
        state: initStateAccount.publicKey,
        user: user,
        systemProgram: web3.SystemProgram.programId,
      })
      .signers([initStateAccount, signer])
      .rpc();
    console.log(`initialize:${initialize}'`);
    // Confirm transaction
    await program.provider.connection.confirmTransaction(initialize);
    // Fetch the created "InitializeState account"
    const newStateAccount = await program.account.initializeState.fetch(
      initStateAccount.publicKey
    );
    console.log("InitializeState:", "\n", newStateAccount);
  } catch (e) {
    console.log("Initialize error:", e);
  }
}
await Initialize(thisOwner, thisFee, thisFeeReceiver, lock);

//lock
async function Lock(lockState) {
  try {
    let lock = await program.methods
      .lock(lockState)
      .accounts({
        state: initStateAccount.publicKey,
        user: user,
      })
      .signers([signer])
      .rpc();
    console.log(`lock:${lock}'`);
    // Confirm transaction
    await program.provider.connection.confirmTransaction(lock);
  } catch (e) {
    console.log("Lock error:", e);
  }
}
await Lock(paused);

//SetMakerList
async function SetMakerList(thisMakerGroup, thisMakerBoolGroup) {
  try {
    const setMakerList = await program.methods
      .setMakerList(thisMakerGroup, thisMakerBoolGroup)
      .accounts({
        state: initStateAccount.publicKey,
        makerValid: makerValidAccount.publicKey,
        user: user,
        systemProgram: web3.SystemProgram.programId,
      })
      .signers([makerValidAccount, signer])
      .rpc();
    console.log(`setMakerList:${setMakerList}'`);
    // Confirm transaction
    await program.provider.connection.confirmTransaction(setMakerList);
    // Fetch the created account
    const newMakerValidAccount =
      await program.account.mappingMakerToBool.fetch(
        makerValidAccount.publicKey
      );
    console.log("Maker valid account accounts:", newMakerValidAccount.mappings);
  } catch (e) {
    console.log("SetMakerList error:", e);
  }
}
//deploy use
await SetMakerList(newMakerGroup, newMakerBoolGroup);
//test use
// await SetMakerList([user], [true]);

//SetFee
async function SetFee(newFee) {
  try {
    const setFee = await program.methods
      .setFee(newFee)
      .accounts({
        state: initStateAccount.publicKey,
        user: user,
      })
      .signers([signer])
      .rpc();
    console.log(`setFee:${setFee}'`);
    // Confirm transaction
    await program.provider.connection.confirmTransaction(setFee);
  } catch (e) {
    console.log("SetFee error:", e);
  }
}
await SetFee(thisNewFee);

//SetFeeReceiver
async function SetFeeReceiver(newFeeReceiver) {
  try {
    const setFeeReceiver = await program.methods
      .setFeeReceiver(newFeeReceiver)
      .accounts({
        state: initStateAccount.publicKey,
        user: user,
      })
      .signers([signer])
      .rpc();
    console.log(`setFeeReceiver:${setFeeReceiver}'`);
    // Confirm transaction
    await program.provider.connection.confirmTransaction(setFeeReceiver);
  } catch (e) {
    console.log("SetFee error:", e);
  }
}
await SetFeeReceiver(thisNewFeeReceiver);

//TransferOwner
async function TransferOwner(newOwner) {
  try {
    const transferOwner = await program.methods
      .tranferOwner(newOwner)
      .accounts({
        state: initStateAccount.publicKey,
        user: user,
      })
      .signers([signer])
      .rpc();
    console.log(`transferOwner:${transferOwner}'`);
    // Confirm transaction
    await program.provider.connection.confirmTransaction(transferOwner);
  } catch (e) {
    console.log("SetFee error:", e);
  }
}
await TransferOwner(thisNewOwner);

//SetManagerList
async function SetManagerList(
  thisManagerTokenGroup,
  thisManagerGroup
) {
  try {
    const setManagerList = await program.methods
      .setManagerList(thisManagerTokenGroup, thisManagerGroup)
      .accounts({
        state: initStateAccount.publicKey,
        tokenToManager: newTokenManagerAccount.publicKey,
        user: user,
        systemProgram: web3.SystemProgram.programId,
      })
      .signers([newTokenManagerAccount, signer])
      .rpc();
    console.log(`setManagerList:${setManagerList}'`);
    await program.provider.connection.confirmTransaction(setManagerList);
    // Fetch the created account
    const fetchTokenToManagerAccount =
      await program.account.mappingTokenToManager.fetch(
        newTokenManagerAccount.publicKey
      );
    console.log(
      "fetchTokenToManagerAccount accounts:",
      fetchTokenToManagerAccount.mappings
    );
  } catch (e) {
    console.log("SetManagerList error:", e);
  }
}
//deploy use
await SetManagerList(newManagerTokenGroup, newManagerGroup);
//test use
// await SetManagerList([newTokenMes.publicKey], [user]);

//SetTokenReceiver
async function SetTokenReceiver(newTokenGroup, newReceiverGroup) {
  try {
    const setTokenReceiver = await program.methods
      .setTokenReceiver(newTokenGroup, newReceiverGroup)
      .accounts({
        state: initStateAccount.publicKey,
        tokenToReceiver: newTokenReceiverAccount.publicKey,
        user: user,
        systemProgram: web3.SystemProgram.programId,
      })
      .signers([newTokenReceiverAccount, signer])
      .rpc();
    console.log(`setTokenReceiver:${setTokenReceiver}'`);
    // Confirm transaction
    await program.provider.connection.confirmTransaction(setTokenReceiver);
    // Fetch the created account
    const fetchTokenToReceiverAccount =
      await program.account.mappingTokenToReceiver.fetch(
        newTokenReceiverAccount.publicKey
      );
    console.log(
      "tokenToReceiver accounts:",
      fetchTokenToReceiverAccount.mappings
    );
  } catch (e) {
    console.log("SetTokenReceiver error:", e);
  }
}
//deploy use
await SetTokenReceiver(newTokenReceiverGroup, newReceiverGroup);
// test use
// await SetTokenReceiver([newTokenMes.publicKey], [user]);

//power user register
async function register(userAuthority) {
  try {
    let fetchPowerUserRegister = await program.account.powerUser.fetch(
      userAuthority
    );
    console.log("fetchPowerUserRegister:", fetchPowerUserRegister);
  } catch (e) {
    console.log("Power user not register,Ready to execute registration!!!");
    const powerUserRegister = await program.methods
      .withdrawRegister()
      .accounts({
        state: initStateAccount.publicKey,
        tokenToManager: newTokenManagerAccount.publicKey,
        makerValid: makerValidAccount.publicKey,
        user: user,
        powerUserPda: userAuthority,
        systemProgram: web3.SystemProgram.programId,
        tokenProgram: token_programId,
      })
      .signers([signer])
      .rpc();
    console.log(`powerUserRegister:${powerUserRegister}'`);
    // Confirm transaction
    await program.provider.connection.confirmTransaction(powerUserRegister);
  }
}
//register
await register(powerUserAuthority);

//循环派生各个spl token账户
for(let i=0;i<tokenGroup.length;i++){
  let userAssociatedAccount = await createAssociatedToken(
  tokenGroup[i],
  user
);
console.log(
  "userAssociatedAccount:",
  userAssociatedAccount.toString(),
  "owner:",
  user.toString()
);

//create feeReceiver token associated
let feeReceiverAssociated = await createAssociatedToken(
  tokenGroup[i],
  thisFeeReceiver
);
console.log(
  "feeReceiverAssociated:",
  feeReceiverAssociated.toString(),
  "owner:",
  thisFeeReceiver.toString()
);

//create pda token associated
const powerUserPdaTokenAccount = await createAssociatedToken(
  tokenGroup[i],
  powerUserAuthority
);
console.log(
  "powerUserPdaTokenAccount:",
  powerUserPdaTokenAccount.toString(),
  "owner:",
  powerUserPdaTokenAccount.toString()
);
}

//Inbox
// async function Inbox(thisUser, userAssociated, this_signer) {
//   let inAmount = new anchor.BN(100000);
//   try {
//     const inbox = await program.methods
//       .inbox(inAmount)
//       .accounts({
//         state: initStateAccount.publicKey,
//         user: thisUser,
//         source: userAssociated,
//         destination: powerUserPdaTokenAccount,
//         feeDestination: feeReceiverAssociated,
//         tokenProgram: token_programId,
//         makerValid: makerValidAccount.publicKey,
//       })
//       .signers([this_signer])
//       .rpc();
//     console.log(`inbox:${inbox}'`);
//     // Confirm transaction
//     await program.provider.connection.confirmTransaction(inbox);
//   } catch (e) {
//     console.log("inbox error:", e);
//   }
// }
// await Inbox(user, userAssociatedAccount, signer);

// check pool balance
// await getTokenBalance(powerUserPdaTokenAccount);

//Outbox
// async function Outbox(
//   thisUser,
//   userAssociated,
//   userAuthority,
//   thisUserBump,
//   this_signer
// ) {
//   let outAmount = new anchor.BN(100);
//   try {
//     const outbox = await program.methods
//       .outbox(outAmount, thisUserBump)
//       .accounts({
//         state: initStateAccount.publicKey,
//         user: thisUser,
//         source: powerUserPdaTokenAccount,
//         destination: userAssociated,
//         contractAuthority: userAuthority,
//         tokenProgram: token_programId,
//         makerValid: makerValidAccount.publicKey,
//       })
//       .signers([this_signer])
//       .rpc();
//     console.log(`outbox:${outbox}'`);
//     // Confirm transaction
//     await program.provider.connection.confirmTransaction(outbox);
//   } catch (e) {
//     console.log("outbox error:", e);
//   }
// }
//user
// await Outbox(
//   user,
//   userAssociatedAccount,
//   powerUserAuthority,
//   powerUserBump,
//   signer
// );

//Withdraw
// async function withdraw(
//   thisUser,
//   userAssociated,
//   userAuthority,
//   thisUserBump,
//   this_signer
// ) {
//   let withdrawAmount = new anchor.BN(666);
//   try {
//     const withdraw = await program.methods
//       .withdraw(withdrawAmount, thisUserBump)
//       .accounts({
//         state: initStateAccount.publicKey,
//         user: thisUser,
//         source: powerUserPdaTokenAccount,
//         destination: userAssociated,
//         tokenToManager: newTokenManagerAccount.publicKey,
//         contractAuthority: userAuthority,
//         tokenProgram: token_programId,
//       })
//       .signers([this_signer])
//       .rpc();
//     console.log(`withdraw:${withdraw}'`);
//     // Confirm transaction
//     await program.provider.connection.confirmTransaction(withdraw);
//   } catch (e) {
//     console.log("Power user withdraw error:", e);
//   }
// }
//user withdraw
// await withdraw(
//   user,
//   userAssociatedAccount,
//   powerUserAuthority,
//   powerUserBump,
//   signer
// );
